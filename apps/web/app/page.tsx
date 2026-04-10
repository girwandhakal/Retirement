import { PlannerShell } from "@/components/planner-shell";

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="hero-orb -left-16 top-8 h-56 w-56 bg-sky-500/22"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="hero-orb right-[8%] top-24 h-52 w-52 bg-lime-300/18"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="hero-orb bottom-12 left-[42%] h-44 w-44 bg-rose-300/14"
          style={{ animationDelay: "-4s" }}
        />
      </div>
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h1 className="rise-in-soft font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl">
                See if your{" "}
                <span className="text-spark-sky">retirement plan</span> is{" "}
                <span className="text-spark-lime">on track</span> before you trust
                it.
              </h1>
              <p
                className="rise-in-soft max-w-2xl text-lg leading-8 text-slate-200/80"
                style={{ animationDelay: "0.08s" }}
              >
                Model the years before retirement, the{" "}
                <span className="text-spark-gold">spending years after</span>{" "}
                retirement, and the <span className="text-spark-rose">full journey</span>{" "}
                in one place. Adjust the inputs and the charts{" "}
                <span className="text-spark-sky">respond immediately</span>.
              </p>
            </div>
          </div>
        </div>

        <PlannerShell />
      </section>
    </main>
  );
}
