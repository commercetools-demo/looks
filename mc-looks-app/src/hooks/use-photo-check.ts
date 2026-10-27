import { useCallback, useEffect, useRef, useState } from 'react';
import { measureImage, type ImageLoader } from '../domain/image-size';
import { isLookImagePath, lookImageUrl } from '../domain/look-value';
import type { LookImage } from '../domain/types';

export type PhotoStatus = 'empty' | 'invalid' | 'loading' | 'ready' | 'failed';

export type PhotoVerdict =
  | { ok: true; image?: LookImage }
  | { ok: false; reason: 'invalid' | 'failed' };

export interface PhotoCheck {
  status: PhotoStatus;
  /** The photo's URL while the path is valid and a shop origin is set. */
  url?: string;
  /** Path and pixel size once the photo loaded. */
  image?: LookImage;
  /** Resolves with the outcome for the current path, waiting for a load that
   *  is still running. An empty path is fine (a look without photo). */
  verify: () => Promise<PhotoVerdict>;
}

/**
 * Checks the look photo of step 1: the path must have the look-image form and
 * the file must load from the shop, which also yields its pixel size. Without
 * a shop origin the photo cannot be checked and is treated as absent.
 */
export function usePhotoCheck(
  rawPath: string,
  shopOrigin: string,
  load?: ImageLoader
): PhotoCheck {
  const path = rawPath.trim();
  const url =
    path && isLookImagePath(path) ? lookImageUrl(path, shopOrigin) : undefined;
  const [state, setState] = useState<{
    url: string;
    outcome: 'loading' | 'ready' | 'failed';
    image?: LookImage;
  }>();
  const pending = useRef<
    { url: string; promise: Promise<PhotoVerdict> } | undefined
  >(undefined);

  const start = useCallback(
    (target: string, targetPath: string): Promise<PhotoVerdict> => {
      if (pending.current?.url === target) return pending.current.promise;
      setState({ url: target, outcome: 'loading' });
      const promise = measureImage(target, load).then(
        (size): PhotoVerdict => {
          const image = { path: targetPath, ...size };
          setState((current) =>
            current?.url === target
              ? { url: target, outcome: 'ready', image }
              : current
          );
          return { ok: true, image };
        },
        (): PhotoVerdict => {
          // A later "Weiter" loads the file again instead of replaying the failure.
          if (pending.current?.url === target) pending.current = undefined;
          setState((current) =>
            current?.url === target
              ? { url: target, outcome: 'failed' }
              : current
          );
          return { ok: false, reason: 'failed' };
        }
      );
      pending.current = { url: target, promise };
      return promise;
    },
    [load]
  );

  useEffect(() => {
    if (url) void start(url, path);
  }, [url, path, start]);

  const verify = useCallback(async (): Promise<PhotoVerdict> => {
    if (!path) return { ok: true };
    if (!isLookImagePath(path)) return { ok: false, reason: 'invalid' };
    if (!url) return { ok: true }; // no shop origin: nothing to load
    return start(url, path);
  }, [path, url, start]);

  if (!path) return { status: 'empty', verify };
  if (!isLookImagePath(path)) return { status: 'invalid', verify };
  if (!url) return { status: 'empty', verify };
  const current = state?.url === url ? state : undefined;
  return {
    status: current?.outcome ?? 'loading',
    url,
    image: current?.outcome === 'ready' ? current.image : undefined,
    verify,
  };
}
