import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(import.meta.dirname ?? '', '..');
const JOURNAL_PATH = join(MIGRATIONS_DIR, 'meta', '_journal.json');

describe('migration journal', () => {
  it('registers every SQL migration for runtime db:migrate execution', () => {
    const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as {
      entries?: Array<{ idx?: number; tag?: string }>;
    };
    const migrationTags = readdirSync(MIGRATIONS_DIR)
      .filter((entry) => entry.endsWith('.sql'))
      .map((entry) => entry.replace(/\.sql$/, ''))
      .sort();
    const journalTags = (journal.entries ?? [])
      .flatMap((entry) => (entry.tag ? [entry.tag] : []))
      .sort();

    expect(journalTags).toEqual(migrationTags);
    expect((journal.entries ?? []).map((entry) => entry.idx)).toEqual(
      Array.from({ length: migrationTags.length }, (_, index) => index),
    );
  });
});
