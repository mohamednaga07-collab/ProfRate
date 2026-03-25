import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Settings, Shield, Bell, Database, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function AdminSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: t("adminPlatformSettings.toast.savedTitle"), description: t("adminPlatformSettings.toast.savedDesc") });
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
              <h1 className="text-3xl font-bold">{t("adminPlatformSettings.title")}</h1>
              <p className="text-muted-foreground">{t("adminPlatformSettings.subtitle")}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? t("adminPlatformSettings.saving") : t("adminPlatformSettings.saveConfig")}
          </Button>
        </motion.div>

        <div className="grid gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> {t("adminPlatformSettings.security.title")}</CardTitle>
                <CardDescription>{t("adminPlatformSettings.security.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t("adminPlatformSettings.security.registrationOpen")}</p>
                    <p className="text-sm text-muted-foreground">{t("adminPlatformSettings.security.registrationOpenDesc")}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t("adminPlatformSettings.security.emailVerification")}</p>
                    <p className="text-sm text-muted-foreground">{t("adminPlatformSettings.security.emailVerificationDesc")}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-indigo-500" /> {t("adminPlatformSettings.data.title")}</CardTitle>
                <CardDescription>{t("adminPlatformSettings.data.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t("adminPlatformSettings.data.autoPublish")}</p>
                    <p className="text-sm text-muted-foreground">{t("adminPlatformSettings.data.autoPublishDesc")}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t("adminPlatformSettings.data.profanityFilter")}</p>
                    <p className="text-sm text-muted-foreground">{t("adminPlatformSettings.data.profanityFilterDesc")}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-orange-500" /> {t("adminPlatformSettings.notifications.title")}</CardTitle>
                <CardDescription>{t("adminPlatformSettings.notifications.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t("adminPlatformSettings.notifications.maintenance")}</p>
                    <p className="text-sm text-destructive">{t("adminPlatformSettings.notifications.maintenanceDesc")}</p>
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
