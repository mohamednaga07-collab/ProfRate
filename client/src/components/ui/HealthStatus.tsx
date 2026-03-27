import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { fetchSystemHealth } from "@/lib/healthUtils";

export default function HealthStatus() {
  const { t } = useTranslation();
  // Start at 100 so there's no "Warning flash" before the first fetch
  const [health, setHealth] = useState(100);
  const [targetHealth, setTargetHealth] = useState(100);
  const [status, setStatus] = useState<"healthy" | "degraded" | "critical">("healthy");

  // Fetch every 30s (was 5s — excessive for a health poll and hammers the DB)
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (!mounted) return;
        const pct = typeof data.percent === "number" ? data.percent : 100;
        setTargetHealth(pct);
        setStatus(data.status ?? (pct >= 95 ? "healthy" : pct >= 70 ? "degraded" : "critical"));
      } catch {
        if (mounted) {
          // Network error — don't drop to 0, just note degraded
          setTargetHealth(60);
          setStatus("degraded");
        }
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Smooth animation: 60fps lerp toward target
  useEffect(() => {
    let running = true;
    const animateHealth = () => {
      setHealth((prev) => {
        const diff = targetHealth - prev;
        // Stop animating once close enough
        if (Math.abs(diff) < 0.05) return targetHealth;
        return prev + diff * 0.07;
      });
      if (running) setTimeout(animateHealth, 1000 / 60);
    };
    animateHealth();
    return () => { running = false; };
  }, [targetHealth]);

  const label =
    status === "healthy" ? t("admin.stats.healthExcellent") :
    status === "degraded" ? t("admin.stats.healthWarning") :
    t("admin.stats.healthWarning");

  const valueColor =
    status === "healthy"  ? "text-green-600 dark:text-green-400" :
    status === "degraded" ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400";

  const labelColor =
    status === "healthy"  ? "font-semibold text-green-600" :
    status === "degraded" ? "font-semibold text-yellow-500" :
                            "font-semibold text-red-500";

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-1">
        <div className="h-10 w-10 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
          <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-0.5">
            {t("admin.stats.systemHealth")}:{" "}
            <span className={labelColor}>{label}</span>
          </p>
          <h3 className={["text-3xl font-bold tracking-tight transition-all duration-300", valueColor].join(" ")}>
            {health.toFixed(2)}%
          </h3>
        </div>
      </div>
    </div>
  );
}

export function AnimatedHealthText({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let running = true;
    const animate = () => {
      setDisplayValue((prev) => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.01) return value;
        return prev + diff * 0.08;
      });
      if (running) setTimeout(animate, 1000 / 60);
    };
    animate();
    return () => { running = false; };
  }, [value]);

  return <span className={className}>{displayValue.toFixed(2)}%</span>;
}
