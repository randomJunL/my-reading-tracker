import {
  Award,
  Blocks,
  BookCheck,
  CalendarCheck2,
  CalendarHeart,
  Compass,
  Crown,
  Flame,
  LibraryBig,
  Medal,
  Repeat2,
  Sparkles,
  Sun,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

type BadgeDesign = {
  icon: LucideIcon;
  primary: string;
  secondary: string;
  highlight: string;
};

const badgeDesigns: Record<string, BadgeDesign> = {
  "first-book": design(BookCheck, "#3f8c78", "#1f5c50", "#f7cf78"),
  "book-explorer": design(LibraryBig, "#4c83a8", "#285778", "#f6d78a"),
  "book-adventurer": design(Compass, "#d1804f", "#964a31", "#ffe0a1"),
  "book-champion": design(Trophy, "#785b9f", "#4a356f", "#f2c86d"),
  "reading-legend": design(Crown, "#c28b25", "#7a4d0c", "#fff0a9"),
  "steady-reader": design(CalendarCheck2, "#5a9f74", "#2d6b4a", "#dff2a6"),
  "strong-reading-week": design(CalendarHeart, "#d26f78", "#913d55", "#ffd0b4"),
  "perfect-reading-week": design(Sparkles, "#6a8fd4", "#40539b", "#fff1a8"),
  "building-a-habit": design(Blocks, "#4c9b99", "#286a69", "#f0cb72"),
  "monthly-momentum": design(TrendingUp, "#df744e", "#9b402d", "#ffd98d"),
  "reading-routine": design(Repeat2, "#7086bd", "#43558c", "#bce7df"),
  "season-of-reading": design(Sun, "#d49a32", "#a25421", "#fff0a0"),
  "three-day-reader": design(Flame, "#e06d48", "#a73a2c", "#ffd56e"),
  "one-week-reader": design(Zap, "#dc8140", "#9f3d27", "#ffe570"),
  "two-week-reader": design(Medal, "#c85757", "#812e46", "#ffca82"),
  "monthly-reader": design(Award, "#8c5ca8", "#54356f", "#f5cf75"),
  "reading-marathon": design(Trophy, "#bd8929", "#69430e", "#fff4aa"),
};

const categoryShapes: Record<string, string> = {
  books_finished:
    "polygon(50% 0%, 91% 13%, 88% 66%, 50% 100%, 12% 66%, 9% 13%)",
  weekly_consistency:
    "polygon(50% 0%, 61% 10%, 75% 6%, 82% 20%, 96% 25%, 91% 41%, 100% 53%, 88% 64%, 90% 80%, 74% 83%, 64% 97%, 50% 88%, 36% 97%, 26% 83%, 10% 80%, 12% 64%, 0% 53%, 9% 41%, 4% 25%, 18% 20%, 25% 6%, 39% 10%)",
  weekly_streak: "polygon(25% 7%, 75% 7%, 100% 50%, 75% 93%, 25% 93%, 0% 50%)",
  continuous_days:
    "polygon(50% 0%, 63% 10%, 79% 7%, 86% 23%, 100% 33%, 92% 50%, 100% 67%, 86% 77%, 79% 93%, 63% 90%, 50% 100%, 37% 90%, 21% 93%, 14% 77%, 0% 67%, 8% 50%, 0% 33%, 14% 23%, 21% 7%, 37% 10%)",
};

export function BadgeEmblem({
  code,
  category,
  name,
  threshold,
  earned,
  compact = false,
}: {
  code: string;
  category: string;
  name: string;
  threshold: number;
  earned: boolean;
  compact?: boolean;
}) {
  const badge =
    badgeDesigns[code] ?? design(Award, "#6c8b82", "#345f54", "#f4bd62");
  const Icon = badge.icon;
  const size = compact ? "h-[72px] w-[62px]" : "h-[118px] w-[102px]";
  const medalSize = compact ? "size-[62px]" : "size-[102px]";
  const innerSize = compact ? "inset-[7px]" : "inset-[11px]";
  const iconSize = compact ? "size-5" : "size-8";

  return (
    <div
      role="img"
      aria-label={`${name} badge${earned ? ", earned" : ", locked"}`}
      className={`relative shrink-0 ${size} ${earned ? "" : "grayscale"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-[19%] w-[31%] -rotate-6 ${compact ? "h-8" : "h-12"}`}
        style={{
          background: earned ? badge.secondary : "#9aa6a1",
          clipPath: "polygon(0 0, 100% 0, 82% 100%, 48% 77%, 10% 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute right-[19%] bottom-0 w-[31%] rotate-6 ${compact ? "h-8" : "h-12"}`}
        style={{
          background: earned ? badge.primary : "#b3bcb8",
          clipPath: "polygon(0 0, 100% 0, 90% 100%, 52% 77%, 18% 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute top-0 left-1/2 -translate-x-1/2 drop-shadow-[0_6px_7px_rgba(38,57,51,0.25)] ${medalSize}`}
        style={{
          background: earned
            ? `linear-gradient(145deg, ${badge.highlight} 0%, ${badge.primary} 38%, ${badge.secondary} 100%)`
            : "linear-gradient(145deg, #e2e6e4, #aab4b0 55%, #7f8e88)",
          clipPath: categoryShapes[category] ?? categoryShapes.continuous_days,
        }}
      >
        <span
          className={`absolute flex items-center justify-center rounded-full border-[3px] ${innerSize}`}
          style={{
            borderColor: earned ? badge.highlight : "#d7ddda",
            background: earned
              ? `radial-gradient(circle at 35% 28%, ${badge.primary}, ${badge.secondary})`
              : "radial-gradient(circle at 35% 28%, #cbd2cf, #899791)",
            color: earned ? badge.highlight : "#eef1ef",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,.2)",
          }}
        >
          <Icon className={iconSize} strokeWidth={2.2} />
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute left-1/2 -translate-x-1/2 rounded-full border border-white/60 bg-[#fff8df] font-black text-[#694a20] shadow-sm ${compact ? "top-[45px] px-1.5 py-0.5 text-[8px]" : "top-[76px] px-2 py-0.5 text-[10px]"}`}
      >
        {threshold}
      </span>
    </div>
  );
}

function design(
  icon: LucideIcon,
  primary: string,
  secondary: string,
  highlight: string,
): BadgeDesign {
  return { icon, primary, secondary, highlight };
}
