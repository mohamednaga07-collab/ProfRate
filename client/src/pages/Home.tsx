import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { DoctorCard } from "@/components/DoctorCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Star, Users, BarChart3, TrendingUp, ArrowRight, Award, MessageSquare, BookOpen, Target, Sparkles, Shield } from "lucide-react";
import type { DoctorWithRatings } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, memo, useCallback } from "react";

import styles from "./Home.module.css";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: doctors, isLoading: doctorsLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
  });

  const { data: stats } = useQuery<{ totalDoctors: number; totalReviews: number }>({
    queryKey: ["/api/stats"],
  });

  // Hero images carousel - 4K Premium Resolution
  const heroImages = useMemo(() => [
    "https://images.unsplash.com/photo-1460518451285-97b6aa326961?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1503676382389-4809596d5290?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1516383607781-913a19294fd1?w=3840&h=2160&fit=crop&q=95&auto=format",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=3840&h=2160&fit=crop&q=95&auto=format",
  ], []);

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
  }, [heroImages.length, lastInteraction, isDragging]); // Pause if dragging

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

  const topDoctors = useMemo(
    () =>
      doctors
        ?.filter((d) => (d.ratings?.totalReviews ?? 0) > 0)
        ?.sort((a, b) => (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0))
        ?.slice(0, 3),
    [doctors]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Infinite Continuous Strip Carousel */}
      <section className="relative h-[280px] sm:h-[350px] lg:h-[450px] overflow-hidden bg-slate-900 -mt-0" dir="ltr">
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
            stiffness: 260,
            damping: 30,
            mass: 1,
            tension: 170,
            friction: 26,
            duration: isTransitioning ? undefined : 0
          }}
          onAnimationComplete={handleTransitionEnd}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1} 
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(e, { offset, velocity }) => {
            setIsDragging(false);
            const swipe = offset.x; 
            const swipeVelocity = velocity.x; 
            
            // Discrete Swipe Guard: Trigger exactly one slide change
            // and ignore excessive momentum
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

            const originalIndex = heroImages.indexOf(src);
            const imageClass = originalIndex >= 0 ? styles[`heroImage${originalIndex + 1}`] : '';

            return (
              <div 
                key={`${index}-${src}`}
                className={`relative h-full overflow-hidden flex-1 ${isVisible ? styles.heroSlideVisible : styles.heroSlide}`}

              >
                <div
                  className={`absolute inset-0 transition-all duration-1000 ease-out will-change-transform ${styles.heroBackground} ${imageClass} ${isActive ? styles.heroBackgroundActive : ''}`}
                />
              </div>
            );
          })}
        </motion.div>
        
        {/* Indicator Dots - Mapped for consistency */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
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
                className={`h-2 rounded-full transition-all ${
                  isActive ? "bg-white w-6" : "bg-white/40 w-2"
                }`}
                whileHover={{ scale: 1.3, backgroundColor: "rgba(255,255,255,0.8)" }}
                whileTap={{ scale: 0.9 }}
              />
            );
          })}
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/50 to-black/40 pointer-events-none" />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-start z-20">
          <div className="container mx-auto px-4 pt-6 md:pt-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }} // Faster initial load
              className="max-w-md rounded-xl bg-black/40 border border-white/10 backdrop-blur px-4 py-3 shadow-lg"
            >
              <p className="text-sm text-white/70">
                {t("home.welcomeBack", { name: user?.firstName || t("roles.student") })}
              </p>
              <p className="text-white font-semibold text-lg leading-relaxed mt-1">
                {user?.role === "student"
                  ? t("home.studentTagline", { defaultValue: "Rate your professors and help fellow students make better decisions." })
                  : user?.role === "teacher"
                  ? t("home.roleMessage.teacher")
                  : t("home.roleMessage.admin")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Premium Action Cards - Perfectly Aligned Vertical Layout */}
            {[
              {
                title: t("home.actions.rateTitle", { defaultValue: "Rate a professor" }),
                desc: t("home.actions.rateDesc", { defaultValue: "Share your experience in under 60 seconds." }),
                icon: Star,
                href: "/doctors",
                color: "from-amber-500/15 to-amber-600/5",
                accentText: "text-amber-600 dark:text-amber-300",
                cta: t("home.actions.rateCta", { defaultValue: "Start rating" }),
              },
              {
                title: t("home.actions.compareTitle", { defaultValue: "Compare options" }),
                desc: t("home.actions.compareDesc", { defaultValue: "Stack educators side by side before you decide." }),
                icon: BarChart3,
                href: "/compare",
                color: "from-sky-500/15 to-indigo-600/5",
                accentText: "text-sky-600 dark:text-sky-300",
                cta: t("home.actions.compareCta", { defaultValue: "Open compare" }),
              },
              {
                title: t("home.actions.shortlistTitle", { defaultValue: "Shortlist & follow" }),
                desc: t("home.actions.shortlistDesc", { defaultValue: "Save favorites and get notified when ratings change." }),
                icon: Target,
                href: "/doctors",
                color: "from-emerald-500/15 to-teal-600/5",
                accentText: "text-emerald-600 dark:text-emerald-300",
                cta: t("home.actions.shortlistCta", { defaultValue: "View shortlist" }),
              },
              {
                title: t("home.actions.feedbackTitle", { defaultValue: "Feedback insights" }),
                desc: t("home.actions.feedbackDesc", { defaultValue: "See themes from recent student feedback instantly." }),
                icon: MessageSquare,
                href: "/doctors",
                color: "from-purple-500/15 to-fuchsia-600/5",
                accentText: "text-purple-600 dark:text-purple-300",
                cta: t("home.actions.feedbackCta", { defaultValue: "Explore insights" }),
              },
            ].map((item, index) => (
              <div key={item.title}>
                <Card className={`h-full border border-border/50 bg-card/40 bg-gradient-to-br ${item.color} backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden`}>
                  <CardContent className="p-6 flex flex-col flex-1 gap-6 relative">
                    {/* Floating Background Icon for Premium Feel */}
                    <item.icon className={`absolute -right-4 -top-4 h-24 w-24 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-110 transition-all duration-500 ${item.accentText}`} />
                    
                    <div className="space-y-4 relative z-10">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1 flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${item.accentText.replace('text-', 'bg-')}`} />
                          {t("home.actions.quick", { defaultValue: "Quick action" })}
                        </p>
                        <h3 className="text-xl font-bold text-foreground tracking-tight leading-tight">{item.title}</h3>
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px] line-clamp-2">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-auto relative z-10">
                      <Button asChild className="w-full justify-between gap-2 bg-background/50 hover:bg-background/80 backdrop-blur border border-border/50 text-foreground group/btn shadow-sm hover:shadow-md transition-all duration-300 h-11 px-5">
                        <Link href={item.href}>
                          <span className="font-bold tracking-tight">{item.cta}</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t("home.stats.title", { defaultValue: "Platform Overview" })}</h2>
              <p className="text-muted-foreground">{t("home.stats.description", { defaultValue: "Get insights into our professor ratings" })}</p>
            </div>
            {user?.role === "student" && (
              <Button asChild data-testid="button-rate-professor" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg border border-amber-600/20 font-semibold">
                <Link href="/doctors">
                  <Star className="h-4 w-4" />
                  {t("home.rateProfessor")}
                </Link>
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                labelKey: "home.stats.totalProfessors",
                value: stats?.totalDoctors ?? doctors?.length ?? 0,
                color: "blue",
              },
              {
                icon: Star,
                labelKey: "home.stats.totalReviews",
                value: stats?.totalReviews ?? 0,
                color: "green",
              },
              {
                icon: TrendingUp,
                labelKey: "home.stats.avgRating",
                value: doctors && doctors.length > 0
                  ? (
                      doctors.reduce((acc, d) => acc + (d.ratings?.overallRating ?? 0), 0) /
                      Math.max(1, doctors.filter((d) => (d.ratings?.totalReviews ?? 0) > 0).length)
                    ).toFixed(1)
                  : "0.0",
                color: "purple",
              },
              {
                icon: BarChart3,
                labelKey: "home.stats.departments",
                value: doctors ? new Set(doctors.map((d) => d.department)).size : 0,
                color: "orange",
              },
            ].map((stat, index) => (
              <div key={index}>
                <Card className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color}-600/5 border-${stat.color}-200 dark:border-${stat.color}-800 backdrop-blur hover:shadow-lg transition-shadow`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                        <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                        <p className="text-2xl font-bold" data-testid={`stat-${stat.labelKey}`}>
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="bg-card/90 border border-border shadow-sm">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("home.enhance.compareLabel", { defaultValue: "Compare" })}</p>
                    <h3 className="text-lg font-semibold text-foreground">{t("home.enhance.compareTitle", { defaultValue: "Side-by-side clarity" })}</h3>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-sm text-foreground">
                  <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground mb-2">
                    <span>{t("home.enhance.factor", { defaultValue: "Factor" })}</span>
                    <span className="text-center">{t("home.enhance.doctorA", { defaultValue: "A" })}</span>
                    <span className="text-center">{t("home.enhance.doctorB", { defaultValue: "B" })}</span>
                  </div>
                  {[ 
                    { label: t("home.enhance.clarity", { defaultValue: "Clarity" }), a: "4.8", b: "4.2" },
                    { label: t("home.enhance.support", { defaultValue: "Support" }), a: "4.6", b: "4.0" },
                    { label: t("home.enhance.fairness", { defaultValue: "Fairness" }), a: "4.7", b: "4.1" },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-3 py-1 text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="text-center font-semibold text-foreground">{row.a}</span>
                      <span className="text-center font-semibold text-foreground">{row.b}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 pr-3">{t("home.enhance.compareDesc", { defaultValue: "Quickly spot strengths before you decide." })}</p>
                  <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:from-sky-600 hover:to-indigo-600 shadow-md hover:shadow-lg border border-sky-600/20 font-semibold whitespace-nowrap flex-shrink-0">
                    <Link href="/compare">{t("home.enhance.compareCta", { defaultValue: "Open compare" })}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/90 border border-border shadow-sm">
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("home.enhance.rateLabel", { defaultValue: "Rate" })}</p>
                    <h3 className="text-lg font-semibold text-foreground">{t("home.enhance.rateTitle", { defaultValue: "Guided multi-factor rating" })}</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <span>{t("home.enhance.ratePoint1", { defaultValue: "Five factors with tooltips for consistent scores." })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>{t("home.enhance.ratePoint2", { defaultValue: "Highlight strengths and a quick takeaway." })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-sky-500 mt-0.5" />
                    <span>{t("home.enhance.ratePoint3", { defaultValue: "See what peers recently noticed most." })}</span>
                  </li>
                </ul>
                <div className="flex items-center justify-between mt-2 pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 pr-3">{t("home.enhance.rateDesc", { defaultValue: "Stay structured while staying fast." })}</p>
                  <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg border border-amber-600/20 font-semibold whitespace-nowrap flex-shrink-0">
                    <Link href="/doctors">{t("home.enhance.rateCta", { defaultValue: "Start rating" })}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/90 border border-border shadow-sm">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("home.enhance.trustLabel", { defaultValue: "Trust" })}</p>
                    <h3 className="text-lg font-semibold text-foreground">{t("home.enhance.trustTitle", { defaultValue: "Respectful by default" })}</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>{t("home.enhance.trustPoint1", { defaultValue: "Anonymous by design; no spam or doxxing." })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5" />
                    <span>{t("home.enhance.trustPoint2", { defaultValue: "Civility guardrails keep feedback constructive." })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Award className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>{t("home.enhance.trustPoint3", { defaultValue: "Verified profiles surface first for credibility." })}</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground pt-1">{t("home.enhance.trustDesc", { defaultValue: "Built to stay fair for students and faculty." })}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div
            className="flex items-center justify-between gap-4 mb-8"
          >
            <div>
              <h2 className="text-2xl font-bold">{t("home.topRated.title")}</h2>
              <p className="text-muted-foreground">{t("home.topRated.subtitle")}</p>
            </div>
            <Button asChild className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg border border-indigo-600/20 font-semibold">
              <Link href="/doctors">
                {t("home.topRated.viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {doctorsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full mt-6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topDoctors && topDoctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topDoctors.map((doctor) => (
                <div key={doctor.id}>
                  <DoctorCard doctor={doctor} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("home.empty.title")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("home.empty.description")}
                </p>
                {user?.role === "admin" && (
                  <Button asChild>
                    <Link href="/doctors">{t("home.empty.addProfessor")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
