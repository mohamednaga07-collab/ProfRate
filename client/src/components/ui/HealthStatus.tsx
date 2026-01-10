
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchSystemHealth } from "@/lib/healthUtils";


export default function HealthStatus() {
  const { t } = useTranslation();
  const [health, setHealth] = useState(100);
  const [targetHealth, setTargetHealth] = useState(100);
  const requestRef = useRef<number>();

  // Fetch real health from backend every 5s
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      const value = await fetchSystemHealth();
      if (mounted) setTargetHealth(value);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Smooth animation at 120fps (8.33ms per frame)
  useEffect(() => {
    let running = true;
    const animateHealth = () => {
      setHealth((prev) => {
        const next = prev + (targetHealth - prev) * 0.08;
        return next;
      });
      if (running) {
        setTimeout(animateHealth, 1000 / 120);
      }
    };
    animateHealth();
    return () => { running = false; };
  }, [targetHealth]);

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
            {t("admin.stats.systemHealth")}: <span className="font-semibold text-green-600">{health > 97 ? t("admin.stats.healthExcellent") : health > 94 ? t("admin.stats.healthGood") : t("admin.stats.healthWarning")}</span>
          </p>
          <h3
            className={[
              "text-3xl font-bold tracking-tight transition-all duration-300",
              health > 97 ? "text-green-600 dark:text-green-400" : health > 94 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
            ].join(" ")}
          >
            {health.toFixed(2)}%
          </h3>
        </div>
      </div>
    </div>
  );
}

export function AnimatedHealthText({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  // Smooth animation at 120fps
  useEffect(() => {
    let running = true;
    const animate = () => {
      setDisplayValue((prev) => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.01) return value;
        return prev + diff * 0.08;
      });
      if (running) {
        setTimeout(animate, 1000 / 120);
      }
    };
    animate();
    return () => { running = false; };
  }, [value]);

  return (
    <span className={className}>
      {displayValue.toFixed(2)}%
    </span>
  );
}
