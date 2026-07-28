"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  borderColor?: string;
  trend?: {
    label: string;
    icon?: ReactNode;
  };
  sparklineData?: number[];
  animationIndex?: number;
}

const STYLE_ID = "stat-card-animations";

function injectKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseHighlight {
      0%, 100% { box-shadow: 0 0 0 0 transparent; }
      50% { box-shadow: 0 0 0 3px var(--pulse-color, rgb(34 197 94 / 0.3)); }
    }
  `;
  document.head.appendChild(style);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function useAnimatedValue(target: string | number, duration = 1200): string {
  const prefersReducedMotion = usePrefersReducedMotion();
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef(target);
  const isFirstRender = useRef(true);

  const [displayValue, setDisplayValue] = useState(() => {
    // Non-numeric or reduced-motion: show immediately without animation
    const raw = String(target);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return raw;

    const numTarget =
      typeof target === "number"
        ? target
        : parseFloat(raw.replace(/[^0-9.\-]/g, ""));
    if (isNaN(numTarget)) return raw;

    return "0";
  });

  useEffect(() => {
    if (prefersReducedMotion) return;

    const raw = String(target);
    const numTarget =
      typeof target === "number"
        ? target
        : parseFloat(raw.replace(/[^0-9.\-]/g, ""));

    // Non-numeric values — display immediately, no animation
    if (isNaN(numTarget)) return;

    // Skip re-animation if value hasn't changed (after first render)
    if (!isFirstRender.current && target === prevTarget.current) return;
    isFirstRender.current = false;
    prevTarget.current = target;

    const startTime = performance.now();
    const startValue = 0;

    function animate(currentTime: number): void {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (numTarget - startValue) * eased);

      if (progress < 1) {
        setDisplayValue(String(current));
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(raw);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, prefersReducedMotion]);

  return displayValue;
}

export default function StatCard({
  title,
  value,
  icon,
  borderColor,
  trend,
  sparklineData,
  animationIndex,
}: StatCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatedValue = useAnimatedValue(value);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValue = useRef(value);

  // Inject keyframe styles once
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Pulse on value change
  useEffect(() => {
    if (prevValue.current === value) return;

    setIsPulsing(true);
    const numCur = Number(value);
    const numPrev = Number(prevValue.current);

    // Set CSS variable on the card element for dynamic pulse color
    const cardEl = document.getElementById(
      `stat-card-${title.replace(/\s+/g, "-")}`,
    );
    if (cardEl) {
      const color =
        !isNaN(numCur) && !isNaN(numPrev) && numCur > numPrev
          ? "rgb(34 197 94 / 0.3)"
          : "rgb(239 68 68 / 0.3)";
      cardEl.style.setProperty("--pulse-color", color);
    }

    const timer = setTimeout(() => {
      setIsPulsing(false);
    }, 1500);

    prevValue.current = value;
    return () => clearTimeout(timer);
  }, [value, title]);

  const cardId = `stat-card-${title.replace(/\s+/g, "-")}`;

  const pulseStyle: React.CSSProperties | undefined = isPulsing
    ? { animation: "pulseHighlight 1.5s ease-out" }
    : undefined;

  const entryStyle: React.CSSProperties | undefined =
    animationIndex !== undefined && !prefersReducedMotion
      ? {
          animation: `fadeSlideUp 0.4s ease-out both`,
          animationDelay: `${animationIndex * 50}ms`,
        }
      : undefined;

  const sparklineMax = sparklineData ? Math.max(...sparklineData, 1) : 1;

  return (
    <Card
      id={cardId}
      className={`hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 dark:bg-card dark:border-border ${borderColor ?? "border-t-primary"}`}
      style={{ ...pulseStyle, ...entryStyle }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {animatedValue}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-2 h-8">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 32"
              preserveAspectRatio="none"
            >
              {sparklineData.map((val, i) => {
                const x =
                  (i / (sparklineData.length - 1 || 1)) * 100;
                const h = (val / sparklineMax) * 28;
                const barWidth = Math.max(
                  100 / sparklineData.length - 2,
                  3,
                );
                return (
                  <rect
                    key={i}
                    x={x}
                    y={32 - h}
                    width={barWidth}
                    height={h}
                    rx="1"
                    className="fill-primary/40 dark:fill-primary/30"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {trend && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend.icon}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
