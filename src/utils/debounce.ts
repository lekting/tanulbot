/**
 * Debounce utility - limits how often a function can be called
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of the trailing
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const context = this;
    lastArgs = args;

    // Store whether we're still waiting
    const later = function () {
      timeout = null;
      if (!immediate && lastArgs) {
        func.apply(context, lastArgs);
        lastArgs = null;
      }
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
      lastArgs = null;
    }
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Unlike debounce, throttle guarantees the function is called at regular intervals.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number = 0;

  return function (this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();
    const remaining = wait - (now - lastCallTime);

    lastArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      lastCallTime = now;
      func.apply(context, args);
      lastArgs = null;
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCallTime = Date.now();
        timeout = null;
        if (lastArgs) {
          func.apply(context, lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  };
}
