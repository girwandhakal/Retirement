import { PlannerShell } from "@/components/planner-shell";

const highlights = [
  "Instant browser-side calculations with no login or API wait.",
  "Save, reload, import, export, and compare scenarios locally.",
  "Goal tracking, withdrawal sustainability, and plain-language guidance.",
];

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100/90">
              Retirement planning without spreadsheet drag
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl">
                See if your retirement plan is on track before you trust it.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200/80">
                Model the years before retirement, the spending years after
                retirement, and the full journey in one place. Adjust the inputs
                and the charts respond immediately.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="glass-panel animate-rise-in rounded-3xl px-4 py-4 text-sm leading-6 text-slate-100/80"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="glass-panel grid-halo relative rounded-[2rem] p-6">
            <div className="absolute right-6 top-6 rounded-full border border-lime-300/30 bg-lime-300/14 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-lime-100">
              MVP
            </div>
            <div className="space-y-4">
              <h2 className="font-display text-2xl text-white">
                What the planner covers right now
              </h2>
              <ul className="space-y-3 text-sm leading-6 text-slate-100/76">
                <li>Deterministic accumulation, withdrawal, and full-journey planning.</li>
                <li>Local scenario save/load plus JSON import and export.</li>
                <li>Side-by-side scenario comparison without re-entering inputs.</li>
                <li>Plain-language caveats and visible modeling assumptions.</li>
              </ul>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4 text-sm leading-6 text-slate-200/76">
                Results are estimates, not financial advice. The current
                formulas are deterministic and intended as a clear baseline
                before more advanced simulation work.
              </div>
            </div>
          </aside>
        </div>

        <PlannerShell />
      </section>
    </main>
  );
}
