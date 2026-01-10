import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { User, BarChart3, Eye } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { DoctorWithRatings } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface DoctorCardProps {
  doctor: DoctorWithRatings;
  onCompareToggle?: (doctorId: number) => void;
  isComparing?: boolean;
}

export function DoctorCard({ doctor, onCompareToggle, isComparing }: DoctorCardProps) {
  const { t } = useTranslation();
  const formatName = (name: string) => name.replace(/^Dr\.?\s+/i, "");
  const initials = doctor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getDepartmentTranslationKey = (dept: string) => {
    const map: Record<string, string> = {
      "Computer Science": "home.depts.cs",
      "Information Technology": "home.depts.it",
      "Information Systems": "home.depts.is",
      "Engineering": "home.depts.eng",
      "Medicine": "home.depts.med",
      "Law": "home.depts.law",
      "Arts": "home.depts.art",
      "Science": "home.depts.sci",
      "Business": "home.depts.bus",
      "Veterinary Medicine": "home.depts.vet"
    };
    return map[dept] ? t(map[dept]) : dept;
  };

  const overallRating = doctor.ratings?.overallRating ?? 0;
  const totalReviews = doctor.ratings?.totalReviews ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card className="flex flex-col h-full" data-testid={`card-doctor-${doctor.id}`}>
      <CardContent className="flex-1 p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={doctor.profileImageUrl ?? undefined} alt={doctor.name} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" data-testid={`text-doctor-name-${doctor.id}`}>
              {t("doctorProfile.doctorPrefix")} {formatName(doctor.name)}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{getDepartmentTranslationKey(doctor.department)}</p>
            {doctor.title && (
              <Badge variant="secondary" className="mt-2">
                {doctor.title}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <StarRating rating={overallRating} size="lg" showValue />
          </div>
          <p className="text-sm text-muted-foreground">
            {totalReviews} {t("doctorCard.reviews", { count: totalReviews })}
          </p>

          {doctor.ratings && (
            <div className="grid grid-cols-5 gap-1 mt-4">
              {[
                { label: "T", value: doctor.ratings.avgTeachingQuality ?? 0 },
                { label: "A", value: doctor.ratings.avgAvailability ?? 0 },
                { label: "C", value: doctor.ratings.avgCommunication ?? 0 },
                { label: "K", value: doctor.ratings.avgKnowledge ?? 0 },
                { label: "F", value: doctor.ratings.avgFairness ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div
                    className="h-8 rounded bg-muted relative overflow-hidden"
                    title={`${label}: ${value.toFixed(1)}`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary/60 transition-all"
                      style={{ height: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 p-6 pt-0">
        <Button asChild variant="default" className="flex-1" data-testid={`button-view-doctor-${doctor.id}`}>
          <Link href={`/doctors/${doctor.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            {t("doctorCard.viewProfile")}
          </Link>
        </Button>
        {onCompareToggle && (
          <Button
            variant={isComparing ? "secondary" : "outline"}
            size="icon"
            onClick={() => onCompareToggle(doctor.id)}
            data-testid={`button-compare-${doctor.id}`}
            className={isComparing ? "toggle-elevate toggle-elevated" : "toggle-elevate"}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
    </motion.div>
  );
}
