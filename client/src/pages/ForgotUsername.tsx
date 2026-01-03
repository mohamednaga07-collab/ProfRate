import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";

export default function ForgotUsername() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const recaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    try {
      const isDark = document?.documentElement?.classList?.contains("dark") ?? false;
      setIsDarkMode(isDark);

      const observer = new MutationObserver(() => {
        try {
          const isDarkNow = document?.documentElement?.classList?.contains("dark") ?? false;
          setIsDarkMode(isDarkNow);
        } catch (e) {
          console.warn('Error detecting dark mode:', e);
        }
      });

      if (document?.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }

      return () => {
        try {
          observer.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      };
    } catch (e) {
      console.warn('Error setting up dark mode observer:', e);
      return () => {};
    }
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

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setTimeout(() => setRecaptchaToken(null), 120000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (recaptchaEnabled && !recaptchaToken) {
      setError(t("auth.errors.recaptchaRequiredDescription", { defaultValue: "Please complete the reCAPTCHA" }));
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recaptchaToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to process request");
      }

      setSubmitted(true);
      setEmail("");
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
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("auth.backToLogin", { defaultValue: "Back to Login" })}
            </Link>
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto w-full"
          >
            <Card className="border border-primary/10 shadow-xl shadow-primary/10 backdrop-blur-sm bg-card/80">
              <CardHeader className="space-y-3">
                <div className="inline-flex items-center gap-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span>{t("auth.forgotUsername", { defaultValue: "Forgot Username?" })}</span>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {t("auth.forgotUsername", { defaultValue: "Forgot Username?" })}
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm">
                    {t("auth.forgotUsernameDesc", {
                      defaultValue: "Enter your email address and we'll send you your username.",
                    })}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-8">
              {submitted ? (
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
                      {t("auth.usernameSent", { defaultValue: "Username sent!" })}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("auth.usernameSentDesc", {
                        defaultValue: "Check your email for your username.",
                      })}
                    </p>
                  </div>
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
                    <label className="text-sm font-medium">{t("auth.email", { defaultValue: "Email" })}</label>
                    <Input
                      type="email"
                      placeholder={t("auth.emailPlaceholder", { defaultValue: "you@example.com" })}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {recaptchaEnabled && (
                    <div className="flex justify-center items-center gap-3">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        key={isDarkMode ? "forgot-username-dark" : "forgot-username-light"}
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
                    disabled={isLoading}
                  >
                    {isLoading
                      ? t("auth.sending", { defaultValue: "Sending..." })
                      : t("auth.sendUsername", { defaultValue: "Send Username" })}
                  </Button>
                </form>
              )}
            </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
