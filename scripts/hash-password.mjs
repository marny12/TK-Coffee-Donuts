import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = createInterface({ input, output });
const password = await rl.question('Password to hash (input is visible; use a private terminal): ');
rl.close();
if (!password) throw new Error('Password cannot be empty');
const salt = randomBytes(16).toString('base64url');
const hash = scryptSync(password, salt, 64).toString('base64url');
console.log(`scrypt:${salt}:${hash}`);
