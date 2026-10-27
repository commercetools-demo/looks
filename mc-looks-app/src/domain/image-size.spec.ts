import { loadImageSize, measureImage } from './image-size';

describe('measureImage', () => {
  it('returns the size the loader reports', async () => {
    const load = jest.fn().mockResolvedValue({ width: 800, height: 1200 });
    await expect(measureImage('https://shop/x.webp', load)).resolves.toEqual({
      width: 800,
      height: 1200,
    });
    expect(load).toHaveBeenCalledWith('https://shop/x.webp');
  });

  it('rejects when the loader fails', async () => {
    const load = jest.fn().mockRejectedValue(new Error('404'));
    await expect(measureImage('u', load)).rejects.toThrow('404');
  });

  it.each([
    { width: 0, height: 10 },
    { width: 10, height: 0 },
    { width: 1.5, height: 10 },
    { width: Number.NaN, height: 10 },
  ])('rejects an unusable size %j', async (size) => {
    await expect(measureImage('u', async () => size)).rejects.toThrow(
      'no usable size'
    );
  });
});

describe('loadImageSize', () => {
  const original = global.Image;
  afterEach(() => {
    global.Image = original;
  });

  function stubImage(outcome: 'load' | 'error') {
    class FakeImage {
      naturalWidth = 400;
      naturalHeight = 600;
      onload?: () => void;
      onerror?: () => void;
      set src(_value: string) {
        setTimeout(() =>
          outcome === 'load' ? this.onload?.() : this.onerror?.()
        );
      }
    }
    global.Image = FakeImage as unknown as typeof Image;
  }

  it('resolves with the natural size once the image loaded', async () => {
    stubImage('load');
    await expect(loadImageSize('u')).resolves.toEqual({
      width: 400,
      height: 600,
    });
  });

  it('rejects when the image fails to load', async () => {
    stubImage('error');
    await expect(loadImageSize('u')).rejects.toThrow('could not be loaded');
  });
});
