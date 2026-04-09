"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

type FieldHintProps = {
  children: React.ReactNode;
};

export function FieldHint({ children }: FieldHintProps) {
  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/14 bg-white/8 text-[10px] font-bold text-cyan-100 transition hover:bg-white/16"
            aria-label="Field description"
          >
            ?
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={8}
            className="max-w-xs rounded-2xl border border-white/12 bg-ink-950/96 px-3 py-2 text-xs leading-5 text-slate-100 shadow-2xl"
          >
            {children}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

