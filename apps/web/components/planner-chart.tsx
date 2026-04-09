"use client";

import { useEffect, useRef } from "react";

type ChartSeries = {
  color: string;
  label: string;
  values: number[];
};

type PlannerChartProps = {
  title: string;
  subtitle: string;
  xValues: number[];
  series: ChartSeries[];
};

export function PlannerChart({
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
          width: Math.max(target.clientWidth, 320),
          height: 280,
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
        const nextWidth = Math.max(entries[0]?.contentRect.width ?? 320, 320);
        chart?.setSize({ width: nextWidth, height: 280 });
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

  return (
    <section className="glass-panel rounded-[2rem] p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl text-white">{title}</p>
          <p className="text-sm leading-6 text-slate-200/72">{subtitle}</p>
        </div>
      </div>
      <div ref={containerRef} className="min-h-[280px] w-full" />
    </section>
  );
}
