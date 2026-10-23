import { createSeedState } from '@/data/seed';
import type { AppState } from '@/lib/types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Env-driven data layer.
 * - DATABASE_URL set: Postgres (Neon in production), one JSONB state document in tk_app_state.
 * - DATABASE_URL omitted: local JSON file under .data/ for development and build verification.
 * The API surface is the same either way; DB provisioning is the deployment last mile.
 */

const STATE_KEY = 'primary';
let pgPool: import('pg').Pool | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

function localFile(): string {
  return process.env.TK_STORE_FILE || path.join(process.cwd(), '.data', 'tk-store.json');
}

async function loadFromFile(): Promise<AppState> {
  const file = localFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as AppState;
  } catch {
    const seed = createSeedState();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function saveToFile(state: AppState): Promise<void> {
  const file = localFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, file);
}

async function getPool(): Promise<import('pg').Pool> {
  if (pgPool) return pgPool;
  const { Pool } = await import('pg');
  const url = process.env.DATABASE_URL!;
  const local = /localhost|127\.0\.0\.1/.test(url);
  pgPool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await pgPool.query('CREATE TABLE IF NOT EXISTS tk_app_state (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  return pgPool;
}

async function loadFromDatabase(): Promise<AppState> {
  const pool = await getPool();
  const result = await pool.query('SELECT value FROM tk_app_state WHERE key = $1', [STATE_KEY]);
  if (result.rows[0]?.value) return result.rows[0].value as AppState;
  const seed = createSeedState();
  await saveToDatabase(seed);
  return seed;
}

async function saveToDatabase(state: AppState): Promise<void> {
  const pool = await getPool();
  await pool.query(
    'INSERT INTO tk_app_state (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()',
    [STATE_KEY, JSON.stringify(state)],
  );
}

export async function getState(): Promise<AppState> {
  const state = process.env.DATABASE_URL ? await loadFromDatabase() : await loadFromFile();
  return structuredClone(state);
}

async function saveState(state: AppState): Promise<void> {
  if (process.env.DATABASE_URL) await saveToDatabase(state);
  else await saveToFile(state);
}

export async function updateState<T>(mutator: (state: AppState) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const state = process.env.DATABASE_URL ? await loadFromDatabase() : await loadFromFile();
    const result = await mutator(state);
    await saveState(state);
    return result;
  };
  const result = writeChain.then(run, run);
  writeChain = result.catch(() => undefined);
  return result;
}
