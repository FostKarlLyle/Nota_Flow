/**
 * Mesin geometri jalur SVG tanpa ketergantungan DOM.
 *
 * Menghitung titik awal/akhir, arah, titik tengah, dan posisi pada fraksi
 * panjang tertentu. Dipakai untuk menempatkan penanda panah serta label
 * konektor, baik di kanvas maupun saat ekspor PNG/SVG.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PathInfo {
  start: Point;
  end: Point;
  mid: Point;
  /** arah perjalanan (derajat) di titik awal */
  startAngle: number;
  /** arah perjalanan (derajat) di titik akhir */
  endAngle: number;
  length: number;
  /** titik pada fraksi panjang 0..1 */
  pointAt: (t: number) => Point;
}

type Segment =
  | { type: 'line'; p0: Point; p1: Point }
  | { type: 'cubic'; p0: Point; c1: Point; c2: Point; p1: Point }
  | { type: 'quad'; p0: Point; c1: Point; p1: Point };

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const SAMPLE_CURVE = 24;

function parsePoints(chunk: string): number[] {
  const matches = chunk.match(NUMBER);
  return matches ? matches.map(Number) : [];
}

/** Ubah string `d` menjadi daftar segmen garis/kurva. */
export function parsePath(d: string): { segments: Segment[]; start: Point } | null {
  const segments: Segment[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let subStart: Point = { x: 0, y: 0 };
  let startPoint: Point | null = null;
  let lastCubicControl: Point | null = null;
  let lastQuadControl: Point | null = null;

  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(d))) {
    const command = match[1];
    const upper = command.toUpperCase();
    const relative = command !== upper;
    const nums = parsePoints(match[2]);
    const isCubic = upper === 'C' || upper === 'S';
    const isQuad = upper === 'Q' || upper === 'T';

    switch (upper) {
      case 'M': {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const point = relative && (i > 0 || cursor) ? { x: cursor.x + nums[i], y: cursor.y + nums[i + 1] } : { x: nums[i], y: nums[i + 1] };
          cursor = point;
          if (i === 0) {
            subStart = point;
            startPoint = point;
          } else {
            segments.push({ type: 'line', p0: segments.length ? segments[segments.length - 1].p1 : cursor, p1: point });
          }
        }
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const point = { x: relative ? cursor.x + nums[i] : nums[i], y: relative ? cursor.y + nums[i + 1] : nums[i + 1] };
          segments.push({ type: 'line', p0: cursor, p1: point });
          cursor = point;
        }
        break;
      }
      case 'H': {
        for (const value of nums) {
          const point = { x: relative ? cursor.x + value : value, y: cursor.y };
          segments.push({ type: 'line', p0: cursor, p1: point });
          cursor = point;
        }
        break;
      }
      case 'V': {
        for (const value of nums) {
          const point = { x: cursor.x, y: relative ? cursor.y + value : value };
          segments.push({ type: 'line', p0: cursor, p1: point });
          cursor = point;
        }
        break;
      }
      case 'C':
      case 'S': {
        for (let i = 0; i + (isCubic ? 5 : 3) < nums.length + 1; i += isCubic ? 6 : 4) {
          if (i + (isCubic ? 5 : 3) >= nums.length) break;
          let c1: Point;
          if (isCubic) {
            c1 = { x: relative ? cursor.x + nums[i] : nums[i], y: relative ? cursor.y + nums[i + 1] : nums[i + 1] };
          } else {
            c1 = lastCubicControl ? { x: 2 * cursor.x - lastCubicControl.x, y: 2 * cursor.y - lastCubicControl.y } : { ...cursor };
          }
          const offset = isCubic ? 2 : 0;
          const c2 = { x: relative ? cursor.x + nums[i + offset] : nums[i + offset], y: relative ? cursor.y + nums[i + offset + 1] : nums[i + offset + 1] };
          const end = { x: relative ? cursor.x + nums[i + offset + 2] : nums[i + offset + 2], y: relative ? cursor.y + nums[i + offset + 3] : nums[i + offset + 3] };
          segments.push({ type: 'cubic', p0: cursor, c1, c2, p1: end });
          lastCubicControl = c2;
          lastQuadControl = null;
          cursor = end;
        }
        break;
      }
      case 'Q':
      case 'T': {
        for (let i = 0; i + (isQuad ? 3 : 1) < nums.length + 1; i += isQuad ? 4 : 2) {
          if (i + (isQuad ? 3 : 1) >= nums.length) break;
          let c1: Point;
          if (isQuad) {
            c1 = { x: relative ? cursor.x + nums[i] : nums[i], y: relative ? cursor.y + nums[i + 1] : nums[i + 1] };
          } else {
            c1 = lastQuadControl ? { x: 2 * cursor.x - lastQuadControl.x, y: 2 * cursor.y - lastQuadControl.y } : { ...cursor };
          }
          const offset = isQuad ? 2 : 0;
          const end = { x: relative ? cursor.x + nums[i + offset] : nums[i + offset], y: relative ? cursor.y + nums[i + offset + 1] : nums[i + offset + 1] };
          segments.push({ type: 'quad', p0: cursor, c1, p1: end });
          lastQuadControl = c1;
          lastCubicControl = null;
          cursor = end;
        }
        break;
      }
      case 'A': {
        // busur diperlakukan sebagai garis lurus ke titik akhir (jarang dipakai)
        for (let i = 0; i + 6 < nums.length; i += 7) {
          const end = { x: relative ? cursor.x + nums[i + 5] : nums[i + 5], y: relative ? cursor.y + nums[i + 6] : nums[i + 6] };
          segments.push({ type: 'line', p0: cursor, p1: end });
          cursor = end;
        }
        break;
      }
      case 'Z': {
        segments.push({ type: 'line', p0: cursor, p1: subStart });
        cursor = subStart;
        break;
      }
      default:
        break;
    }
  }

  if (!segments.length) return null;
  return { segments, start: startPoint ?? segments[0].p0 };
}

