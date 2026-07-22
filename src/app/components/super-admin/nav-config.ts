import {
  LayoutDashboard,
  UsersRound,
  UserRound,
  Building2,
  Briefcase,
  FileStack,
  CreditCard,
  DollarSign,
  Receipt,
  MessagesSquare,
  Mail,
  Bell,
  FileBarChart,
  BarChart3,
  ScrollText,
  Activity,
  Radio,
  ListTodo,
  Database,
  HardDrive,
  LifeBuoy,
  MessageSquareHeart,
  ShieldCheck,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface SuperAdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  status: "active" | "soon";
  description?: string;
}

export interface SuperAdminNavGroup {
  label: string;
  items: SuperAdminNavItem[];
}

export const superAdminNavGroups: SuperAdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/super-admin", icon: LayoutDashboard, status: "active" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Recruiters", path: "/super-admin/recruiters", icon: UsersRound, status: "active" },
      { label: "Job Seekers", path: "/super-admin/jobseekers", icon: UserRound, status: "active" },
      {
        label: "Companies",
        path: "/super-admin/companies",
        icon: Building2,
        status: "active",
        description: "A dedicated company directory, distinct from individual recruiter accounts, with verification and branding controls.",
      },
    ],
  },
  {
    label: "Hiring",
    items: [
      { label: "Jobs", path: "/super-admin/jobs", icon: Briefcase, status: "active" },
      { label: "Applications", path: "/super-admin/applications", icon: FileStack, status: "active" },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Subscriptions",
        path: "/super-admin/subscriptions",
        icon: CreditCard,
        status: "active",
        description: "Manage recruiter subscription plans, upgrades, downgrades, and renewals directly.",
      },
      {
        label: "Revenue",
        path: "/super-admin/revenue",
        icon: DollarSign,
        status: "active",
        description: "Revenue breakdowns by plan, cohort, and time period, built on payment_transactions.",
      },
      {
        label: "Transactions",
        path: "/super-admin/transactions",
        icon: Receipt,
        status: "active",
        description: "A searchable ledger of every payment transaction with refund and dispute tools.",
      },
    ],
  },
  {
    label: "Communications",
    items: [
      {
        label: "Communications",
        path: "/super-admin/communications",
        icon: MessagesSquare,
        status: "active",
        description: "A unified center for broadcast messaging across email, SMS, and push.",
      },
      {
        label: "Emails",
        path: "/super-admin/emails",
        icon: Mail,
        status: "active",
        description: "Delivery logs and templates for every transactional email sent through Brevo.",
      },
      {
        label: "Notifications",
        path: "/super-admin/notifications",
        icon: Bell,
        status: "active",
        description: "Platform-wide notification delivery stats and manual broadcast tools.",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Reports",
        path: "/super-admin/reports",
        icon: FileBarChart,
        status: "active",
        description: "Scheduled and on-demand exports — PDF, Excel, and CSV — of platform activity.",
      },
      {
        label: "Analytics",
        path: "/super-admin/analytics",
        icon: BarChart3,
        status: "active",
        description: "Deeper cohort, retention, and funnel analytics beyond the main Dashboard.",
      },
      {
        label: "Audit Logs",
        path: "/super-admin/audit-logs",
        icon: ScrollText,
        status: "active",
        description: "A full trail of every admin action — who changed what, when, and from where.",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "System Health",
        path: "/super-admin/system-health",
        icon: Activity,
        status: "active",
        description: "Real infrastructure signals available to this stack — Supabase and Storage status — without fabricated server metrics this architecture doesn't have.",
      },
      {
        label: "API Monitoring",
        path: "/super-admin/api-monitoring",
        icon: Radio,
        status: "active",
        description: "Request volume and error-rate tracking for the Netlify Functions layer.",
      },
      {
        label: "Background Jobs",
        path: "/super-admin/background-jobs",
        icon: ListTodo,
        status: "active",
        description: "Visibility into scheduled tasks such as job-expiry sweeps.",
      },
      {
        label: "Database",
        path: "/super-admin/database",
        icon: Database,
        status: "active",
        description: "Table sizes and row-growth trends read directly from Supabase.",
      },
      {
        label: "Storage",
        path: "/super-admin/storage",
        icon: HardDrive,
        status: "active",
        description: "Usage breakdown for the resumes, reports, and offer-letters storage buckets.",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "Support Tickets",
        path: "/super-admin/support-tickets",
        icon: LifeBuoy,
        status: "active",
        description: "A ticketing queue for recruiter and job-seeker support requests.",
      },
      {
        label: "Feedback",
        path: "/super-admin/feedback",
        icon: MessageSquareHeart,
        status: "active",
        description: "Browse and moderate the ratings and comments already collected in the feedback table.",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Roles & Permissions",
        path: "/super-admin/roles",
        icon: ShieldCheck,
        status: "active",
        description: "Granular permission scopes for admin team members beyond the single super-admin role.",
      },
      {
        label: "Admin Team",
        path: "/super-admin/admin-team",
        icon: UserCog,
        status: "active",
        description: "Invite and manage additional super_admins rows without touching environment variables.",
      },
      {
        label: "Settings",
        path: "/super-admin/settings",
        icon: Settings,
        status: "active",
        description: "Platform branding, SEO, SMTP, and security policy configuration.",
      },
    ],
  },
];

export function findNavItemByPath(pathname: string): SuperAdminNavItem | undefined {
  for (const group of superAdminNavGroups) {
    for (const item of group.items) {
      if (item.path === pathname) return item;
    }
  }
  return undefined;
}
