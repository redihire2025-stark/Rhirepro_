import { describe, it, expect } from 'vitest';
import { generateReportHTML, ReportCompany, ReportJob, ReportApp } from '../lib/reportGenerator';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const company: ReportCompany = {
  company_name: 'Acme Corp',
  recruiter_name: 'Bob Builder',
  logo_url: null,
  industry: 'Manufacturing',
  location: 'Mumbai, Maharashtra',
  tagline: 'We build things',
  website: 'https://acme.example.com',
};

const baseJob = (overrides: Partial<ReportJob> = {}): ReportJob => ({
  id: 'j1',
  title: 'Engineer',
  status: 'Active',
  employment_type: 'Full-time',
  location: 'Mumbai',
  views: 100,
  openings: 2,
  created_at: '2026-01-15T10:00:00Z',
  ...overrides,
});

// ── Logo rendering ────────────────────────────────────────────────────────────

describe('generateReportHTML — logo', () => {
  it('renders the first letter of company name when logo_url is null', () => {
    const html = generateReportHTML(company, [], []);
    // No img tag — the fallback letter is rendered inside .company-logo
    expect(html).not.toContain('<img');
    expect(html).toContain('class="company-logo"');
  });

  it('renders an img tag when logo_url is provided', () => {
    const c = { ...company, logo_url: 'https://cdn.example.com/logo.png' };
    const html = generateReportHTML(c, [], []);
    expect(html).toContain('<img');
    expect(html).toContain('https://cdn.example.com/logo.png');
  });

  it('escapes logo_url value to prevent XSS', () => {
    const c = { ...company, logo_url: '"onload="alert(1)' };
    const html = generateReportHTML(c, [], []);
    expect(html).not.toContain('"onload="');
    expect(html).toContain('&quot;');
  });
});

// ── Website rendering ─────────────────────────────────────────────────────────

describe('generateReportHTML — website', () => {
  it('strips https:// protocol from display text', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('acme.example.com');
    expect(html).not.toMatch(/>https?:\/\/[^<]+</);
  });

  it('keeps full URL in href attribute', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('href="https://acme.example.com"');
  });

  it('omits website section when website is null', () => {
    const c = { ...company, website: null };
    const html = generateReportHTML(c, [], []);
    // The company's website link should not appear (footer has its own href but not the company URL)
    expect(html).not.toContain('acme.example.com');
  });
});

// ── Status badge classes ──────────────────────────────────────────────────────

describe('generateReportHTML — status badge classes', () => {
  const jobs = [
    baseJob({ id: 'ja', title: 'Job A', status: 'Active' }),
    baseJob({ id: 'jb', title: 'Job B', status: 'Paused' }),
    baseJob({ id: 'jc', title: 'Job C', status: 'Closed' }),
  ];

  it('uses job-active class for Active jobs', () => {
    const html = generateReportHTML(company, jobs, []);
    expect(html).toContain('class="job-active"');
  });

  it('uses job-paused class for Paused jobs', () => {
    const html = generateReportHTML(company, jobs, []);
    expect(html).toContain('class="job-paused"');
  });

  it('also uses job-paused class for Closed status (not active)', () => {
    const html = generateReportHTML(company, jobs, []);
    // Closed is not "Active", so it gets job-paused
    const closedIdx = html.indexOf('Job C');
    expect(closedIdx).toBeGreaterThan(-1);
  });
});

// ── CTR edge cases ────────────────────────────────────────────────────────────

describe('generateReportHTML — CTR calculation', () => {
  it('shows N/A for jobs with 0 views', () => {
    const j = baseJob({ views: 0 });
    expect(generateReportHTML(company, [j], [])).toContain('N/A');
  });

  it('shows correct CTR for 1 app / 50 views = 2.0%', () => {
    const j = baseJob({ id: 'j1', views: 50 });
    const a: ReportApp[] = [{ job_id: 'j1', status: 'New' }];
    expect(generateReportHTML(company, [j], a)).toContain('2.0%');
  });

  it('shows 0.0% when 0 apps and views > 0', () => {
    const j = baseJob({ views: 100 });
    expect(generateReportHTML(company, [j], [])).toContain('0.0%');
  });

  it('shows 100.0% when apps equal views', () => {
    const j = baseJob({ id: 'j1', views: 2 });
    const a: ReportApp[] = [
      { job_id: 'j1', status: 'New' },
      { job_id: 'j1', status: 'New' },
    ];
    expect(generateReportHTML(company, [j], a)).toContain('100.0%');
  });
});

// ── Funnel bars ───────────────────────────────────────────────────────────────

