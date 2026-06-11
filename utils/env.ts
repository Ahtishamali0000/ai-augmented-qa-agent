type TestEnvironment = 'CF' | 'UAT1';
type Locale = 'UK' | 'US' | 'EU';

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

export const testEnv = {
  environment: normalizeEnvironment(process.env.DEFAULT_TEST_ENV),
  locale: normalizeLocale(process.env.DEFAULT_LOCALE),
  loginEmail: process.env.LOGIN_EMAIL || '',
  loginPassword: process.env.LOGIN_PASSWORD || '',
  get baseURL() {
    return urls[this.environment][this.locale];
  },
};

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
