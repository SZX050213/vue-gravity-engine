import type { GravityRule, Finding, GravityConfig, ScanReport } from '../types.js';
import { defaultRules } from '../rules.js';
import { minimatch } from 'minimatch';

export class GravityEngine {
  private rules: GravityRule[];

  constructor(config?: GravityConfig) {
    this.rules = defaultRules.map(r => ({ ...r }));

    if (config?.rules) {
      for (const rule of this.rules) {
        const override = config.rules[rule.id];
        if (override) {
          if (override.enabled !== undefined) rule.enabled = override.enabled;
          if (override.severity !== undefined) rule.severity = override.severity;
        }
      }
    }
  }

  scan(filePath: string, code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');
    const isVue = filePath.endsWith('.vue');
    const blockMap = isVue ? buildBlockMap(lines) : null;

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!rule.filePatterns.some(p => minimatch(filePath, p))) continue;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (isCommentLine(line)) continue;

        // SFC block filtering: skip lines outside the rule's target block
        if (blockMap && rule.block) {
          const block = blockMap[lineIndex];
          if (block !== rule.block) continue;
        }

        for (const pattern of rule.patterns) {
          const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
          let match: RegExpExecArray | null;

          while ((match = regex.exec(line)) !== null) {
            if (isInsideString(line, match.index)) continue;

            findings.push({
              ruleId: rule.id,
              severity: rule.severity,
              file: filePath,
              line: lineIndex + 1,
              column: match.index + 1,
              message: rule.message,
              suggestion: rule.suggestion,
              docsUrl: rule.docsUrl,
              fixable: true,
              matchedText: match[0],
            });

            if (match[0].length === 0) break;
          }
        }
      }
    }

    return deduplicate(findings);
  }

  scanFiles(files: Array<{ path: string; content: string }>): ScanReport {
    const start = Date.now();
    const allFindings: Finding[] = [];

    for (const file of files) {
      allFindings.push(...this.scan(file.path, file.content));
    }

    return {
      timestamp: new Date().toISOString(),
      scannedFiles: files.length,
      duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
      summary: {
        errors: allFindings.filter(f => f.severity === 'error').length,
        warnings: allFindings.filter(f => f.severity === 'warning').length,
        infos: allFindings.filter(f => f.severity === 'info').length,
      },
      findings: allFindings,
    };
  }

  getRules(): GravityRule[] {
    return this.rules.filter(r => r.enabled);
  }
}

type BlockType = 'template' | 'script' | 'style';

function buildBlockMap(lines: string[]): (BlockType | null)[] {
  const map: (BlockType | null)[] = new Array(lines.length).fill(null);
  let current: BlockType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (current === null) {
      const open = line.match(/^\s*<(template|script|style)\b/);
      if (open) {
        current = open[1] as BlockType;
        map[i] = current;
        // single-line block: <script>...</script> on same line
        if (line.includes(`</${current}>`)) current = null;
      }
    } else {
      map[i] = current;
      if (line.includes(`</${current}>`)) {
        current = null;
      }
    }
  }

  return map;
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('<!--');
}

function isInsideString(line: string, index: number): boolean {
  let inSingle = false, inDouble = false, inTemplate = false;
  for (let i = 0; i < index; i++) {
    const ch = line[i];
    if (i > 0 && line[i - 1] === '\\') continue; // skip escaped chars
    if (ch === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    if (ch === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    if (ch === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
  }
  return inSingle || inDouble || inTemplate;
}

function deduplicate(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter(f => {
    const key = `${f.ruleId}:${f.file}:${f.line}:${f.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
