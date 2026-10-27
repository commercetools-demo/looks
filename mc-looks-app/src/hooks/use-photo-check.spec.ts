import { act, renderHook, waitFor } from '@testing-library/react';
import { usePhotoCheck } from './use-photo-check';

const ORIGIN = 'https://shop.example.com';

describe('usePhotoCheck', () => {
  it('treats an empty path as valid without loading anything', async () => {
    const load = jest.fn();
    const { result } = renderHook(() => usePhotoCheck('  ', ORIGIN, load));
    expect(result.current.status).toBe('empty');
    await expect(result.current.verify()).resolves.toEqual({ ok: true });
    expect(load).not.toHaveBeenCalled();
  });

  it('refuses an invalid path without loading', async () => {
    const load = jest.fn();
    const { result } = renderHook(() =>
      usePhotoCheck('photo.gif', ORIGIN, load)
    );
    expect(result.current.status).toBe('invalid');
    await expect(result.current.verify()).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('loads a valid path from the shop and reports path and size', async () => {
    const load = jest.fn().mockResolvedValue({ width: 800, height: 1200 });
    const { result } = renderHook(() =>
      usePhotoCheck('looks/jacket.webp', ORIGIN, load)
    );
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(load).toHaveBeenCalledWith(`${ORIGIN}/looks/jacket.webp`);
    expect(result.current.url).toBe(`${ORIGIN}/looks/jacket.webp`);
    expect(result.current.image).toEqual({
      path: 'looks/jacket.webp',
      width: 800,
      height: 1200,
    });
    await expect(result.current.verify()).resolves.toEqual({
      ok: true,
      image: { path: 'looks/jacket.webp', width: 800, height: 1200 },
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('fails for a photo that cannot be loaded, and loads again on the next verify', async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValue({ width: 10, height: 15 });
    const { result } = renderHook(() =>
      usePhotoCheck('looks/gone.png', ORIGIN, load)
    );
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.image).toBeUndefined();
    let verdict;
    await act(async () => {
      verdict = await result.current.verify();
    });
    expect(verdict).toMatchObject({ ok: true });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('waits for a running load when verifying', async () => {
    let finish: (size: { width: number; height: number }) => void = () =>
      undefined;
    const load = jest.fn(
      () =>
        new Promise<{ width: number; height: number }>(
          (resolve) => (finish = resolve)
        )
    );
    const { result } = renderHook(() =>
      usePhotoCheck('looks/slow.jpg', ORIGIN, load)
    );
    let verdict: Promise<unknown> = Promise.resolve();
    act(() => {
      verdict = result.current.verify();
    });
    await act(async () => {
      finish({ width: 4, height: 6 });
      await verdict;
    });
    await expect(verdict).resolves.toMatchObject({ ok: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('cannot check anything without a shop origin and treats the photo as absent', async () => {
    const load = jest.fn();
    const { result } = renderHook(() =>
      usePhotoCheck('looks/a.webp', '', load)
    );
    expect(result.current.status).toBe('empty');
    await expect(result.current.verify()).resolves.toEqual({ ok: true });
    expect(load).not.toHaveBeenCalled();
  });
});
