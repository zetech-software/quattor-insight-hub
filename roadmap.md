# Stripe homologation

- [x] Inspect calculation creation/deletion paths in PR #4 and current schema without production writes.
- [x] Prepare technical plan for confirmed monthly limits and unlimited Superior plan.
- [x] Confirm calendar-month Brasília boundaries, successful-save consumption, free edits, no deletion refund, and retry deduplication.
- [x] Revalidate PR #4 head d82fbdbaa4ac58f9c42d9af887cd11cf96c2b9ec and run its 105 unit tests in a separate source copy.
- [x] Re-run four simulated Stripe Checkout/webhook tests on that revision: 4 passed, no real Stripe payment attempted.
- [x] Verify accessible managed Stripe sandbox account, empty product/price catalog, and two existing managed webhook destinations; current internal catalog remains empty.
- [ ] Incorporate current PR into separate code draft without deployment or database writes (draft drft_01m73zcczqe1xsgk23m5a7x834).
- [ ] Obtain a confirmed isolated database and zero-cost hosting before migrations, function deployment, catalog linkage, or Stripe end-to-end tests; new drafts currently share the live database.
- [ ] Verify access to Qu4ttuor live account and its nine prices read-only; project managed live setup is incomplete and no live connection is available.
- [ ] Open secure read-only Live connection form without linking it to runtime: blocked, standard Stripe connect explicitly refuses because this project's Stripe integration is managed Payments. No alternate connector or key requested.
- [ ] Confirm sandbox claim to the intended Live account before catalog creation: Payments reports claim in progress; sandbox account ID is not a claimable-sandbox resource ID (read-only probe returned 404), so ownership is not established.
- [x] Check published isolated-hosting prices: external Free project is $0 with up to two active Free projects; Pro starts $25/month, additional Micro compute typically $10/month in existing paid organization before usage. Customer organizations, free quota, and access are unavailable here; no resource created.
- [ ] Obtain access to an authorized customer-owned isolated resource or confirm its unused free capacity; current Cloud cannot be switched to an external database and new drafts share live data. Cloud usage is credit-metered, not guaranteed free.
- [ ] Obtain commercial priority for multiple active Diesel contracts and identify legacy mapping and course module codes/content-delivery endpoint.
- [ ] Complete sandbox approved/declined checkout, actual signed webhook replay, renewal/cancellation, quota/concurrency, product separation, and course-expiry checks once isolation is available.
- [ ] Finalize rollback evidence for the incorporated revision without executing destructive operations; preserve BILLING_HOMOLOGATED=false.