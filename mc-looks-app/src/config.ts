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
  /** Localized colour-name attribute. */
  colorNameAttribute: string;
  /** Fallback colour attribute (enum or localized enum). */
  colorAttribute: string;
  /** Shop address for the "Im Shop ansehen" link; empty disables the link. */
  shopOrigin: string;
}

export const CONFIG_VARIABLES: Record<keyof AppConfig, string> = {
  variantAttributes: 'VARIANT_ATTRIBUTES',
  colorNameAttribute: 'COLOR_NAME_ATTRIBUTE',
  colorAttribute: 'COLOR_ATTRIBUTE',
  shopOrigin: 'SHOP_ORIGIN',
};

const defaults: AppConfig = {
  variantAttributes: ['size'],
  colorNameAttribute: 'color-name',
  colorAttribute: 'color',
  shopOrigin: '',
};

/** Raw values as read from the environment: every value is text, the list of
 *  variant attributes is comma-separated. */
export type ConfigSource = Partial<Record<keyof AppConfig, string | undefined>>;

const requiredText: Array<'colorNameAttribute' | 'colorAttribute'> = [
  'colorNameAttribute',
  'colorAttribute',
];

export function resolveConfig(source: ConfigSource = {}): AppConfig {
  const merged: AppConfig = { ...defaults };
  if (source.variantAttributes !== undefined) {
    merged.variantAttributes = source.variantAttributes
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  }
  for (const key of [
    'colorNameAttribute',
    'colorAttribute',
    'shopOrigin',
  ] as const) {
    const value = source[key];
    if (value !== undefined) merged[key] = value.trim();
  }
  const missing = (key: keyof AppConfig) =>
    new Error(
      `Missing configuration value ${CONFIG_VARIABLES[key]}: it must not be empty.`
    );
  if (merged.variantAttributes.length === 0) throw missing('variantAttributes');
  for (const key of requiredText) {
    if (!merged[key]) throw missing(key);
  }
  merged.shopOrigin = merged.shopOrigin.replace(/\/+$/, '');
  return merged;
}

export const config: AppConfig = resolveConfig({
  variantAttributes: process.env.VARIANT_ATTRIBUTES,
  colorNameAttribute: process.env.COLOR_NAME_ATTRIBUTE,
  colorAttribute: process.env.COLOR_ATTRIBUTE,
  shopOrigin: process.env.SHOP_ORIGIN,
});
