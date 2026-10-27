import fs from 'fs';
import path from 'path';
import {
  isLiteralElement,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTagElement,
  parse,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';
import de from './i18n/data/de.json';
import en from './i18n/data/en.json';

/** Argument names of an ICU message, including those inside plural/select
 *  branches, but not the branch labels themselves. */
const placeholders = (text: string): string[] => {
  const names = new Set<string>();
  const visit = (elements: MessageFormatElement[]) => {
    for (const element of elements) {
      if (isLiteralElement(element) || isPoundElement(element)) continue;
      names.add(element.value);
      if (isSelectElement(element) || isPluralElement(element)) {
        Object.values(element.options).forEach((option) => visit(option.value));
      }
      if (isTagElement(element)) visit(element.children);
    }
  };
  visit(parse(text, { ignoreTag: true }));
  return [...names].sort();
};

const srcDir = __dirname;
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(srcDir);

const jsx = files.filter(
  (f) =>
    f.endsWith('.tsx') &&
    !f.endsWith('.spec.tsx') &&
    !f.includes(`${path.sep}test-utils${path.sep}`)
);

describe('message catalogs (SC-009)', () => {
  const deKeys = Object.keys(de).sort();
  const enKeys = Object.keys(en).sort();

  it('have the same keys in German and English', () => {
    expect(enKeys).toEqual(deKeys);
  });

  it('have the same placeholders in every message', () => {
    const mismatches = deKeys.filter(
      (id) =>
        JSON.stringify(placeholders((de as Record<string, string>)[id])) !==
        JSON.stringify(placeholders((en as Record<string, string>)[id] ?? ''))
    );
    expect(mismatches).toEqual([]);
  });

  it('use ids that are unique app-wide and carry the app prefix', () => {
    const ids: string[] = [];
    for (const file of files.filter((f) => /messages\.ts$/.test(f))) {
      ids.push(
        ...[...fs.readFileSync(file, 'utf8').matchAll(/id: '([^']+)'/g)].map(
          (match) => match[1]
        )
      );
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !id.startsWith('Looks.'))).toEqual([]);
    expect([...ids].sort()).toEqual(deKeys);
  });

  it('have no empty message', () => {
    expect(
      deKeys.filter((id) => !(de as Record<string, string>)[id].trim())
    ).toEqual([]);
    expect(
      enKeys.filter((id) => !(en as Record<string, string>)[id].trim())
    ).toEqual([]);
  });
});

describe('no raw UI strings in JSX', () => {
  it('has no visible text literal or text attribute literal in components', () => {
    const offenders: string[] = [];
    for (const file of jsx) {
      const source = fs.readFileSync(file, 'utf8');
      source.split('\n').forEach((line, index) => {
        const attribute =
          /\b(aria-label|placeholder|title|label)="([^"{]+)"/.exec(line);
        const text = /<\w[^>]*>\s*([A-Za-zÄÖÜäöü][^<>{}]*)\s*<\//.exec(line);
        if (attribute || text) {
          offenders.push(
            `${path.relative(srcDir, file)}:${index + 1}: ${line.trim()}`
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
