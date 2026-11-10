# Stripe homologation

- [x] Inspect calculation creation/deletion paths in PR #4 and current schema without production writes.
- [x] Prepare technical plan for confirmed monthly limits and unlimited Superior plan.
- [ ] Validate month boundaries, consumption/edit/delete rules, legacy mapping and plan-switch behavior with responsible parties.
- [ ] Obtain isolated editable environment for `fix/stripe-homologation`; current checkout is main.
- [ ] Implement product-specific rights, fixed 30-day course expiry and validated catalog mappings in the isolated PR work surface.
- [ ] Implement atomic monthly calculation quota and usage display after policy approval; run targeted regression/concurrency tests.
- [ ] Obtain specific authorization before migrations or deployment to the isolated environment; never use production for homologation.