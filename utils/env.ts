import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type TestEnvironment = 'CF' | 'UAT1';
type Locale = 'UK' | 'US' | 'EU';
type CiEnvironment = 'CF_UK' | 'CF_US' | 'CF_EU' | 'UAT1_UK' | 'UAT1_US' | 'UAT1_EU';

loadLocalEnv();

const urls: Record<TestEnvironment, Record<Locale, string>> = {
  CF: {
    UK: process.env.CF_UK_URL || 'https://cfstaging.ego.co.uk/',
    US: process.env.CF_US_URL || 'https://cfstaging.egoshoes.com/us',
    EU: process.env.CF_EU_URL || 'https://cfstaging.egoshoes.com/eu',
  },
  UAT1: {
    UK: process.env.UAT1_UK_URL || 'https://cf-uat1.ego.co.uk/',
    US: process.env.UAT1_US_URL || 'https://cf-uat1.egoshoes.com/us',
    EU: process.env.UAT1_EU_URL || 'https://cf-uat1.egoshoes.com/eu',
  },
};

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, 'utf8');

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[key.trim()] ||= value;
  }
}

export const testEnv = {
  environment: normalizeEnvironment(process.env.DEFAULT_TEST_ENV),
  locale: normalizeLocale(process.env.DEFAULT_LOCALE),
  ciEnvironment: normalizeCiEnvironment(process.env.QA_TARGET_ENV),
  loginEmail: process.env.LOGIN_EMAIL || '',
  loginPassword: process.env.LOGIN_PASSWORD || '',
  get baseURL() {
    return process.env.PLAYWRIGHT_BASE_URL || resolveEnvironmentUrl(this.ciEnvironment, this.environment, this.locale);
  },
};

export function resolveEnvironmentUrl(ciEnvironment?: string, fallbackEnvironment?: TestEnvironment, fallbackLocale?: Locale) {
  const selected = normalizeCiEnvironment(ciEnvironment);

  if (selected) {
    const [environment, locale] = selected.split('_') as [TestEnvironment, Locale];
    return urls[environment][locale];
  }

  return urls[fallbackEnvironment || 'CF'][fallbackLocale || 'UK'];
}

function normalizeEnvironment(value?: string): TestEnvironment {
  return value?.toUpperCase() === 'UAT1' ? 'UAT1' : 'CF';
}

function normalizeLocale(value?: string): Locale {
  const normalized = value?.toUpperCase();

  if (normalized === 'US' || normalized === 'EU') {
    return normalized;
  }

  return 'UK';
}

function normalizeCiEnvironment(value?: string): CiEnvironment | undefined {
  const normalized = value?.toUpperCase();
  const allowed: CiEnvironment[] = ['CF_UK', 'CF_US', 'CF_EU', 'UAT1_UK', 'UAT1_US', 'UAT1_EU'];
  return allowed.find((item) => item === normalized);
}
