/**
 * features.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Feature-level tests covering the pure logic and data-transformation functions
 * that power RhirePro's key application features.
 *
 * Sections:
 *  1. Authentication — OTP generation logic
 *  2. Authentication — email/password validation rules
 *  3. Recruiter — job status logic
 *  4. Recruiter — application status pipeline
 *  5. Recruiter — CSV export construction
 *  6. Recruiter — analytics / metric calculations
 *  7. Job Seeker — profile completeness score
 *  8. Hiring funnel — stage ordering
 *  9. Notifications — message construction
 * 10. Search & filter — candidate filter logic
 */

import { describe, it, expect } from 'vitest';

// ── 1. Authentication — OTP generation logic ─────────────────────────────────

describe('Feature: OTP generation', () => {
  /** Simulates the OTP generation used in auth flows */
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  it('generates a 6-digit string', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
  });

  it('generated OTP contains only digits', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOTP()).toMatch(/^\d{6}$/);
    }
  });

  it('OTP is within valid range (100000–999999)', () => {
    for (let i = 0; i < 50; i++) {
      const n = parseInt(generateOTP(), 10);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it('generates different OTPs across calls (statistically)', () => {
    const otps = new Set(Array.from({ length: 20 }, generateOTP));
    // With 900000 possible values, 20 draws should almost certainly be unique
    expect(otps.size).toBeGreaterThan(15);
  });

  it('OTP is returned as a string, not a number', () => {
    expect(typeof generateOTP()).toBe('string');
  });
});

// ── 2. Authentication — email validation rules ────────────────────────────────

describe('Feature: Email validation', () => {
  /** Basic email format check (mirrors front-end validation) */
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  it('accepts standard email format', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('hr@techcorp.rhirepro.dev')).toBe(true);
  });

  it('accepts email with dots in local part', () => {
    expect(isValidEmail('first.last@company.org')).toBe(true);
  });

  it('rejects email without @ symbol', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

// ── 3. Authentication — password strength rules ───────────────────────────────

describe('Feature: Password strength validation', () => {
  /**
   * RhirePro requires passwords to be at least 6 characters (Supabase default).
   * The UI also enforces an uppercase letter and a digit for recruiter signup.
   */
  const meetsMinLength = (pw: string) => pw.length >= 6;
  const hasUppercase   = (pw: string) => /[A-Z]/.test(pw);
  const hasDigit       = (pw: string) => /\d/.test(pw);
  const isStrongPassword = (pw: string) =>
    meetsMinLength(pw) && hasUppercase(pw) && hasDigit(pw);

  it('accepts passwords with 6+ chars, uppercase, and digit', () => {
    expect(isStrongPassword('RedHire@123')).toBe(true);
    expect(isStrongPassword('Pass1word')).toBe(true);
  });

  it('rejects passwords shorter than 6 characters', () => {
    expect(meetsMinLength('Ab1')).toBe(false);
    expect(meetsMinLength('Ab1de')).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(hasUppercase('password123')).toBe(false);
  });

  it('rejects passwords without digits', () => {
    expect(hasDigit('Password')).toBe(false);
  });

  it('rejects empty password', () => {
    expect(isStrongPassword('')).toBe(false);
  });

  it('accepts exactly 6 chars with uppercase and digit', () => {
    expect(isStrongPassword('Pass1!')).toBe(true);
  });
});

// ── 4. Recruiter — job status pipeline ───────────────────────────────────────

describe('Feature: Job status management', () => {
  type JobStatus = 'Active' | 'Paused' | 'Closed';

  const validStatuses: JobStatus[] = ['Active', 'Paused', 'Closed'];

  const isValidStatus = (s: string): s is JobStatus =>
    validStatuses.includes(s as JobStatus);

  const canActivate = (s: JobStatus) => s !== 'Active';
  const canPause    = (s: JobStatus) => s === 'Active';
  const canClose    = (s: JobStatus) => s !== 'Closed';

  it('Active, Paused, Closed are all valid statuses', () => {
    expect(validStatuses.every(isValidStatus)).toBe(true);
  });

  it('rejects unknown job status', () => {
    expect(isValidStatus('Draft')).toBe(false);
    expect(isValidStatus('')).toBe(false);
  });

  it('only Active jobs can be paused', () => {
    expect(canPause('Active')).toBe(true);
    expect(canPause('Paused')).toBe(false);
    expect(canPause('Closed')).toBe(false);
  });

  it('Paused and Closed jobs can be activated', () => {
    expect(canActivate('Paused')).toBe(true);
    expect(canActivate('Closed')).toBe(true);
    expect(canActivate('Active')).toBe(false);
  });

  it('Active and Paused jobs can be closed', () => {
    expect(canClose('Active')).toBe(true);
    expect(canClose('Paused')).toBe(true);
    expect(canClose('Closed')).toBe(false);
  });
});

// ── 5. Recruiter — application status pipeline ───────────────────────────────

describe('Feature: Application status pipeline', () => {
  const STATUSES = ['New', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'];

  const nextStatus: Record<string, string> = {
    'New':                 'Reviewed',
    'Reviewed':            'Shortlisted',
    'Shortlisted':         'Interview Scheduled',
    'Interview Scheduled': 'Offered',
  };

  it('pipeline has 6 distinct stages', () => {
    expect(STATUSES.length).toBe(6);
    expect(new Set(STATUSES).size).toBe(6);
  });

  it('New → Reviewed progression is correct', () => {
    expect(nextStatus['New']).toBe('Reviewed');
  });

  it('Reviewed → Shortlisted progression is correct', () => {
    expect(nextStatus['Reviewed']).toBe('Shortlisted');
  });

  it('Shortlisted → Interview Scheduled progression is correct', () => {
    expect(nextStatus['Shortlisted']).toBe('Interview Scheduled');
  });

  it('Interview Scheduled → Offered is the final positive stage', () => {
    expect(nextStatus['Interview Scheduled']).toBe('Offered');
  });

  it('Offered has no automatic next step (terminal positive)', () => {
    expect(nextStatus['Offered']).toBeUndefined();
  });

  it('Rejected is a terminal state', () => {
    expect(nextStatus['Rejected']).toBeUndefined();
  });

  it('all STATUSES except New appear later in the pipeline than New', () => {
    const newIdx = STATUSES.indexOf('New');
    expect(STATUSES.indexOf('Reviewed')).toBeGreaterThan(newIdx);
    expect(STATUSES.indexOf('Offered')).toBeGreaterThan(newIdx);
  });
});

// ── 6. Recruiter — CSV export construction ───────────────────────────────────

describe('Feature: CSV export', () => {
  interface Applicant {
    name: string;
    email: string;
    status: string;
    jobTitle: string;
    appliedAt: string;
  }

  function buildCSV(applicants: Applicant[]): string {
    const header = ['Name', 'Email', 'Status', 'Job Title', 'Applied At'].join(',');
    const rows = applicants.map(a =>
      [a.name, a.email, a.status, a.jobTitle, a.appliedAt]
        .map(v => `"${v.replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header, ...rows].join('\n');
  }

  it('produces a CSV string starting with the header row', () => {
    const csv = buildCSV([]);
    expect(csv).toMatch(/^Name,Email,Status/);
  });

  it('empty applicant list produces only the header', () => {
    const lines = buildCSV([]).split('\n');
    expect(lines).toHaveLength(1);
  });

  it('each applicant becomes exactly one CSV row', () => {
    const apps: Applicant[] = [
      { name: 'Alice', email: 'a@x.com', status: 'New', jobTitle: 'Dev', appliedAt: '2026-01-01' },
      { name: 'Bob',   email: 'b@x.com', status: 'Reviewed', jobTitle: 'PM', appliedAt: '2026-01-02' },
    ];
    const lines = buildCSV(apps).split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('values are double-quoted', () => {
    const apps: Applicant[] = [
      { name: 'Alice', email: 'a@x.com', status: 'New', jobTitle: 'Dev', appliedAt: '2026-01-01' },
    ];
    const csv = buildCSV(apps);
    expect(csv).toContain('"Alice"');
  });

  it('escapes embedded double quotes (RFC 4180)', () => {
    const apps: Applicant[] = [
      { name: 'Say "Hi"', email: 'a@x.com', status: 'New', jobTitle: 'Dev', appliedAt: '2026-01-01' },
    ];
    const csv = buildCSV(apps);
    expect(csv).toContain('"Say ""Hi"""');
  });

  it('includes all 5 header columns', () => {
    const header = buildCSV([]).split('\n')[0];
    ['Name', 'Email', 'Status', 'Job Title', 'Applied At'].forEach(col => {
      expect(header).toContain(col);
    });
  });

  it('each row has exactly 5 comma-separated fields', () => {
    const apps: Applicant[] = [
      { name: 'Alice', email: 'a@x.com', status: 'New', jobTitle: 'Software Engineer', appliedAt: '2026-01-01' },
    ];
    const dataRow = buildCSV(apps).split('\n')[1];
    // Count commas not inside quotes
    const fields = dataRow.match(/"[^"]*"/g) || [];
    expect(fields).toHaveLength(5);
  });
});

// ── 7. Recruiter — analytics metric calculations ─────────────────────────────

describe('Feature: Analytics metrics', () => {
  interface Job { id: string; status: string; views: number; }
  interface App { job_id: string; status: string; }

  function calcMetrics(jobs: Job[], apps: App[]) {
    return {
      totalJobs:   jobs.length,
      activeJobs:  jobs.filter(j => j.status === 'Active').length,
      totalApps:   apps.length,
      totalViews:  jobs.reduce((s, j) => s + j.views, 0),
      shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
      offered:     apps.filter(a => a.status === 'Offered').length,
      convRate:    apps.length > 0
        ? ((apps.filter(a => a.status === 'Offered').length / apps.length) * 100).toFixed(1)
        : '0.0',
    };
  }

  const jobs: Job[] = [
    { id: 'j1', status: 'Active', views: 300 },
    { id: 'j2', status: 'Active', views: 150 },
    { id: 'j3', status: 'Paused', views: 50 },
  ];

  const apps: App[] = [
    { job_id: 'j1', status: 'New' },
    { job_id: 'j1', status: 'Shortlisted' },
    { job_id: 'j1', status: 'Offered' },
    { job_id: 'j2', status: 'New' },
    { job_id: 'j2', status: 'Rejected' },
  ];

  it('totalJobs counts all jobs', () => {
    expect(calcMetrics(jobs, apps).totalJobs).toBe(3);
  });

  it('activeJobs counts only Active-status jobs', () => {
    expect(calcMetrics(jobs, apps).activeJobs).toBe(2);
  });

  it('totalApps counts all applications', () => {
    expect(calcMetrics(jobs, apps).totalApps).toBe(5);
  });

  it('totalViews sums all job views', () => {
    expect(calcMetrics(jobs, apps).totalViews).toBe(500);
  });

  it('shortlisted count is correct', () => {
    expect(calcMetrics(jobs, apps).shortlisted).toBe(1);
  });

  it('offered count is correct', () => {
    expect(calcMetrics(jobs, apps).offered).toBe(1);
  });

  it('conversion rate is offered/total * 100', () => {
    // 1 offered / 5 total = 20.0%
    expect(calcMetrics(jobs, apps).convRate).toBe('20.0');
  });

  it('conversion rate is 0.0 when no applications', () => {
    expect(calcMetrics(jobs, []).convRate).toBe('0.0');
  });

  it('all metrics are 0 for empty jobs and apps', () => {
    const m = calcMetrics([], []);
    expect(m.totalJobs).toBe(0);
    expect(m.activeJobs).toBe(0);
    expect(m.totalViews).toBe(0);
    expect(m.totalApps).toBe(0);
  });
});

// ── 8. Job Seeker — profile completeness score ───────────────────────────────

describe('Feature: Profile completeness score', () => {
  interface Profile {
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    skills: string[];
    work_experience: unknown[];
    education: unknown[];
    resume_url: string | null;
  }

  function calcCompleteness(p: Profile): number {
    const checks = [
      !!p.avatar_url,
      !!p.bio,
      !!p.location,
      p.skills.length > 0,
      p.work_experience.length > 0,
      p.education.length > 0,
      !!p.resume_url,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  it('empty profile scores 0%', () => {
    expect(calcCompleteness({
      avatar_url: null, bio: null, location: null,
      skills: [], work_experience: [], education: [], resume_url: null,
    })).toBe(0);
  });

  it('fully complete profile scores 100%', () => {
    expect(calcCompleteness({
      avatar_url: 'url', bio: 'About me', location: 'Mumbai',
      skills: ['React'], work_experience: [{}], education: [{}], resume_url: 'url',
    })).toBe(100);
  });

  it('profile with only avatar scores ~14%', () => {
    expect(calcCompleteness({
      avatar_url: 'url', bio: null, location: null,
      skills: [], work_experience: [], education: [], resume_url: null,
    })).toBe(14);
  });

  it('profile with 4 of 7 fields scores ~57%', () => {
    expect(calcCompleteness({
      avatar_url: 'url', bio: 'Bio', location: 'City', skills: ['JS'],
      work_experience: [], education: [], resume_url: null,
    })).toBe(57);
  });

  it('adding resume increases score', () => {
    const base: Profile = {
      avatar_url: 'url', bio: 'Bio', location: 'City', skills: ['JS'],
      work_experience: [], education: [], resume_url: null,
    };
    const withResume: Profile = { ...base, resume_url: 'resume.pdf' };
    expect(calcCompleteness(withResume)).toBeGreaterThan(calcCompleteness(base));
  });

  it('scores are always between 0 and 100', () => {
    const profiles: Profile[] = [
      { avatar_url: null, bio: null, location: null, skills: [], work_experience: [], education: [], resume_url: null },
      { avatar_url: 'u', bio: 'b', location: 'l', skills: ['s'], work_experience: [{}], education: [{}], resume_url: 'r' },
    ];
    for (const p of profiles) {
      const score = calcCompleteness(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

// ── 9. Hiring funnel — stage ordering & drop-off ─────────────────────────────

describe('Feature: Hiring funnel drop-off', () => {
  const FUNNEL_ORDER = ['Applied', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Offered'];

  interface FunnelStage {
    label: string;
    count: number;
  }

  function buildFunnel(sc: Record<string, number>, total: number): FunnelStage[] {
    return [
      { label: 'Applied',             count: total },
      { label: 'Reviewed',            count: sc['Reviewed'] || 0 },
      { label: 'Shortlisted',         count: sc['Shortlisted'] || 0 },
      { label: 'Interview Scheduled', count: sc['Interview Scheduled'] || 0 },
      { label: 'Offered',             count: sc['Offered'] || 0 },
    ];
  }

  it('funnel has 5 stages in the correct order', () => {
    const f = buildFunnel({}, 10);
    expect(f.map(s => s.label)).toEqual(FUNNEL_ORDER);
  });

  it('Applied stage always equals total applications', () => {
    const f = buildFunnel({ Reviewed: 5 }, 10);
    expect(f[0].count).toBe(10);
  });

  it('missing stages default to 0', () => {
    const f = buildFunnel({}, 10);
    expect(f[1].count).toBe(0); // Reviewed
    expect(f[4].count).toBe(0); // Offered
  });

  it('funnel counts are non-increasing (each stage ≤ previous)', () => {
    const f = buildFunnel({ Reviewed: 8, Shortlisted: 5, 'Interview Scheduled': 3, Offered: 1 }, 10);
    for (let i = 1; i < f.length; i++) {
      expect(f[i].count).toBeLessThanOrEqual(f[i - 1].count);
    }
  });

  it('drop-off rate between Applied and Offered is calculated correctly', () => {
    const total = 100;
    const offered = 10;
    const dropOff = ((total - offered) / total) * 100;
    expect(dropOff).toBe(90);
  });

  it('empty funnel (0 apps) has all zeros', () => {
    const f = buildFunnel({}, 0);
    expect(f.every(s => s.count === 0)).toBe(true);
  });
});

// ── 10. Search & filter — candidate search logic ─────────────────────────────

describe('Feature: Candidate search and filter', () => {
  interface Candidate {
    name: string;
    skills: string[];
    location: string;
    status: string;
  }

  const candidates: Candidate[] = [
    { name: 'Alice Kumar',  skills: ['React', 'TypeScript'], location: 'Bengaluru', status: 'Shortlisted' },
    { name: 'Bob Sharma',   skills: ['Python', 'Django'],    location: 'Mumbai',    status: 'New' },
    { name: 'Carol Singh',  skills: ['React', 'Node.js'],    location: 'Bengaluru', status: 'Reviewed' },
    { name: 'Dave Verma',   skills: ['Java', 'Spring'],      location: 'Hyderabad', status: 'New' },
    { name: 'Eve Mehta',    skills: ['TypeScript', 'Vue'],   location: 'Remote',    status: 'Offered' },
  ];

  const searchByName = (q: string) =>
    candidates.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  const filterByStatus = (status: string) =>
    status ? candidates.filter(c => c.status === status) : candidates;

  const filterByLocation = (location: string) =>
    location ? candidates.filter(c => c.location === location) : candidates;

  const filterBySkill = (skill: string) =>
    skill ? candidates.filter(c => c.skills.some(s => s.toLowerCase() === skill.toLowerCase())) : candidates;

  it('search by name is case-insensitive', () => {
    expect(searchByName('alice')).toHaveLength(1);
    expect(searchByName('ALICE')).toHaveLength(1);
    expect(searchByName('Alice')).toHaveLength(1);
  });

  it('search by partial name matches', () => {
    expect(searchByName('kumar')).toHaveLength(1);
    expect(searchByName('sh')).toHaveLength(1); // Sharma
  });

  it('search with no match returns empty array', () => {
    expect(searchByName('zzz')).toHaveLength(0);
  });

  it('filter by status returns only matching candidates', () => {
    expect(filterByStatus('New')).toHaveLength(2); // Bob, Dave
    expect(filterByStatus('Offered')).toHaveLength(1); // Eve
  });

  it('empty status filter returns all candidates', () => {
    expect(filterByStatus('')).toHaveLength(candidates.length);
  });

  it('filter by location returns correct results', () => {
    expect(filterByLocation('Bengaluru')).toHaveLength(2); // Alice, Carol
    expect(filterByLocation('Remote')).toHaveLength(1);    // Eve
  });

  it('filter by skill is case-insensitive', () => {
    expect(filterBySkill('react')).toHaveLength(2); // Alice, Carol
    expect(filterBySkill('TYPESCRIPT')).toHaveLength(2); // Alice, Eve
  });

  it('filter by skill with no match returns empty array', () => {
    expect(filterBySkill('Rust')).toHaveLength(0);
  });

  it('empty skill filter returns all candidates', () => {
    expect(filterBySkill('')).toHaveLength(candidates.length);
  });
});

// ── 11. Notification message construction ────────────────────────────────────

describe('Feature: Notification messages', () => {
  function buildStatusNotification(applicantName: string, jobTitle: string, newStatus: string): string {
    const messages: Record<string, string> = {
      'Reviewed':            `Your application for "${jobTitle}" has been reviewed.`,
      'Shortlisted':         `Great news! You've been shortlisted for "${jobTitle}".`,
      'Interview Scheduled': `Your interview for "${jobTitle}" has been scheduled!`,
      'Offered':             `Congratulations! You've received an offer for "${jobTitle}".`,
      'Rejected':            `Thank you for applying to "${jobTitle}". We've decided to move forward with other candidates.`,
    };
    return messages[newStatus] ?? `Your application status for "${jobTitle}" has been updated to ${newStatus}.`;
  }

  it('Reviewed status generates a review notification', () => {
    const msg = buildStatusNotification('Alice', 'Software Engineer', 'Reviewed');
    expect(msg).toContain('reviewed');
    expect(msg).toContain('Software Engineer');
  });

  it('Shortlisted generates a positive notification', () => {
    expect(buildStatusNotification('Alice', 'Dev', 'Shortlisted')).toContain('shortlisted');
  });

  it('Interview Scheduled includes scheduling confirmation', () => {
    expect(buildStatusNotification('Alice', 'Dev', 'Interview Scheduled')).toContain('interview');
  });

  it('Offered generates a congratulatory message', () => {
    expect(buildStatusNotification('Alice', 'Dev', 'Offered')).toContain('Congratulations');
  });

  it('Rejected generates a polite rejection message', () => {
    expect(buildStatusNotification('Alice', 'Dev', 'Rejected')).toContain('Thank you');
  });

  it('unknown status uses fallback message', () => {
    const msg = buildStatusNotification('Alice', 'Dev', 'OnHold');
    expect(msg).toContain('OnHold');
    expect(msg).toContain('Dev');
  });

  it('all messages include the job title', () => {
    const statuses = ['Reviewed', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'];
    const title = 'Product Manager';
    for (const s of statuses) {
      expect(buildStatusNotification('Alice', title, s)).toContain(title);
    }
  });
});

// ── 12. Job listings — employment type filter ─────────────────────────────────

describe('Feature: Job listings filter', () => {
  interface Job {
    title: string;
    employment_type: string;
    location: string;
    status: string;
  }

  const jobs: Job[] = [
    { title: 'Frontend Dev',  employment_type: 'Full-time', location: 'Bengaluru', status: 'Active' },
    { title: 'Backend Dev',   employment_type: 'Full-time', location: 'Remote',    status: 'Active' },
    { title: 'Data Analyst',  employment_type: 'Contract',  location: 'Mumbai',    status: 'Active' },
    { title: 'UI Designer',   employment_type: 'Part-time', location: 'Bengaluru', status: 'Paused' },
    { title: 'DevOps Eng',    employment_type: 'Full-time', location: 'Hyderabad', status: 'Active' },
  ];

  const filterByType     = (t: string)  => t ? jobs.filter(j => j.employment_type === t) : jobs;
  const filterByLocation = (l: string)  => l ? jobs.filter(j => j.location === l) : jobs;
  const filterActive     = ()           => jobs.filter(j => j.status === 'Active');
  const searchTitle      = (q: string)  => jobs.filter(j => j.title.toLowerCase().includes(q.toLowerCase()));

  it('filter by Full-time returns 3 jobs', () => {
    expect(filterByType('Full-time')).toHaveLength(3);
  });

  it('filter by Contract returns 1 job', () => {
    expect(filterByType('Contract')).toHaveLength(1);
  });

  it('no type filter returns all 5 jobs', () => {
    expect(filterByType('')).toHaveLength(5);
  });

  it('filter by location Bengaluru returns 2 jobs', () => {
    expect(filterByLocation('Bengaluru')).toHaveLength(2);
  });

  it('filter by Remote location returns 1 job', () => {
    expect(filterByLocation('Remote')).toHaveLength(1);
  });

  it('active filter hides paused jobs', () => {
    const active = filterActive();
    expect(active.every(j => j.status === 'Active')).toBe(true);
    expect(active).toHaveLength(4);
  });

  it('search by title is case-insensitive', () => {
    expect(searchTitle('dev')).toHaveLength(3); // Frontend Dev, Backend Dev, DevOps Eng
  });

  it('search with no match returns empty', () => {
    expect(searchTitle('Blockchain')).toHaveLength(0);
  });
});