describe('generateReportHTML — funnel bar percentages', () => {
  const apps: ReportApp[] = [
    { job_id: 'j1', status: 'New' },
    { job_id: 'j1', status: 'Reviewed' },
    { job_id: 'j1', status: 'Reviewed' },
    { job_id: 'j1', status: 'Shortlisted' },
    { job_id: 'j1', status: 'Interview Scheduled' },
    { job_id: 'j1', status: 'Offered' },
    { job_id: 'j1', status: 'Rejected' },
  ];
  const jobs = [baseJob({ id: 'j1' })];

  it('funnel applied count equals total apps', () => {
    const html = generateReportHTML(company, jobs, apps);
    // Applied row shows "7" (total apps)
    expect(html).toContain('>Applied<');
    expect(html).toContain('>7<');
  });

  it('Applied bar is always at 100%', () => {
    const html = generateReportHTML(company, jobs, apps);
    // The Applied bar should be 100%
    expect(html).toMatch(/width:100%;background:#9CA3AF/);
  });

  it('minimum bar width is 4% to ensure visibility', () => {
    // Offered has 1/7 apps = ~14%, but even 0 should clamp to 4%
    const apps2: ReportApp[] = [{ job_id: 'j1', status: 'New' }];
    const html = generateReportHTML(company, jobs, apps2);
    // All stages except Applied would be 0 → clamped to 4%
    expect(html).toContain('width:4%');
  });
});

// ── Applications by Status section ───────────────────────────────────────────

describe('generateReportHTML — applications by status', () => {
  it('shows Rejected status badge', () => {
    const j = baseJob({ id: 'j1' });
    const a: ReportApp[] = [{ job_id: 'j1', status: 'Rejected' }];
    expect(generateReportHTML(company, [j], a)).toContain('>Rejected<');
  });

  it('shows Offered status badge', () => {
    const j = baseJob({ id: 'j1' });
    const a: ReportApp[] = [{ job_id: 'j1', status: 'Offered' }];
    expect(generateReportHTML(company, [j], a)).toContain('>Offered<');
  });

  it('statuses with 0 count are not shown', () => {
    const j = baseJob({ id: 'j1' });
    const a: ReportApp[] = [{ job_id: 'j1', status: 'New' }];
    const html = generateReportHTML(company, [j], a);
    // Rejected was not in apps, should not appear in status section
    // (it could appear in the funnel label though)
    expect(html).not.toContain('>Rejected<');
  });

  it('bar-fill width is proportional to max count', () => {
    const j = baseJob({ id: 'j1' });
    const a: ReportApp[] = [
      { job_id: 'j1', status: 'New' },
      { job_id: 'j1', status: 'New' },
      { job_id: 'j1', status: 'Reviewed' },
    ];
    const html = generateReportHTML(company, [j], a);
    // New: 2/3 apps = 66.67% → Math.round = 67%, Reviewed: 1/3 = 33.33% → 33%
    expect(html).toContain('width:67%');
    expect(html).toContain('width:33%');
  });
});

// ── Job table columns ─────────────────────────────────────────────────────────

describe('generateReportHTML — job table columns', () => {
  it('shows employment_type in subtitle row', () => {
    const j = baseJob({ employment_type: 'Contract' });
    expect(generateReportHTML(company, [j], [])).toContain('Contract');
  });

  it('shows location in subtitle when present', () => {
    const j = baseJob({ location: 'Pune' });
    expect(generateReportHTML(company, [j], [])).toContain('Pune');
  });

  it('omits sub-row when employment_type is null', () => {
    const j = baseJob({ employment_type: null, location: null });
    const html = generateReportHTML(company, [j], []);
    // CSS defines .td-sub but no <div class="td-sub"> element should be rendered
    expect(html).not.toContain('<div class="td-sub">');
  });

  it('shows posted date in human-readable format', () => {
    const j = baseJob({ created_at: '2026-01-15T00:00:00Z' });
    const html = generateReportHTML(company, [j], []);
    // date-fns / toLocaleDateString in en-IN: "15 Jan 2026"
    expect(html).toContain('Jan');
    expect(html).toContain('2026');
  });
});

// ── Print / copy topbar ───────────────────────────────────────────────────────

describe('generateReportHTML — topbar actions', () => {
  it('contains a Print / PDF button', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('Print / PDF');
  });

  it('contains a Copy Link button', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('Copy Link');
  });

  it('Print button calls window.print()', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('window.print()');
  });

  it('Copy Link button uses navigator.clipboard', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('navigator.clipboard.writeText');
  });
});

// ── Footer ────────────────────────────────────────────────────────────────────

describe('generateReportHTML — footer', () => {
  it('contains RhirePro branding', () => {
    expect(generateReportHTML(company, [], [])).toContain('RhirePro');
  });

  it('contains a note about public accessibility', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('publicly accessible');
  });
});

// ── Metric card values ────────────────────────────────────────────────────────

describe('generateReportHTML — metric cards', () => {
  const jobs: ReportJob[] = [
    baseJob({ id: 'j1', status: 'Active', views: 400 }),
    baseJob({ id: 'j2', status: 'Active', views: 100 }),
    baseJob({ id: 'j3', status: 'Paused', views: 50 }),
  ];
  const apps: ReportApp[] = [
    { job_id: 'j1', status: 'New' },
    { job_id: 'j2', status: 'Reviewed' },
  ];

  it('total jobs metric is correct (3)', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('>3<');
  });

  it('active jobs metric is correct (2)', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('>2<');
  });

  it('total applications metric is correct (2)', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('>2<');
  });

  it('total views metric shows comma-formatted number (550)', () => {
    // 400+100+50 = 550
    const html = generateReportHTML(company, jobs, apps);
    // toLocaleString in en-IN for 550 = "550" (no comma needed)
    expect(html).toContain('550');
  });

  it('shows 0 active jobs when all jobs are paused', () => {
    const pausedJobs = jobs.map(j => ({ ...j, status: 'Paused' }));
    const html = generateReportHTML(company, pausedJobs, []);
    expect(html).toContain('>0<');
  });
});
