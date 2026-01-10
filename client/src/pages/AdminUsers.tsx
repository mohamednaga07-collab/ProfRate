
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AdminUsers() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t("admin.titles.users")}</h1>
      {isLoading && (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading users...</div>
      )}
      {error && (
        <div className="text-red-500">Error loading users: {String(error.message)}</div>
      )}
      {users && Array.isArray(users) && (
        <table className="min-w-full border rounded-lg overflow-hidden mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">{t("admin.table.name")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.email")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.role")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.status")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">{user.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
