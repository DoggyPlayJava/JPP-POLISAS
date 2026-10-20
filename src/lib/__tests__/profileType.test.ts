import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Profile Type & Migration Integrity', () => {
  it('has migration file 100_add_preferred_language_to_profiles.sql with correct check constraint', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/100_add_preferred_language_to_profiles.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('preferred_language VARCHAR(5)');
    expect(content).toContain("CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'ms'))");
  });

  it('defines preferred_language on Profile interface in src/lib/supabase.ts', () => {
    const supabasePath = path.resolve(process.cwd(), 'src/lib/supabase.ts');
    const content = fs.readFileSync(supabasePath, 'utf8');
    expect(content).toMatch(/preferred_language\?:\s*['"]en['"]\s*\|\s*['"]ms['"]\s*\|\s*null;/);
  });
});
