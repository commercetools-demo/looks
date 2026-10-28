import type userEvent from '@testing-library/user-event';
import {
  screen,
  within,
} from '@commercetools-frontend/application-shell/test-utils';

type User = ReturnType<typeof userEvent.setup>;

const SHOW_ALL = /Alle Sprachen anzeigen|Show all languages/i;

/** The two localized fields of step 1, each a group named by its legend. */
export type LookTextField = 'name' | 'description';

const FIELD_LEGEND: Record<LookTextField, RegExp> = {
  name: /^(Name|Name\*)/,
  description: /^(Beschreibung|Description)/,
};

/** The field's group; the name field outside step 1 (the detail page) has no
 *  group, and is then the only localized field on the screen. */
const fieldGroup = (field: LookTextField) =>
  screen.queryByRole('group', { name: FIELD_LEGEND[field] }) ??
  (field === 'name' ? screen.getByRole('main') : screen.getByRole('group'));

/** Shows every language input of a localized field (it opens collapsed
 *  with only the data locale, unless an error already expanded it). */
export async function expandNameField(
  user: User,
  field: LookTextField = 'name'
) {
  const toggle = within(fieldGroup(field)).queryByRole('button', {
    name: SHOW_ALL,
  });
  if (toggle) await user.click(toggle);
}

/** The input of one language of a localized field, by its language label. */
export const nameInput = (locale: string, field: LookTextField = 'name') =>
  within(fieldGroup(field)).getByRole('textbox', {
    name: new RegExp(`^${locale}`, 'i'),
  });

/** Types a localized field for the given languages, expanding it first. */
export async function fillLookName(
  user: User,
  names: Record<string, string>,
  field: LookTextField = 'name'
) {
  await expandNameField(user, field);
  for (const [locale, text] of Object.entries(names)) {
    const input = await within(fieldGroup(field)).findByRole('textbox', {
      name: new RegExp(`^${locale}`, 'i'),
    });
    await user.clear(input);
    await user.type(input, text);
  }
}
