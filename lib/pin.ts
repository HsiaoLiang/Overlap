import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/*
 * PINs are hashed with scrypt (built into Node, no extra package) and a random
 * salt. Stored format: "scrypt$<salt hex>$<hash hex>".
 *
 * A 4-digit PIN only has 10,000 options, so hashing alone doesn't make it
 * strong — the real protection is the attempt limit in lib/participants.ts.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected); // constant-time comparison
}
