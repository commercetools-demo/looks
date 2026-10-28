import { createFakeLookApi } from '../test-utils/fake-look-api';
import { buildDiscount, buildObject, buildPiece } from '../test-utils/fixtures';
import { renderLooks, screen } from '../test-utils';

const setup = () =>
  createFakeLookApi({
    pieces: [buildPiece('a'), buildPiece('b')],
    objects: [buildObject('live', ['a', 'b']), buildObject('past', ['a', 'b'])],
    discounts: [
      buildDiscount('live', ['a', 'b'], { name: { de: 'Look-Set: Live' } }),
      buildDiscount('past', ['a', 'b'], {
        isActive: false,
        name: { de: 'Look-Set: Vorbei' },
      }),
    ],
  });

const writeCalls = (fake: ReturnType<typeof setup>) =>
  ['createCartDiscount', 'updateCartDiscount', 'writeLookObject'].flatMap(
    (method) => fake.callsTo(method)
  );

describe('read-only access (US7): controls are disabled, never hidden', () => {
  it('list and past looks: every write control is present and disabled', async () => {
    const fake = setup();
    renderLooks({ api: fake.api, canManage: false });

    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(screen.getAllByText('Nur Lesezugriff').length).toBeGreaterThan(0);

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    switches.forEach((control) => expect(control).toBeDisabled());

    const reactivate = await screen.findByRole('button', {
      name: /wieder aktivieren/i,
    });
    expect(reactivate).toBeDisabled();
    expect(writeCalls(fake)).toHaveLength(0);
  });

  it('detail: switch and set price inputs are present and disabled', async () => {
    const fake = setup();
    renderLooks({ api: fake.api, canManage: false, path: '/live' });

    expect(
      await screen.findByRole('switch', { name: /Live aktiv/ })
    ).toBeDisabled();
    expect(screen.getAllByText('Nur Lesezugriff').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Setpreis speichern' })
    ).toBeDisabled();
    expect(writeCalls(fake)).toHaveLength(0);
  });

  it('a user with Manage gets the same controls enabled', async () => {
    const fake = setup();
    renderLooks({ api: fake.api, canManage: true, path: '/live' });

    expect(
      await screen.findByRole('switch', { name: /Live aktiv/ })
    ).toBeEnabled();
    expect(screen.queryByText('Nur Lesezugriff')).not.toBeInTheDocument();
  });
});
