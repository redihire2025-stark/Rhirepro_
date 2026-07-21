import { Navigate, Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { SuperAdminAuthProvider, useSuperAdminAuth } from "../../../lib/super-admin-auth-context";
import { SuperAdminSidebar } from "../../components/super-admin/SuperAdminSidebar";
import { SuperAdminHeader } from "../../components/super-admin/SuperAdminHeader";
import { Skeleton } from "../../components/ui/skeleton";
import { Toaster } from "../../components/ui/sonner";

function SuperAdminLayoutInner() {
  const { session, superAdmin, loading } = useSuperAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden md:block w-64 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!session || !superAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster position="top-right" />
      <SuperAdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <SuperAdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function SuperAdminLayout() {
  return (
    <SuperAdminAuthProvider>
      <SuperAdminLayoutInner />
    </SuperAdminAuthProvider>
  );
}
