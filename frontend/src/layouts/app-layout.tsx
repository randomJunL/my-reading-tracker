import {
  ChartNoAxesColumnIncreasing,
  Clock3,
  Home,
  Library,
  LogOut,
  Menu,
  Plus,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/branding";
import { useAuth } from "@/features/auth/auth";
import { useCurrentUser } from "@/features/auth/current-user";
import { ReaderSelector } from "@/features/readers/reader-selector";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { label: "Home", to: "/", icon: Home },
  { label: "Readers", to: "/readers", icon: Users },
  { label: "Library", to: "/library", icon: Library },
  { label: "History", to: "/history", icon: Clock3 },
];

export function AppLayout() {
  const { isDevAuthBypass, user, signOut } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const displayName =
    (user?.email ?? currentUser?.email)?.split("@")[0] ?? "Reader";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f3eb] text-[#1f3b34]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#173f36] px-5 py-7 text-white lg:flex">
        <NavLink
          to="/"
          aria-label={`${APP_NAME} home`}
          className="mb-11 flex items-center gap-3 px-2"
        >
          <span className="shrink-0">
            <BrandMark />
          </span>
          <span className="min-w-0 font-serif text-[23px] leading-tight font-bold tracking-[-0.02em]">
            {APP_NAME}
          </span>
        </NavLink>

        <nav aria-label="Primary navigation" className="space-y-1.5">
          {primaryNavigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-[#c7d6d1] hover:bg-white/7 hover:text-white",
                )
              }
            >
              <Icon className="size-[19px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="my-6 h-px bg-white/10" />

        <NavLink
          to="/reports"
          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#c7d6d1] hover:bg-white/7 hover:text-white"
        >
          <ChartNoAxesColumnIncreasing className="size-[19px]" />
          Reports
          <span className="ml-auto rounded-full bg-[#f4bd62]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f4bd62] uppercase">
            Soon
          </span>
        </NavLink>

        <div className="mt-auto rounded-2xl bg-white/7 p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#e79679] text-sm font-bold text-[#173f36]">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {currentUser?.household_name ?? "My Household"}
              </p>
              <p className="truncate text-xs text-[#a9c0b9]">{user?.email}</p>
            </div>
            {isDevAuthBypass ? (
              <span className="rounded-md bg-[#f4bd62]/15 px-2 py-1 text-[10px] font-bold tracking-wide text-[#f4bd62] uppercase">
                Local
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void signOut()}
                className="cursor-pointer rounded-lg p-2 text-[#a9c0b9] hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-[#deddd3]/80 bg-[#f5f3eb]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-10 xl:px-14">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
              <NavLink
                to="/"
                aria-label={`${APP_NAME} home`}
                className="flex min-w-0 items-center gap-2 lg:hidden"
              >
                <span className="shrink-0 sm:hidden">
                  <BrandMark className="size-7" />
                </span>
                <span className="max-w-28 truncate font-serif text-base font-bold sm:hidden">
                  {APP_NAME}
                </span>
              </NavLink>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold tracking-[0.12em] text-[#6f817b] uppercase">
                  Monday, August 3
                </p>
                <p className="hidden text-sm font-semibold text-[#264940] sm:block">
                  Welcome, {displayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ReaderSelector />
              <Button aria-label="Log reading">
                <Plus className="size-4" strokeWidth={2.6} />
                <span className="hidden md:inline">Log reading</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-5 pt-8 pb-28 sm:px-8 lg:px-10 lg:pt-10 lg:pb-12 xl:px-14">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-white/10 bg-[#173f36] px-2 py-2 text-white shadow-2xl lg:hidden"
      >
        {primaryNavigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold",
                isActive ? "bg-white/12 text-[#f4bd62]" : "text-[#bed0ca]",
              )
            }
          >
            <Icon className="size-[19px]" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
