"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TallyCounterProps {
  count: number;
  malas: number;
  isCelebrating: boolean;
}

const TallyCounter = ({ count, malas, isCelebrating }: TallyCounterProps) => {
  return (
    <Card className="relative w-full shadow-lg border-2 border-primary/20 bg-card overflow-hidden ">
      {isCelebrating && (
        <div
          className="pointer-events-none absolute inset-0 z-10 origin-center animate-ripple-glow rounded-lg"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent) / 0.5) 0%, hsl(var(--accent) / 0) 70%)",
          }}
        />
      )}
      <CardContent className="relative z-0 p-6 flex flex-col items-center justify-center">
        <div className="mt-5 w-full text-center mb-4">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Mala Completion
          </p>
          <p className="font-headline text-4xl font-bold text-accent">
            {malas}
          </p>
        </div>

        <div className="w-full h-32 bg-background/50 rounded-lg shadow-inner flex items-center justify-center overflow-hidden border border-primary/10">
          <div
            key={count}
            className="animate-count-up font-mono text-8xl font-bold text-foreground"
          >
            {String(count).padStart(3, "0")}
          </div>
        </div>
        {/* <p className="mt-2 text-4xl text-muted-foreground">Total Count {108*malas + count}</p> */}
        <div className="mt-5 w-full text-center mb-4">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Total Count
          </p>
          <p className="font-headline text-4xl font-bold text-accent">
          {108*malas + count}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TallyCounter;
