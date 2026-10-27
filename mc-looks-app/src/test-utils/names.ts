import type userEvent from '@testing-library/user-event';
import { screen } from '@commercetools-frontend/application-shell/test-utils';

type User = ReturnType<typeof userEvent.setup>;

const SHOW_ALL = /Alle Sprachen anzeigen|Show all languages/i;

/** Shows every language input of the look name field (it opens collapsed
 *  with only the data locale, unless an error already expanded it). */
export async function expandNameField(user: User) {
  const toggle = screen.queryByRole('button', { name: SHOW_ALL });
  if (toggle) await user.click(toggle);
}

/** The input of one language of the look name field, by its language label. */
export const nameInput = (locale: string) =>
  screen.getByRole('textbox', { name: new RegExp(`^${locale}`, 'i') });

/** Types the look name for the given languages, expanding the field first. */
export async function fillLookName(user: User, names: Record<string, string>) {
  await expandNameField(user);
  for (const [locale, text] of Object.entries(names)) {
    const input = await screen.findByRole('textbox', {
      name: new RegExp(`^${locale}`, 'i'),
    });
    await user.clear(input);
    await user.type(input, text);
  }
}
