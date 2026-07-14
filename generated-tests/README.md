# Generated test review gate

AI or rule-generated automation is written to `generated-tests/pending/` first. A pending package contains its feature, required step additions, proposed POM changes, and an AC coverage manifest (`covered`, `partial`, or `missing`).

Nothing in `pending/` is executed. A human reviewer checks for duplicate scenarios, business-readable Gherkin, POM reuse, destructive behavior, and complete AC assertions. Only approved changes are moved into `features/`, `steps/`, and `pages/` or `components/`.

Generated output must be idempotent: use Jira key + AC ID + normalized scenario title as the stable identity.

Legacy pending `.spec.ts` drafts are audit evidence only and must not be approved into the framework. Convert them into review packages with:

```bash
npm run migrate:pending-bdd
```

The command preserves each legacy source and writes a review-only `.feature` plus `.review.json`. Migrated scenarios remain `@manual @skip @coverage:missing` until real Jira acceptance criteria, reusable POM mappings, and deterministic test data are supplied.
