import { PlannerShell } from "@/components/planner-shell";

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-6">
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
