import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthForm } from "@/components/AuthForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GraduationCap, Star, BarChart3, Shield, Users, ChevronRight, CheckCircle, MapPin, ArrowRight, TrendingUp, Target, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { DoctorCard } from "@/components/DoctorCard";
import type { DoctorWithRatings } from "@shared/schema";
import styles from "./Landing.module.css";

interface LandingProps {
  defaultTab?: "login" | "register";
}



export default function Landing({ defaultTab = "login" }: LandingProps) {
  const { t } = useTranslation();
  const [lastInteraction, setLastInteraction] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const { data: doctors, isLoading: doctorsLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
  });

  const { data: stats } = useQuery<{ totalDoctors: number; totalReviews: number }>({
    queryKey: ["/api/stats"],
  });

  const topDoctors = useMemo(
    () =>
      doctors
        ?.filter((d) => (d.ratings?.totalReviews ?? 0) > 0)
        ?.sort((a, b) => (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0))
        ?.slice(0, 3),
    [doctors]
  );

  // Hero carousel images - 4K Premium Resolution
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
  const extendedImages = [
    heroImages[heroImages.length - 1],
    ...heroImages,
    heroImages[0]
  ];

  // currentIndex is now 1-indexed relative to extendedImages
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Robust carousel rotation - high-speed & reliable
  useEffect(() => {
    const autoplayTimer = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
    // Use 2000ms (2s) pause after interaction as requested
      if (!isDragging && (timeSinceLastInteraction > 2000 || lastInteraction === 0)) {
        handleNext();
      }
    }, 5000); 
    return () => clearInterval(autoplayTimer);
  }, [isDragging, lastInteraction, handleNext]);

  // Instant reset logic for infinite loop
  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    
    if (currentIndex === 0) {
      // Jumped to clone of last image from first -> snap to real last
      setCurrentIndex(extendedImages.length - 2);
    } else if (currentIndex === extendedImages.length - 1) {
      // Jumped to clone of first image from last -> snap to real first
      setCurrentIndex(1);
    }
  };

  const scrollToAuth = () => {
    const el = document.getElementById("auth-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleGetStarted = scrollToAuth;
  const handleLogin = scrollToAuth;

  return (
    <div className="min-h-screen bg-background">
      <header
        className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 shadow-sm"
      >
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">{t("brand.name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button onClick={handleLogin} data-testid="button-landing-login">
              {t("auth.login")}
            </Button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      <main>
        {/* Hero Section with Infinite Continuous Strip Carousel */}
        <section className="relative h-[380px] sm:h-[450px] lg:h-[650px] w-full overflow-hidden bg-slate-900" dir="ltr">
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

              return (
                <div 
                  key={`${index}-${src}`}
                  className={`relative h-full overflow-hidden ${styles.carouselItem} ${isVisible ? styles.visible : styles.hidden}`}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-1000 ease-out will-change-transform ${styles.carouselImage} ${styles[`image${heroImages.indexOf(src) + 1}`]} ${isActive ? styles.active : styles.inactive}`}
                  />
                </div>
              );
            })}
          </motion.div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/50 pointer-events-none z-10" />

          {/* Content Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="container mx-auto max-w-4xl text-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="pointer-events-auto"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm font-medium mb-6">
                  <Shield className="h-4 w-4" />
                  {t("landing.badge.anonymous")}
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
                  {t("landing.hero.title")}
                  <span className="text-blue-400 block mt-2">{t("landing.hero.highlight")}</span>
                </h1>

                <p className="text-lg text-white/90 max-w-2xl mx-auto mb-10">
                  {t("landing.hero.description")}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" onClick={handleGetStarted} data-testid="button-get-started">
                    {t("landing.getStarted")}
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  <Button size="lg" variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <a href="#features">{t("landing.learnMore")}</a>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Image indicators - Mapped to real index */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
            {heroImages.map((_, index) => {
              // Map continuous currentIndex back to 0-7 for dots
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
                  aria-label={`Go to slide ${index + 1}`}
                />
              );
            })}
          </div>
        </section>

        {/* Action Cards Section - Premium Layout */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-12 text-center md:text-left">
               <div className="max-w-2xl">
                 <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("home.actions.rateTitle", { defaultValue: "Everything you need to decide" })}</h2>
                 <p className="text-muted-foreground text-lg">{t("home.actions.rateDesc", { defaultValue: "Powerful tools designed to help students share meaningful feedback and choose the best educators." })}</p>
               </div>
               <Button onClick={scrollToAuth} variant="ghost" className="gap-2 group text-primary font-semibold">
                 {t("landing.learnMore")} 
                 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: t("home.actions.rateTitle", { defaultValue: "Rate a professor" }),
                  desc: t("home.actions.rateDesc", { defaultValue: "Share your experience in under 60 seconds." }),
                  icon: Star,
                  color: "from-amber-500/15 to-amber-600/5",
                  accentText: "text-amber-600 dark:text-amber-300",
                  cta: t("home.actions.rateCta", { defaultValue: "Start rating" }),
                },
                {
                  title: t("home.actions.compareTitle", { defaultValue: "Compare options" }),
                  desc: t("home.actions.compareDesc", { defaultValue: "Stack educators side by side before you decide." }),
                  icon: BarChart3,
                  color: "from-sky-500/15 to-indigo-600/5",
                  accentText: "text-sky-600 dark:text-sky-300",
                  cta: t("home.actions.compareCta", { defaultValue: "Open compare" }),
                },
                {
                  title: t("home.actions.shortlistTitle", { defaultValue: "Shortlist & follow" }),
                  desc: t("home.actions.shortlistDesc", { defaultValue: "Save favorites and get notified when ratings change." }),
                  icon: Target,
                  color: "from-emerald-500/15 to-teal-600/5",
                  accentText: "text-emerald-600 dark:text-emerald-300",
                  cta: t("home.actions.shortlistCta", { defaultValue: "View shortlist" }),
                },
                {
                  title: t("home.actions.feedbackTitle", { defaultValue: "Feedback insights" }),
                  desc: t("home.actions.feedbackDesc", { defaultValue: "See themes from recent student feedback instantly." }),
                  icon: MessageSquare,
                  color: "from-purple-500/15 to-fuchsia-600/5",
                  accentText: "text-purple-600 dark:text-purple-300",
                  cta: t("home.actions.feedbackCta", { defaultValue: "Explore insights" }),
                },
              ].map((item, index) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card 
                    className={`h-full border border-border/50 bg-card/40 bg-gradient-to-br ${item.color} backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col group overflow-hidden cursor-pointer`}
                    onClick={scrollToAuth}
                  >
                    <CardContent className="p-6 flex flex-col flex-1 gap-6 relative">
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
                        <Button className="w-full justify-between gap-2 bg-background/50 hover:bg-background/80 backdrop-blur border border-border/50 text-foreground group/btn shadow-sm hover:shadow-md transition-all duration-300 h-11 px-5">
                            <span className="font-bold tracking-tight">{item.cta}</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section with Animations */}
        <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("home.stats.title", { defaultValue: "Platform Overview" })}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("home.stats.description", { defaultValue: "Get real-time insights into our growing rating ecosystem." })}</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color}-600/5 border-${stat.color}-200/50 dark:border-${stat.color}-800/30 backdrop-blur shadow-sm hover:shadow-md transition-all`}>
                    <CardContent className="pt-8 pb-8 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className={`h-14 w-14 rounded-2xl bg-${stat.color}-500/15 flex items-center justify-center shadow-inner`}>
                          <stat.icon className={`h-7 w-7 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground/80 mb-1">{t(stat.labelKey)}</p>
                          <p className="text-3xl font-bold tracking-tight">
                            {stat.value}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Rated Section */}
        <section className="py-24 px-4 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
              <div className="text-center sm:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold mb-3">{t("home.topRated.title")}</h2>
                <p className="text-muted-foreground text-lg">{t("home.topRated.subtitle")}</p>
              </div>
              <Button onClick={scrollToAuth} size="lg" className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 font-bold">
                {t("home.topRated.viewAll")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            {doctorsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-8">
                      <div className="flex items-start gap-5">
                        <div className="h-20 w-20 rounded-2xl bg-muted animate-pulse" />
                        <div className="flex-1 space-y-3 pt-2">
                          <div className="h-6 w-40 bg-muted animate-pulse rounded-lg" />
                          <div className="h-4 w-28 bg-muted animate-pulse rounded-lg" />
                        </div>
                      </div>
                      <div className="h-24 w-full bg-muted animate-pulse rounded-2xl mt-8" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : topDoctors && topDoctors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {topDoctors.map((doctor, index) => (
                  <motion.div 
                    key={doctor.id} 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 }}
                    viewport={{ once: true }}
                    className="cursor-pointer group" 
                    onClick={scrollToAuth}
                  >
                    <DoctorCard doctor={doctor} readOnly />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">{t("home.empty.description")}</p>
              </div>
            )}
          </div>
        </section>

        <section id="auth-section" className="py-20 px-4 bg-slate-50 dark:bg-slate-950 text-foreground transition-colors duration-300">
          <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary dark:bg-white/10 dark:border-white/15 dark:text-white text-sm font-medium">
                <Shield className="h-4 w-4" />
                <span>{t("landing.hero.highlight")}</span>
              </div>
              <h2 className="text-3xl font-bold leading-tight">
                {t("auth.login")}/{t("auth.register")}
                <span className="block text-primary dark:text-blue-200 text-xl font-semibold mt-2">{t("landing.hero.title")}</span>
              </h2>
              <p className="text-muted-foreground dark:text-white/80 max-w-xl">
                {t("landing.hero.description")}
              </p>
              <ul className="space-y-3 text-muted-foreground dark:text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-300 mt-0.5" />
                  <span>{t("landing.hero.features.anonymous")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-300 mt-0.5" />
                  <span>{t("landing.hero.features.sync")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-sky-500 dark:text-sky-200 mt-0.5" />
                  <span>{t("landing.hero.features.preferences")}</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="bg-card shadow-2xl border-border/50 backdrop-blur-xl transition-all duration-300">
                <CardContent className="p-6">
                  <AuthForm defaultTab={defaultTab} />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-4">{t("landing.final.title")}</h2>
              <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
                {t("landing.final.subtitle")}
              </p>
              <Button size="lg" variant="secondary" onClick={handleGetStarted}>
                {t("landing.getStarted")}
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("brand.name")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("landing.footer.tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
