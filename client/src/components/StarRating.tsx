import { useId } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  scaleFrom10?: boolean;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
  showValue = false,
  scaleFrom10 = true,
}: StarRatingProps) {
  const gradientIdBase = useId().replace(/:/g, "");
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      // If scaled, we still pass back the scaled index (or unscale it back to 10 points)
      // Assuming interactive ratings are usually 1-5 format directly.
      onRatingChange(scaleFrom10 ? (index + 1) * 2 : (index + 1));
    }
  };

  const visualRating = scaleFrom10 ? rating / 2 : rating;

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5 relative">
        {Array.from({ length: maxRating }).map((_, index) => {
          const fillPercentage = Math.max(0, Math.min(1, visualRating - index)) * 100;
          const gradientId = `star-grad-${gradientIdBase}-${index}`;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(index)}
              aria-label={`Rate ${index + 1} stars`}
              title={`Rate ${index + 1} stars`}
              className={cn(
                "relative transition-transform",
                interactive && "cursor-pointer hover:scale-110",
                !interactive && "cursor-default"
              )}
              data-testid={`star-${index + 1}`}
            >
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset={`${fillPercentage}%`} stopColor="rgb(251, 191, 36)" /> {/* amber-400 */}
                    <stop offset={`${fillPercentage}%`} stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              <Star
                style={{ fill: `url(#${gradientId})` }}
                className={cn(
                  sizeClasses[size],
                  "transition-colors",
                  fillPercentage > 0 ? "text-amber-400" : "text-muted-foreground/40"
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          {rating.toFixed(1)} {scaleFrom10 && "/ 10"}
        </span>
      )}
    </div>
  );
}
