
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AdminDoctors() {
  const { data: doctors, isLoading, error } = useQuery({
    queryKey: ["/api/admin/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Manage Doctors</h1>
      {isLoading && (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading doctors...</div>
      )}
      {error && (
        <div className="text-red-500">Error loading doctors: {String(error.message)}</div>
      )}
      {doctors && Array.isArray(doctors) && (
        <table className="min-w-full border rounded-lg overflow-hidden mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Specialty</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor: any) => (
              <tr key={doctor.id} className="border-b">
                <td className="px-4 py-2">{doctor.name}</td>
                <td className="px-4 py-2">{doctor.department}</td>
                <td className="px-4 py-2">{doctor.title}</td>
                <td className="px-4 py-2">{doctor.specialty || doctor.bio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
