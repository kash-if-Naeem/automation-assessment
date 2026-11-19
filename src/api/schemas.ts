import { z } from 'zod';

/** Every documented API response carries a numeric responseCode and a message (API list, page 1). */
export const ApiEnvelope = z.object({ responseCode: z.number(), message: z.string().optional() }).passthrough();

export const ProductSchema = z
  .object({
    id: z.number(),
    name: z.string().min(1),
    price: z.string().regex(/^Rs\.\s*\d+/),
    brand: z.string().optional(),
  })
  .passthrough();

export const ProductsListSchema = ApiEnvelope.extend({ products: z.array(ProductSchema) });
export const SearchSchema = ApiEnvelope.extend({ products: z.array(ProductSchema).optional() });
export const BrandsListSchema = ApiEnvelope.extend({
  brands: z.array(z.object({ id: z.number(), brand: z.string().min(1) }).passthrough()),
});
export const UserDetailSchema = ApiEnvelope.extend({
  user: z.object({ email: z.string(), city: z.string().optional() }).passthrough().optional(),
});
