#!/usr/bin/env bash
# Concurrency check on a DISPOSABLE database: DB_URL must point to it.
set -euo pipefail
: "${DB_URL:?set DB_URL to a disposable database}"
: "${QUATTOR_DISPOSABLE_DB:?Set QUATTOR_DISPOSABLE_DB=YES only for a disposable local test database}"
if [[ "$QUATTOR_DISPOSABLE_DB" != "YES" ]]; then
  echo "Refusing to write: QUATTOR_DISPOSABLE_DB must be YES" >&2
  exit 2
fi
# Never allow this fixture to run against a hosted/live database.
python3 - "$DB_URL" <<'PY'
import sys
from urllib.parse import urlparse
host = urlparse(sys.argv[1]).hostname
if host not in ("localhost", "127.0.0.1", "::1"):
    raise SystemExit("Refusing to run concurrency fixtures on a non-local database")
PY
U=b1111111-1111-4111-8111-111111111111
psql "$DB_URL" -q -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users (id, email) VALUES ('$U', 'concorrencia@example.invalid');
INSERT INTO public.subscription_plans (code, name, environment, product, checkout_mode, monthly_calculation_limit, is_active)
VALUES ('diesel_conc', 'Básico', 'test', 'diesel', 'subscription', 30, true);
INSERT INTO public.stripe_contracts (environment, object_id, user_id, plan_code, mode, customer_id, price_id, product_id, status, access_until)
VALUES ('test','sub_conc','$U','diesel_conc','subscription','cus_c','price_c','prod_c','active', now() + interval '20 days');
INSERT INTO public.diesel_usage (user_id, period_start, used) VALUES ('$U', public.diesel_usage_period(), 28);
SQL
call() {
  local output last
  if output=$(psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 \
    -c "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$U',false);" \
    -c "SELECT public.save_diesel_calculation('$1'::uuid, jsonb_build_object('volume_nf',1,'peso_liquido',1,'massa_especifica_20_nf',1,'temperatura_amostra',1,'densidade_amostra',1,'temperatura_ct',1))->>'duplicate'" 2>&1); then
    last="${output##*$'\n'}"
    case "$last" in
      true|false) printf '%s\n' "$last" ;;
      *) echo "unexpected"; printf '%s\n' "$output" >&2 ;;
    esac
  elif [[ "$output" == *"diesel_quota_exceeded"* ]]; then
    echo "blocked"
  else
    echo "unexpected"
    printf '%s\n' "$output" >&2
  fi
}
SAME=$(python3 -c "import uuid;print(uuid.uuid4())")
for i in $(seq 1 8); do call "$SAME" & done > /tmp/conc_same.txt; wait
for i in $(seq 1 8); do call "$(python3 -c "import uuid;print(uuid.uuid4())")" & done > /tmp/conc_many.txt; wait
CALCS=$(psql "$DB_URL" -qAt -c "SELECT count(*) FROM public.calculations WHERE user_id = '$U'")
USED=$(psql "$DB_URL" -qAt -c "SELECT used FROM public.diesel_usage WHERE user_id = '$U' AND period_start = public.diesel_usage_period()")
same_new=$(grep -xc 'false' /tmp/conc_same.txt || true)
same_dup=$(grep -xc 'true' /tmp/conc_same.txt || true)
other_new=$(grep -xc 'false' /tmp/conc_many.txt || true)
other_blocked=$(grep -xc 'blocked' /tmp/conc_many.txt || true)
echo "same-request: $same_new new, $same_dup duplicates"
echo "distinct: $other_new saved, $other_blocked blocked"
echo "calculations=$CALCS used=$USED"
if [[ "$CALCS" != 2 || "$USED" != 30 || "$same_new" != 1 || "$same_dup" != 7 || "$other_new" != 1 || "$other_blocked" != 7 ]]; then
  echo "Unexpected results in concurrent saves" >&2
  exit 1
fi
echo "concurrency ok"
