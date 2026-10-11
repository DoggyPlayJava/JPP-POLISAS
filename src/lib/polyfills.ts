/**
 * Browser and PDF.js polyfills for Safari / WebKit and older environments.
 * Fixes: "TypeError: undefined is not a function (near '...i of e...')"
 * caused by missing ReadableStream.prototype[Symbol.asyncIterator] and Promise.withResolvers.
 */

export function ensurePdfPolyfills(): void {
  // 1. Polyfill Promise.withResolvers (Safari < 17.4, Chrome < 119)
  if (typeof Promise !== 'undefined' && !Promise.withResolvers) {
    (Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  // 2. Polyfill ReadableStream.prototype[Symbol.asyncIterator] (Safari / WebKit missing async iterator)
  if (typeof ReadableStream !== 'undefined' && !(ReadableStream.prototype as any)[Symbol.asyncIterator]) {
    (ReadableStream.prototype as any)[Symbol.asyncIterator] = async function* () {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    };
  }
}

// Auto-run immediately when imported
ensurePdfPolyfills();
