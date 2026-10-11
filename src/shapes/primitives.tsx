import type { ReactNode } from 'react';
import { layoutText } from '../lib/text';

/* ---------------------------------------------------------------- teks ---- */

export interface SvgTextProps {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
  weight?: number | string;
  fill?: string;
  align?: 'center' | 'left' | 'right';
  valign?: 'middle' | 'top' | 'bottom';
  maxLines?: number;
  italic?: boolean;
  lineHeightFactor?: number;
  keyPrefix?: string;
  opacity?: number;
}

/** Teks multi-baris yang dibungkus sesuai lebar kotak. */
export function SvgText({
  text,
  x,
  y,
  width,
  height,
  size = 12,
  weight = 400,
  fill = '#0f172a',
  align = 'center',
  valign = 'middle',
  maxLines = 40,
  italic = false,
  lineHeightFactor = 1.26,
  keyPrefix = 'l',
  opacity = 1,
}: SvgTextProps) {
  const content = String(text ?? '');
  if (!content.trim()) return null;
  const block = layoutText(content, width, size, weight, lineHeightFactor, maxLines, italic);
  let top = y;
  if (valign === 'middle') top = y + (height - block.height) / 2;
  else if (valign === 'bottom') top = y + height - block.height;

  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;

  return (
    <text
      textAnchor={anchor}
      fontFamily='Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif'
      fontSize={size}
      fontWeight={weight as number}
      fontStyle={italic ? 'italic' : undefined}
      fill={fill}
      opacity={opacity}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {block.lines.map((line, i) => (
        <tspan key={`${keyPrefix}-${i}`} x={tx} y={top + i * block.lineHeight + size * 0.8}>
          {line || ' '}
        </tspan>
      ))}
    </text>
  );
}

/* --------------------------------------------------------------- bentuk --- */

