/**
 * The only reader of per-project values (FR-084/085). Today it holds typed
 * defaults; the same module is where `.env` values will be read from, so no
 * caller changes when they move. A required value that is empty fails loudly
 * with the name of its variable.
 */

export interface AppConfig {
  /** Product-variant attribute holding the size. */
  sizeAttribute: string;
  /** Localized colour-name attribute. */
  colorNameAttribute: string;
  /** Fallback colour attribute (enum or localized enum). */
  colorAttribute: string;
  /** Shop origin for look photos and "Im Shop ansehen"; empty disables both. */
  shopOrigin: string;
}

export const CONFIG_VARIABLES: Record<keyof AppConfig, string> = {
  sizeAttribute: 'SIZE_ATTRIBUTE',
  colorNameAttribute: 'COLOR_NAME_ATTRIBUTE',
  colorAttribute: 'COLOR_ATTRIBUTE',
  shopOrigin: 'SHOP_ORIGIN',
};

const defaults: AppConfig = {
  sizeAttribute: 'size',
  colorNameAttribute: 'color-name',
  colorAttribute: 'color',
  shopOrigin: '',
};

const required: Array<keyof AppConfig> = [
  'sizeAttribute',
  'colorNameAttribute',
  'colorAttribute',
];

export function resolveConfig(
  source: Partial<Record<keyof AppConfig, string | undefined>> = {}
): AppConfig {
  const merged = { ...defaults };
  (Object.keys(defaults) as Array<keyof AppConfig>).forEach((key) => {
    const value = source[key];
    if (value !== undefined) merged[key] = value.trim();
  });
  for (const key of required) {
    if (!merged[key]) {
      throw new Error(
        `Missing configuration value ${CONFIG_VARIABLES[key]}: it must not be empty.`
      );
    }
  }
  merged.shopOrigin = merged.shopOrigin.replace(/\/+$/, '');
  return merged;
}

export const config: AppConfig = resolveConfig();
