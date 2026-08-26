import { getActiveSubscriptionForCaller, resolveCaller, json } from "../shared/jobseekerPayments.mjs";

/*
 * GET /api/jobseeker-plan-status
 *
 * Single source of truth for "does this job seeker currently have Premium".
 * Every gated feature (resume templates, Trending Skills, Suggested
 * Certifications, Compare Jobs) calls this rather than re-implementing the
 * check, so the same identity-resolution and same-email defensive lookup
 * (see getActiveSubscriptionForCaller) is applied everywhere consistently.
 */
export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const caller = await resolveCaller(request);
  if (!caller) {
    return json({ isPremium: false, error: "Not signed in." }, 401);
  }

  try {
    const { subscription, viaLinkedEmail } = await getActiveSubscriptionForCaller(caller);
    return json(
      {
        isPremium: !!subscription,
        expiresAt: subscription?.expires_at ?? null,
        planId: subscription?.plan_id ?? null,
        viaLinkedEmail,
      },
      200,
    );
  } catch (err) {
    console.error("[jobseeker-plan-status] unhandled:", err);
    // Fail closed — never grant access when the check itself errors.
    return json({ isPremium: false, error: "Could not verify plan status." }, 500);
  }
};

export const config = { path: "/api/jobseeker-plan-status" };
