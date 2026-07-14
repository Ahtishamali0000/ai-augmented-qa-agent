import { defineConfig, devices } from '@playwright/test';
import { testEnv } from './utils/env';

const headless = process.env.HEADLESS === undefined
  ? Boolean(process.env.CI)
  : process.env.HEADLESS.toLowerCase() !== 'false';
const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TESTS === 'true';
const allowUnstable = process.env.ALLOW_UNSTABLE_TESTS === 'true';
const excludedTags = [
  ...(!allowDestructive ? [/@destructive/] : []),
  ...(!allowUnstable ? [/@unstable/] : []),
];

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/.features-gen/**',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright/html', open: 'never' }],
    ['json', { outputFile: 'reports/playwright/results.json' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results', detail: true, suiteTitle: true }],
    ['./reporters/qaPipelineReporter.ts'],
  ],
  grepInvert: excludedTags.length ? excludedTags : undefined,
  use: {
    baseURL: testEnv.baseURL,
    headless,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  outputDir: 'reports/playwright/artifacts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
