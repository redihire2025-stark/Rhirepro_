import { describe, it, expect, beforeAll } from 'vitest';
import { generateReportHTML, ReportCompany, ReportJob, ReportApp } from '../lib/reportGenerator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const company: ReportCompany = {
  company_name: 'TechCorp Pvt Ltd',
  recruiter_name: 'Alice Smith',
  logo_url: null,
  industry: 'Information Technology',
  location: 'Bengaluru, Karnataka',
  tagline: 'Building the future of tech',
  website: 'https://techcorp.example.com',
};

const jobs: ReportJob[] = [
  { id: 'j1', title: 'Software Engineer', status: 'Active', employment_type: 'Full-time', location: 'Bengaluru', views: 200, openings: 3, created_at: '2026-01-10T00:00:00Z' },
  { id: 'j2', title: 'Product Manager', status: 'Paused', employment_type: 'Full-time', location: 'Remote', views: 100, openings: 1, created_at: '2026-02-01T00:00:00Z' },
  { id: 'j3', title: 'UI/UX Designer', status: 'Active', employment_type: 'Contract', location: 'Hyderabad', views: 0, openings: 2, created_at: '2026-03-01T00:00:00Z' },
];

const apps: ReportApp[] = [
  { job_id: 'j1', status: 'New' },
  { job_id: 'j1', status: 'Reviewed' },
  { job_id: 'j1', status: 'Shortlisted' },
  { job_id: 'j1', status: 'Interview Scheduled' },
  { job_id: 'j2', status: 'New' },
  { job_id: 'j2', status: 'Offered' },
  { job_id: 'j3', status: 'Rejected' },
];

// ── HTML Structure ────────────────────────────────────────────────────────────

describe('generateReportHTML — HTML structure', () => {
  it('returns a string', () => {
    expect(typeof generateReportHTML(company, jobs, apps)).toBe('string');
  });

  it('starts with <!DOCTYPE html>', () => {
    expect(generateReportHTML(company, jobs, apps).trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('contains <html lang="en">', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('<html lang="en">');
  });

  it('has a <meta charset="UTF-8"/> tag', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('charset="UTF-8"');
  });

  it('has a viewport meta tag', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('name="viewport"');
  });

  it('contains </html> closing tag', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('</html>');
  });
});

// ── Company Information ───────────────────────────────────────────────────────

describe('generateReportHTML — company info', () => {
  it('displays company_name when set', () => {
    const html = generateReportHTML(company, [], []);
    expect(html).toContain('TechCorp Pvt Ltd');
  });

  it('falls back to recruiter_name when company_name is null', () => {
    const c = { ...company, company_name: null };
    expect(generateReportHTML(c, [], [])).toContain('Alice Smith');
  });

  it('falls back to "Company" when both names are null', () => {
    const c = { ...company, company_name: null, recruiter_name: null };
    expect(generateReportHTML(c, [], [])).toContain('Company');
  });

  it('includes tagline', () => {
    expect(generateReportHTML(company, [], [])).toContain('Building the future of tech');
  });

  it('includes industry', () => {
    expect(generateReportHTML(company, [], [])).toContain('Information Technology');
  });

  it('includes location', () => {
    expect(generateReportHTML(company, [], [])).toContain('Bengaluru, Karnataka');
  });
});

// ── Security — HTML Escaping ──────────────────────────────────────────────────

