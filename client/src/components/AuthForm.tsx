import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import { Link } from "wouter";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, User, Lock, UserCircle, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { apiRequest, queryClient, prefetchCsrfToken } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface AuthFormProps {
  onSuccess?: () => void;
  defaultTab?: "login" | "register";
}

export function AuthForm({ onSuccess, defaultTab = "login" }: AuthFormProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync activeTab with defaultTab prop when it changes (e.g. navigation /login <-> /register)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const authCardRef = useRef<HTMLDivElement>(null);

  const recaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";


  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginAs, setLoginAs] = useState<"student" | "teacher">("student");
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState<string | null>(null);
  const loginRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [isDetectedAdmin, setIsDetectedAdmin] = useState(false);
  const isInitialMount = useRef(true);

  // Admin check - runs immediately on mount and with reduced debounce on changes
  useEffect(() => {
    const checkAdmin = async () => {
      if (!loginUsername || loginUsername.length < 3) {
        setIsDetectedAdmin(false);
        return;
      }
      
      // Don't check API if it's exactly "Admin" (case-sensitive default admin account)
      if (loginUsername === "Admin") return;

      try {
        console.log(`🔍 Checking if user '${loginUsername}' is admin...`);
        const res = await fetch(`/api/auth/is-admin/${encodeURIComponent(loginUsername)}`);
        if (res.ok) {
           const data = await res.json();
           console.log(`🔍 Admin check result for '${loginUsername}':`, data.isAdmin);
           setIsDetectedAdmin(data.isAdmin);
        }
      } catch (e) {
        console.error("❌ Admin check failed:", e);
        setIsDetectedAdmin(false);
      }
    };

    // On initial mount, check immediately if username is present (e.g., from autofill)
    if (isInitialMount.current && loginUsername && loginUsername.length >= 3) {
      isInitialMount.current = false;
      checkAdmin();
      return;
    }
    
    isInitialMount.current = false;

    // For subsequent changes, use a short debounce (150ms feels instant but avoids excessive API calls)
    const timer = setTimeout(checkAdmin, 150);
    return () => clearTimeout(timer);
  }, [loginUsername]);

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerRole, setRegisterRole] = useState<"student" | "teacher">("student");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Admin detection: Database authorization FIRST, then exact "Admin" username match
  const isAdminLogin = isDetectedAdmin || loginUsername === "Admin";

  // Check for existing reCAPTCHA verification in session
  const checkRecaptchaVerification = () => {
    const verification = localStorage.getItem('recaptcha_verified');
    console.log('🔍 Checking reCAPTCHA verification:', verification);
    if (verification) {
      const timestamp = parseInt(verification, 10);
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      const timeLeft = thirtyMinutes - (now - timestamp);

      console.log('⏰ Time since verification:', Math.floor((now - timestamp) / 1000), 'seconds');
      console.log('⏰ Time left:', Math.floor(timeLeft / 1000), 'seconds');

      if (now - timestamp < thirtyMinutes) {
        console.log('✅ Session is verified!');
        setIsSessionVerified(true);
        return true;
      } else {
        console.log('❌ Session expired, removing verification');
        localStorage.removeItem('recaptcha_verified');
        setIsSessionVerified(false);
        return false;
      }
    }
    console.log('❌ No verification found');
    return false;
  };

  const markRecaptchaVerified = () => {
    const now = Date.now();
    console.log('✅ Marking reCAPTCHA as verified at:', new Date(now).toISOString());
    localStorage.setItem('recaptcha_verified', now.toString());
    setIsSessionVerified(true);
  };

  // Detect dark mode preference and check reCAPTCHA verification
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Initial check
    checkRecaptchaVerification();

    // Prefetch CSRF token to speed up first POST (login/register)
    prefetchCsrfToken();

    // Check expiration every second
    const interval = setInterval(checkRecaptchaVerification, 1000);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDarkNow);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Calculate password strength
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setRegisterPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
    setValidationErrors([]); // Clear validation errors on password change
  };

  const validateRegisterForm = () => {
    const errors: string[] = [];

    // Validate Email
    if (!registerEmail) {
      errors.push(t("auth.validation.emailRequired", { defaultValue: "Email is required" }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      errors.push(t("auth.validation.emailInvalid", { defaultValue: "Email must be valid" }));
    }

    // Validate Username
    if (!registerUsername) {
      errors.push(t("auth.validation.usernameRequired", { defaultValue: "Username is required" }));
    } else if (registerUsername.length < 3) {
      errors.push(t("auth.validation.usernameTooShort", { defaultValue: "Username must be at least 3 characters" }));
    } else if (registerUsername.toLowerCase() === "admin") {
      errors.push(t("auth.errors.usernameReserved", { username: "admin" }));
    }

    if (!registerPassword) errors.push(t("auth.validation.passwordRequired", { defaultValue: "Password is required" }));
    if (registerPassword !== registerPasswordConfirm) errors.push(t("auth.validation.passwordsDontMatch", { defaultValue: "Passwords do not match" }));

    // Relaxed password rules check (>= 40 is fair)
    if (passwordStrength < 40) {
      errors.push(t("auth.errors.passwordTooWeakDesc"));
    }

    if (recaptchaEnabled && !recaptchaToken && !isSessionVerified) {
      errors.push(t("auth.validation.recaptchaRequired", { defaultValue: "Please verify you are human" }));
    }

    if (!registerFirstName.trim()) errors.push(t("auth.validation.firstNameRequired", { defaultValue: "First Name is required" }));
    if (!registerLastName.trim()) errors.push(t("auth.validation.lastNameRequired", { defaultValue: "Last Name is required" }));

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getPasswordStrengthColor = (): string => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (): string => {
    if (passwordStrength < 40) return t("auth.passwordStrength.weak");
    if (passwordStrength < 70) return t("auth.passwordStrength.fair");
    return t("auth.passwordStrength.strong");
  };

  const canSubmitRegister = (): boolean => {
    const hasEmail = registerEmail.trim().length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail);
    const hasUsername = registerUsername.trim().length >= 3;
    const passwordsMatch = registerPassword === registerPasswordConfirm && registerPassword.length >= 8;
    const passwordStrong = passwordStrength >= 40; // Relaxed check
    const namesFilled = registerFirstName.trim().length > 0 && registerLastName.trim().length > 0;
    return hasEmail && hasUsername && passwordsMatch && passwordStrong && namesFilled;
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    // Mark user as verified for 30 minutes across all forms
    if (token) {
      markRecaptchaVerified();
      setTimeout(() => {
        setRecaptchaToken(null);
      }, 120000);
    }
  };

  const handleRegisterTab = () => {
    setActiveTab("register");
    setRecaptchaToken(null);
    setLoginRecaptchaToken(null);
  };

  const handleLoginTab = () => {
    setActiveTab("login");
    setLoginRecaptchaToken(null);
  };

  const handleLoginRecaptchaChange = (token: string | null) => {
    setLoginRecaptchaToken(token);
    // Mark user as verified for 30 minutes across all forms
    if (token) {
      markRecaptchaVerified();
      setTimeout(() => {
        setLoginRecaptchaToken(null);
      }, 120000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔄 handleLogin called");

    if (!loginUsername.trim()) {
      console.log("⚠️ Showing username required toast");
      toast({
        title: t("auth.errors.usernameRequiredTitle"),
        description: t("auth.errors.usernameRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!loginPassword.trim()) {
      console.log("⚠️ Showing password required toast");
      toast({
        title: t("auth.errors.passwordRequiredTitle"),
        description: t("auth.errors.passwordRequiredDescription"),
        variant: "destructive",
      });
      return;
    }



    // Verify reCAPTCHA - only if enabled, not an admin, NO valid session, and no fresh token
    const isActuallyVerified = isSessionVerified || !!loginRecaptchaToken;
    
    if (!isAdminLogin && recaptchaEnabled && !isActuallyVerified) {
      console.log("⚠️ Showing reCAPTCHA required toast - isSessionVerified:", isSessionVerified, "hasToken:", !!loginRecaptchaToken);
      toast({
        title: t("auth.errors.recaptchaRequiredTitle"),
        description: t("auth.errors.recaptchaRequiredDescription"),
        variant: "destructive",
      });
      setIsLoading(false); // Make sure to stop loading
      return;
    }

    setIsLoading(true);

    try {
      const requestData = {
        username: loginUsername,
        password: loginPassword,
        role: isAdminLogin ? "admin" : loginAs,
        recaptchaToken: loginRecaptchaToken,
        skipRecaptcha: isSessionVerified && !loginRecaptchaToken,
      };

      console.log("🔐 Attempting login with:", {
        username: loginUsername,
        hasToken: !!loginRecaptchaToken,
        skipRecaptcha: requestData.skipRecaptcha,
        isSessionVerified: isSessionVerified,
        recaptchaEnabled: recaptchaEnabled
      });

      const responseObj: any = await apiRequest("POST", "/api/auth/login", requestData);

      // apiRequest returns a Response object, we need to parse JSON
      const response = await responseObj.json();
      console.log("✅ Login response received:", response);

      if (response?.user) {
        console.log("✅ Login successful! User:", response.user);

        // Show success message with role awareness
        const actualRole = response.user.role;
        const selectedRole = isAdminLogin ? "admin" : loginAs;
        
        console.log("📢 Showing success toast");
        if (actualRole !== selectedRole && actualRole !== "admin") {
          toast({
            title: t("auth.success.login"),
            description: t("auth.errors.roleMismatchDesc", { role: actualRole }),
          });
        } else {
          toast({
            title: t("auth.success.login"),
            description: t("auth.success.loginWelcome", { name: response.user.firstName || loginUsername }),
          });
        }

        // Clear login form
        setLoginUsername("");
        setLoginPassword("");
        setLoginRecaptchaToken(null);

        // Update auth state immediately so routing reacts instantly
        queryClient.setQueryData(["/api/auth/user"], response.user);

        // Redirect based on user role
        let finalTarget = "/";
        if (response.user.role === "admin") {
          finalTarget = "/admin";
        } else if (response.user.role === "teacher") {
          finalTarget = "/teacher-dashboard";
        }

        if (onSuccess) onSuccess();

        // Short delay to show toast, but keep it snappy
        console.log("🔄 Redirecting to:", finalTarget);
        setTimeout(() => {
          window.location.assign(finalTarget);
        }, 1500); // Increased delay slightly to allow reading the role warning toast if applicable
      } else {
        throw new Error("Login failed - no user data returned");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);

      const errorMessage = error?.message || "";
      console.log("📝 Error message:", errorMessage);

      // Check for user not found errors (invalid username or password)
      if (/invalid username or password|username.*found|cannot be found|check your username or create/i.test(errorMessage) || error?.response?.status === 401) {
        console.log("📢 Login failed - Invalid credentials or unregistered username");
        toast({
          title: t("auth.errors.loginFailed"),
          description: t("auth.errors.userNotFoundDesc", { username: loginUsername }),
          variant: "destructive",
          duration: 5000,
        });

        setIsLoading(false);
        return;
      }

      // Check for reCAPTCHA errors
      if (/recaptcha verification/i.test(errorMessage)) {
        console.log("📢 Showing reCAPTCHA error toast");
        toast({
          title: t("auth.errors.recaptchaRequiredTitle"),
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Common failure mode in dev: API server not running or you opened the Vite port
      // so /api/* returns HTML (index.html) instead of JSON.
      const looksLikeNetworkError =
        error instanceof TypeError ||
        /failed to fetch|networkerror|load failed/i.test(errorMessage);
      const looksLikeHtmlJsonParseError = /unexpected token </i.test(errorMessage);
      const looksLikeWrongPortOrNoApi =
        looksLikeNetworkError || looksLikeHtmlJsonParseError || /404:/i.test(errorMessage);

      if (looksLikeWrongPortOrNoApi) {
        toast({
          title: t("auth.errors.serverUnavailableTitle"),
          description: t("auth.errors.serverUnavailableDescription", {
            origin: window.location.origin,
          }),
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check for specific error messages
      let title = t("auth.errors.loginFailed");
      let description = errorMessage || t("auth.errors.generic");

      if (errorMessage.toLowerCase().includes("invalid password")) {
        title = t("auth.errors.incorrectPassword");
        description = t("auth.errors.incorrectPasswordDesc");
      } else if (errorMessage.toLowerCase().includes("role mismatch") || 
                 errorMessage.toLowerCase().includes("account type mismatch") ||
                 errorMessage.toLowerCase().includes("invalid username or password")) {
        title = t("auth.errors.roleMismatch");
        description = errorMessage || t("auth.errors.roleMismatchDesc", { role: loginAs });
      } else if (errorMessage.toLowerCase().includes("account locked")) {
        title = t("auth.errors.accountLocked");
        description = errorMessage;
      } else if (errorMessage.toLowerCase().includes("user not found")) {
        title = t("auth.errors.userNotFound");
        description = t("auth.errors.userNotFoundDesc");
      } else if (errorMessage.toLowerCase().includes("recaptcha")) {
        title = t("auth.errors.verificationFailed");
        description = errorMessage;
      }

      console.log("📢 Showing error toast:", { title, description });
      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      // Errors are displayed in the Alert component
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting registration with email:", registerEmail, "username:", registerUsername);
      const responseObj: any = await apiRequest("POST", "/api/auth/register", {
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        role: registerRole,
        recaptchaToken,
        skipRecaptcha: isSessionVerified && !recaptchaToken,
      });

      // apiRequest returns a Response object, we need to parse JSON
      const response = await responseObj.json();
      console.log("Register response:", response);

      if (response?.user) {
        console.log("Registration successful, user:", response.user);

        // Show success toast with activation message
        toast({
          title: t("auth.success.registration"),
          description: t("auth.success.verificationSent", { email: registerEmail, name: registerFirstName || registerUsername }),
        });

        // Set success state and switch to login tab after showing message
        setRegistrationSuccess(true);
        setTimeout(() => {
          setActiveTab("login");
          setRegistrationSuccess(false);
          // Reset form fields
          setRegisterEmail("");
          setRegisterUsername("");
          setRegisterPassword("");
          setRegisterPasswordConfirm("");
          setRegisterFirstName("");
          setRegisterLastName("");
          setRecaptchaToken(null);
        }, 2000);

        if (onSuccess) onSuccess();
      } else {
        throw new Error("No user in response");
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      let errorTitle = t("auth.errors.registrationFailed");
      let errorDescription = error.message || t("auth.errors.generic");

       if (error.message.includes("already exists")) {
        errorTitle = t("auth.errors.usernameTaken");
        errorDescription = t("auth.errors.usernameTakenDesc", { username: registerUsername });
      } else if (error.message.includes("reCAPTCHA")) {
        errorTitle = t("auth.errors.recaptchaFailed");
        errorDescription = t("auth.errors.recaptchaFailedDesc");
      } else if (error.message.includes("password")) {
        errorTitle = t("auth.errors.passwordTooWeak");
        errorDescription = t("auth.errors.passwordTooWeakDesc");
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      id="auth-form-container"
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 1.2,
        ease: [0.34, 1.56, 0.64, 1],
        staggerChildren: 0.12
      }}
    >
      {registrationSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/60 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md mx-4 shadow-2xl border-green-500/50">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-bold text-green-600">{t("auth.success.registration")}</h2>
              <p className="text-lg text-muted-foreground font-medium">
                {t("auth.success.registrationWelcome", { name: registerFirstName || registerUsername })}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        ref={authCardRef}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="w-full shadow-xl hover:shadow-2xl transition-shadow duration-300 border-border/50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <CardHeader className="space-y-1 pb-4">
              <motion.div
                className="flex items-center justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.7, delay: 0.5, type: "spring", stiffness: 80, damping: 15 }}
              >
                <motion.div
                  className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GraduationCap className="h-6 w-6 text-white" />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
              >
                <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{t("auth.welcomeTitle")}</CardTitle>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.75 }}
              >
                <CardDescription className="text-center text-sm">{t("auth.welcomeDescription")}</CardDescription>
              </motion.div>
            </CardHeader>
          </motion.div>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.loginTab")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.registerTab")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">{t("auth.username")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-username"
                        placeholder={t("auth.placeholders.username")}
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder={t("auth.placeholders.password")}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Hide role selection for admin users */}
                  {!isAdminLogin && (
                    <div className="space-y-2">
                      <Label>{t("auth.loginAs")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={loginAs === "student" ? "default" : "outline"}
                          onClick={() => setLoginAs("student")}
                          disabled={isLoading}
                        >
                          {t("roles.student")}
                        </Button>
                        <Button
                          type="button"
                          variant={loginAs === "teacher" ? "default" : "outline"}
                          onClick={() => setLoginAs("teacher")}
                          disabled={isLoading}
                        >
                          {t("roles.teacher")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show admin badge when admin username is entered */}
                    {isAdminLogin && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <UserCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-red-500">{t("auth.adminLogin")}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t("auth.loggingIn")}</span>
                      </>
                    ) : (
                      t("auth.login")
                    )}
                  </Button>

                  {recaptchaEnabled && (
                    isSessionVerified ? (
                      <motion.div
                        className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                        initial={{ scale: 0.8, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <motion.path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 0.5, ease: "circOut", delay: 0.2 }}
                            />
                          </svg>
                        </motion.div>
                        <motion.span
                          className="text-sm font-medium text-green-500"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: 0.3 }}
                        >
                          {t("auth.verifiedHuman", { defaultValue: "Verified Human" })}
                        </motion.span>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="recaptcha-wrapper"
                        key={isDarkMode ? "dark-recaptcha-login" : "light-recaptcha-login"}
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <ReCAPTCHA
                          ref={loginRecaptchaRef}
                          key={isDarkMode ? "dark-recaptcha-login" : "light-recaptcha-login"}
                          sitekey={recaptchaSiteKey}
                          onChange={handleLoginRecaptchaChange}
                          theme={isDarkMode ? "dark" : "light"}
                          hl={i18n.language}
                        />
                      </motion.div>
                    )
                  )}

                  <div className="flex gap-2 justify-center text-sm">
                    <Link href="/forgot-username" className="text-primary hover:underline">
                      {t("auth.forgotUsername", { defaultValue: "Forgot username?" })}
                    </Link>
                    <span className="text-muted-foreground">•</span>
                    <Link href="/forgot-password" className="text-primary hover:underline">
                      {t("auth.forgotPassword", { defaultValue: "Forgot password?" })}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t("auth.email", { defaultValue: "Email" })}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t("auth.enterEmail")}
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">{t("auth.username", { defaultValue: "Username" })}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder={t("auth.chooseUsername")}
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                        minLength={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder={t("auth.placeholders.choosePassword")}
                        value={registerPassword}
                        onChange={handlePasswordChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                        minLength={8}
                      />
                    </div>

                    {/* Password Strength Meter */}
                    {registerPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t("auth.passwordStrength.label")}</span>
                          <span className={`font-semibold ${passwordStrength < 40 ? "text-red-500" :
                            passwordStrength < 70 ? "text-yellow-500" :
                              "text-green-500"
                            }`}>
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${getPasswordStrengthColor()}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength}%` }}
                            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password-confirm">{t("auth.confirmPassword")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password-confirm"
                        type="password"
                        placeholder={t("auth.placeholders.confirmPassword")}
                        value={registerPasswordConfirm}
                        onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                        className={`pl-10 ${registerPasswordConfirm && registerPassword !== registerPasswordConfirm
                          ? "border-red-500"
                          : registerPasswordConfirm && registerPassword === registerPasswordConfirm
                            ? "border-green-500"
                            : ""
                          }`}
                        required
                        disabled={isLoading}
                        minLength={8}
                      />
                    </div>
                    {registerPasswordConfirm && registerPassword !== registerPasswordConfirm && (
                      <p className="text-sm text-red-500">{t("auth.validation.passwordsDontMatch")}</p>
                    )}
                    {registerPasswordConfirm && registerPassword === registerPasswordConfirm && (
                      <p className="text-sm text-green-500">{t("auth.validation.passwordsMatch")}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">{t("auth.firstName")}</Label>
                      <Input
                        id="register-firstname"
                        placeholder={t("auth.placeholders.firstName")}
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">{t("auth.lastName")}</Label>
                      <Input
                        id="register-lastname"
                        placeholder={t("auth.placeholders.lastName")}
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("auth.iAm")}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={registerRole === "student" ? "default" : "outline"}
                        onClick={() => setRegisterRole("student")}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <UserCircle className="h-4 w-4 mr-2" />
                        {t("roles.student")}
                      </Button>
                      <Button
                        type="button"
                        variant={registerRole === "teacher" ? "default" : "outline"}
                        onClick={() => setRegisterRole("teacher")}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        {t("roles.teacher")}
                      </Button>
                    </div>
                  </div>

                  {validationErrors.length > 0 && (
                    <Alert variant="destructive" className="border-red-500 bg-red-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Registration Failed</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-4 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={isLoading || !canSubmitRegister()}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t("auth.creatingAccount")}</span>
                      </>
                    ) : (
                      t("auth.createAccount")
                    )}
                  </Button>

                  {recaptchaEnabled && (
                    isSessionVerified ? (
                      <motion.div
                        className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                        initial={{ scale: 0.8, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <motion.path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 0.5, ease: "circOut", delay: 0.2 }}
                            />
                          </svg>
                        </motion.div>
                        <motion.span
                          className="text-sm font-medium text-green-500"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: 0.3 }}
                        >
                          {t("auth.verifiedHuman", { defaultValue: "Verified Human" })}
                        </motion.span>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="recaptcha-wrapper"
                        key={isDarkMode ? "dark" : "light"}
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          key={isDarkMode ? "dark-recaptcha" : "light-recaptcha"}
                          sitekey={recaptchaSiteKey}
                          onChange={handleRecaptchaChange}
                          theme={isDarkMode ? "dark" : "light"}
                        />
                      </motion.div>
                    )
                  )}

                  {!canSubmitRegister() && (registerPassword || registerPasswordConfirm) && (
                    <p className="text-sm text-muted-foreground text-center">
                      {registerPassword !== registerPasswordConfirm
                        ? t("auth.validation.passwordsMustMatch")
                        : passwordStrength < 40
                          ? t("auth.validation.passwordMustBeAtLeastFair")
                          : t("auth.validation.passwordRequirementsNotMet")}
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}