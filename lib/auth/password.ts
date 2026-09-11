import { timingSafeEqual, randomBytes, scryptSync } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SALT_LENGTH_BYTES = 16;

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");

  if (!salt || !expected || !/^[0-9a-f]{32}$/i.test(salt) || !/^[0-9a-f]{128}$/i.test(expected)) {
    return false;
  }

  const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actual.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actual, expectedBuffer);
}
