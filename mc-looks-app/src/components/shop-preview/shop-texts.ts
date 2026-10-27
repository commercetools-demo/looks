/**
 * Every text inside the shop preview card. The card shows what the German
 * shopper sees, whatever language the Merchant Center user's profile has, so
 * these are constants and deliberately not part of the app's message files.
 * Only the caption above the card follows the UI language.
 */
export const shopTexts = {
  setPrice: (price: string) => `Set zu ${price}`,
  setPending: 'Setpreis folgt',
  sumLabel: 'Einzelpreise zusammen',
  addSet: 'Set in den Warenkorb',
  oneSize: 'Einheitsgröße',
  soldOut: 'ausverkauft',
  lowStock: (count: number) => `nur noch ${count}`,
  saving: (amount: string) => `Du sparst ${amount}`,
} as const;

/** Locale the prices in the card are formatted for. */
export const SHOP_LOCALE = 'de-DE';
