// scripts/generateTestReport.mjs
// Reads test-results/results.json + coverage-summary.json and produces
// test-results/report.html — a shareable, self-contained HTML report.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RESULTS_PATH  = join(ROOT, 'test-results', 'results.json');
const COVERAGE_PATH = join(ROOT, 'coverage', 'coverage-summary.json');
const OUT_DIR       = join(ROOT, 'test-results');
const OUT_PATH      = join(OUT_DIR, 'report.html');

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(n) {
  return typeof n === 'number' ? n.toFixed(1) + '%' : 'N/A';
}

function statusClass(state) {
  if (state === 'pass' || state === 'passed') return 'pass';
  if (state === 'fail' || state === 'failed') return 'fail';
  return 'skip';
}

function statusLabel(state) {
  if (state === 'pass' || state === 'passed') return 'PASS';
  if (state === 'fail' || state === 'failed') return 'FAIL';
  return 'SKIP';
}

// ── read inputs ───────────────────────────────────────────────────────────────

if (!existsSync(RESULTS_PATH)) {
  console.error('ERROR: test-results/results.json not found. Run: npm test first.');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));

// Vitest JSON format
const suites   = raw.testResults || raw.testSuites || [];
const numPass  = raw.numPassedTests  ?? 0;
const numFail  = raw.numFailedTests  ?? 0;
const numSkip  = raw.numPendingTests ?? raw.numSkippedTests ?? 0;
const numTotal = raw.numTotalTests   ?? (numPass + numFail + numSkip);
const duration = typeof raw.startTime === 'number' && typeof raw.endTime === 'number'
  ? ((raw.endTime - raw.startTime) / 1000).toFixed(2) + 's'
  : raw.duration
    ? (raw.duration / 1000).toFixed(2) + 's'
    : 'N/A';

// ── coverage ──────────────────────────────────────────────────────────────────

let coverage = null;
if (existsSync(COVERAGE_PATH)) {
  const cov = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
  const total = cov.total || {};
  coverage = {
    statements: total.statements?.pct ?? null,
    branches:   total.branches?.pct   ?? null,
    functions:  total.functions?.pct  ?? null,
    lines:      total.lines?.pct      ?? null,
  };
}

// ── build test table rows ─────────────────────────────────────────────────────

function buildRows(suites) {
  const rows = [];
  for (const suite of suites) {
    const file = (suite.testFilePath || suite.filepath || suite.name || '')
      .replace(/.*[\\/]src[\\/]__tests__[\\/]/, '')
      .replace(/.*[\\/]src[\\/]/, '');
    // Collect individual tests
    const tests = collectTests(suite);
    for (const t of tests) {
      rows.push({ file, ...t });
    }
  }
  return rows;
}

function collectTests(suite, prefix = '') {
  const tests = [];
  // Vitest JSON: assertionResults / testResults inside suites
  const assertions = suite.assertionResults || suite.tests || [];
  for (const a of assertions) {
    const name = prefix ? prefix + ' > ' + a.fullName || a.title : a.fullName || a.title || a.name || '';
    tests.push({
      name,
      state:    a.state || a.status || 'unknown',
      duration: typeof a.duration === 'number' ? a.duration.toFixed(0) + 'ms' : '',
      error:    a.failureMessages?.join('\n') || a.errors?.map(e => e.message || e).join('\n') || '',
    });
  }
  // Nested suites
  for (const child of suite.suites || suite.testSuites || []) {
    const childPrefix = child.name || child.title || '';
    tests.push(...collectTests(child, childPrefix));
  }
  return tests;
}

const rows = buildRows(suites);

// ── coverage bars ─────────────────────────────────────────────────────────────

function covBar(value, label) {
  if (value === null) return `<div class="cov-item"><span class="cov-label">${label}</span><span class="cov-na">N/A</span></div>`;
  const p = Math.round(value);
  const color = p >= 80 ? '#10B981' : p >= 50 ? '#F59E0B' : '#EF4444';
  return `
  <div class="cov-item">
    <span class="cov-label">${label}</span>
    <div class="cov-track">
      <div class="cov-fill" style="width:${p}%;background:${color}"></div>
    </div>
    <span class="cov-pct" style="color:${color}">${pct(value)}</span>
  </div>`;
}

// ── assemble HTML ─────────────────────────────────────────────────────────────

const passRate = numTotal > 0 ? ((numPass / numTotal) * 100).toFixed(1) : '0.0';
const overallColor = numFail > 0 ? '#EF4444' : '#10B981';
const generated = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

const suiteMap = {};
for (const r of rows) {
  if (!suiteMap[r.file]) suiteMap[r.file] = [];
  suiteMap[r.file].push(r);
}

const suiteSections = Object.entries(suiteMap).map(([file, tests]) => {
  const fp = tests.filter(t => statusClass(t.state) === 'fail').length;
  const headerClass = fp > 0 ? 'suite-header suite-fail' : 'suite-header suite-pass';
  const testRows = tests.map(t => {
    const cls = statusClass(t.state);
    const errHtml = t.error
      ? `<tr class="err-row"><td colspan="3"><pre class="err-pre">${esc(t.error.slice(0, 600))}</pre></td></tr>`
      : '';
    return `
    <tr class="test-row ${cls}">
      <td class="td-status"><span class="badge-${cls}">${statusLabel(t.state)}</span></td>
      <td class="td-name">${esc(t.name)}</td>
      <td class="td-dur">${esc(t.duration)}</td>
    </tr>${errHtml}`;
  }).join('');
  return `
  <div class="suite-block">
    <div class="${headerClass}">
      <span class="suite-file">${esc(file)}</span>
      <span class="suite-counts">${tests.filter(t => statusClass(t.state) === 'pass').length}/${tests.length} passed</span>
    </div>
    <table class="test-table">
      <thead><tr><th width="72">Result</th><th>Test Name</th><th width="80">Duration</th></tr></thead>
      <tbody>${testRows}</tbody>
    </table>
  </div>`;
}).join('');

