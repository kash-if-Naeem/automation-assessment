import { test, expect } from '../../src/fixtures';

test.describe('API - Account & Login', () => {
  test('AE-05 (API 7): verifyLogin with valid details @p0', async ({ api, newUser, accountCleanup }) => {
    const created = await api.createAccount(newUser);
    expect(created.body.responseCode).toBe(201);
    accountCleanup.track(newUser);

    const login = await api.verifyLogin(newUser.email, newUser.password);
    expect(login.body.responseCode).toBe(200);
    expect(login.body.message).toMatch(/user exists/i);
  });

  test('AE-05 (API 8): verifyLogin without email (negative) @p1', async ({ api }) => {
    const res = await api.raw('POST', 'verifyLogin', { password: 'WrongPassword!' });
    expect(res.body.responseCode).toBe(400);
    expect(res.body.message).toMatch(/email or password parameter is missing/i);
  });

  test('AE-03 (API 10): verifyLogin with unknown user (negative) @p0', async ({ api }) => {
    const res = await api.verifyLogin('nonexistent_9999@example-test.invalid', 'WrongPassword!');
    expect(res.body.responseCode).toBe(404);
    expect(res.body.message).toMatch(/user not found/i);
  });

  test('AE-23 (API 9): DELETE on verifyLogin is not supported (negative) @p1', async ({ api }) => {
    const res = await api.raw('DELETE', 'verifyLogin');
    expect(res.body.responseCode).toBe(405);
    expect(res.body.message).toMatch(/this request method is not supported/i);
  });

  test('AE-22 (API 11-14): account create, read, update, delete @p1', async ({ api, newUser }) => {
    const created = await api.createAccount(newUser);
    expect(created.body.responseCode).toBe(201);
    let deleted = false;
    try {
      const read = await api.getUserDetailByEmail(newUser.email);
      expect(read.body.responseCode).toBe(200);
      expect(read.body.user?.email).toBe(newUser.email);

      const updated = await api.updateAccount({ ...newUser, city: 'UpdatedCity' });
      expect(updated.body.responseCode).toBe(200);
      expect(updated.body.message).toMatch(/user updated/i);

      const reread = await api.getUserDetailByEmail(newUser.email);
      expect(reread.body.user?.city).toBe('UpdatedCity');

      const del = await api.deleteAccount(newUser.email, newUser.password);
      expect(del.body.responseCode).toBe(200);
      expect(del.body.message).toMatch(/account deleted/i);
      deleted = true;
    } finally {
      // Best-effort cleanup if an assertion failed before the delete step.
      if (!deleted) await api.deleteAccount(newUser.email, newUser.password).catch(() => undefined);
    }
  });
});
