import { describe, it, expect } from 'vitest';
import { formatTerminalReport, formatJsonReport } from './reporter.js';
import type { ScanReport } from '../types.js';

const mockReport: ScanReport = {
  timestamp: '2024-01-01T00:00:00.000Z',
  scannedFiles: 3,
  duration: '0.5s',
  summary: { errors: 1, warnings: 1, infos: 1 },
  findings: [
    {
      ruleId: 'api-no-react-hooks',
      severity: 'error',
      file: 'App.vue',
      line: 5,
      column: 10,
      message: 'React hooks detected',
      suggestion: 'Use ref() instead',
      fixable: true,
      matchedText: 'useState(',
    },
    {
      ruleId: 'template-vfor-key',
      severity: 'warning',
      file: 'List.vue',
      line: 3,
      column: 1,
      message: 'Missing :key',
      suggestion: 'Add :key',
      fixable: true,
      matchedText: 'v-for="item in list"',
    },
    {
      ruleId: 'template-event-casing',
      severity: 'info',
      file: 'Btn.vue',
      line: 1,
      column: 1,
      message: 'Use kebab-case events',
      suggestion: '@myEvent → @my-event',
      fixable: true,
      matchedText: '@myEvent',
    },
  ],
};

describe('formatTerminalReport', () => {
  it('shows summary stats', () => {
    const output = formatTerminalReport(mockReport);
    expect(output).toContain('3 files');
    expect(output).toContain('0.5s');
  });

  it('groups findings by severity', () => {
    const output = formatTerminalReport(mockReport);
    expect(output).toContain('Errors (1)');
    expect(output).toContain('Warnings (1)');
    expect(output).toContain('Info (1)');
  });

  it('includes file locations', () => {
    const output = formatTerminalReport(mockReport);
    expect(output).toContain('App.vue:5:10');
    expect(output).toContain('List.vue:3:1');
  });

  it('includes suggestions', () => {
    const output = formatTerminalReport(mockReport);
    expect(output).toContain('Use ref() instead');
    expect(output).toContain('Add :key');
  });

  it('shows success message for clean report', () => {
    const clean: ScanReport = {
      timestamp: '2024-01-01T00:00:00.000Z',
      scannedFiles: 5,
      duration: '0.1s',
      summary: { errors: 0, warnings: 0, infos: 0 },
      findings: [],
    };
    const output = formatTerminalReport(clean);
    expect(output).toContain('No issues found');
  });
});

describe('formatJsonReport', () => {
  it('returns valid JSON', () => {
    const json = formatJsonReport(mockReport);
    const parsed = JSON.parse(json);
    expect(parsed.scannedFiles).toBe(3);
    expect(parsed.findings).toHaveLength(3);
  });

  it('preserves all fields', () => {
    const json = formatJsonReport(mockReport);
    const parsed = JSON.parse(json);
    expect(parsed.findings[0].ruleId).toBe('api-no-react-hooks');
    expect(parsed.findings[0].line).toBe(5);
  });
});