const covSection = coverage ? `
<div class="section">
  <h2 class="section-title">Code Coverage</h2>
  <div class="cov-grid">
    ${covBar(coverage.lines,      'Lines')}
    ${covBar(coverage.statements, 'Statements')}
    ${covBar(coverage.functions,  'Functions')}
    ${covBar(coverage.branches,   'Branches')}
  </div>
</div>` : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RhirePro &mdash; Automated Test Report</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F6F6F6;color:#1F2937;font-size:14px}
.topbar{background:#3A1F1F;color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px}
.logo{font-size:1.1rem;font-weight:700}.logo span{color:#FF2B2B}
.topbar-sub{font-size:.8rem;color:rgba(255,255,255,.55);margin-top:2px}
.wrap{max-width:1040px;margin:0 auto;padding:28px 16px}
.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:28px}
@media(max-width:640px){.summary{grid-template-columns:repeat(2,1fr)}}
.s-card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center}
.s-val{font-size:1.8rem;font-weight:700}
.s-label{font-size:.72rem;color:#6B7280;margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.section{margin-bottom:28px}
.section-title{font-size:1rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'';display:inline-block;width:4px;height:16px;background:#FF2B2B;border-radius:2px}
.cov-grid{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:560px){.cov-grid{grid-template-columns:1fr}}
.cov-item{display:flex;align-items:center;gap:10px}
.cov-label{width:90px;font-size:.8rem;color:#374151;flex-shrink:0}
.cov-track{flex:1;height:10px;background:#E5E7EB;border-radius:999px;overflow:hidden}
.cov-fill{height:100%;border-radius:999px;transition:width .4s}
.cov-pct{width:48px;text-align:right;font-size:.8rem;font-weight:600}
.cov-na{font-size:.8rem;color:#9CA3AF}
.suite-block{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);margin-bottom:16px;overflow:hidden}
.suite-header{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;font-size:.8125rem;font-weight:600}
.suite-pass{background:#F0FDF4;border-left:4px solid #10B981}
.suite-fail{background:#FEF2F2;border-left:4px solid #EF4444}
.suite-file{color:#1F2937}
.suite-counts{font-size:.75rem;color:#6B7280;font-weight:400}
.test-table{width:100%;border-collapse:collapse;font-size:.8125rem}
.test-table thead tr{border-bottom:1px solid #F3F4F6}
.test-table th{padding:8px 12px;color:#9CA3AF;font-weight:500;text-align:left}
.test-table td{padding:8px 12px;border-bottom:1px solid #F9FAFB}
.test-row:last-child td{border-bottom:none}
.test-row.fail{background:#FFFBFB}
.td-status{width:72px}
.td-dur{width:80px;text-align:right;color:#9CA3AF;font-size:.75rem}
.badge-pass{background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700}
.badge-fail{background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700}
.badge-skip{background:#F3F4F6;color:#6B7280;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700}
.err-row td{padding:0 12px 10px}
.err-pre{background:#FEF2F2;color:#991B1B;font-size:.72rem;border-radius:8px;padding:10px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;border:1px solid #FECACA;line-height:1.4}
.footer{text-align:center;padding:24px 0 32px;font-size:.75rem;color:#9CA3AF}
.footer a{color:#FF2B2B;font-weight:600}
</style>
</head>
<body>
<div class="topbar">
  <div>
    <div class="logo">Rhire<span>Pro</span></div>
    <div class="topbar-sub">Automated Test Report &mdash; Generated ${esc(generated)}</div>
  </div>
</div>
<div class="wrap">

  <div class="summary">
    <div class="s-card">
      <div class="s-val" style="color:${overallColor}">${passRate}%</div>
      <div class="s-label">Pass Rate</div>
    </div>
    <div class="s-card">
      <div class="s-val">${numTotal}</div>
      <div class="s-label">Total Tests</div>
    </div>
    <div class="s-card">
      <div class="s-val" style="color:#10B981">${numPass}</div>
      <div class="s-label">Passed</div>
    </div>
    <div class="s-card">
      <div class="s-val" style="color:${numFail > 0 ? '#EF4444' : '#10B981'}">${numFail}</div>
      <div class="s-label">Failed</div>
    </div>
    <div class="s-card">
      <div class="s-val">${duration}</div>
      <div class="s-label">Duration</div>
    </div>
  </div>

  ${covSection}

  <div class="section">
    <h2 class="section-title">Test Suites &amp; Results</h2>
    ${suiteSections || '<p style="color:#9CA3AF;padding:16px">No test results found.</p>'}
  </div>

  <div class="footer">
    <p>RhirePro automated test report &middot; <a href="https://vitest.dev" target="_blank">Powered by Vitest</a></p>
  </div>
</div>
</body>
</html>`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, html, 'utf8');
console.log('');
console.log('  Test report written to: test-results/report.html');
console.log(`  Total: ${numTotal}  Pass: ${numPass}  Fail: ${numFail}  Pass rate: ${passRate}%`);
if (coverage) {
  console.log(`  Coverage: Lines ${pct(coverage.lines)}  Stmts ${pct(coverage.statements)}  Fns ${pct(coverage.functions)}  Branches ${pct(coverage.branches)}`);
}
console.log('');
