# Controle mensal de inserções — Calculadora Diesel

Migração: `supabase/migrations/20261110180000_diesel_quota_and_product_rights.sql`
(não aplicada em produção; depende de aprovação).

## Regras implementadas
- Período: mês civil no horário de Brasília; renova no dia 1 às 00:00, inclusive no plano anual.
- Cada cálculo novo salvo consome 1 inserção, via `save_diesel_calculation` (atômica, trava por cliente/mês).
- Reenvio com o mesmo identificador de operação devolve o registro já gravado, sem consumir.
- Edição não consome; exclusão não devolve saldo. Inserção direta na tabela foi revogada.
- Troca de plano no mês mantém o consumo; vale o limite do plano vigente.
- Superior (`unlimited_calculations = true`) é ilimitado.
- Contagem começa em zero na ativação (sem retroativo).
- Contrato antigo sem `plan_code` mapeado: acesso preservado, sem plano comercial nem limite.
- Direitos independentes por produto (`subscription_plans.product`: diesel, news, course).
- Minicurso: acesso por 30 dias a partir da primeira confirmação de pagamento; webhooks repetidos não renovam.

## Pendente de decisão
- Precedência com mais de um contrato Diesel ativo (provisório: o mais generoso).
  Casos listados por `diesel_multiple_contracts()`.
- Mapeamento dos contratos antigos para Básico/Intermediário/Superior.
- Cadastro do catálogo (preços e IDs Stripe) no ambiente de homologação.

## Testes
- `supabase/tests/diesel_quota.sql` e `supabase/tests/stripe_contracts.sql` (banco descartável).
- `DB_URL=... supabase/tests/diesel_quota_concurrency.sh` (banco descartável).
- `src/test/dieselQuota.test.ts` (Vitest).
