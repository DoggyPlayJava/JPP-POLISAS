import { describe, it, expect } from 'vitest';
import { ensurePdfPolyfills } from '../lib/polyfills';

describe('PDF and Browser Polyfills', () => {
  it('ensures Promise.withResolvers is defined and works correctly', () => {
    ensurePdfPolyfills();
    expect(typeof Promise.withResolvers).toBe('function');

    const { promise, resolve } = Promise.withResolvers<string>();
    resolve('resolved_value');
    return expect(promise).resolves.toBe('resolved_value');
  });

  it('ensures ReadableStream Symbol.asyncIterator is defined and iterable in for await', async () => {
    ensurePdfPolyfills();
    expect(typeof (ReadableStream.prototype as any)[Symbol.asyncIterator]).toBe('function');

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('chunk1');
        controller.enqueue('chunk2');
        controller.close();
      },
    });

    const collected: string[] = [];
    for await (const chunk of stream as any) {
      collected.push(chunk);
    }

    expect(collected).toEqual(['chunk1', 'chunk2']);
  });
});
