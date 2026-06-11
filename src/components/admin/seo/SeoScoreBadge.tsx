// Color-graded SEO score chip. Red <40, Orange <70, Green <90, Blue >=90.


import { cn } from "@/lib/utils";

export type SeoScoreBadgeProps = {
  score: number; // 0..100
  max?: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
};

export function seoColor(score: number) {
  if (score >= 90) return { bg: "bg-blue-500", text: "text-white", label: "Excellent" };
  if (score >= 70) return { bg: "bg-green-500", text: "text-white", label: "Good" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-white", label: "Needs work" };
  return { bg: "bg-red-500", text: "text-white", label: "Poor" };
}

export default function SeoScoreBadge({ score, max = 100, label, size = "md", className, onClick }: SeoScoreBadgeProps) {
  const c = seoColor(score);
  const big = size === "md";
  return (
    <button
      type="button"
      onClick={onClick}
      title={`SEO: ${c.label}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold transition-transform hover:scale-105",
        c.bg, c.text,
        big ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span className="opacity-90">{label || "SEO"}</span>
      <span className="tabular-nums">{score} / {max}</span>
    </button>
  );
}

// Small dot used in tables/list overlays.
export function SeoScoreDot({ score, title }: { score: number; title?: string }) {
  const c = seoColor(score);
  return (
    <span
      title={title || `SEO ${score}/100`}
      className={cn("inline-block w-2.5 h-2.5 rounded-full ring-2 ring-background", c.bg)}
    />
  );
}
