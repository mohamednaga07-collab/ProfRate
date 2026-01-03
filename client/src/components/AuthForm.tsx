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
import { GraduationCap, User, Lock, UserCircle } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface AuthFormProps {
  onSuccess?: () => void;
  defaultTab?: "login" | "register";
}

export function AuthForm({ onSuccess, defaultTab = "login" }: AuthFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const recaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginAs, setLoginAs] = useState<"student" | "teacher">("student");
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState<string | null>(null);
  const loginRecaptchaRef = useRef<ReCAPTCHA>(null);

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerRole, setRegisterRole] = useState<"student" | "teacher">("student");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Detect dark mode preference
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Handle click outside reCAPTCHA modal to dismiss it
  useEffect(() => {
    const cleanupRecaptchaBackdrop = () => {
      try {
        // Remove any reCAPTCHA backdrop/modal overlays
        const modals = document.querySelectorAll('[role="presentation"], .grecaptcha-modal, div[style*="position: fixed"][style*="opacity"]');
        modals.forEach(modal => {
          try {
            modal?.remove();
          } catch (e) {
            // Ignore errors removing individual modals
          }
        });
        
        // Reset body styles that reCAPTCHA may have changed
        try {
          if (document?.body?.style) {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
          }
        } catch (e) {
          // Ignore body style errors
        }
        
        try {
          if (document?.documentElement?.style) {
            document.documentElement.style.overflow = '';
          }
        } catch (e) {
          // Ignore html style errors
        }
        
        // Remove any inline styles on html/body that might be hiding content
        const allDivs = document.querySelectorAll('div[style*="opacity"]');
        allDivs.forEach(div => {
          try {
            const style = div?.getAttribute('style');
            if (style && (style.includes('opacity: 0') || style.includes('display: none') || style.includes('visibility: hidden'))) {
              if ((div?.classList?.length ?? 0) === 0 || (div?.id ?? '') === '') {
                div?.remove();
              }
            }
          } catch (e) {
            // Ignore errors removing individual divs
          }
        });
      } catch (e) {
        console.warn('Error cleaning up reCAPTCHA backdrop:', e);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      try {
        const target = e?.target as HTMLElement;
        if (!target) return;
        
        const recaptchaElements = document.querySelectorAll(".g-recaptcha");
        
        // Check if clicked on any reCAPTCHA container
        let clickedOnRecaptcha = false;
        recaptchaElements.forEach(elem => {
          try {
            if (elem?.contains?.(target)) {
              clickedOnRecaptcha = true;
            }
          } catch (e) {
            // Ignore errors checking contains
          }
        });
        
        if (clickedOnRecaptcha) return;
        
        // Check if clicking inside any reCAPTCHA iframe
        const recaptchaIframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe[title*="recaptcha"]');
        let clickedInsideIframe = false;
        
        recaptchaIframes.forEach(iframe => {
          try {
            if (iframe?.contains?.(target)) {
              clickedInsideIframe = true;
            }
          } catch (e) {
            // Ignore iframe errors
          }
        });
        
        // If clicked outside all reCAPTCHA elements, close them
        if (!clickedInsideIframe) {
          try {
            setRecaptchaToken(null);
            setLoginRecaptchaToken(null);
            recaptchaRef.current?.reset?.();
            loginRecaptchaRef.current?.reset?.();
            setTimeout(() => cleanupRecaptchaBackdrop(), 100);
          } catch (e) {
            console.warn('Error resetting reCAPTCHA:', e);
          }
        }
      } catch (e) {
        console.warn('Error in handleClickOutside:', e);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Close reCAPTCHA modal on ESC key
        if (e?.key === 'Escape') {
          try {
            setRecaptchaToken(null);
            setLoginRecaptchaToken(null);
            recaptchaRef.current?.reset?.();
            loginRecaptchaRef.current?.reset?.();
            setTimeout(() => cleanupRecaptchaBackdrop(), 100);
          } catch (e) {
            console.warn('Error resetting reCAPTCHA on ESC:', e);
          }
        }
      } catch (e) {
        console.warn('Error in handleKeyDown:', e);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
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
    const passwordsMatch = registerPassword === registerPasswordConfirm;
    const passwordStrong = passwordStrength >= 70 || passwordStrength >= 40;
    return passwordsMatch && passwordStrong;
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    // Auto-reset reCAPTCHA token after 2 minutes (120 seconds)
    if (token) {
      setTimeout(() => {
        setRecaptchaToken(null);
      }, 120000);
    }
  };

  const handleRegisterTab = () => {
    setActiveTab("register");
    // Reset reCAPTCHA when switching to register tab
    setRecaptchaToken(null);
    setLoginRecaptchaToken(null);
  };

  const handleLoginTab = () => {
    setActiveTab("login");
    setLoginRecaptchaToken(null);
  };

  const handleLoginRecaptchaChange = (token: string | null) => {
    setLoginRecaptchaToken(token);
    if (token) {
      setTimeout(() => {
        setLoginRecaptchaToken(null);
      }, 120000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername.trim()) {
      toast({
        title: t("auth.errors.usernameRequiredTitle"),
        description: t("auth.errors.usernameRequiredDescription"),
        variant: "destructive",
      });
      return;
    }
    
    if (!loginPassword.trim()) {
      toast({
        title: t("auth.errors.passwordRequiredTitle"),
        description: t("auth.errors.passwordRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (recaptchaEnabled && !loginRecaptchaToken) {
      toast({
        title: t("auth.errors.recaptchaRequiredTitle"),
        description: t("auth.errors.recaptchaRequiredDescription"),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      console.log("🔐 Attempting login with username:", loginUsername);
      const responseObj: any = await apiRequest("POST", "/api/auth/login", {
        username: loginUsername,
        password: loginPassword,
        role: loginAs,
        recaptchaToken: loginRecaptchaToken,
      });

      // apiRequest returns a Response object, we need to parse JSON
      const response = await responseObj.json();
      console.log("✅ Login response received:", response);

      if (response?.user) {
        console.log("✅ Login successful! User:", response.user);
        
        // Show success message
        toast({ 
          title: t("auth.success.welcomeBackTitle"),
          description: t("auth.success.welcomeBackDescription", { name: response.user.firstName || loginUsername }),
        });
        
        // Clear login form
        setLoginUsername("");
        setLoginPassword("");
        setLoginRecaptchaToken(null);
        
        // Update auth state immediately so routing reacts instantly
        queryClient.setQueryData(["/api/auth/user"], response.user);

        // Redirect based on the selected role button
        const finalTarget = loginAs === "teacher" ? "/teacher-dashboard" : "/";

        if (onSuccess) onSuccess();

        window.location.assign(finalTarget);
      } else {
        throw new Error("Login failed - no user data returned");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      
      const errorMessage = error?.message || "";

      if (/this username cannot be found/i.test(errorMessage)) {
        toast({
          title: t("auth.errors.userNotFoundTitle"),
          description: t("auth.errors.userNotFoundDescription"),
          variant: "destructive",
        });
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
        return;
      }
      
      // Only show specific error if it's about password being invalid
      // Otherwise show generic error (username might not exist)
      let title = "❌ Login Failed";
      let description = "";
      
      if (errorMessage.toLowerCase().includes("invalid password")) {
        title = t("auth.errors.invalidPasswordTitle");
        description = t("auth.errors.invalidPasswordDescription");
      } else {
        title = t("auth.errors.loginFailedTitle");
        description = t("auth.errors.loginFailedDescription");
      }
      
      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recaptchaEnabled && !recaptchaToken) {
      toast({
        title: t("auth.errors.recaptchaRequiredTitle"),
        description: t("auth.errors.recaptchaRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      toast({
        title: t("auth.errors.passwordsDontMatchTitle"),
        description: t("auth.errors.passwordsDontMatchDescription"),
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 40) {
      toast({
        title: t("auth.errors.passwordTooWeakTitle"),
        description: t("auth.errors.passwordTooWeakDescription"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting registration with username:", registerUsername);
      const responseObj: any = await apiRequest("POST", "/api/auth/register", {
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        role: registerRole,
        recaptchaToken,
      });

      // apiRequest returns a Response object, we need to parse JSON
      const response = await responseObj.json();
      console.log("Register response:", response);

      if (response?.user) {
        console.log("Registration successful, user:", response.user);
        
        // Show success toast
        toast({
          title: t("auth.success.accountCreatedTitle"),
          description: t("auth.success.accountCreatedDescription", { name: registerFirstName || registerUsername }),
        });

        // Set success state and switch to login tab after showing message
        setRegistrationSuccess(true);
        setTimeout(() => {
          setActiveTab("login");
          setRegistrationSuccess(false);
          // Reset form fields
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
      toast({
        title: t("auth.errors.registrationFailedTitle"),
        description: error.message || t("auth.errors.registrationFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      id="auth-form-container"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.34, 1.56, 0.64, 1],
        staggerChildren: 0.1
      }}
    >
      {registrationSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
        >
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl"
              >
                ✅
              </motion.div>
              <h2 className="text-2xl font-bold text-green-600">{t("auth.success.overlayTitle")}</h2>
              <p className="text-muted-foreground">
                {t("auth.success.overlayDescription")}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t("auth.welcomeTitle")}</CardTitle>
          <CardDescription className="text-center">
            {t("auth.welcomeDescription")}
          </CardDescription>
        </CardHeader>
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("auth.loggingIn") : t("auth.login")}
                </Button>

                {recaptchaEnabled && (
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
                    />
                  </motion.div>
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
                  <Label htmlFor="register-username">{t("auth.username")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-username"
                      placeholder={t("auth.placeholders.chooseUsername")}
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
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
                        <span className={`font-semibold ${
                          passwordStrength < 40 ? "text-red-500" : 
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
                      className={`pl-10 ${
                        registerPasswordConfirm && registerPassword !== registerPasswordConfirm
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

                {recaptchaEnabled && (
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
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !canSubmitRegister()}
                >
                  {isLoading ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
                
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
  );
}
