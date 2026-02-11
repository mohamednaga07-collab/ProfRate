import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function VerifyEmail() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState(t("auth.verify.verifying"));
  
  // Resend logic state
  const [isResending, setIsResending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [showResendInput, setShowResendInput] = useState(false);

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
        // Redirect removed to let user read the success message
        // setLocation("/login");
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

  const handleResend = async () => {
    if (!resendEmail || !resendEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Verification Sent",
          description: "Please check your email for the new link.",
        });
        setShowResendInput(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed",
          description: data.message || "Could not resend email. Account might not exist.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred.",
      });
    } finally {
      setIsResending(false);
    }
  };

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
                <>
                  {!showResendInput ? (
                    <div className="space-y-2">
                      <Button 
                        variant="secondary"
                        className="w-full" 
                        onClick={() => setShowResendInput(true)}
                      >
                        Resend Verification Email
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full" 
                        onClick={() => setLocation("/register")}
                      >
                        {t("auth.verify.registerCta", { defaultValue: t("auth.registerCta") })}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border text-left">
                      <div className="space-y-1">
                        <Label htmlFor="resend-email" className="text-xs font-medium">
                          Enter your email to verify
                        </Label>
                        <Input 
                          id="resend-email"
                          type="email" 
                          placeholder="name@example.com"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="flex-1"
                          onClick={() => setShowResendInput(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={handleResend}
                          disabled={isResending}
                        >
                          {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Link"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
