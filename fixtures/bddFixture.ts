/**
 * BDD uses the same fixture graph as hand-written Playwright specs.
 * Keeping one fixture source prevents the two test styles from drifting.
 */
export { expect, test, type QaFixtures } from './testFixture';
