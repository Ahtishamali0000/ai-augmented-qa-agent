export type RegistrationUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
};

export function randomYopmailEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);

  return `qa.test.${timestamp}.${random}@yopmail.com`;
}

export function createRegistrationUser(overrides: Partial<RegistrationUser> = {}): RegistrationUser {
  return {
    firstName: 'QA',
    lastName: 'Automation',
    email: randomYopmailEmail(),
    password: 'QaTest@12345',
    phone: '07123456789',
    ...overrides,
  };
}
