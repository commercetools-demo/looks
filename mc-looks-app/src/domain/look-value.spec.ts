import fs from 'fs';
import path from 'path';
import { buildLookValue, isLookImagePath, lookImageUrl } from './look-value';

const schema = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../specs/001-looks-app/contracts/look-value.schema.json'
    ),
    'utf8'
  )
);

describe('look value', () => {
  it('only produces properties the contract schema allows, and all required ones', () => {
    const value = buildLookValue({
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 100 },
      image: { path: 'looks/x.webp', width: 10, height: 15 },
      endedAt: '2026-10-06T10:00:00.000Z',
    });
    for (const key of Object.keys(value))
      expect(Object.keys(schema.properties)).toContain(key);
    for (const key of schema.required) expect(value).toHaveProperty(key);
    expect(Object.keys(schema.properties.image.properties)).toEqual(
      expect.arrayContaining(Object.keys(value.image!))
    );
  });

  it('leaves image and endedAt out when absent', () => {
    expect(
      buildLookValue({ componentProductIds: ['a', 'b'], setPrice: { EUR: 1 } })
    ).toEqual({
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 1 },
    });
  });

  it('accepts only relative photo paths of the allowed form', () => {
    expect(isLookImagePath('looks/cozy-in-grey.webp')).toBe(true);
    expect(isLookImagePath('looks/a.b_c-d.PNG')).toBe(false);
    expect(isLookImagePath('looks/x.jpg')).toBe(true);
    expect(isLookImagePath('looks/../secret.png')).toBe(false);
    expect(isLookImagePath('https://evil.com/x.png')).toBe(false);
    expect(isLookImagePath('looks/x.gif')).toBe(false);
  });

  it('resolves the photo against the shop origin', () => {
    expect(lookImageUrl('looks/x.webp', 'https://shop.example.com')).toBe(
      'https://shop.example.com/looks/x.webp'
    );
    expect(lookImageUrl('looks/x.webp', '')).toBeUndefined();
  });
});
