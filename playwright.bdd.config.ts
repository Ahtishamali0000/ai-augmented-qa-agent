import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import sharedConfig from './playwright.config';

const bddTestDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['fixtures/bddFixture.ts', 'steps/**/*.steps.ts'],
  featuresRoot: 'features',
  outputDir: 'tests/.features-gen',
  missingSteps: 'fail-on-gen',
});

export default defineConfig({
  ...sharedConfig,
  testDir: bddTestDir,
  testIgnore: [],
});
