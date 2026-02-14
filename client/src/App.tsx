import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
// Page imports - explicitly typed to help IDE resolution
import { Header } from "@/components/Header";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/Landing";
// Lazy load pages for performance
// Landing is eager loaded to prevent initialization race conditions and improve LCP
const Home = lazy(() => import("@/pages/Home"));
const DoctorListing = lazy(() => import("@/pages/DoctorListing"));
const DoctorProfile = lazy(() => import("@/pages/DoctorProfile"));
const Compare = lazy(() => import("@/pages/Compare"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ForgotUsername = lazy(() => import("@/pages/ForgotUsername"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail").then(module => ({ default: module.VerifyEmail })));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminDoctors = lazy(() => import("@/pages/AdminDoctors"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));

const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.99,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 30,
      mass: 0.8,
      velocity: 2,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98, // Slight shrink feel on exit
    transition: {
      duration: 0.4, // Longer exit for smoother dissolve
      ease: [0.43, 0.13, 0.23, 0.96], // Elegant ease-in-out
    },
  },
};

function AnimatedPageWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  React.useLayoutEffect(() => {
    // Reset scroll to top IMMEDIATELY before browser paint
    window.scrollTo(0, 0);
  }, [location, isAuthenticated, user?.id]);
  
  return (
    <motion.div
      // Use a combined key so that transitions trigger when logging/out on the same URL
      key={`${location}-${isAuthenticated}-${user?.id || 'guest'}`}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full flex-1 transition-[padding] duration-500 ${location === "/" ? "pt-0" : "pt-16"}`}
      style={{ willChange: "transform, opacity" }}
    >
      <div className={`w-full h-full ${location === "/" ? "min-h-screen" : "min-h-[calc(100vh-64px)]"}`}>
        {children}
      </div>
    </motion.div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  console.log("🔄 Router render - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user?.username);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <Switch location={location}>
        {/* Public routes - always accessible */}
        <Route path="/reset-password">
          {() => (
            <AnimatedPageWrapper>
              <ResetPassword />
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/verify-email">
          {() => (
            <AnimatedPageWrapper>
              <VerifyEmail />
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/forgot-password">
          {() => (
            <AnimatedPageWrapper>
              <ForgotPassword />
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/forgot-username">
          {() => (
            <AnimatedPageWrapper>
              <ForgotUsername />
            </AnimatedPageWrapper>
          )}
        </Route>

        {/* Login Route - Redirects to / but can be used as explicit login page */}
        <Route path="/login">
          {() => (
            <AnimatedPageWrapper>
              {isAuthenticated ? (
                user?.role === "admin" ? (
                  <AdminDashboard />
                ) : user?.role === "teacher" ? (
                  <TeacherDashboard />
                ) : (
                  <Home />
                )
              ) : (
                <Landing />
              )}
            </AnimatedPageWrapper>
          )}
        </Route>
        
        <Route path="/register">
          {() => (
            <AnimatedPageWrapper>
              {isAuthenticated ? (
                user?.role === "admin" ? (
                  <AdminDashboard />
                ) : user?.role === "teacher" ? (
                  <TeacherDashboard />
                ) : (
                  <Home />
                )
              ) : (
                <Landing defaultTab="register" />
              )}
            </AnimatedPageWrapper>
          )}
        </Route>
        
        {/* Root Route - Handles logic for different roles and auth state */}
        <Route path="/">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? (
                <Landing />
              ) : user?.role === "admin" ? (
                <AdminDashboard />
              ) : user?.role === "teacher" ? (
                <TeacherDashboard />
              ) : (
                <Home />
              )}
            </AnimatedPageWrapper>
          )}
        </Route>

        {/* Protected Routes - Show Landing if not authenticated */}
        <Route path="/doctors">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : <DoctorListing />}
            </AnimatedPageWrapper>
          )}
        </Route>
        
        <Route path="/doctors/:id">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : <DoctorProfile />}
            </AnimatedPageWrapper>
          )}
        </Route>

        <Route path="/compare">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : <Compare />}
            </AnimatedPageWrapper>
          )}
        </Route>

        <Route path="/teacher-dashboard">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : <TeacherDashboard />}
            </AnimatedPageWrapper>
          )}
        </Route>

        <Route path="/admin">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? (
                <Landing />
              ) : user?.role === "admin" ? (
                <AdminDashboard />
              ) : (
                <NotFound />
              )}
            </AnimatedPageWrapper>
          )}
        </Route>
        {/* Removed admin management routes for Users, Doctors, Reviews */}
        <Route path="/admin/analytics">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : user?.role === "admin" ? <AdminAnalytics /> : <NotFound />}
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/admin/settings">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : user?.role === "admin" ? <AdminSettings /> : <NotFound />}
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/profile/settings">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : <ProfileSettings />}
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route>
          {() => (
            <AnimatedPageWrapper>
              <NotFound />
            </AnimatedPageWrapper>
          )}
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  const { i18n } = useTranslation();

  // Handle RTL/LTR document direction
  React.useLayoutEffect(() => {
    const isRTL = i18n.language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Header />
        <ErrorBoundary>
          <Suspense 
            fallback={
              <div className="w-full min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              </div>
            }
          >
            <Router />
          </Suspense>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
