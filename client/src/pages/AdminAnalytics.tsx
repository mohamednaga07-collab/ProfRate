import React from "react";

import { useTranslation } from "react-i18next";

export default function AdminAnalytics() {
  const { t } = useTranslation();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t("admin.titles.analytics")}</h1>
      <p>This is the admin analytics dashboard. Add analytics and reporting features here.</p>
    </div>
  );
}
