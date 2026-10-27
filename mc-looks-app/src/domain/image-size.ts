export interface ImageSize {
  width: number;
  height: number;
}

/** Loads an image and reports its natural pixel size; rejects when it cannot
 *  be loaded. */
export type ImageLoader = (url: string) => Promise<ImageSize>;

export const loadImageSize: ImageLoader = (url) =>
  new Promise<ImageSize>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () =>
      reject(new Error(`Image could not be loaded: ${url}`));
    image.src = url;
  });

/** The pixel size of the image at `url`; rejects for an image that does not
 *  load or reports no usable size. `load` is injectable for tests. */
export async function measureImage(
  url: string,
  load: ImageLoader = loadImageSize
): Promise<ImageSize> {
  const { width, height } = await load(url);
  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new Error(`Image has no usable size: ${url}`);
  }
  return { width, height };
}
