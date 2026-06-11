export type RegistrationData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  day: string;
  month: string;
  year: string;
  country: string;
  address: string;
};

export type RegistrationUser = RegistrationData;

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const passwordChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomYopmailEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);

  return `qa.test.${timestamp}.${random}@yopmail.com`;
}

export function generateAlphabeticWord(length = randomInt(5, 9)) {
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomInt(0, alphabet.length - 1)];
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function generateName() {
  return {
    firstName: generateAlphabeticWord(),
    lastName: generateAlphabeticWord(),
  };
}

export function generateUSPhone() {
  return `555${randomInt(1000000, 9999999)}`;
}

export function generatePassword(length = randomInt(10, 14)) {
  const requiredChars = ['A', 'a', '1', '@'];
  const chars = [...requiredChars];

  while (chars.length < Math.max(length, 9)) {
    chars.push(passwordChars[randomInt(0, passwordChars.length - 1)]);
  }

  return chars.sort(() => Math.random() - 0.5).join('');
}

export function generateRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  const name = generateName();

  return {
    firstName: name.firstName,
    lastName: name.lastName,
    email: generateRandomYopmailEmail(),
    password: generatePassword(),
    phone: generateUSPhone(),
    day: '10',
    month: 'January',
    year: '1995',
    country: 'United States',
    address: 'QA Automation Test Address',
    ...overrides,
  };
}

export function createRegistrationUser(overrides: Partial<RegistrationData> = {}) {
  return generateRegistrationData(overrides);
}

export const randomYopmailEmail = generateRandomYopmailEmail;
