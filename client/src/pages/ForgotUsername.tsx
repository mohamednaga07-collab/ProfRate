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
import { apiRequest } from "@/lib/queryClient";

export default function ForgotUsername() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const recaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const checkRecaptchaVerification = () => {
    const verification = localStorage.getItem('recaptcha_verified');
    if (verification) {
      const timestamp = parseInt(verification, 10);
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      if (now - timestamp < thirtyMinutes) {
        setIsSessionVerified(true);
        return true;
      } else {
        localStorage.removeItem('recaptcha_verified');
        setIsSessionVerified(false);
        return false;
      }
    }
    return false;
  };

  const markRecaptchaVerified = () => {
    const now = Date.now();
    localStorage.setItem('recaptcha_verified', now.toString());
    setIsSessionVerified(true);
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Initial check
    checkRecaptchaVerification();

    // Check expiration every second
    const interval = setInterval(checkRecaptchaVerification, 1000);

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

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      markRecaptchaVerified();
      setTimeout(() => setRecaptchaToken(null), 120000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (recaptchaEnabled && !recaptchaToken && !isSessionVerified) {
      setError(t("auth.errors.recaptchaRequiredDescription", { defaultValue: "Please complete the reCAPTCHA" }));
      return;
    }
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/forgot-username", {
        email,
        recaptchaToken,
        skipRecaptcha: isSessionVerified && !recaptchaToken
      });

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
                    {t("auth.enterEmailForUsername")}
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
                        <div className="flex justify-center">
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            key={isDarkMode ? "forgot-username-dark" : "forgot-username-light"}
                            sitekey={recaptchaSiteKey}
                            onChange={handleRecaptchaChange}
                            theme={isDarkMode ? "dark" : "light"}
                          />
                        </div>
                      )
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
