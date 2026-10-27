export interface ImageSize {
  width: number;
  height: number;
}

export type ImageLoader = (url: string) => Promise<ImageSize>;

/** The file's pixel size, read by loading it; rejects when it cannot be
 *  loaded or takes too long. */
export const measureImage: ImageLoader = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    const timer = setTimeout(() => reject(new Error('timeout')), 8000);
    image.onload = () => {
      clearTimeout(timer);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error('load'));
    };
    image.src = url;
  });
