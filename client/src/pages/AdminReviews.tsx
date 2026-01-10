
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminReviews() {
  const { t } = useTranslation();
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["/api/admin/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t("admin.titles.reviews")}</h1>
      {isLoading && (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading reviews...</div>
      )}
      {error && (
        <div className="text-red-500">Error loading reviews: {String(error.message)}</div>
      )}
      {reviews && Array.isArray(reviews) && (
        <table className="min-w-full border rounded-lg overflow-hidden mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">{t("admin.table.user")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.doctor")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.rating")}</th>
              <th className="px-4 py-2 text-left">{t("admin.table.comment")}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review: any) => (
              <tr key={review.id} className="border-b">
                <td className="px-4 py-2">{review.userName || review.userId}</td>
                <td className="px-4 py-2">{review.doctorName || review.doctorId}</td>
                <td className="px-4 py-2">{review.rating}</td>
                <td className="px-4 py-2">{review.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
