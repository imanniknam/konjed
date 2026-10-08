import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number }) => Promise<Buffer>;
const N = 16384;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N });
  return `s1$${salt.toString("base64")}$${key.toString("base64")}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [v, s, k] = stored.split("$");
  if (v !== "s1") return false;
  const key = await scrypt(pw, Buffer.from(s, "base64"), 64, { N });
  const expected = Buffer.from(k, "base64");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
