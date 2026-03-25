import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Settings, Shield, Bell, Database, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings Saved", description: "Global platform settings have been updated successfully." });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-zinc-500/10 border border-zinc-200 dark:border-zinc-800">
              <Settings className="h-6 w-6 text-zinc-500 flex-shrink-0 cursor-pointer" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Platform Settings</h1>
              <p className="text-muted-foreground">Manage global configuration for ProfRate</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Config"}
          </Button>
        </motion.div>

        <div className="grid gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Security Basics</CardTitle>
                <CardDescription>Control core access barriers and registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Registration Open</p>
                    <p className="text-sm text-muted-foreground">Allow new users to sign up automatically</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Force Email Verification</p>
                    <p className="text-sm text-muted-foreground">Require university (.edu) email verification before login</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-indigo-500" /> Data Management</CardTitle>
                <CardDescription>Handling reviews and professor listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Auto-Publish Reviews</p>
                    <p className="text-sm text-muted-foreground">Publish student reviews immediately without manual approval</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Profanity Filter Active</p>
                    <p className="text-sm text-muted-foreground">Automatically hide reviews containing flagged words</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-orange-500" /> System Notifications</CardTitle>
                <CardDescription>Maintenance and platform-wide alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-destructive">Locks out all non-admin users (use with extreme caution)</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
