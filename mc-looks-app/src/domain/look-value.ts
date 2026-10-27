import type { LookImage, LookValue } from './types';

export const LOOK_IMAGE_PATH = /^looks\/[A-Za-z0-9._-]+\.(webp|jpg|png)$/;

export function isLookImagePath(path: string): boolean {
  return LOOK_IMAGE_PATH.test(path);
}

/**
 * The Custom Object value of a look. `image` and `endedAt` are left out when
 * absent so values stay minimal.
 */
export function buildLookValue(look: {
  componentProductIds: string[];
  setPrice: Record<string, number>;
  image?: LookImage;
  endedAt?: string;
}): LookValue {
  return {
    componentProductIds: [...look.componentProductIds],
    setPrice: { ...look.setPrice },
    ...(look.image
      ? {
          image: {
            path: look.image.path,
            width: look.image.width,
            height: look.image.height,
          },
        }
      : {}),
    ...(look.endedAt ? { endedAt: look.endedAt } : {}),
  };
}

/** The photo's URL: the stored path is relative to the shop origin. Without
 *  a shop origin there is no URL. */
export function lookImageUrl(
  path: string,
  shopOrigin: string
): string | undefined {
  return shopOrigin ? `${shopOrigin}/${path}` : undefined;
}
