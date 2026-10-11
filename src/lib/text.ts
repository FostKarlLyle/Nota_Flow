/**
 * Pengukuran & pembungkusan teks untuk label berbasis SVG.
 * Dipakai agar tampilan di kanvas identik dengan hasil ekspor SVG.
 */

export const FONT_STACK =
  'Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

let ctx: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();

function context(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  return ctx;
}

export function fontString(size: number, weight: number | string = 400, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT_STACK}`;
}

/** Lebar teks (px) dengan cache sederhana. */
export function measureText(text: string, size: number, weight: number | string = 400, italic = false): number {
  if (!text) return 0;
  const font = fontString(size, weight, italic);
  const key = `${font}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const c = context();
  let width: number;
  if (c) {
    c.font = font;
    width = c.measureText(text).width;
  } else {
    // perkiraan kasar bila canvas tidak tersedia (SSR/prerender)
    width = text.length * size * 0.55;
  }
  if (widthCache.size > 8000) widthCache.clear();
  widthCache.set(key, width);
  return width;
}

/** Bungkus teks menjadi beberapa baris sesuai lebar maksimum. */
export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  weight: number | string = 400,
  italic = false,
): string[] {
  const raw = String(text ?? '');
  const paragraphs = raw.split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureText(candidate, size, weight, italic) <= maxWidth || !current) {
        // kata tunggal yang terlalu panjang dipotong paksa
        if (!current && measureText(word, size, weight, italic) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (measureText(chunk + ch, size, weight, italic) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
          continue;
        }
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [''];
}

export interface TextBlock {
  lines: string[];
  lineHeight: number;
  width: number;
  height: number;
}

export function layoutText(
  text: string,
  maxWidth: number,
  size: number,
  weight: number | string = 400,
  lineHeightFactor = 1.28,
  maxLines = 40,
  italic = false,
): TextBlock {
  let lines = wrapText(text, Math.max(8, maxWidth), size, weight, italic);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, lines[maxLines - 1].length - 1))}…`;
  }
  const lineHeight = Math.round(size * lineHeightFactor * 100) / 100;
  const width = lines.reduce((max, line) => Math.max(max, measureText(line, size, weight, italic)), 0);
  return { lines, lineHeight, width, height: lines.length * lineHeight };
}
