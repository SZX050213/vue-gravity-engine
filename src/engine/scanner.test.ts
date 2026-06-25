import { describe, it, expect } from 'vitest';
import { GravityEngine } from './scanner.js';

describe('GravityEngine', () => {
  it('detects React hooks in .vue file', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('App.vue', '<script setup>\nconst [c, s] = useState(0)\n</script>');
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('api-no-react-hooks');
    expect(findings[0].line).toBe(2);
  });

  it('detects className in template', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('App.vue', '<template>\n  <div className="foo"></div>\n</template>');
    expect(findings.some(f => f.ruleId === 'template-no-classname')).toBe(true);
  });

  it('detects multiple issues in one file', () => {
    const engine = new GravityEngine();
    const code = '<template>\n<div className="foo"></div>\n</template>\n<script setup>\nconst x = useState(1)\n</script>';
    const findings = engine.scan('App.vue', code);
    const ruleIds = new Set(findings.map(f => f.ruleId));
    expect(ruleIds.has('template-no-classname')).toBe(true);
    expect(ruleIds.has('api-no-react-hooks')).toBe(true);
  });

  it('returns empty for clean Vue 3 code', () => {
    const engine = new GravityEngine();
    const code = '<template>\n<div class="foo"></div>\n</template>\n<script setup>\nimport { ref } from "vue"\nconst x = ref(1)\n</script>';
    const findings = engine.scan('App.vue', code);
    expect(findings).toHaveLength(0);
  });

  it('skips comment lines', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('App.vue', '// const [c, s] = useState(0)');
    expect(findings).toHaveLength(0);
  });

  it('skips matches inside strings', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('App.vue', 'const msg = "useState()"');
    expect(findings).toHaveLength(0);
  });

  it('respects filePatterns — className only in .vue', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('utils.ts', 'const cls = className="foo"');
    expect(findings.some(f => f.ruleId === 'template-no-classname')).toBe(false);
  });

  it('respects config overrides — disable a rule', () => {
    const engine = new GravityEngine({ rules: { 'api-no-react-hooks': { enabled: false } } });
    const findings = engine.scan('App.vue', 'const [c, s] = useState(0)');
    expect(findings.some(f => f.ruleId === 'api-no-react-hooks')).toBe(false);
  });

  it('respects config overrides — change severity', () => {
    const engine = new GravityEngine({ rules: { 'api-no-react-hooks': { severity: 'warning' } } });
    const findings = engine.scan('App.vue', '<script setup>\nconst [c, s] = useState(0)\n</script>');
    expect(findings[0].severity).toBe('warning');
  });

  it('reports correct line and column numbers', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('App.vue', '<script setup>\nline1\nline2\nconst x = useState(1)\n</script>');
    expect(findings[0].line).toBe(4);
    expect(findings[0].column).toBe(11);
  });

  it('scanFiles returns a ScanReport', () => {
    const engine = new GravityEngine();
    const report = engine.scanFiles([{ path: 'App.vue', content: '<template>\n<div className="x"></div>\n</template>' }]);
    expect(report.scannedFiles).toBe(1);
    expect(report.summary.errors).toBeGreaterThanOrEqual(1);
  });

  it('getRules returns only enabled rules', () => {
    const engine = new GravityEngine({ rules: { 'api-no-react-hooks': { enabled: false } } });
    const rules = engine.getRules();
    expect(rules.some(r => r.id === 'api-no-react-hooks')).toBe(false);
  });

  it('SFC block filtering — template rule only matches in template block', () => {
    const engine = new GravityEngine();
    // className outside <template> should not trigger
    const code = '<script setup>\nconst className = "foo"\n</script>';
    const findings = engine.scan('App.vue', code);
    expect(findings.some(f => f.ruleId === 'template-no-classname')).toBe(false);
  });

  it('SFC block filtering — style rule only matches in style block', () => {
    const engine = new GravityEngine();
    // /deep/ in <script> string should not trigger style rule
    const code = '<script setup>\nconst s = "/deep/ .foo"\n</script>';
    const findings = engine.scan('App.vue', code);
    expect(findings.some(f => f.ruleId === 'styles-no-deep-deprecated')).toBe(false);
  });

  it('SFC block filtering — script rule only matches in script block', () => {
    const engine = new GravityEngine();
    // useState in template text should not trigger script rule
    const code = '<template>\n<p>useState()</p>\n</template>';
    const findings = engine.scan('App.vue', code);
    expect(findings.some(f => f.ruleId === 'api-no-react-hooks')).toBe(false);
  });

  it('non-vue files do not use block filtering', () => {
    const engine = new GravityEngine();
    const findings = engine.scan('utils.ts', 'const [c, s] = useState(0)');
    expect(findings.some(f => f.ruleId === 'api-no-react-hooks')).toBe(true);
  });
});
