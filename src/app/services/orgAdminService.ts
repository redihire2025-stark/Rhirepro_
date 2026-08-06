import { supabase, RecruiterProfile, RecruiterArticle } from "../../lib/supabase";

export interface OverviewKpis {
  totalRecruiters: number;
  activeRecruiters: number;
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  totalCandidates: number;
  applicationsToday: number;
  interviewsScheduled: number;
  offersReleased: number;
  successfulHires: number;
}

export interface SendInvitationParams {
  inviteEmail: string;
  recruiterProfile: RecruiterProfile;
  userId: string;
  activeCount: number;
  existingInvitations: Array<{ invited_email: string; status: string }>;
}

export interface SaveArticleParams {
  editingBlog: RecruiterArticle | null;
  blogTitle: string;
  blogSummary: string;
  blogCategory: string;
  blogTags: string;
  blogContent: string;
  blogCoverUrl: string;
  blogStatus: "Draft" | "Published";
  userId: string;
  orgId: string | null;
}

/**
 * Service containing Org Admin business logic rules, invitation checks, KPI calculations, and database mutations.
 */
export const orgAdminService = {
  /**
   * Validates whether a company is authorized to invite team members or publish resources.
   */
  validateCompanyVerification(recruiterProfile: RecruiterProfile | null): { allowed: boolean; reason?: string } {
    if (!recruiterProfile) {
      return { allowed: false, reason: "Recruiter profile not loaded." };
    }
    if (recruiterProfile.verification_status === "Pending") {
      return {
        allowed: false,
        reason: "Your company verification is pending. You cannot invite team members until your company is verified by Super Admin.",
      };
    }
    if (recruiterProfile.verification_status === "Rejected") {
      return {
        allowed: false,
        reason: "Your company verification was rejected. Team invitations are disabled.",
      };
    }
    return { allowed: true };
  },

  /**
   * Sends an invitation to a prospective team member after validating domain rules and seat limits.
   */
  async sendTeamInvitation({
    inviteEmail,
    recruiterProfile,
    userId,
    activeCount,
    existingInvitations,
  }: SendInvitationParams): Promise<{ success: boolean; error?: string }> {
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: "Please enter a valid email address." };
    }

    // 1. Verification status check
    const verificationCheck = this.validateCompanyVerification(recruiterProfile);
    if (!verificationCheck.allowed) {
      return { success: false, error: verificationCheck.reason };
    }

    // 2. Seat limit check
    const maxSeats = recruiterProfile.max_seats || 5;
    if (activeCount >= maxSeats) {
      return { success: false, error: `Seat limit reached (${maxSeats} seats). Upgrade your plan to add more.` };
    }

    // 3. Pending invitation check
    const pendingExists = existingInvitations.some(
      (inv) => inv.invited_email.toLowerCase() === trimmedEmail && inv.status === "pending"
    );
    if (pendingExists) {
      return { success: false, error: "A pending invitation already exists for this email." };
    }

    // 4. Domain matching check
    const adminDomain = recruiterProfile.email?.split("@")[1]?.toLowerCase();
    const inviteDomain = trimmedEmail.split("@")[1]?.toLowerCase();
    if (!adminDomain || !inviteDomain || adminDomain !== inviteDomain) {
      return { success: false, error: `You can only invite members with a matching email domain (@${adminDomain || ""}).` };
    }

    // 5. Send invite via serverless function
    const res = await fetch("/api/send-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_admin_id: userId,
        company_name: recruiterProfile.company_name || "",
        invited_email: trimmedEmail,
        invited_by_name: recruiterProfile.recruiter_name || recruiterProfile.company_name || "Admin",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to send invitation" }));
      return { success: false, error: err.error || "Failed to send invitation" };
    }

    return { success: true };
  },

  /**
   * Updates an org member's status (activate, deactivate, remove).
   */
  async updateMemberStatus(
    memberId: string,
    action: "deactivate" | "activate" | "remove"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (action === "deactivate") {
        const { error } = await supabase.from("recruiter_profiles").update({ is_active: false }).eq("id", memberId);
        if (error) throw error;
      } else if (action === "activate") {
        const { error } = await supabase.from("recruiter_profiles").update({ is_active: true }).eq("id", memberId);
        if (error) throw error;
      } else if (action === "remove") {
        const { error } = await supabase
          .from("recruiter_profiles")
          .update({ org_admin_id: null, is_active: false })
          .eq("id", memberId);
        if (error) throw error;
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update member status." };
    }
  },

  /**
   * Pure function to calculate Overview Tab KPIs from aggregated team data.
   */
  calculateOverviewKpis(
    members: Array<{ is_active: boolean }>,
    teamJobs: Array<{ status: string }>,
    teamApps: Array<{ profile_id: string; applied_at: string; status: string }>
  ): OverviewKpis {
    const todayStr = new Date().toDateString();
    const activeRecruiters = members.filter((m) => m.is_active).length;

    return {
      totalRecruiters: members.length,
      activeRecruiters,
      totalJobs: teamJobs.length,
      activeJobs: teamJobs.filter((j) => j.status === "Active").length,
      closedJobs: teamJobs.filter((j) => j.status === "Closed").length,
      totalCandidates: new Set(teamApps.map((a) => a.profile_id)).size,
      applicationsToday: teamApps.filter((a) => new Date(a.applied_at).toDateString() === todayStr).length,
      interviewsScheduled: teamApps.filter((a) => a.status === "Interview Scheduled").length,
      offersReleased: teamApps.filter((a) => a.status === "Offered").length,
      successfulHires: teamApps.filter((a) => ["Hired", "Joined"].includes(a.status)).length,
    };
  },

  /**
   * Toggles the publication status of an article.
   */
  async toggleArticlePublishStatus(blog: RecruiterArticle): Promise<{ success: boolean; error?: string }> {
    const newStatus = blog.status === "Published" ? "Draft" : "Published";
    try {
      const { error } = await supabase
        .from("recruiter_articles")
        .update({
          status: newStatus,
          published_at: newStatus === "Published" ? new Date().toISOString() : blog.published_at,
        })
        .eq("id", blog.id);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update article status." };
    }
  },

  /**
   * Deletes an article from the database.
   */
  async deleteArticle(blogId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("recruiter_articles").delete().eq("id", blogId);
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete article." };
    }
  },
};
