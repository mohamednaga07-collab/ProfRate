import React from "react";

export default function AdminSettings() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t("admin.titles.settings")}</h1>
      <p>This is the system settings page. Add configuration options here.</p>
    </div>
  );
}
