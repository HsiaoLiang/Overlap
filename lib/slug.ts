import { customAlphabet } from "nanoid";

// No lookalikes (0/o, 1/l/i) so links are easy to read out or type.
// 31 characters ^ 6 = ~887 million possible links: unguessable enough for us.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export const generateSlug = customAlphabet(ALPHABET, 6);

export function isValidSlug(value: string) {
  return /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(value);
}
