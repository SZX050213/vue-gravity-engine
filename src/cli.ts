#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GravityEngine } from './engine/scanner.js';
import { formatTerminalReport, formatJsonReport } from './engine/reporter.js';
import { loadConfig } from './config.js';
import { generateSkillsMarkdown } from './skills-generator.js';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('vue-gravity')
  .description('Vue code hallucination detector — catches AI-generated anti-patterns')
  .version(pkg.version);

program
  .command('check')
  .description('Scan project for AI hallucination patterns')
  .option('-r, --report', 'Generate report file')
  .option('-d, --dir <path>', 'Scan specific directory')
  .option('--format <type>', 'Report format: json | html', 'json')
  .option('--ci', 'CI mode: exit code 1 on errors')
  .action(async (options) => {
    const projectRoot = resolve(options.dir || process.cwd());
    const config = await loadConfig(projectRoot);
    const engine = new GravityEngine(config);

    const files = collectFiles(projectRoot, config.ignore || []);
    const report = engine.scanFiles(
      files.map(f => ({ path: relative(projectRoot, f), content: readFileSync(f, 'utf-8') }))
    );

    console.log(formatTerminalReport(report));

    if (options.report) {
      const reportPath = join(projectRoot, `gravity-report.${options.format}`);
      writeFileSync(reportPath, formatJsonReport(report), 'utf-8');
      console.log(pc.dim(`\n  Report saved to ${reportPath}`));
    }

    if (options.ci && report.summary.errors > 0) {
      console.log(pc.red(`\n  CI: ${report.summary.errors} errors found`));
      process.exit(1);
    }

    process.exit(report.summary.errors > 0 ? 1 : 0);
  });

program
  .command('generate-skills')
  .description('Generate skills markdown document for AI tools')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    const config = await loadConfig(process.cwd());
    const markdown = generateSkillsMarkdown(config);

    if (options.output) {
      writeFileSync(options.output, markdown, 'utf-8');
      console.log(pc.green(`  Skills document saved to ${options.output}`));
    } else {
      console.log(markdown);
    }
  });

function collectFiles(dir: string, ignore: string[]): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
      if (ignore.some(pattern => fullPath.includes(pattern))) continue;
      files.push(...collectFiles(fullPath, ignore));
    } else if (entry.endsWith('.vue') || entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

if (process.argv[1] && (process.argv[1] === __filename || process.argv[1].endsWith('cli.ts'))) {
  program.parse();
}

export { program, collectFiles };
