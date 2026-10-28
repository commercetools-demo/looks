/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

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
}

export const CONFIG_VARIABLES: Record<keyof AppConfig, string> = {
  variantAttributes: 'VARIANT_ATTRIBUTES',
};

const defaults: AppConfig = {
  variantAttributes: ['size'],
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
  const missing = (key: keyof AppConfig) =>
    new Error(
      `Missing configuration value ${CONFIG_VARIABLES[key]}: it must not be empty.`
    );
  if (merged.variantAttributes.length === 0) throw missing('variantAttributes');
  return merged;
}

export const config: AppConfig = resolveConfig({
  variantAttributes: process.env.VARIANT_ATTRIBUTES,
});
