import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function VerifyEmail() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState(t("auth.verify.verifying"));

  const verifyEmail = useCallback(async () => {
    try {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage(t("auth.verify.noToken"));
        return;
      }

      // Call verification endpoint
      const res = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await res.json();

      if (res.ok) {
        setMessage(t(data.message || "auth.verify.successMsg"));
        setStatus("success");
        // Redirect to login after 2 seconds using setLocation
        setTimeout(() => {
          setLocation("/login");
        }, 2000);
      } else {
        setMessage(t(data.message || "auth.verify.failedMsg"));
        setStatus("error");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage(t("auth.verify.errorMsg"));
      setStatus("error");
    }
  }, [t, setLocation]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${status === 'loading' ? 'bg-primary/10' : status === 'success' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {status === 'loading' ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : status === 'success' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-destructive" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.verify.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className={`text-lg ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {message}
          </p>
          
          {status !== 'loading' && (
            <div className="flex flex-col gap-2 mt-4">
              <Button 
                className="w-full" 
                onClick={() => setLocation("/login")}
              >
                {t("auth.verify.tryLoginCta", { defaultValue: t("auth.tryLoginCta") })}
              </Button>
              {status === 'error' && (
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={() => setLocation("/register")}
                >
                  {t("auth.verify.registerCta", { defaultValue: t("auth.registerCta") })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
