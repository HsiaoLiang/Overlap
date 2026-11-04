import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";

/*
 * Organiser ("host") identity without accounts.
 *
 * createEvent makes a long random token and gives it to the organiser's
 * browser; the database keeps only a SHA-256 hash. A fast hash is fine here
 * (unlike 4-digit PINs, which use slow scrypt): 32 random characters are
 * ~190 bits, far too many to guess, so there's nothing to slow down.
 */

function hashToken(token: string) {
  return createHash("sha256").update(token).digest();
}

/** A new organiser token and the hash to store. */
export function createHostToken() {
  const token = nanoid(32);
  return { token, hash: hashToken(token).toString("hex") };
}

/** Does `token` match the stored hash? Constant-time, so timing reveals nothing. */
export function isHostToken(token: string | undefined, storedHash: string | null) {
  if (!token || !storedHash) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = hashToken(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
