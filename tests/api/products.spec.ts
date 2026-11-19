import { test, expect } from '../../src/fixtures';

test.describe('API - Products, Brands & Method Validation', () => {
  test('AE-06 (API 1): products list returns products with required fields @p0 @smoke', async ({ api }) => {
    const res = await api.productsList();
    expect(res.httpStatus).toBe(200);
    expect(res.body.responseCode).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    const first = res.body.products[0];
    expect(first.id).toBeGreaterThan(0);
    expect(first.name).not.toBe('');
    expect(first.price).toMatch(/^Rs\.\s*\d+/);
  });

  test('AE-07 (API 5): search for a known term returns products @p0', async ({ api }) => {
    const res = await api.searchProduct('Tshirt');
    expect(res.body.responseCode).toBe(200);
    expect(res.body.products?.length ?? 0).toBeGreaterThan(0);
  });

  test('AE-08 (API 6): search without search_product parameter (negative) @p1', async ({ api }) => {
    const res = await api.searchProduct();
    expect(res.body.responseCode).toBe(400);
    expect(res.body.message).toMatch(/bad request, search_product parameter is missing/i);
  });

  test('AE-10 (API 3): brands list returns named brands @p1', async ({ api }) => {
    const res = await api.brandsList();
    expect(res.body.responseCode).toBe(200);
    expect(res.body.brands.length).toBeGreaterThan(0);
    expect(res.body.brands.every((b) => b.brand.trim().length > 0)).toBe(true);
  });

  test('AE-23 (API 2): POST to productsList is not supported (negative) @p1', async ({ api }) => {
    const res = await api.raw('POST', 'productsList');
    expect(res.body.responseCode).toBe(405);
    expect(res.body.message).toMatch(/this request method is not supported/i);
  });

  test('AE-23 (API 4): PUT to brandsList is not supported (negative) @p1', async ({ api }) => {
    const res = await api.raw('PUT', 'brandsList');
    expect(res.body.responseCode).toBe(405);
    expect(res.body.message).toMatch(/this request method is not supported/i);
  });
});
