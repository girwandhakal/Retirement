type SummaryCardProps = {
  label: string;
  value: string;
  caption: string;
  accent?: "sky" | "lime" | "gold" | "rose";
};

const accentClasses: Record<NonNullable<SummaryCardProps["accent"]>, string> = {
  sky: "from-sky-500/18 to-cyan-300/8 text-cyan-50",
  lime: "from-lime-300/16 to-white/6 text-lime-50",
  gold: "from-gold-300/16 to-white/6 text-amber-50",
  rose: "from-rose-300/18 to-white/6 text-rose-50",
};

const accentGlowClasses: Record<NonNullable<SummaryCardProps["accent"]>, string> = {
  sky: "bg-sky-500/18",
  lime: "bg-lime-300/16",
  gold: "bg-gold-300/18",
  rose: "bg-rose-300/18",
};

const accentValueClasses: Record<NonNullable<SummaryCardProps["accent"]>, string> = {
  sky: "from-white via-cyan-100 to-sky-200",
  lime: "from-white via-lime-100 to-lime-300",
  gold: "from-white via-amber-100 to-gold-300",
  rose: "from-white via-rose-100 to-rose-300",
};

export function SummaryCard({
  label,
  value,
  caption,
  accent = "sky",
}: SummaryCardProps) {
  return (
    <article
      className={`glass-panel interactive-panel relative isolate overflow-hidden flex min-h-0 flex-col rounded-[1.25rem] bg-gradient-to-br px-4 py-4 sm:min-h-[13.5rem] sm:rounded-[1.75rem] sm:px-5 sm:py-5 ${accentClasses[accent]}`}
    >
      <div
        aria-hidden
        className={`hero-orb -right-10 -top-12 h-20 w-20 sm:h-28 sm:w-28 ${accentGlowClasses[accent]}`}
        style={{ animationDelay: "-3s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/64 sm:text-xs">{label}</p>
      <p
        className={`mt-2 bg-gradient-to-r sm:mt-3 sm:min-h-[2.75rem] ${accentValueClasses[accent]} bg-clip-text font-display text-2xl tracking-tight text-transparent sm:text-3xl`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-white/72 sm:mt-4 sm:min-h-[4.5rem] sm:text-sm sm:leading-6">
        {caption}
      </p>
    </article>
  );
}