export function rectPath(x: number, y: number, w: number, h: number, rx = 8): string {
  const r = Math.max(0, Math.min(rx, w / 2, h / 2));
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

export function diamondPath(x: number, y: number, w: number, h: number): string {
  return `M${x + w / 2},${y} L${x + w},${y + h / 2} L${x + w / 2},${y + h} L${x},${y + h / 2} Z`;
}

/* --------------------------------------------------------------- ikon ----- */

export type GlyphKind =
  | 'message'
  | 'sendMessage'
  | 'timer'
  | 'error'
  | 'signal'
  | 'conditional'
  | 'terminate'
  | 'escalation'
  | 'user'
  | 'gear'
  | 'script'
  | 'manual'
  | 'table'
  | 'plus'
  | 'x'
  | 'circle'
  | 'pentagonCircle'
  | 'subProcessPlus'
  | 'arrowUp'
  | 'arrowDown'
  | 'hourglass'
  | 'folder'
  | 'box3'
  | 'database'
  | 'sensor';

interface GlyphProps {
  kind: GlyphKind;
  x: number;
  y: number;
  size: number;
  color: string;
  strokeWidth?: number;
}

/** Ikon digambar pada ruang koordinat 16x16 lalu diskalakan. */
export function Glyph({ kind, x, y, size, color, strokeWidth = 1.4 }: GlyphProps) {
  const s = size / 16;
  const sw = strokeWidth;
  const body: ReactNode = (() => {
    switch (kind) {
      case 'message':
        return (
          <>
            <rect x="1" y="3.4" width="14" height="9.2" rx="1.2" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M1.9 4.4 8 9.1l6.1-4.7" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'sendMessage':
        return (
          <>
            <rect x="1" y="3.4" width="14" height="9.2" rx="1.2" fill={color} />
            <path d="M1.9 4.4 8 9.1l6.1-4.7" fill="none" stroke="#ffffff" strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'timer':
        return (
          <>
            <circle cx="8" cy="8.6" r="5.6" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M8 5.4v3.4l2.4 1.5" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <path d="M6.4 1.4h3.2" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'error':
        return <path d="M9.8 1.2 3.2 9h4l-1 5.8L13 7H8.9z" fill={color} />;
      case 'signal':
        return <path d="M8 2.4 14 13H2z" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
      case 'conditional':
        return (
          <>
            <rect x="1.2" y="3.4" width="13.6" height="9.2" rx="1" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M3.6 6.2h8.8M3.6 8h8.8M3.6 9.8h5.6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'terminate':
        return <circle cx="8" cy="8" r="6.2" fill={color} />;
      case 'escalation':
        return <path d="M8 2 13.4 8.6h-3.1v5.4H5.7V8.6H2.6z" fill={color} />;
      case 'user':
        return (
          <>
            <circle cx="8" cy="4.8" r="2.7" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M2.9 13.8c.7-3.1 2.8-4.5 5.1-4.5s4.4 1.4 5.1 4.5" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'gear':
        return (
          <>
            <circle cx="8" cy="8" r="2.7" fill="none" stroke={color} strokeWidth={sw} />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <path
                  key={i}
                  d={`M${8 + Math.cos(a) * 4.2} ${8 + Math.sin(a) * 4.2} L${8 + Math.cos(a) * 6.4} ${8 + Math.sin(a) * 6.4}`}
                  stroke={color}
                  strokeWidth={sw * 1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </>
        );
      case 'script':
        return (
          <>
            <path d="M3.4 1.4h6L13 5v9.6H3.4z" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M9.2 1.6V5H12.8" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M5.4 8h5.4M5.4 10h5.4M5.4 12h3.2" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'manual':
        return (
          <path
            d="M5.2 13.9V6.1c0-.9 1.3-.9 1.3 0v3.1h.6V3.9c0-.9 1.3-.9 1.3 0v5.3h.6V5.2c0-.9 1.3-.9 1.3 0v5h.6V7c0-.9 1.3-.9 1.3 0v4c0 1.9-1.2 2.9-3.2 2.9z"
            fill="none"
            stroke={color}
            strokeWidth={sw * 0.9}
            strokeLinejoin="round"
          />
        );
      case 'table':
        return (
          <>
            <rect x="1.4" y="2.6" width="13.2" height="10.8" rx="1" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M1.4 6h13.2M6 6v7.4" stroke={color} strokeWidth={sw} />
          </>
        );
      case 'plus':
        return <path d="M8 2.6v10.8M2.6 8h10.8" stroke={color} strokeWidth={sw * 1.8} strokeLinecap="round" />;
      case 'x':
        return <path d="M3.6 3.6 12.4 12.4M12.4 3.6 3.6 12.4" stroke={color} strokeWidth={sw * 1.6} strokeLinecap="round" />;
      case 'circle':
        return <circle cx="8" cy="8" r="5.4" fill="none" stroke={color} strokeWidth={sw * 1.5} />;
      case 'pentagonCircle':
        return (
          <>
            <path d="M8 2.2 13.2 6l-2 6.2H4.8L2.8 6z" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
            <circle cx="8" cy="7.6" r="2.2" fill="none" stroke={color} strokeWidth={sw} />
          </>
        );
      case 'subProcessPlus':
        return (
          <>
            <rect x="1.6" y="5.4" width="12.8" height="5.4" rx="1.4" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M8 6.6v3M6.5 8.1h3" stroke={color} strokeWidth={sw * 1.2} strokeLinecap="round" />
          </>
        );
      case 'arrowUp':
        return <path d="M8 13.4V2.8M3.8 7 8 2.8 12.2 7" fill="none" stroke={color} strokeWidth={sw * 1.2} strokeLinecap="round" strokeLinejoin="round" />;
      case 'arrowDown':
        return <path d="M8 2.6v10.6M3.8 9 8 13.2 12.2 9" fill="none" stroke={color} strokeWidth={sw * 1.2} strokeLinecap="round" strokeLinejoin="round" />;
      case 'hourglass':
        return (
          <>
            <path d="M4 2.4h8M4 13.6h8M5.4 2.8c0 4 5.2 4 5.2 0M5.4 13.2c0-4 5.2-4 5.2 0" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      case 'folder':
        return (
          <>
            <path d="M1.6 4.2h4.8l1.5 1.8h6.5v7.8H1.6z" fill={color} opacity="0.18" />
            <path d="M1.6 4.2h4.8l1.5 1.8h6.5v7.8H1.6z" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          </>
        );
      case 'box3':
        return (
          <>
            <rect x="1.6" y="4.4" width="12.8" height="9.2" rx="1" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M1.6 4.4h5.2V2.6" fill="none" stroke={color} strokeWidth={sw} />
          </>
        );
      case 'database':
        return (
          <>
            <ellipse cx="8" cy="3.8" rx="5.6" ry="2.2" fill="none" stroke={color} strokeWidth={sw} />
            <path d="M2.4 3.8v8.4c0 1.2 2.5 2.2 5.6 2.2s5.6-1 5.6-2.2V3.8" fill="none" stroke={color} strokeWidth={sw} />
          </>
        );
      case 'sensor':
        return (
          <>
            <circle cx="8" cy="8" r="1.8" fill={color} />
            <path d="M4.6 4.6a4.8 4.8 0 0 0 0 6.8M11.4 4.6a4.8 4.8 0 0 1 0 6.8" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          </>
        );
      default:
        return null;
    }
  })();

  return <g transform={`translate(${x},${y}) scale(${s})`}>{body}</g>;
}

/* ------------------------------------------------------- bentuk gabungan -- */

/** Silinder (data store BPMN / database). */
export function Cylinder({ w, h, fill, stroke, strokeWidth = 1.6 }: { w: number; h: number; fill: string; stroke: string; strokeWidth?: number }) {
  const ry = Math.min(10, h * 0.16);
  const path = `M1,${ry + 1} C1,${ry * 0.2 + 1} ${w * 0.18},1 ${w / 2},1 C${w * 0.82},1 ${w - 1},${ry * 0.2 + 1} ${w - 1},${ry + 1} V${h - ry - 1} C${w - 1},${h - ry * 0.2 - 1} ${w * 0.82},${h - 1} ${w / 2},${h - 1} C${w * 0.18},${h - 1} 1,${h - ry * 0.2 - 1} 1,${h - ry - 1} Z`;
  return (
    <>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <path
        d={`M1,${ry + 1} C1,${ry * 1.9} ${w * 0.18},${ry * 2 + 1} ${w / 2},${ry * 2 + 1} C${w * 0.82},${ry * 2 + 1} ${w - 1},${ry * 1.9} ${w - 1},${ry + 1}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

/** Figur aktor (stick figure) dalam kotak w x h. */
export function ActorFigure({ w, h, stroke, strokeWidth = 1.8 }: { w: number; h: number; stroke: string; strokeWidth?: number }) {
  const size = Math.min(w * 0.62, h * 0.82);
  const cx = w / 2;
  const top = (h - size) / 2;
  const headR = size * 0.17;
  const headCy = top + headR + size * 0.02;
  const bodyTop = headCy + headR + size * 0.03;
  const bodyBottom = bodyTop + size * 0.32;
  const armY = bodyTop + size * 0.1;
  const legBottom = top + size;
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
      <circle cx={cx} cy={headCy} r={headR} />
      <path d={`M${cx},${bodyTop} V${bodyBottom}`} />
      <path d={`M${cx - size * 0.24},${armY} H${cx + size * 0.24}`} />
      <path d={`M${cx},${bodyBottom} L${cx - size * 0.2},${legBottom}`} />
      <path d={`M${cx},${bodyBottom} L${cx + size * 0.2},${legBottom}`} />
    </g>
  );
}

