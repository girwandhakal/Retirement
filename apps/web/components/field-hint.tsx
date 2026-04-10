"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { useCallback, useEffect, useRef, useState } from "react";

type FieldHintProps = {
  children: React.ReactNode;
};

/**
 * Shows field descriptions via hover tooltip on desktop
 * and tap-to-toggle popover on touch devices.
 */
export function FieldHint({ children }: FieldHintProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Close when tapping outside on mobile
  useEffect(() => {
    if (!open) return;

    function handleOutside(event: PointerEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <button
            ref={buttonRef}
            type="button"
            onClick={handleClick}
            className="interactive-chip inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/14 bg-white/8 text-[10px] font-bold text-cyan-100 hover:bg-white/16"
            aria-label="Field description"
          >
            ?
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={8}
            className="z-50 max-w-xs rounded-2xl border border-white/12 bg-ink-950/96 px-3 py-2 text-xs leading-5 text-slate-100 shadow-2xl"
          >
            {children}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
