"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to debounce a rapidly changing value (e.g. search inputs).
 * Allows the controlled input to remain immediately responsive while
 * deferring heavy filtering, recalculations, or queries until typing pauses.
 *
 * @param value The value to debounce.
 * @param delay Milliseconds to delay updating the debounced value (default: 200ms).
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
