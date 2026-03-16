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
import JobListingsPage from "./pages/JobListingsPage";
import JobDetailPage from "./pages/JobDetailPage";
import ServicesPage from "./pages/ServicesPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import NotFound from "./pages/NotFound";
import ErrorPage from "./pages/ErrorPage";

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
    path: "*",
    Component: NotFound,
  },
    ],
  },
]);