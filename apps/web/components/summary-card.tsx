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

export function SummaryCard({
  label,
  value,
  caption,
  accent = "sky",
}: SummaryCardProps) {
  return (
    <article
      className={`glass-panel rounded-[1.75rem] bg-gradient-to-br px-5 py-5 ${accentClasses[accent]}`}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-white/64">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight text-white">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/72">{caption}</p>
    </article>
  );
}

