import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  title: { id: 'Looks.preview.title', defaultMessage: 'Shop-Vorschau' },
  caption: {
    id: 'Looks.preview.caption',
    defaultMessage: 'So erscheint der Look im Shop',
  },
  placeholder: {
    id: 'Looks.preview.placeholder',
    defaultMessage:
      'Sobald ein Teil gewählt ist, erscheint hier der Look wie im Shop.',
  },
  region: {
    id: 'Looks.preview.region',
    defaultMessage: 'Look-Karte der Vorschau',
  },
  photoAlt: { id: 'Looks.preview.photoAlt', defaultMessage: 'Look-Foto' },
  setPrice: { id: 'Looks.preview.setPrice', defaultMessage: 'Set zu {price}' },
  setPending: {
    id: 'Looks.preview.setPending',
    defaultMessage: 'Setpreis folgt',
  },
  sumLabel: {
    id: 'Looks.preview.sumLabel',
    defaultMessage: 'Einzelpreise zusammen',
  },
  saving: { id: 'Looks.preview.saving', defaultMessage: 'Du sparst {amount}' },
  addSet: {
    id: 'Looks.preview.addSet',
    defaultMessage: 'Set in den Warenkorb',
  },
  soldOut: { id: 'Looks.preview.soldOut', defaultMessage: 'ausverkauft' },
  lowStock: {
    id: 'Looks.preview.lowStock',
    defaultMessage: 'nur noch {count}',
  },
});
