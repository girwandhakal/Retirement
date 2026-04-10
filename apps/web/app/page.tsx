import { PlannerShell } from "@/components/planner-shell";

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-6">
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
          </div>
        </div>

        <PlannerShell />
      </section>
    </main>
  );
}
