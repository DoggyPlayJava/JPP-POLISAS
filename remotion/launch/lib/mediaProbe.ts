import { Input, ALL_FORMATS, UrlSource } from 'mediabunny';

function createUrlInput(src: string): Input {
  return new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      // Fail fast on missing/invalid media instead of Mediabunny's infinite retry backoff
      getRetryDelay: () => null,
    }),
  });
}

export async function probeMediaDurationSeconds(src: string): Promise<number | null> {
  if (!src || !src.trim()) return null;
  try {
    const input = createUrlInput(src);
    try {
      const duration = await input.computeDuration();
      return Number.isFinite(duration) && duration > 0 ? duration : null;
    } finally {
      input.dispose();
    }
  } catch {
    return null;
  }
}

export async function probeVideoDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  if (!src || !src.trim()) return null;
  try {
    const input = createUrlInput(src);
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) return null;
      return { width: track.displayWidth, height: track.displayHeight };
    } finally {
      input.dispose();
    }
  } catch {
    return null;
  }
}
