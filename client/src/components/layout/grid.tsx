import React from "react";
import { cn } from "@/lib/utils";

export interface GridProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Responsive columns
   * default: 1 column on mobile, 2 on md, 3 on lg
   */
  cols?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap utility, defaults to 6 */
  gap?: 2 | 3 | 4 | 5 | 6 | 8 | 10;
}

function colsToClass(cols?: GridProps["cols"]) {
  const c = cols || {};
  const classes: string[] = ["grid"];
  const base = c.base ?? 1;
  classes.push(`grid-cols-${base}`);
  if (c.sm) classes.push(`sm:grid-cols-${c.sm}`);
  if (c.md) classes.push(`md:grid-cols-${c.md}`);
  if (c.lg) classes.push(`lg:grid-cols-${c.lg}`);
  if (c.xl) classes.push(`xl:grid-cols-${c.xl}`);
  return classes.join(" ");
}

const GAP_CLASS: Record<NonNullable<GridProps["gap"]>, string> = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
};

export const Grid: React.FC<GridProps> = ({ children, className, cols, gap = 6 }) => {
  const baseClasses = colsToClass(cols ?? { base: 1, md: 2, lg: 3 });
  const gapClass = GAP_CLASS[gap] || GAP_CLASS[6];
  return (
    <div className={cn(baseClasses, gapClass, className)}>
      {children}
    </div>
  );
};
