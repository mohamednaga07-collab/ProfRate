import { cn } from "@/lib/utils";

interface RatingBarProps {
  label: string;
  value: number;
  maxValue?: number;
  showPercentage?: boolean;
}

export function RatingBar({ label, value, maxValue = 5, showPercentage = false }: RatingBarProps) {
  const percentage = (value / maxValue) * 100;

  const getColorClass = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-chart-2";
    if (pct >= 40) return "bg-chart-3";
    if (pct >= 20) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {showPercentage ? `${percentage.toFixed(0)}%` : value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColorClass(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
