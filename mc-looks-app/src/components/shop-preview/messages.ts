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
});
