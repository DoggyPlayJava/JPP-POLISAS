import { Input, ALL_FORMATS, UrlSource } from 'mediabunny';

export async function probeMediaDurationSeconds(src: string): Promise<number | null> {
  if (!src || !src.trim()) return null;
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    const duration = await input.computeDuration();
    input.dispose();
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

export async function probeVideoDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  if (!src || !src.trim()) return null;
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    const track = await input.getPrimaryVideoTrack();
    if (!track) {
      input.dispose();
      return null;
    }
    const dims = { width: track.displayWidth, height: track.displayHeight };
    input.dispose();
    return dims;
  } catch {
    return null;
  }
}
