import { APIRequestContext, APIResponse } from '@playwright/test';
import { z, ZodType } from 'zod';
import { TestUser } from '../fixtures/user-data';
import { redact } from '../utils/logger';
import { ApiEnvelope, BrandsListSchema, ProductsListSchema, SearchSchema, UserDetailSchema } from './schemas';

/** Raised when a response is not JSON or does not match the documented contract. */
export class ApiContractError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'ApiContractError';
  }
}

export interface ApiResult<T> {
  httpStatus: number;
  body: T;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Typed client for the public API. Endpoints are passed WITHOUT a leading slash:
 * Playwright resolves a leading "/" against the origin and would drop the "/api" base path.
 */
export class AutomationExerciseApi {
  constructor(private readonly ctx: APIRequestContext) {}

  productsList() {
    return this.call('GET', 'productsList', ProductsListSchema);
  }

  /** Pass undefined to send the request without the search_product parameter (API 6). */
  searchProduct(term?: string) {
    return this.call('POST', 'searchProduct', SearchSchema, {
      form: term === undefined ? {} : { search_product: term },
    });
  }

  brandsList() {
    return this.call('GET', 'brandsList', BrandsListSchema);
  }

  verifyLogin(email: string, password?: string) {
    const form: Record<string, string> = { email };
    if (password !== undefined) form.password = password;
    return this.call('POST', 'verifyLogin', ApiEnvelope, { form });
  }

  createAccount(u: TestUser) {
    return this.call('POST', 'createAccount', ApiEnvelope, { form: toApiForm(u) });
  }

  updateAccount(u: TestUser) {
    return this.call('PUT', 'updateAccount', ApiEnvelope, { form: toApiForm(u) });
  }

  getUserDetailByEmail(email: string) {
    return this.call('GET', 'getUserDetailByEmail', UserDetailSchema, { params: { email } });
  }

  deleteAccount(email: string, password: string) {
    return this.call('DELETE', 'deleteAccount', ApiEnvelope, { form: { email, password } });
  }

  /** Method-validation checks (405) and other negative calls. */
  raw(method: Method, endpoint: string, form?: Record<string, string>) {
    return this.call(method, endpoint, ApiEnvelope, form ? { form } : {});
  }

  private async call<S extends ZodType>(
    method: Method,
    endpoint: string,
    schema: S,
    options: { form?: Record<string, string>; params?: Record<string, string> } = {},
  ): Promise<ApiResult<z.infer<S>>> {
    const res = await this.send(method, endpoint, options);
    const body = await this.parse(res, schema, endpoint);
    return { httpStatus: res.status(), body };
  }

  private send(
    method: Method,
    endpoint: string,
    options: { form?: Record<string, string>; params?: Record<string, string> },
  ) {
    switch (method) {
      case 'GET':
        return this.ctx.get(endpoint, { params: options.params });
      case 'POST':
        return this.ctx.post(endpoint, { form: options.form });
      case 'PUT':
        return this.ctx.put(endpoint, { form: options.form });
      case 'DELETE':
        return this.ctx.delete(endpoint, { form: options.form });
    }
  }

  private async parse<S extends ZodType>(res: APIResponse, schema: S, endpoint: string): Promise<z.infer<S>> {
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      const snippet = redact(text.slice(0, 80).replace(/\s+/g, ' '));
      throw new ApiContractError(`${endpoint}: non-JSON body (HTTP ${res.status()}): ${snippet}`, res.status());
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'} ${i.message}`).join('; ');
      throw new ApiContractError(`${endpoint}: schema mismatch (HTTP ${res.status()}): ${issues}`, res.status());
    }
    return parsed.data;
  }
}

/** Maps a test user onto the form fields the createAccount/updateAccount endpoints expect. */
export function toApiForm(u: TestUser): Record<string, string> {
  return {
    name: u.name,
    email: u.email,
    password: u.password,
    title: u.title,
    birth_date: u.birthDay,
    birth_month: u.birthMonth,
    birth_year: u.birthYear,
    firstname: u.firstName,
    lastname: u.lastName,
    company: u.company,
    address1: u.address1,
    address2: u.address2,
    country: u.country,
    zipcode: u.zipcode,
    state: u.state,
    city: u.city,
    mobile_number: u.mobileNumber,
  };
}
