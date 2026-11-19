import { randomUUID } from 'crypto';

export interface TestUser {
  name: string;
  email: string;
  password: string;
  title: 'Mr' | 'Mrs' | 'Miss';
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
}

/**
 * Generates a unique, disposable test user. Every call is a fresh identity so parallel
 * workers never share an account. Emails use the reserved .invalid domain.
 */
export function generateTestUser(prefix = 'qa'): TestUser {
  const id = randomUUID().split('-')[0];
  return {
    name: `QA ${id}`,
    email: `${prefix}.${id}@example-test.invalid`,
    password: `Pw-${id}-Aa1!`,
    title: 'Mr',
    firstName: 'QA',
    lastName: id.toUpperCase(),
    company: 'QA Test Co',
    address1: `1 Test Street ${id}`,
    address2: 'Suite 100',
    country: 'United States',
    state: 'California',
    city: 'Testville',
    zipcode: '90210',
    mobileNumber: '5551234567',
    birthDay: '10',
    birthMonth: '5',
    birthYear: '1990',
  };
}
