import { describe, it, expect } from 'vitest';
import { generateReportHTML } from '../lib/reportGenerator';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// dirname = src/__tests__,  ../../ = project root
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../');

function readSrc(rel: string) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const company = {
  company_name: 'Test Co',
  recruiter_name: null,
  logo_url: null,
  industry: null,
  location: null,
  tagline: null,
  website: null,
};

// ── reportGenerator branding ──────────────────────────────────────────────────

describe('Branding — reportGenerator.ts (generated HTML)', () => {
  const html = generateReportHTML(company, [], []);

  it('topbar logo says RhirePro not RedHire', () => {
    expect(html).toContain('Rhire<span>Pro</span>');
    expect(html).not.toMatch(/Red.*Hire/);
  });

  it('page title contains RhirePro', () => {
    expect(html).toContain('RhirePro');
  });

  it('footer link points to rhirepro.com', () => {
    expect(html).toContain('rhirepro.com');
  });

  it('no reference to old redhire.dev domain', () => {
    expect(html).not.toContain('redhire.dev');
  });

  it('no reference to old RedHire brand name', () => {
    expect(html).not.toContain('RedHire');
  });
});

// ── Source file branding checks ───────────────────────────────────────────────

describe('Branding — JobSeekerSignIn.tsx', () => {
  const src = readSrc('src/app/pages/JobSeekerSignIn.tsx');

  it('displays Rhire logo text (new brand prefix)', () => {
    // Logo rendered as: Rhire<span>Pro</span>
    expect(src).toContain('Rhire');
  });

  it('does not display old RedHire logo text', () => {
    expect(src).not.toMatch(/Red<span[^>]*>Hire/);
  });
});

describe('Branding — JobSeekerSignUp.tsx', () => {
  const src = readSrc('src/app/pages/JobSeekerSignUp.tsx');

  it('welcome message uses RhirePro', () => {
    expect(src).toContain('Welcome to RhirePro');
  });

  it('tagline uses RhirePro', () => {
    expect(src).toContain('RhirePro');
  });

  it('does not reference old brand RedHire', () => {
    expect(src).not.toContain('RedHire');
  });
});

describe('Branding — RecruiterSignIn.tsx', () => {
  const src = readSrc('src/app/pages/RecruiterSignIn.tsx');

  it('displays Rhire logo text (new brand prefix)', () => {
    // Logo rendered as: Rhire<span>Pro</span>
    expect(src).toContain('Rhire');
  });

  it('does not display old RedHire logo text', () => {
    expect(src).not.toMatch(/Red<span[^>]*>Hire/);
  });
});

describe('Branding — RecruiterSignUp.tsx', () => {
  const src = readSrc('src/app/pages/RecruiterSignUp.tsx');

  it('displays Rhire logo text (new brand prefix)', () => {
    // Logo rendered as: Rhire<span>Pro</span>
    expect(src).toContain('Rhire');
  });

  it('does not display old RedHire logo text', () => {
    expect(src).not.toMatch(/Red<span[^>]*>Hire/);
  });
});

describe('Branding — PublicReport.tsx', () => {
  const src = readSrc('src/app/pages/PublicReport.tsx');

  it('back button says RhirePro', () => {
    expect(src).toContain('Back to RhirePro');
  });

  it('footer link says RhirePro', () => {
    expect(src).toContain('RhirePro');
  });

  it('does not reference old RedHire brand', () => {
    expect(src).not.toContain('RedHire');
  });
});

describe('Branding — LandingPage.tsx contact email', () => {
  const src = readSrc('src/app/pages/LandingPage.tsx');

  it('support email uses rhirepro.com domain', () => {
    expect(src).toContain('support@rhirepro.com');
  });

  it('does not reference old redihire.com typo domain', () => {
    expect(src).not.toContain('redihire.com');
  });
});
