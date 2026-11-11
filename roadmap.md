# Stripe homologation

- [x] Inspect calculation creation/deletion paths in PR #4 and current schema without production writes.
- [x] Prepare technical plan for confirmed monthly limits and unlimited Superior plan.
- [x] Confirm calendar-month Brasília boundaries, successful-save consumption, free edits, no deletion refund, and retry deduplication.
- [x] Revalidate PR #4 head d82fbdbaa4ac58f9c42d9af887cd11cf96c2b9ec and run its 105 unit tests in a separate source copy.
- [x] Verify accessible managed Stripe sandbox account, empty product/price catalog, and two existing managed webhook destinations; current internal catalog remains empty.
- [ ] Incorporate current PR into separate code draft without deployment or database writes (draft drft_01m73zcczqe1xsgk23m5a7x834).
- [ ] Obtain a confirmed isolated database and zero-cost hosting before migrations, function deployment, catalog linkage, or Stripe end-to-end tests; new drafts currently share the live database.
- [ ] Verify access to Qu4ttuor live account and its nine prices read-only; project managed live setup is incomplete and no live connection is available.
- [ ] Obtain commercial priority for multiple active Diesel contracts and identify legacy mapping and course module codes/content-delivery endpoint.
- [ ] Complete sandbox approved/declined checkout, actual signed webhook replay, renewal/cancellation, quota/concurrency, product separation, and course-expiry checks once isolation is available.
- [ ] Finalize rollback evidence for the incorporated revision without executing destructive operations; preserve BILLING_HOMOLOGATED=false.