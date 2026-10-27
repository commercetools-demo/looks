import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import { createFakeLookApi } from '../test-utils/fake-look-api';
import { LookProvider } from './context';
import { useLookDetail } from './use-look-detail';

jest.mock('@apollo/client', () => ({ useApolloClient: () => ({}) }));
jest.mock('@commercetools-frontend/application-shell-connectors', () => ({
  useApplicationContext: () => 'de',
}));
jest.mock('@commercetools-frontend/permissions', () => ({
  useIsAuthorized: () => true,
}));

const pieces = [buildPiece('p1'), buildPiece('p2')];

function setup(fake: ReturnType<typeof createFakeLookApi>, lookKey = 'a') {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(LookProvider, {
      api: fake.api,
      currencies: CURRENCIES,
      children,
    });
  return renderHook(() => useLookDetail(lookKey), { wrapper });
}

describe('useLookDetail', () => {
  it('loads object, discount and pieces into one row', async () => {
    const fake = createFakeLookApi({
      objects: [buildObject('a', ['p1', 'p2'])],
      discounts: [buildDiscount('a', ['p1', 'p2'])],
      pieces,
    });
    const { result } = setup(fake);
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const state = result.current.state;
    if (state.status !== 'ready') throw new Error('not ready');
    expect(state.row.completeness).toBe('complete');
    expect(state.row.pieces.map((p) => p?.id)).toEqual(['p1', 'p2']);
  });

  it('reports not found when neither object nor discount exists', async () => {
    const { result } = setup(createFakeLookApi());
    await waitFor(() => expect(result.current.state.status).toBe('not-found'));
  });

  it('reports a half look as ready', async () => {
    const fake = createFakeLookApi({
      discounts: [buildDiscount('a', ['p1', 'p2'])],
      pieces,
    });
    const { result } = setup(fake);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const state = result.current.state;
    expect(state.status === 'ready' && state.row.completeness).toBe(
      'missing-object'
    );
  });

  it('reports an error and recovers on reload', async () => {
    const fake = createFakeLookApi({
      objects: [buildObject('a', ['p1', 'p2'])],
      pieces,
    });
    fake.failNext('getLookObject', new Error('boom'));
    const { result } = setup(fake);
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('applies a written discount without reading again', async () => {
    const fake = createFakeLookApi({
      objects: [buildObject('a', ['p1', 'p2'])],
      discounts: [buildDiscount('a', ['p1', 'p2'])],
      pieces,
    });
    const { result } = setup(fake);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const reads = fake.calls.length;
    const state = result.current.state;
    if (state.status !== 'ready' || !state.row.discount)
      throw new Error('not ready');
    act(() =>
      result.current.apply({ ...state.row.discount!, isActive: false })
    );
    const next = result.current.state;
    expect(next.status === 'ready' && next.row.isActive).toBe(false);
    expect(fake.calls.length).toBe(reads);
  });
});
