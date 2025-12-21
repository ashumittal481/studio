"use client";

import { cn } from "@/lib/utils";

interface ChantAnimatorProps {
  text: string;
  animationKey: number;
}

const ChantAnimator = ({ text, animationKey }: ChantAnimatorProps) => {
  if (animationKey === 0) {
    return null;
  }

  return (
    <div
      key={animationKey}
      className={cn(
        "pointer-events-none absolute inset-0 flex  justify-center",
        "animate-chant-up"
      )}
    >
      <span className="text-4xl font-bold text-accent opacity-80" style={{ textShadow: '0 0 10px hsl(var(--accent) / 0.5)' }}>
        {text}
      </span>
    </div>
  );
};

export default ChantAnimator;
