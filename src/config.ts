import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GravityConfig } from './types.js';

const CONFIG_FILES = [
  'gravity.config.ts',
  'gravity.config.js',
  'gravity.config.mjs',
  '.gravityrc.json',
];

const DEFAULT_CONFIG: GravityConfig = {
  rules: {},
  ignore: [],
};

export async function loadConfig(projectRoot: string): Promise<GravityConfig> {
  for (const fileName of CONFIG_FILES) {
    const configPath = join(projectRoot, fileName);
    if (existsSync(configPath)) {
      try {
        const mod = await import(configPath);
        return { ...DEFAULT_CONFIG, ...mod.default };
      } catch (err) {
        console.warn(`[vue-gravity] Failed to load config ${fileName}:`, err);
      }
    }
  }

  // Try .gravityrc.json as JSON
  const jsonPath = join(projectRoot, '.gravityrc.json');
  if (existsSync(jsonPath)) {
    try {
      const { readFileSync } = await import('node:fs');
      const content = readFileSync(jsonPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (err) {
      console.warn('[vue-gravity] Failed to parse .gravityrc.json:', err);
    }
  }

  return { ...DEFAULT_CONFIG };
}
