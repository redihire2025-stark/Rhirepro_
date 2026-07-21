import { describe, it, expect } from 'vitest';
import { router } from '../app/routes';

// ── Route configuration ───────────────────────────────────────────────────────

describe('Router — route definitions', () => {
  const routes = router.routes;

  it('router is defined and has routes', () => {
    expect(router).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('has a root layout wrapping all routes', () => {
    // The top-level route has children
    expect(routes[0].children).toBeDefined();
    expect(routes[0].children!.length).toBeGreaterThan(0);
  });

  function getChildPaths(): string[] {
    return (routes[0].children || []).map((r: { path?: string }) => r.path ?? '');
  }

  it('defines the landing page route (/)', () => {
    expect(getChildPaths()).toContain('/');
  });

  it('defines the unified signin route (/signin)', () => {
    expect(getChildPaths()).toContain('/signin');
  });

  it('defines the unified signup route (/signup)', () => {
    expect(getChildPaths()).toContain('/signup');
  });

  it('defines the job seeker signin route (/jobseeker/signin)', () => {
    expect(getChildPaths()).toContain('/jobseeker/signin');
  });

  it('defines the job seeker signup route (/jobseeker/signup)', () => {
    expect(getChildPaths()).toContain('/jobseeker/signup');
  });

  it('defines the recruiter signin route (/recruiter/signin)', () => {
    expect(getChildPaths()).toContain('/recruiter/signin');
  });

  it('defines the recruiter signup route (/recruiter/signup)', () => {
    expect(getChildPaths()).toContain('/recruiter/signup');
  });

  it('defines the job seeker dashboard route (/jobseeker/dashboard/*)', () => {
    expect(getChildPaths()).toContain('/jobseeker/dashboard/*');
  });

  it('defines the recruiter dashboard route (/recruiter/dashboard/*)', () => {
    expect(getChildPaths()).toContain('/recruiter/dashboard/*');
  });

  it('defines the jobs listing route (/jobs)', () => {
    expect(getChildPaths()).toContain('/jobs');
  });

  it('defines the job detail route (/job/:id)', () => {
    expect(getChildPaths()).toContain('/job/:id');
  });

  it('defines the services route (/services)', () => {
    expect(getChildPaths()).toContain('/services');
  });

  it('defines the blog route (/blog)', () => {
    expect(getChildPaths()).toContain('/blog');
  });

  it('defines the blog detail route (/blog/:id)', () => {
    expect(getChildPaths()).toContain('/blog/:id');
  });

  it('defines a catch-all 404 route (*)', () => {
    expect(getChildPaths()).toContain('*');
  });

  it('has 28 child routes total', () => {
    // /, /signin, /signup, /jobs, /job/:id, /services, /blog, /blog/:id,
    // /jobseeker/signin, /jobseeker/signup, /recruiter/signin, /recruiter/signup,
    // /jobseeker/dashboard/*, /recruiter/dashboard/*, *
    expect(getChildPaths().length).toBe(32);
  });

  it('each child route has a Component', () => {
    for (const child of routes[0].children || []) {
      expect((child as any).Component ?? (child as any).element, `Route ${child.path} has no Component`).toBeDefined();
    }
  });
});
