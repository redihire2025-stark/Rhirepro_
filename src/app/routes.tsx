import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from "react-router";
import ApplicantProfilePage from "./pages/ApplicantProfilePage";
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import JobSeekerSignIn from "./pages/JobSeekerSignIn";
import JobSeekerSignUp from "./pages/JobSeekerSignUp";
import RecruiterSignIn from "./pages/RecruiterSignIn";
import RecruiterSignUp from "./pages/RecruiterSignUp";
import JobSeekerDashboard from "./pages/JobSeekerDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import PlanDetailsPage from "./pages/PlanDetailsPage";
import PaymentGatewayPage from "./pages/PaymentGatewayPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import JobListingsPage from "./pages/JobListingsPage";
import JobDetailPage from "./pages/JobDetailPage";
import ServicesPage from "./pages/ServicesPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import TalentSourcingPage from "./pages/services/TalentSourcingPage";
import ExecutiveSearchPage from "./pages/services/ExecutiveSearchPage";
import ProjectBasedHiringPage from "./pages/services/ProjectBasedHiringPage";
import CareerCoachingPage from "./pages/services/CareerCoachingPage";
import JobMatchingPage from "./pages/services/JobMatchingPage";
import BrandingSupportPage from "./pages/services/BrandingSupportPage";
import NotFound from "./pages/NotFound";
import ErrorPage from "./pages/ErrorPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import OrgAdminPanel from "./pages/OrgAdminPanel";
import RecruiterInviteAccept from "./pages/RecruiterInviteAccept";
import SuperAdminLoginPage from "./pages/super-admin/SuperAdminLoginPage";
import SuperAdminLayout from "./pages/super-admin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminRecruiters from "./pages/super-admin/SuperAdminRecruiters";
import SuperAdminJobSeekers from "./pages/super-admin/SuperAdminJobSeekers";
import SuperAdminJobs from "./pages/super-admin/SuperAdminJobs";
import SuperAdminApplications from "./pages/super-admin/SuperAdminApplications";
import SuperAdminCompanies from "./pages/super-admin/SuperAdminCompanies";
import SuperAdminSubscriptions from "./pages/super-admin/SuperAdminSubscriptions";
import SuperAdminRevenue from "./pages/super-admin/SuperAdminRevenue";
import SuperAdminTransactions from "./pages/super-admin/SuperAdminTransactions";
import SuperAdminCommunications from "./pages/super-admin/SuperAdminCommunications";
import SuperAdminEmails from "./pages/super-admin/SuperAdminEmails";
import SuperAdminNotifications from "./pages/super-admin/SuperAdminNotifications";
import SuperAdminReports from "./pages/super-admin/SuperAdminReports";
import SuperAdminAnalytics from "./pages/super-admin/SuperAdminAnalytics";
import SuperAdminAuditLogs from "./pages/super-admin/SuperAdminAuditLogs";
import SuperAdminSystemHealth from "./pages/super-admin/SuperAdminSystemHealth";
import SuperAdminApiMonitoring from "./pages/super-admin/SuperAdminApiMonitoring";
import SuperAdminBackgroundJobs from "./pages/super-admin/SuperAdminBackgroundJobs";
import SuperAdminDatabase from "./pages/super-admin/SuperAdminDatabase";
import SuperAdminStorage from "./pages/super-admin/SuperAdminStorage";
import SuperAdminSupportTickets from "./pages/super-admin/SuperAdminSupportTickets";
import SuperAdminFeedback from "./pages/super-admin/SuperAdminFeedback";
import SuperAdminRoles from "./pages/super-admin/SuperAdminRoles";
import SuperAdminAdminTeam from "./pages/super-admin/SuperAdminAdminTeam";
import SuperAdminSettings from "./pages/super-admin/SuperAdminSettings";

function RootLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    errorElement: <ErrorPage />,
    children: [
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/signin",
    Component: SignInPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/signup",
    Component: SignUpPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/jobs",
    Component: JobListingsPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/job/:id",
    Component: JobDetailPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services",
    Component: ServicesPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/talent-sourcing",
    Component: TalentSourcingPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/executive-search",
    Component: ExecutiveSearchPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/project-based-hiring",
    Component: ProjectBasedHiringPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/career-coaching",
    Component: CareerCoachingPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/job-matching",
    Component: JobMatchingPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/services/branding-support",
    Component: BrandingSupportPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/blog",
    Component: BlogPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/blog/:id",
    Component: BlogDetailPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/jobseeker/signin",
    Component: JobSeekerSignIn,
    errorElement: <ErrorPage />,
  },
  {
    path: "/jobseeker/signup",
    Component: JobSeekerSignUp,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/plan-details",
    Component: PlanDetailsPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/payment",
    Component: PaymentGatewayPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/payment/status",
    Component: PaymentStatusPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/signin",
    Component: RecruiterSignIn,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/signup",
    Component: RecruiterSignUp,
    errorElement: <ErrorPage />,
  },
  {
    path: "/jobseeker/dashboard/*",
    Component: JobSeekerDashboard,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/dashboard/*",
    Component: RecruiterDashboard,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/org-admin/*",
    Component: () => <Navigate to="/recruiter/admin" replace />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/candidate/:candidateId/profile",
    Component: ApplicantProfilePage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/applicant/:applicantId/profile",
    Component: ApplicantProfilePage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/privacy-policy",
    Component: PrivacyPolicyPage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/terms-of-service",
    Component: TermsOfServicePage,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/admin",
    Component: OrgAdminPanel,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/admin/member/:memberId",
    Component: OrgAdminPanel,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recruiter/join/:token",
    Component: RecruiterInviteAccept,
    errorElement: <ErrorPage />,
  },
  {
    path: "/super-admin/login",
    Component: SuperAdminLoginPage,
    errorElement: <ErrorPage />,
  },
  {
    Component: SuperAdminLayout,
    errorElement: <ErrorPage />,
    children: [
      { path: "/super-admin", Component: SuperAdminDashboard },
      { path: "/super-admin/recruiters", Component: SuperAdminRecruiters },
      { path: "/super-admin/jobseekers", Component: SuperAdminJobSeekers },
      { path: "/super-admin/jobs", Component: SuperAdminJobs },
      { path: "/super-admin/applications", Component: SuperAdminApplications },
      { path: "/super-admin/companies", Component: SuperAdminCompanies },
      { path: "/super-admin/subscriptions", Component: SuperAdminSubscriptions },
      { path: "/super-admin/revenue", Component: SuperAdminRevenue },
      { path: "/super-admin/transactions", Component: SuperAdminTransactions },
      { path: "/super-admin/communications", Component: SuperAdminCommunications },
      { path: "/super-admin/emails", Component: SuperAdminEmails },
      { path: "/super-admin/notifications", Component: SuperAdminNotifications },
      { path: "/super-admin/reports", Component: SuperAdminReports },
      { path: "/super-admin/analytics", Component: SuperAdminAnalytics },
      { path: "/super-admin/audit-logs", Component: SuperAdminAuditLogs },
      { path: "/super-admin/system-health", Component: SuperAdminSystemHealth },
      { path: "/super-admin/api-monitoring", Component: SuperAdminApiMonitoring },
      { path: "/super-admin/background-jobs", Component: SuperAdminBackgroundJobs },
      { path: "/super-admin/database", Component: SuperAdminDatabase },
      { path: "/super-admin/storage", Component: SuperAdminStorage },
      { path: "/super-admin/support-tickets", Component: SuperAdminSupportTickets },
      { path: "/super-admin/feedback", Component: SuperAdminFeedback },
      { path: "/super-admin/roles", Component: SuperAdminRoles },
      { path: "/super-admin/admin-team", Component: SuperAdminAdminTeam },
      { path: "/super-admin/settings", Component: SuperAdminSettings },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
    ],
  },
]);