"use client";

import { useEffect, useRef } from "react";

type ChartSeries = {
  color: string;
  label: string;
  values: Array<number | null>;
};

type PlannerChartProps = {
  accent?: "sky" | "lime" | "gold" | "rose";
  title: string;
  subtitle: string;
  xValues: number[];
  series: ChartSeries[];
};

export function PlannerChart({
  accent = "sky",
  title,
  subtitle,
  xValues,
  series,
}: PlannerChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart:
      | {
          destroy: () => void;
          setSize: (size: { width: number; height: number }) => void;
        }
      | undefined;
    let observer: ResizeObserver | undefined;

    async function renderChart() {
      if (!containerRef.current || xValues.length === 0) {
        return;
      }

      const target = containerRef.current;
      target.innerHTML = "";

      const { default: uPlot } = await import("uplot");

      if (disposed || !containerRef.current) {
        return;
      }

      chart = new uPlot(
        {
          width: Math.max(target.clientWidth, 280),
          height: target.clientWidth < 480 ? 200 : 280,
          cursor: {
            drag: { x: false, y: false },
          },
          scales: {
            x: {
              time: false,
            },
            y: {
              auto: true,
            },
          },
          axes: [
            {
              stroke: "rgba(255,255,255,0.22)",
              grid: {
                stroke: "rgba(255,255,255,0.08)",
              },
            },
            {
              stroke: "rgba(255,255,255,0.22)",
              grid: {
                stroke: "rgba(255,255,255,0.08)",
              },
              values: (_, values) =>
                values.map((value) =>
                  new Intl.NumberFormat("en-US", {
                    notation:
                      Math.abs(value) >= 1_000_000 ? "compact" : "standard",
                    maximumFractionDigits: 0,
                  }).format(value),
                ),
            },
          ],
          series: [
            {},
            ...series.map((item) => ({
              label: item.label,
              stroke: item.color,
              width: 2.5,
            })),
          ],
        },
        [xValues, ...series.map((item) => item.values)],
        target,
      );

      observer = new ResizeObserver((entries) => {
        const nextWidth = Math.max(entries[0]?.contentRect.width ?? 280, 280);
        const nextHeight = nextWidth < 480 ? 200 : 280;
        chart?.setSize({ width: nextWidth, height: nextHeight });
      });

      observer.observe(target);
    }

    void renderChart();

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.destroy();
    };
  }, [series, xValues]);

  const titleSparkClass = {
    sky: "text-spark-sky",
    lime: "text-spark-lime",
    gold: "text-spark-gold",
    rose: "text-spark-rose",
  }[accent];

  const accentGlowClass = {
    sky: "bg-sky-500/18",
    lime: "bg-lime-300/16",
    gold: "bg-gold-300/18",
    rose: "bg-rose-300/18",
  }[accent];

  return (
    <section className="glass-panel interactive-panel relative isolate min-w-0 overflow-hidden rounded-[1.25rem] p-4 sm:rounded-[2rem] sm:p-5">
      <div
        aria-hidden
        className={`hero-orb -right-8 top-4 h-24 w-24 ${accentGlowClass}`}
        style={{ animationDelay: "-5s" }}
      />
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`font-display text-xl sm:text-2xl ${titleSparkClass}`}>{title}</p>
          <p className="text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.map((item) => (
            <div
              key={item.label}
              className="interactive-chip inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs text-slate-100/78"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-[200px] w-full overflow-hidden rounded-[1rem] sm:min-h-[280px] sm:rounded-[1.5rem]"
      />
    </section>
  );
}
