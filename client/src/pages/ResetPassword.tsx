import { useState, useEffect, useRef } from "react";
import { useLocation, Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import { ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const recaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    console.log("ResetPassword component mounted");
    console.log("Current URL:", window.location.href);
    const params = new URLSearchParams(window.location.search);
    console.log("URL params:", params.toString());
    const resetToken = params.get("token");
    console.log("Reset token from URL:", resetToken);
    if (!resetToken) {
      setError(t("auth.invalidResetLink", { defaultValue: "Invalid reset link" }));
    } else {
      setToken(resetToken);
    }
  }, [t]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
        
        const recaptchaElement = document.querySelector(".g-recaptcha");
        
        // If there's no reCAPTCHA element or we clicked on it, do nothing
        if (!recaptchaElement || recaptchaElement.contains(target)) return;
        
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
        
        // If clicked outside reCAPTCHA container and iframes, close it
        if (!clickedInsideIframe) {
          try {
            setRecaptchaToken(null);
            recaptchaRef.current?.reset?.();
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
        // Close reCAPTCHA modal on ESC key if token is set
        if (e?.key === 'Escape' && recaptchaToken) {
          try {
            setRecaptchaToken(null);
            recaptchaRef.current?.reset?.();
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
      try {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      } catch (e) {
        console.warn('Error removing event listeners:', e);
      }
    };
  }, [recaptchaToken]);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return t("auth.passwordTooShort", { defaultValue: "Password must be at least 8 characters" });
    }
    if (!/[a-z]/.test(password)) {
      return t("auth.passwordNeedLower", { defaultValue: "Password must contain lowercase letters" });
    }
    if (!/[A-Z]/.test(password)) {
      return t("auth.passwordNeedUpper", { defaultValue: "Password must contain uppercase letters" });
    }
    if (!/[0-9]/.test(password)) {
      return t("auth.passwordNeedNumber", { defaultValue: "Password must contain numbers" });
    }
    return "";
  };

  const calculatePasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score += 30;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    return Math.min(score, 100);
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

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setTimeout(() => setRecaptchaToken(null), 120000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch", { defaultValue: "Passwords do not match" }));
      return;
    }

    if (!token) {
      setError(t("auth.invalidToken", { defaultValue: "Invalid reset token" }));
      return;
    }

    if (recaptchaEnabled && !recaptchaToken) {
      setError(t("auth.errors.recaptchaRequiredDescription", { defaultValue: "Please complete the reCAPTCHA" }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, recaptchaToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <Button
            variant="outline"
            asChild
            className="w-fit rounded-full border-primary/30 bg-primary/5 text-primary shadow-sm hover:bg-primary/10 hover:border-primary/50"
          >
            <WouterLink href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("auth.backToLogin", { defaultValue: "Back to Login" })}
            </WouterLink>
          </Button>

          {error && !token ? (
            <Card className="border border-destructive/50 shadow-xl bg-card/80 max-w-xl mx-auto w-full">
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto w-full"
          >
            <Card className="border border-primary/10 shadow-xl shadow-primary/10 backdrop-blur-sm bg-card/80">
              <CardHeader className="space-y-3">
                <div className="inline-flex items-center gap-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span>{t("auth.resetPassword", { defaultValue: "Reset Password" })}</span>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {t("auth.resetPassword", { defaultValue: "Reset Password" })}
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm">
                    {t("auth.resetPasswordDesc", {
                      defaultValue: "Enter your new password below",
                    })}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-8">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-foreground mb-2">
                      {t("auth.passwordReset", { defaultValue: "Password reset successful!" })}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("auth.passwordResetDesc", {
                        defaultValue: "Your password has been reset. You can now log in with your new password.",
                      })}
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <WouterLink href="/">{t("auth.backToLogin", { defaultValue: "Back to Login" })}</WouterLink>
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("auth.newPassword", { defaultValue: "New Password" })}
                    </label>
                    <div className="relative">
                      <Input
                        className="pr-10 focus-visible:ring-2 focus-visible:ring-primary/70"
                        type={showPassword ? "text" : "password"}
                        placeholder="•••••••••"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordStrength(calculatePasswordStrength(e.target.value));
                        }}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("auth.confirmPassword", { defaultValue: "Confirm Password" })}
                    </label>
                    <div className="relative">
                      <Input
                        className="pr-10 focus-visible:ring-2 focus-visible:ring-primary/70"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="•••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("auth.passwordStrength.label")}</span>
                        <span
                          className={`font-semibold ${
                            passwordStrength < 40
                              ? "text-red-500"
                              : passwordStrength < 70
                              ? "text-yellow-500"
                              : "text-green-500"
                          }`}
                        >
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

                  <div className="text-xs text-muted-foreground space-y-1 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="font-semibold text-foreground text-sm">
                      {t("auth.passwordRequirements", { defaultValue: "Password requirements:" })}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{t("auth.passReq8Char", { defaultValue: "At least 8 characters" })}</li>
                      <li>{t("auth.passReqLower", { defaultValue: "Lowercase letters" })}</li>
                      <li>{t("auth.passReqUpper", { defaultValue: "Uppercase letters" })}</li>
                      <li>{t("auth.passReqNumber", { defaultValue: "Numbers" })}</li>
                    </ul>
                  </div>

                  {recaptchaEnabled && (
                    <div className="flex justify-center items-center gap-3">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        key={isDarkMode ? "reset-pass-dark" : "reset-pass-light"}
                        sitekey={recaptchaSiteKey}
                        onChange={handleRecaptchaChange}
                        theme={isDarkMode ? "dark" : "light"}
                      />
                      {recaptchaToken && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRecaptchaToken(null);
                            recaptchaRef.current?.reset();
                          }}
                          className="text-xs"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-primary/30 hover:shadow-primary/40"
                    disabled={isLoading || !token}
                  >
                    {isLoading
                      ? t("auth.resetting", { defaultValue: "Resetting..." })
                      : t("auth.resetPassword", { defaultValue: "Reset Password" })}
                  </Button>
                </form>
              )}
            </CardContent>
            </Card>
          </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
