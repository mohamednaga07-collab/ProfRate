import { useState, useEffect, useRef } from "react";
import { useLocation, Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import { ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");
    if (!resetToken) setError(t("auth.invalidResetLink"));
    else setToken(resetToken);
  }, [t]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
    const verification = localStorage.getItem('recaptcha_verified');
    if (verification && (Date.now() - parseInt(verification)) < 1800000) setIsSessionVerified(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => setLocation("/")}><ArrowLeft className="mr-2 h-4 w-4" />{t("auth.backToLogin")}</Button>
          <Card>
            <CardHeader>
              <CardTitle>{t("auth.resetPassword")}</CardTitle>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p>{t("auth.passwordReset")}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-primary transition-colors"
                      aria-label={showNewPassword ? t("auth.hidePassword", { defaultValue: "Hide password" }) : t("auth.showPassword", { defaultValue: "Show password" })}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={showNewPassword ? "hide" : "show"}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "..." : t("auth.resetPassword")}</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
