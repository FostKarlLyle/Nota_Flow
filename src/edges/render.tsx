import type { ReactNode } from 'react';
import type { EdgeArrow, NotaEdgeData } from '../types';
import type { RenderTheme } from '../lib/renderTheme';
import { analyzePath } from './geometry';

const LINE_HEIGHT_FACTOR = 1.2;

interface MarkerProps {
  x: number;
  y: number;
  angle: number;
  kind: EdgeArrow;
  color: string;
  bg: string;
}

/** Penanda ujung konektor: panah, segitiga generalisasi, belah ketupat, bulatan. */
export function Marker({ x, y, angle, kind, color, bg }: MarkerProps) {
  if (kind === 'none') return null;
  const transform = `translate(${x},${y}) rotate(${angle})`;
  switch (kind) {
    case 'arrow':
      return (
        <path
          transform={transform}
          d="M-11,-5.2 L0,0 L-11,5.2"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'arrowFilled':
      return <path transform={transform} d="M-12,-6 L0,0 L-12,6 Z" fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />;
    case 'triangle':
      return <path transform={transform} d="M-14,-8 L0,0 L-14,8 Z" fill={bg} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />;
    case 'diamond':
      return <path transform={transform} d="M-22,0 L-15,-6.5 L-8,0 L-15,6.5 Z" fill={bg} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />;
    case 'diamondFilled':
      return <path transform={transform} d="M-22,0 L-15,-6.5 L-8,0 L-15,6.5 Z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />;
    case 'dot':
    case 'openDot':
      return <circle transform={transform} cx={-5} cy={0} r={5} fill={bg} stroke={color} strokeWidth={1.6} />;
    default:
      return null;
  }
}

export interface EdgeSceneProps {
  data: NotaEdgeData;
  path: string;
  selected?: boolean;
  theme: RenderTheme;
  /** sembunyikan interaksi (dipakai saat ekspor) */
  static?: boolean;
}

/** Gambar konektor lengkap (jalur, penanda ujung, label) tanpa ketergantungan React Flow. */
export function EdgeScene({ data, path, selected, theme, static: isStatic }: EdgeSceneProps): ReactNode {
  const info = analyzePath(path);
  const baseColor = data.color ?? (selected ? theme.accent : theme.edge);
  const width = selected ? 2.4 : 1.8;
  const dash = data.strokeStyle === 'dashed' ? '7 5' : data.strokeStyle === 'dotted' ? '1.6 4' : undefined;

  const label = (data.label ?? '').trim();
  const labelSize = data.fontSize ?? 11.5;
  const labelLines = label ? label.split('\n') : [];

  let labelX = 0;
  let labelY = 0;
  if (info) {
    const mid = info.mid;
    const a = info.pointAt(0.47);
    const b = info.pointAt(0.53);
    let nx = -(b.y - a.y);
    let ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const offset = 11;
    labelX = mid.x + nx * offset;
    labelY = mid.y + ny * offset;
  }

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={baseColor}
        strokeWidth={width}
        strokeDasharray={dash ?? (data.animated ? '6 4' : undefined)}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`react-flow__edge-path nota-edge-path${data.animated && !isStatic ? ' animated' : ''}`}
      />
      {!isStatic ? (
        <path d={path} fill="none" stroke="transparent" strokeWidth={18} className="react-flow__edge-interaction" />
      ) : null}

      {info ? (
        <>
          {data.startArrow && data.startArrow !== 'none' ? (
            <Marker x={info.start.x} y={info.start.y} angle={info.startAngle + 180} kind={data.startArrow} color={baseColor} bg={theme.canvasBg} />
          ) : null}
          {data.endArrow && data.endArrow !== 'none' ? (
            <Marker x={info.end.x} y={info.end.y} angle={info.endAngle} kind={data.endArrow} color={baseColor} bg={theme.canvasBg} />
          ) : null}
          {data.kind === 'bpmn.default'
            ? (() => {
                const p = info.pointAt(Math.min(0.95, 22 / Math.max(info.length, 1)));
                return (
                  <path
                    d="M-4,5.5 L4,-5.5"
                    transform={`translate(${p.x},${p.y}) rotate(${info.startAngle})`}
                    stroke={baseColor}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                );
              })()
            : null}
          {data.kind === 'bpmn.conditional'
            ? (() => {
                const p = info.pointAt(Math.min(0.95, 20 / Math.max(info.length, 1)));
                return (
                  <path
                    d="M0,-6 L6,0 L0,6 L-6,0 Z"
                    transform={`translate(${p.x},${p.y}) rotate(${info.startAngle})`}
                    fill={theme.canvasBg}
                    stroke={baseColor}
                    strokeWidth={1.5}
                  />
                );
              })()
            : null}
        </>
      ) : null}

      {labelLines.length ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontFamily={theme.font}
          fontSize={labelSize}
          fontWeight={600}
          fill={baseColor}
          stroke={theme.canvasBg}
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {labelLines.map((line, i) => (
            <tspan
              key={i}
              x={labelX}
              y={labelY + (i - (labelLines.length - 1) / 2) * labelSize * LINE_HEIGHT_FACTOR + labelSize * 0.35}
            >
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
    </>
  );
}