function cubicAt(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const dd = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + dd * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + dd * p1.y,
  };
}

function quadAt(p0: Point, c1: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c1.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c1.y + t * t * p1.y,
  };
}

const cache = new Map<string, PathInfo>();

export function analyzePath(d: string): PathInfo | null {
  if (!d) return null;
  const cached = cache.get(d);
  if (cached) return cached;

  const parsed = parsePath(d);
  if (!parsed) return null;

  const points: Point[] = [parsed.start];
  const lengths: number[] = [0];
  let total = 0;

  const push = (point: Point) => {
    const previous = points[points.length - 1];
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (distance < 0.0001) return;
    total += distance;
    points.push(point);
    lengths.push(total);
  };

  for (const segment of parsed.segments) {
    if (segment.type === 'line') {
      push(segment.p1);
    } else if (segment.type === 'cubic') {
      for (let i = 1; i <= SAMPLE_CURVE; i++) {
        push(cubicAt(segment.p0, segment.c1, segment.c2, segment.p1, i / SAMPLE_CURVE));
      }
    } else {
      for (let i = 1; i <= SAMPLE_CURVE; i++) {
        push(quadAt(segment.p0, segment.c1, segment.p1, i / SAMPLE_CURVE));
      }
    }
  }

  if (!total) return null;

  const pointAtLength = (distance: number): Point => {
    const target = Math.max(0, Math.min(total, distance));
    let low = 0;
    let high = lengths.length - 1;
    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (lengths[mid] <= target) low = mid;
      else high = mid;
    }
    const span = lengths[high] - lengths[low];
    const ratio = span > 0 ? (target - lengths[low]) / span : 0;
    return {
      x: points[low].x + (points[high].x - points[low].x) * ratio,
      y: points[low].y + (points[high].y - points[low].y) * ratio,
    };
  };

  const pointAt = (t: number): Point => pointAtLength(t * total);

  const delta = Math.min(8, total * 0.2);
  const p0 = pointAtLength(0);
  const p0b = pointAtLength(delta);
  const p1 = pointAtLength(total);
  const p1b = pointAtLength(total - delta);

  const info: PathInfo = {
    start: p0,
    end: p1,
    mid: pointAtLength(total / 2),
    startAngle: (Math.atan2(p0b.y - p0.y, p0b.x - p0.x) * 180) / Math.PI,
    endAngle: (Math.atan2(p1.y - p1b.y, p1.x - p1b.x) * 180) / Math.PI,
    length: total,
    pointAt,
  };

  if (cache.size > 4000) cache.clear();
  cache.set(d, info);
  return info;
}
