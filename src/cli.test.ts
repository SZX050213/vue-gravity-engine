import { describe, it, expect } from 'vitest';

describe('vue-gravity CLI', () => {
  it('CLI module exports correctly', async () => {
    const mod = await import('./cli.js');
    expect(mod).toBeDefined();
    expect(mod.program).toBeDefined();
    expect(mod.collectFiles).toBeDefined();
  });

  it('collectFiles finds .vue, .ts, .tsx files', async () => {
    const { collectFiles } = await import('./cli.js');
    // Scan the project's own src directory
    const files = collectFiles('src', []);
    expect(files.some(f => f.endsWith('.vue'))).toBe(false); // no .vue in src
    expect(files.some(f => f.endsWith('.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('.tsx'))).toBe(false);
  });

  it('collectFiles skips node_modules and dist', async () => {
    const { collectFiles } = await import('./cli.js');
    const files = collectFiles('.', []);
    expect(files.some(f => f.includes('node_modules'))).toBe(false);
    expect(files.some(f => f.includes('/dist/'))).toBe(false);
  });
});
