
import { useEffect, useRef, useState } from "react";
import styles from "./HealthStatus.module.css";
import { Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchSystemHealth } from "@/lib/healthUtils";


export default function HealthStatus() {
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
    <div className="flex flex-col justify-between h-[140px] pt-0 pb-2">
      <div className="flex items-center justify-between mb-4">
        <div className="h-12 w-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
          <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400 animate-pulse" />
        </div>
      </div>
      <div>
        <h3
          className={["text-3xl font-bold leading-tight transition-all duration-300",styles.healthValue,health > 97? styles.healthValueExcellent: health > 94? styles.healthValueGood: styles.healthValueWarning].join(" ")}
          data-health-scale={1 + Math.abs(targetHealth - health) * 0.01}
        >
          {health.toFixed(2)}%
        </h3>
        <p className="text-xs text-muted-foreground mt-2">Uptime status: <span className="font-semibold text-green-600">{health > 97 ? "Excellent" : health > 94 ? "Good" : "Warning"}</span></p>
      </div>
    </div>
  );
}
