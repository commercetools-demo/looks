/** The Custom Object container every look definition lives in. */
export const LOOK_CONTAINER = 'look';

/** Prefix of the Custom Object key and of its same-key set-price Cart Discount. */
export const LOOK_KEY_PREFIX = 'look-';

/** A derived look key (slug part) is at most this long, suffix included. */
export const LOOK_KEY_MAX_LENGTH = 40;

/** Keys the user chooses: letters, digits, `-` and `_` only (shared key
 *  rule), and the whole key with its prefix at most 256 characters. */
export const LOOK_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const LOOK_KEY_MAX_CHOSEN_LENGTH = 256 - LOOK_KEY_PREFIX.length;

export const LOOK_MIN_PIECES = 2;
export const LOOK_MAX_PIECES = 5;

/** Page size of every GraphQL list read. */
export const PAGE = 500;

/** Largest stock quantity still shown as "nur noch N". */
export const LOW_STOCK_MAX = 3;
