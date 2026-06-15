"use client";

import * as React from "react";
import { SectionCard } from "@/components/section-card";

export function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const height = 288;
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    if (!frameRef.current) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <SectionCard title={title} description={description}>
      <div ref={frameRef} className="h-72 w-full min-w-0">
        {width > 0 ? children({ width, height }) : null}
      </div>
    </SectionCard>
  );
}
