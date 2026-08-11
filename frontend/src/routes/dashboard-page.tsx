import {
  ArrowRight,
  BookCheck,
  BookOpenText,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const summaryCards = [
  {
    label: "Minutes read",
    value: "142",
    note: "+18 from last week",
    icon: Clock3,
    iconClass: "bg-[#e4f0eb] text-[#28705f]",
  },
  {
    label: "Pages turned",
    value: "186",
    note: "Across 4 books",
    icon: BookOpenText,
    iconClass: "bg-[#fff0d5] text-[#a6651c]",
  },
  {
    label: "Reading days",
    value: "5",
    note: "This week",
    icon: CalendarDays,
    iconClass: "bg-[#fbe5de] text-[#bb583f]",
  },
];

export function DashboardPage() {
  return (
    <div className="animate-[fade-in_400ms_ease-out]">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#f4bd62] text-xs font-bold text-[#173f36]">
              M
            </span>
            <button className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#42645b] hover:text-[#173f36]">
              Maya’s reading
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </button>
          </div>
          <h1 className="max-w-2xl font-serif text-[38px] leading-[1.08] font-bold tracking-[-0.035em] text-[#173f36] sm:text-[46px]">
            A good week of reading
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#667972]">
            Maya has read on five days this week. A few more pages tonight will
            make this her strongest week in August.
          </p>
        </div>

        <Button variant="secondary" className="self-start sm:self-auto">
          View full history
          <ArrowRight className="size-4" />
        </Button>
      </section>

      <section
        aria-label="Weekly reading summary"
        className="grid gap-4 md:grid-cols-3"
      >
        {summaryCards.map(({ label, value, note, icon: Icon, iconClass }) => (
          <Card key={label} className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b7e77]">{label}</p>
                <p className="mt-2 font-serif text-[38px] leading-none font-bold tracking-[-0.03em] text-[#173f36]">
                  {value}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${iconClass}`}>
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#71827c]">
              {label === "Minutes read" && (
                <TrendingUp className="size-3.5 text-[#28705f]" />
              )}
              {note}
            </p>
          </Card>
        ))}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#eceae2] px-5 py-4 sm:px-6">
            <div>
              <p className="text-base font-bold text-[#23443b]">
                Continue reading
              </p>
              <p className="mt-0.5 text-xs text-[#7a8a84]">
                2 books in progress
              </p>
            </div>
            <Button variant="ghost" size="sm">
              View library
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <article className="flex gap-4 rounded-2xl bg-[#f2f5ee] p-4">
              <div className="relative flex h-32 w-[88px] shrink-0 flex-col justify-between overflow-hidden rounded-[8px] bg-[#2f7868] p-3 text-white shadow-[4px_6px_15px_rgba(28,66,57,0.18)]">
                <Sparkles className="size-4 text-[#f8ca76]" />
                <div>
                  <p className="font-serif text-[13px] leading-tight font-bold">
                    The Wild Robot
                  </p>
                  <p className="mt-1 text-[8px] text-white/65">Peter Brown</p>
                </div>
                <span className="absolute inset-y-0 left-1.5 w-px bg-black/12" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col py-1">
                <p className="text-xs font-bold tracking-[0.1em] text-[#578077] uppercase">
                  Current book
                </p>
                <h2 className="mt-2 text-base leading-tight font-bold text-[#1e4037]">
                  The Wild Robot
                </h2>
                <p className="mt-1 text-xs text-[#71847d]">Peter Brown</p>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-[#60756e]">
                    <span>Page 164</span>
                    <span>58%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#d7e2dc]">
                    <div className="h-full w-[58%] rounded-full bg-[#df6549]" />
                  </div>
                </div>
              </div>
            </article>

            <article className="flex gap-4 rounded-2xl bg-[#f8f3e8] p-4">
              <div className="relative flex h-32 w-[88px] shrink-0 flex-col justify-between overflow-hidden rounded-[8px] bg-[#d88c52] p-3 text-white shadow-[4px_6px_15px_rgba(99,65,35,0.18)]">
                <span className="text-xl" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className="font-serif text-[13px] leading-tight font-bold">
                    Zoey and Sassafras
                  </p>
                  <p className="mt-1 text-[8px] text-white/70">Asia Citro</p>
                </div>
                <span className="absolute inset-y-0 left-1.5 w-px bg-black/10" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col py-1">
                <p className="text-xs font-bold tracking-[0.1em] text-[#9b6a3e] uppercase">
                  Current book
                </p>
                <h2 className="mt-2 text-base leading-tight font-bold text-[#1e4037]">
                  Dragons and Marshmallows
                </h2>
                <p className="mt-1 text-xs text-[#71847d]">Asia Citro</p>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-[#60756e]">
                    <span>Page 52</span>
                    <span>54%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#eadfca]">
                    <div className="h-full w-[54%] rounded-full bg-[#d88c52]" />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#eceae2] px-5 py-4 sm:px-6">
            <div>
              <p className="text-base font-bold text-[#23443b]">
                Recent activity
              </p>
              <p className="mt-0.5 text-xs text-[#7a8a84]">
                The latest reading moments
              </p>
            </div>
            <button
              className="cursor-pointer rounded-lg p-2 text-[#71847d] hover:bg-[#f3f2ec]"
              aria-label="More activity options"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>

          <div className="divide-y divide-[#eeece5] px-5 sm:px-6">
            <ActivityItem
              icon={<BookCheck className="size-4" />}
              iconClass="bg-[#e4f0eb] text-[#28705f]"
              title="Finished a reading session"
              detail="The Wild Robot · 24 minutes"
              time="Today, 4:10 PM"
            />
            <ActivityItem
              icon={<BookOpenText className="size-4" />}
              iconClass="bg-[#fff0d5] text-[#a6651c]"
              title="Read 18 pages"
              detail="Dragons and Marshmallows"
              time="Yesterday, 7:35 PM"
            />
            <ActivityItem
              icon={<Clock3 className="size-4" />}
              iconClass="bg-[#fbe5de] text-[#bb583f]"
              title="Read together"
              detail="The Wild Robot · 31 minutes"
              time="Saturday, 10:20 AM"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

type ActivityItemProps = {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  detail: string;
  time: string;
};

function ActivityItem({
  icon,
  iconClass,
  title,
  detail,
  time,
}: ActivityItemProps) {
  return (
    <article className="flex gap-3 py-4">
      <span className={`mt-0.5 rounded-xl p-2.5 ${iconClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#274a41]">{title}</p>
        <p className="mt-0.5 truncate text-xs text-[#70817b]">{detail}</p>
        <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#99a49f] uppercase">
          {time}
        </p>
      </div>
    </article>
  );
}
