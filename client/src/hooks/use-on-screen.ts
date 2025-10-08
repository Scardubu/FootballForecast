import { useEffect, useState } from "react";

export function useOnScreen<T extends Element>(
  ref: React.RefObject<T>,
  rootMargin: string = "0px"
): boolean {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => setIntersecting(entry.isIntersecting),
        { root: null, rootMargin, threshold: 0.01 }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }

    // Fallback when IntersectionObserver is not available
    const id = window.setTimeout(() => setIntersecting(true), 0);
    return () => window.clearTimeout(id);
  }, [ref, rootMargin]);

  return isIntersecting;
}