describe('generateReportHTML — XSS / HTML escaping', () => {
  it('escapes < and > in company name', () => {
    const c = { ...company, company_name: '<Evil Corp>' };
    const html = generateReportHTML(c, [], []);
    expect(html).not.toContain('<Evil Corp>');
    expect(html).toContain('&lt;Evil Corp&gt;');
  });

  it('escapes & in company name', () => {
    const c = { ...company, company_name: 'Smith & Jones' };
    expect(generateReportHTML(c, [], [])).toContain('Smith &amp; Jones');
  });

  it('escapes " in tagline', () => {
    const c = { ...company, tagline: 'We "care"' };
    expect(generateReportHTML(c, [], [])).toContain('We &quot;care&quot;');
  });

  it('escapes <script> tags in job titles', () => {
    const j: ReportJob[] = [
      { id: 'x', title: '<script>alert("xss")</script>', status: 'Active', employment_type: null, location: null, views: 0, openings: 1, created_at: '2026-01-01T00:00:00Z' },
    ];
    const html = generateReportHTML(company, j, []);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('output is pure ASCII (immune to charset encoding bugs)', () => {
    const html = generateReportHTML(company, jobs, apps);
    for (let i = 0; i < html.length; i++) {
      const code = html.charCodeAt(i);
      expect(code, `Non-ASCII at position ${i}: "${html[i]}" (U+${code.toString(16).toUpperCase()})`).toBeLessThan(128);
    }
  });
});

// ── Metrics ───────────────────────────────────────────────────────────────────

describe('generateReportHTML — key metrics', () => {
  let html: string;
  beforeAll(() => { html = generateReportHTML(company, jobs, apps); });

  it('shows correct total jobs count (3)', () => {
    expect(html).toContain('>3<');
  });

  it('shows correct active jobs count (2)', () => {
    // 2 active jobs: j1, j3
    expect(html).toContain('>2<');
  });

  it('shows correct total applications count (7)', () => {
    expect(html).toContain('>7<');
  });

  it('total views: 300 (200+100+0)', () => {
    expect(html).toContain('300');
  });
});

// ── Job Performance Table ─────────────────────────────────────────────────────

describe('generateReportHTML — job performance', () => {
  it('includes all job titles', () => {
    const html = generateReportHTML(company, jobs, apps);
    expect(html).toContain('Software Engineer');
    expect(html).toContain('Product Manager');
    expect(html).toContain('UI/UX Designer');
  });

  it('shows Active badge for active jobs', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('job-active');
  });

  it('shows Paused badge for paused jobs', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('job-paused');
  });

  it('calculates CTR correctly (j1: 4 apps / 200 views = 2.0%)', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('2.0%');
  });

  it('shows N/A when views is 0', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('N/A');
  });

  it('sorts jobs by application count descending', () => {
    const html = generateReportHTML(company, jobs, apps);
    const j1Pos = html.indexOf('Software Engineer');
    const j2Pos = html.indexOf('Product Manager');
    // j1 has 4 apps, j2 has 2 apps → j1 should appear first
    expect(j1Pos).toBeLessThan(j2Pos);
  });
});

// ── Hiring Funnel ─────────────────────────────────────────────────────────────

describe('generateReportHTML — hiring funnel', () => {
  it('shows funnel when applications exist', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('Hiring Funnel');
  });

  it('omits funnel section when no applications', () => {
    expect(generateReportHTML(company, jobs, [])).not.toContain('Hiring Funnel');
  });

  it('funnel shows Applied stage', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('>Applied<');
  });

  it('funnel shows Shortlisted stage', () => {
    expect(generateReportHTML(company, jobs, apps)).toContain('>Shortlisted<');
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('generateReportHTML — edge cases', () => {
  it('handles empty jobs and apps without throwing', () => {
    expect(() => generateReportHTML(company, [], [])).not.toThrow();
  });

  it('handles null optional fields without throwing', () => {
    const c: ReportCompany = { company_name: null, recruiter_name: null, logo_url: null, industry: null, location: null, tagline: null, website: null };
    expect(() => generateReportHTML(c, [], [])).not.toThrow();
  });

  it('handles single job and single application', () => {
    const j: ReportJob[] = [{ id: 'x', title: 'Dev', status: 'Active', employment_type: null, location: null, views: 10, openings: 1, created_at: new Date().toISOString() }];
    const a: ReportApp[] = [{ job_id: 'x', status: 'New' }];
    expect(() => generateReportHTML(company, j, a)).not.toThrow();
  });

  it('handles jobs with no matching applications (0 apps)', () => {
    const j: ReportJob[] = [{ id: 'orphan', title: 'No Apps Job', status: 'Active', employment_type: null, location: null, views: 50, openings: 1, created_at: new Date().toISOString() }];
    const html = generateReportHTML(company, j, []);
    expect(html).toContain('No Apps Job');
  });
});
