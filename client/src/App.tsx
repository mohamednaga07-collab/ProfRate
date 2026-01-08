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
  
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);
  
  return (
    <motion.div
      key={location}
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
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
                <Landing defaultTab="login" />
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
        <Route path="/admin/users">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : user?.role === "admin" ? <AdminUsers /> : <NotFound />}
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/admin/doctors">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : user?.role === "admin" ? <AdminDoctors /> : <NotFound />}
            </AnimatedPageWrapper>
          )}
        </Route>
        <Route path="/admin/reviews">
          {() => (
            <AnimatedPageWrapper>
              {!isAuthenticated ? <Landing /> : user?.role === "admin" ? <AdminReviews /> : <NotFound />}
            </AnimatedPageWrapper>
          )}
        </Route>
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
