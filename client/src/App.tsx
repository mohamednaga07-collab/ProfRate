import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
// Page imports - explicitly typed to help IDE resolution
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import DoctorListing from "@/pages/DoctorListing";
import DoctorProfile from "@/pages/DoctorProfile";
import Compare from "@/pages/Compare";
import TeacherDashboard from "@/pages/TeacherDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import ForgotUsername from "@/pages/ForgotUsername";
import ResetPassword from "@/pages/ResetPassword";
import { VerifyEmail } from "@/pages/VerifyEmail";
import NotFound from "@/pages/not-found";
import AdminUsers from "@/pages/AdminUsers";
import AdminDoctors from "@/pages/AdminDoctors";
import AdminReviews from "@/pages/AdminReviews";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminSettings from "@/pages/AdminSettings";
import ProfileSettings from "@/pages/ProfileSettings";
import { useTranslation } from "react-i18next";

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
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
    >
      {children}
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
