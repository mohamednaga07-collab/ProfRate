import { useState } from "react";
import { useEffect } from "react";
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

interface AuthFormProps {
  onSuccess?: () => void;
  defaultTab?: "login" | "register";
}

export function AuthForm({ onSuccess, defaultTab = "login" }: AuthFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerRole, setRegisterRole] = useState<"student" | "teacher">("student");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

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
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 70) return "Fair";
    return "Strong";
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
  };

  const handleLoginTab = () => {
    setActiveTab("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername.trim()) {
      toast({
        title: "❌ Username Required",
        description: "Please enter your username",
        variant: "destructive",
      });
      return;
    }
    
    if (!loginPassword.trim()) {
      toast({
        title: "❌ Password Required",
        description: "Please enter your password",
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
      });

      // apiRequest returns a Response object, we need to parse JSON
      const response = await responseObj.json();
      console.log("✅ Login response received:", response);

      if (response?.user) {
        console.log("✅ Login successful! User:", response.user);
        
        // Show success message
        toast({ 
          title: "✅ Welcome Back!",
          description: `Logged in as ${response.user.firstName || loginUsername}.`,
        });
        
        // Clear login form
        setLoginUsername("");
        setLoginPassword("");
        
        console.log("🔄 Step 1: Invalidating auth cache...");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("🔄 Step 2: Refetching to load user...");
        const newAuthData = await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("🔄 Step 3: New auth data:", newAuthData);
        console.log("🔄 Step 4: Page will auto-redirect when auth state updates...");
        
        if (onSuccess) onSuccess();
      } else {
        throw new Error("Login failed - no user data returned");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      
      const errorMessage = error.message || "Invalid username or password";
      
      // Only show specific error if it's about password being invalid
      // Otherwise show generic error (username might not exist)
      let title = "❌ Login Failed";
      let description = "";
      
      if (errorMessage.toLowerCase().includes("invalid password")) {
        title = "❌ Invalid Password";
        description = "The password you entered is incorrect. Please check your password and try again.";
      } else {
        title = "❌ Login Failed";
        description = "Invalid username or password. Please check your credentials or create a new account.";
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
    
    if (!recaptchaToken) {
      toast({
        title: "❌ reCAPTCHA Required",
        description: "Please complete the reCAPTCHA verification.",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      toast({
        title: "❌ Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 40) {
      toast({
        title: "❌ Password Too Weak",
        description: "Password must be at least Fair strength (yellow).",
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
          title: "🎉 Account Created!",
          description: `Welcome ${registerFirstName || registerUsername}! Your account has been created successfully.`,
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
        title: "❌ Registration Failed",
        description: error.message || "Could not create account. Please try again.",
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
              <h2 className="text-2xl font-bold text-green-600">Account Created!</h2>
              <p className="text-muted-foreground">
                Your account has been successfully created. Redirecting you to login...
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
          <CardTitle className="text-2xl text-center">Welcome to ProfRate</CardTitle>
          <CardDescription className="text-center">
            Login or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      placeholder="Enter your username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-username"
                      placeholder="Choose a username"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Choose a password"
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
                        <span className="text-muted-foreground">Strength:</span>
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
                  <Label htmlFor="register-password-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password-confirm"
                      type="password"
                      placeholder="Re-enter your password"
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
                    <p className="text-sm text-red-500">Passwords don't match</p>
                  )}
                  {registerPasswordConfirm && registerPassword === registerPasswordConfirm && (
                    <p className="text-sm text-green-500">✓ Passwords match</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-firstname">First Name</Label>
                    <Input
                      id="register-firstname"
                      placeholder="First name"
                      value={registerFirstName}
                      onChange={(e) => setRegisterFirstName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-lastname">Last Name</Label>
                    <Input
                      id="register-lastname"
                      placeholder="Last name"
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>I am a</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={registerRole === "student" ? "default" : "outline"}
                      onClick={() => setRegisterRole("student")}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <UserCircle className="h-4 w-4 mr-2" />
                      Student
                    </Button>
                    <Button
                      type="button"
                      variant={registerRole === "teacher" ? "default" : "outline"}
                      onClick={() => setRegisterRole("teacher")}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Teacher
                    </Button>
                  </div>
                </div>

                <motion.div 
                  className="recaptcha-wrapper" 
                  key={isDarkMode ? "dark" : "light"}
                  initial={{ opacity: 0.8, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ReCAPTCHA
                    key={isDarkMode ? "dark-recaptcha" : "light-recaptcha"}
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    onChange={handleRecaptchaChange}
                    theme={isDarkMode ? "dark" : "light"}
                  />
                </motion.div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !canSubmitRegister()}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
                
                {!canSubmitRegister() && (registerPassword || registerPasswordConfirm) && (
                  <p className="text-sm text-muted-foreground text-center">
                    {registerPassword !== registerPasswordConfirm 
                      ? "Passwords must match" 
                      : passwordStrength < 40
                      ? "Password must be at least Fair strength"
                      : "Password requirements not met"}
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
