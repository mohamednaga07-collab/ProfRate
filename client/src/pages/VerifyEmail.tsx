import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function VerifyEmail() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
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
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || t("auth.verify.successMsg"));
          setUsername(data.username || "");
          
          // Redirect to login after 2 seconds (faster redirect)
          const redirectTimer = setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          
          return () => clearTimeout(redirectTimer);
        } else {
          setStatus("error");
          setMessage(data.message || t("auth.verify.failedMsg"));
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(error.message || t("auth.verify.errorMsg"));
      }
    };

    verifyEmail();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("auth.verify.title")}</CardTitle>
          <CardDescription>
            {status === "loading" && t("auth.verify.verifying")}
            {status === "success" && t("auth.verify.success")}
            {status === "error" && t("auth.verify.failed")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-muted-foreground">{t("auth.verify.wait")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-center">{message}</p>
              {username && (
                <p className="text-sm text-muted-foreground">
                  {t("auth.username")}: <span className="font-semibold">{username}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t("auth.verify.redirecting")}
              </p>
              <Button onClick={() => setLocation("/login")}>
                {t("auth.verify.loginCta")}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-red-600">{message}</p>
              <div className="flex gap-2">
                <Button onClick={() => setLocation("/register")}>
                  {t("auth.verify.registerCta")}
                </Button>
                <Button variant="outline" onClick={() => setLocation("/login")}>
                  {t("auth.verify.tryLoginCta")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
