/**
 * The only reader of per-project values (FR-084/085). Today it holds typed
 * defaults; the same module is where `.env` values will be read from, so no
 * caller changes when they move. A required value that is empty fails loudly
 * with the name of its variable.
 */

export interface AppConfig {
  /** Product-variant attributes that tell the variants of a product apart
   *  (for example size, finish colour, search colour), in display order. */
  variantAttributes: string[];
  /** Shop address for the "Im Shop ansehen" link; empty disables the link. */
  shopOrigin: string;
}

export const CONFIG_VARIABLES: Record<keyof AppConfig, string> = {
  variantAttributes: 'VARIANT_ATTRIBUTES',
  shopOrigin: 'SHOP_ORIGIN',
};

const defaults: AppConfig = {
  variantAttributes: ['size'],
  shopOrigin: '',
};

/** Raw values as read from the environment: every value is text, the list of
 *  variant attributes is comma-separated. */
export type ConfigSource = Partial<Record<keyof AppConfig, string | undefined>>;

export function resolveConfig(source: ConfigSource = {}): AppConfig {
  const merged: AppConfig = { ...defaults };
  if (source.variantAttributes !== undefined) {
    merged.variantAttributes = source.variantAttributes
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  }
  if (source.shopOrigin !== undefined) {
    merged.shopOrigin = source.shopOrigin.trim();
  }
  const missing = (key: keyof AppConfig) =>
    new Error(
      `Missing configuration value ${CONFIG_VARIABLES[key]}: it must not be empty.`
    );
  if (merged.variantAttributes.length === 0) throw missing('variantAttributes');
  merged.shopOrigin = merged.shopOrigin.replace(/\/+$/, '');
  return merged;
}

export const config: AppConfig = resolveConfig({
  variantAttributes: process.env.VARIANT_ATTRIBUTES,
  shopOrigin: process.env.SHOP_ORIGIN,
});
