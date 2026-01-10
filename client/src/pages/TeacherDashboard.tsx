import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircle, TrendingUp, Award, Users, MessageSquare, BookOpen, Target, Sparkles, ArrowRight, BarChart3, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface Doctor {
  id: number;
  name: string;
  department: string;
  title: string;
  bio: string;
  profileImageUrl: string | null;
  ratings: {
    avgTeachingQuality: number;
    avgAvailability: number;
    avgCommunication: number;
    avgKnowledge: number;
    avgFairness: number;
    overallRating: number;
    totalReviews: number;
  } | null;
}

interface Review {
  id: number;
  doctorId: number;
  teachingQuality: number;
  availability: number;
  communication: number;
  knowledge: number;
  fairness: number;
  comment: string | null;
  createdAt: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  // Hero images carousel - 4K Premium Resolution
  const heroImages = [
    "https://images.unsplash.com/photo-1460518451285-97b6aa326961?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1503676382389-4809596d5290?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1516383607781-913a19294fd1?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=3840&h=2160&fit=crop&q=95&auto=format",
  ];

  // Extended images for seamless infinite loop [Last, ...Images, First]
  const extendedImages = useMemo(() => [
    heroImages[heroImages.length - 1],
    ...heroImages,
    heroImages[0]
  ], [heroImages]);

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Robust carousel rotation - high-energy timing
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      // Only auto-advance if no recent manual interaction and NOT currently dragging
      if (!isDragging && (timeSinceLastInteraction > 1000 || lastInteraction === 0)) {
        handleNext();
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [heroImages.length, lastInteraction, isDragging]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
  }, [isTransitioning]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
  }, [isTransitioning]);

  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    if (currentIndex === 0) {
      setCurrentIndex(extendedImages.length - 2);
    } else if (currentIndex === extendedImages.length - 1) {
      setCurrentIndex(1);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch all doctors to find self and see reviews
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json() as Promise<Doctor[]>;
    },
  });

  const teacherFullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const normalizeDoctorName = (name: string) =>
    name.replace(/^Dr\.?\s+/i, "").trim().toLowerCase();

  const normalizedTeacherName = teacherFullName.toLowerCase();

  // Best-effort mapping: if a teacher account name matches a doctor name,
  // show only that doctor's stats. (There is no explicit DB relation yet.)
  const matchedDoctors =
    user?.role === "teacher" && normalizedTeacherName
      ? doctors.filter((doc) => normalizeDoctorName(doc.name) === normalizedTeacherName)
      : doctors;

  // Find current teacher's data - for now just show all doctors with ratings
  // In a real app, you'd have a /api/teacher/:id endpoint
  const teacherReviews = matchedDoctors.filter((doc) => doc.ratings && doc.ratings.totalReviews > 0);

  const chartData = matchedDoctors
    .filter((doc) => doc.ratings && doc.ratings.totalReviews > 0)
    .map((doc) => ({
      name: doc.name,
      Teaching: doc.ratings?.avgTeachingQuality ?? 0,
      Availability: doc.ratings?.avgAvailability ?? 0,
      Communication: doc.ratings?.avgCommunication ?? 0,
      Knowledge: doc.ratings?.avgKnowledge ?? 0,
      Fairness: doc.ratings?.avgFairness ?? 0,
    }));

  if (doctorsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">{t("teacherDashboard.loading")}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      {/* Hero Section with Infinite Continuous Strip Carousel */}
      <section className="relative h-[300px] lg:h-[450px] overflow-hidden bg-slate-900" dir="ltr">
        <motion.div
          className="flex h-full will-change-transform"
          style={{
            width: `${extendedImages.length * 100}%`,
            x: `-${currentIndex * (100 / extendedImages.length)}%`,
          }}
          animate={{
            x: `-${currentIndex * (100 / extendedImages.length)}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 18,    // Majestic Deep Liquid flow (restored)
            damping: 22,     // Cinematic settling
            mass: 2.5,       // Elite weighted physical feel
            duration: isTransitioning ? undefined : 0
          }}
          onAnimationComplete={handleTransitionEnd}
          drag="x"
          dragConstraints={{ left: -150, right: 150 }} // Limit drag distance for discrete feel
          dragElastic={0.7} 
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(e, { offset, velocity }) => {
            setIsDragging(false);
            const swipe = offset.x; 
            const swipeVelocity = velocity.x; 
            
            // Discrete Swipe Guard: Trigger exactly one slide change
            if (swipe < -40 || swipeVelocity < -250) {
              handleNext();
              setLastInteraction(Date.now());
            } else if (swipe > 40 || swipeVelocity > 250) {
              handlePrev();
              setLastInteraction(Date.now());
            }
          }}
        >
          {extendedImages.map((src, index) => {
            const isActive = index === currentIndex;
            const isVisible = Math.abs(index - currentIndex) <= 1;

            return (
              <div 
                key={`${index}-${src}`}
                className="relative h-full overflow-hidden"
                style={{ 
                  width: `${100 / extendedImages.length}%`,
                  visibility: isVisible ? "visible" : "hidden"
                }}
              >
                <div
                  className="absolute inset-0 transition-all duration-1000 ease-out will-change-transform"
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: "#0f172a",
                    opacity: isActive ? 1 : 0.4,
                    filter: isActive ? "blur(0px)" : "blur(20px)",
                    transform: isActive ? "scale(1)" : "scale(1.1)",
                  }}
                />
              </div>
            );
          })}
        </motion.div>
        
        {/* Navigation Indicator - Unified Look */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
          {heroImages.map((_, index) => {
            const realIndex = index + 1;
            const isActive = (currentIndex === realIndex) || 
                            (currentIndex === 0 && realIndex === heroImages.length) ||
                            (currentIndex === extendedImages.length - 1 && realIndex === 1);

            return (
              <motion.button
                key={index}
                onClick={() => {
                  if (isTransitioning) return;
                  setIsTransitioning(true);
                  setCurrentIndex(realIndex);
                  setLastInteraction(Date.now());
                }}
                className={`h-1.5 rounded-full transition-all ${
                  isActive ? "bg-blue-400 w-6" : "bg-white/30 w-1.5"
                }`}
              />
            );
          })}
        </div>
        
        {/* Gradient Overlay - Lighter to show image */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-start z-20">
          <div className="container mx-auto px-4 pt-6 md:pt-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }} // Faster initial load
              className="max-w-xl bg-black/60 backdrop-blur-md p-5 md:p-8 rounded-2xl border border-white/10 shadow-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 mb-4">
                <Sparkles className="h-4 w-4 text-blue-300 animate-pulse" />
                <span className="text-blue-100/90 text-sm font-medium">
                  {t("teacherDashboard.hero.badge")}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                {t("teacherDashboard.hero.title")}
              </h1>
              
              <p className="text-lg text-blue-100/80 leading-relaxed">
                {t("teacherDashboard.hero.description")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 relative z-30">
        {user?.role === "teacher" && teacherFullName && matchedDoctors.length === 0 ? (
          <Alert className="mb-8 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-200">
              {t("teacherDashboard.noProfile", { name: teacherFullName })}
            </AlertDescription>
          </Alert>
        ) : teacherReviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-8 border-dashed bg-card/50 backdrop-blur">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <AlertDescription className="text-lg">
                  {t("teacherDashboard.empty")}
                </AlertDescription>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Key Metrics Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              {teacherReviews[0] && (
                <>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800 backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t("teacherDashboard.stats.overallRating", { defaultValue: "Overall Rating" })}</p>
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {teacherReviews[0].ratings?.overallRating.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t("teacherDashboard.stats.overallRatingLabel", { defaultValue: "out of 5.0" })}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800 backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t("teacherDashboard.stats.totalReviews", { defaultValue: "Total Reviews" })}</p>
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {teacherReviews[0].ratings?.totalReviews ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t("teacherDashboard.stats.totalReviewsLabel", { defaultValue: "student feedback" })}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800 backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t("teacherDashboard.stats.topStrength", { defaultValue: "Strongest Factor" })}</p>
                          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {Math.max(
                              teacherReviews[0].ratings?.avgTeachingQuality ?? 0,
                              teacherReviews[0].ratings?.avgKnowledge ?? 0,
                              teacherReviews[0].ratings?.avgCommunication ?? 0
                            ).toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t("teacherDashboard.stats.topStrengthLabel", { defaultValue: "top performance" })}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800 backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{t("teacherDashboard.stats.engagement", { defaultValue: "Engagement Score" })}</p>
                          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {((teacherReviews[0].ratings?.avgAvailability ?? 0) * 20).toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t("teacherDashboard.stats.engagementLabel", { defaultValue: "student engagement" })}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Bar Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="backdrop-blur bg-card/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      {t("teacherDashboard.chart.title")}
                    </CardTitle>
                    <CardDescription>{t("teacherDashboard.chart.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="name" 
                          angle={0} 
                          textAnchor="middle" 
                          height={80}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          domain={[0, 5]}
                          label={{ value: t("teacherDashboard.chart.ratingLabel"), angle: -90, position: "insideLeft" }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <Tooltip 
                          formatter={(value: number) => value.toFixed(2)}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Teaching" name={t("doctorProfile.factorsShort.teaching")} fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Availability" name={t("doctorProfile.factorsShort.availability")} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Communication" name={t("doctorProfile.factorsShort.communication")} fill="#ec4899" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Knowledge" name={t("doctorProfile.factorsShort.knowledge")} fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Fairness" name={t("doctorProfile.factorsShort.fairness")} fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Radar Chart */}
              {teacherReviews[0] && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="backdrop-blur bg-card/80">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {t("teacherDashboard.radar.title", { defaultValue: "Performance Breakdown" })}
                      </CardTitle>
                      <CardDescription>
                        {t("teacherDashboard.radar.description", { defaultValue: "Visual representation of your teaching metrics" })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <RadarChart data={[
                          {
                            category: t("doctorProfile.factorsShort.teaching"),
                            value: teacherReviews[0].ratings?.avgTeachingQuality ?? 0,
                            fullMark: 5
                          },
                          {
                            category: t("doctorProfile.factorsShort.availability"),
                            value: teacherReviews[0].ratings?.avgAvailability ?? 0,
                            fullMark: 5
                          },
                          {
                            category: t("doctorProfile.factorsShort.communication"),
                            value: teacherReviews[0].ratings?.avgCommunication ?? 0,
                            fullMark: 5
                          },
                          {
                            category: t("doctorProfile.factorsShort.knowledge"),
                            value: teacherReviews[0].ratings?.avgKnowledge ?? 0,
                            fullMark: 5
                          },
                          {
                            category: t("doctorProfile.factorsShort.fairness"),
                            value: teacherReviews[0].ratings?.avgFairness ?? 0,
                            fullMark: 5
                          },
                        ]}>
                          <PolarGrid stroke="hsl(var(--muted))" />
                          <PolarAngleAxis 
                            dataKey="category" 
                            stroke="hsl(var(--muted-foreground))"
                            tick={(props: any) => {
                              const { x, y, payload, index } = props;
                              // Optimized positions with better spacing and fitting colors
                              const config = [
                                { dx: 0, dy: -12, color: "#3b82f6" },      // Top (Teaching - Blue) - lowered
                                { dx: 20, dy: -6, color: "#8b5cf6" },      // Top-right (Availability - Purple) - moved right
                                { dx: 12, dy: 14, color: "#10b981" },      // Bottom-right (Communication - Green)
                                { dx: -12, dy: 14, color: "#f59e0b" },     // Bottom-left (Knowledge - Amber)
                                { dx: -20, dy: -6, color: "#ec4899" }      // Top-left (Fairness - Rose) - moved left
                              ];
                              const position = config[index] || { dx: 0, dy: 4, color: "hsl(var(--muted-foreground))" };
                              return (
                                <text 
                                  x={x + position.dx} 
                                  y={y + position.dy} 
                                  textAnchor="middle" 
                                  fill={position.color}
                                  fontSize={14}
                                  fontWeight={500}
                                >
                                  {payload.value}
                                </text>
                              );
                            }}
                          />
                          <PolarRadiusAxis angle={90} domain={[0, 5]} stroke="hsl(var(--muted-foreground))" tick={false} />
                          <Radar 
                            name="Your Ratings" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.6} 
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Individual Detailed Ratings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid gap-6"
            >
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold">{t("teacherDashboard.yourFeedback")}</h2>
              </div>
              
              {teacherReviews.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <Card className="backdrop-blur bg-card/80 hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                            <CardDescription className="text-base mt-1">
                              {doctor.title} • {doctor.department}
                            </CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {doctor.ratings?.totalReviews ?? 0}{" "}
                                {t("teacherDashboard.reviewsCount", { count: doctor.ratings?.totalReviews ?? 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            {doctor.ratings?.overallRating.toFixed(1)}
                          </div>
                          <StarRating rating={doctor.ratings?.overallRating ?? 0} size="sm" />
                          <div className="text-sm text-muted-foreground mt-1">{t("compare.overall")}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {t("doctorProfile.factors.teachingQuality")}
                          </div>
                          <StarRating rating={doctor.ratings?.avgTeachingQuality ?? 0} size="sm" />
                          <div className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
                            {doctor.ratings?.avgTeachingQuality.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-800">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {t("doctorProfile.factors.availability")}
                          </div>
                          <StarRating rating={doctor.ratings?.avgAvailability ?? 0} size="sm" />
                          <div className="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                            {doctor.ratings?.avgAvailability.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-200 dark:border-pink-800">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {t("doctorProfile.factors.communication")}
                          </div>
                          <StarRating rating={doctor.ratings?.avgCommunication ?? 0} size="sm" />
                          <div className="text-2xl font-bold mt-2 text-pink-600 dark:text-pink-400">
                            {doctor.ratings?.avgCommunication.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {t("doctorProfile.factors.knowledge")}
                          </div>
                          <StarRating rating={doctor.ratings?.avgKnowledge ?? 0} size="sm" />
                          <div className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                            {doctor.ratings?.avgKnowledge.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {t("doctorProfile.factors.fairness")}
                          </div>
                          <StarRating rating={doctor.ratings?.avgFairness ?? 0} size="sm" />
                          <div className="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">
                            {doctor.ratings?.avgFairness.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
