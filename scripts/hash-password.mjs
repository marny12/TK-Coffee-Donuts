import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Usage: node scripts/hash-password.mjs [password]
// With no argument it prompts interactively. The printed value goes into
// SITE_ACCESS_PASSWORD_HASH or ADMIN_PASSWORD_HASH — never commit it with a real password.
let password = process.argv.slice(2).join(' ');
if (!password) {
  const rl = createInterface({ input, output });
  password = await rl.question('Password to hash (input is visible; use a private terminal): ');
  rl.close();
}
if (!password) throw new Error('Password cannot be empty');
const salt = randomBytes(16).toString('base64url');
const hash = scryptSync(password, salt, 64).toString('base64url');
console.log(`scrypt:${salt}:${hash}`);
