import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router";
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

function RootLayout() {
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
    path: "/recruiter/join/:token",
    Component: RecruiterInviteAccept,
    errorElement: <ErrorPage />,
  },
  {
    path: "*",
    Component: NotFound,
  },
    ],
  },
]);