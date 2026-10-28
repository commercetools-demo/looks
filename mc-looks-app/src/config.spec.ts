import fs from 'fs';
import path from 'path';
import { CONFIG_VARIABLES, resolveConfig } from './config';

describe('config', () => {
  it('has the documented defaults', () => {
    expect(resolveConfig()).toEqual({
      variantAttributes: ['size'],
      shopOrigin: '',
    });
  });

  it('takes overrides, trims them, and strips trailing slashes from the origin', () => {
    expect(
      resolveConfig({
        variantAttributes: ' searchColor , finishColor,size ',
        shopOrigin: 'https://shop.example.com//',
      })
    ).toMatchObject({
      variantAttributes: ['searchColor', 'finishColor', 'size'],
      shopOrigin: 'https://shop.example.com',
    });
  });

  it('fails loudly and names the variable when a required value is empty', () => {
    expect(() => resolveConfig({ variantAttributes: '' })).toThrow(
      CONFIG_VARIABLES.variantAttributes
    );
    expect(() => resolveConfig({ variantAttributes: ' , ' })).toThrow(
      'VARIANT_ATTRIBUTES'
    );
  });

  it('allows an empty shop origin (the shop link is then unavailable)', () => {
    expect(() => resolveConfig({ shopOrigin: '' })).not.toThrow();
  });
});

describe('config guard (FR-084/085)', () => {
  const srcDir = path.resolve(__dirname);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(srcDir);
  const production = files.filter(
    (f) =>
      !/\.spec\.(ts|tsx)$/.test(f) &&
      !f.includes(`${path.sep}test-utils${path.sep}`) &&
      !f.includes(`${path.sep}types${path.sep}generated`)
  );

  it('only config.ts and constants.ts read process.env', () => {
    const offenders = production
      .filter((f) => /process\.env/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.basename(f))
      .filter((name) => !['config.ts', 'constants.ts'].includes(name));
    expect(offenders).toEqual([]);
  });

  it('has no currency code literal in production code (SC-007)', () => {
    const offenders = production
      .filter((f) =>
        /['"`](EUR|CHF|USD|GBP)['"`]/.test(fs.readFileSync(f, 'utf8'))
      )
      .map((f) => path.relative(srcDir, f));
    expect(offenders).toEqual([]);
  });
});
