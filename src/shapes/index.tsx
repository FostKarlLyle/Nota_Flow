import type { ReactNode } from 'react';
import type { DiagramKind, NotaNodeData, ShapeKey, TriggerKind } from '../types';
import type { ColorMode, ShapeStyle } from '../lib/theme';
import { measureText } from '../lib/text';
import {
  ActorFigure,
  Cylinder,
  Glyph,
  SvgText,
  diamondPath,
  rectPath,
  type GlyphKind,
} from './primitives';

export interface RenderCtx {
  w: number;
  h: number;
  data: NotaNodeData;
  style: ShapeStyle;
  selected: boolean;
  preview?: boolean;
}

export type ShapeRenderer = (ctx: RenderCtx) => ReactNode;

const SW = 1.6;

/* --------------------------------------------------------- teks bantuan --- */

function label(
  ctx: RenderCtx,
  box: { x: number; y: number; w: number; h: number },
  opts: { size?: number; weight?: number | string; align?: 'center' | 'left' | 'right'; italic?: boolean } = {},
) {
  if (ctx.preview) return null;
  const size = ctx.data.fontSize ?? opts.size ?? 12.5;
  const lineHeight = size * 1.26;
  const maxLines = Math.max(1, Math.floor(box.h / lineHeight));
  return (
    <SvgText
      text={ctx.data.label ?? ''}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      size={size}
      weight={opts.weight ?? 500}
      align={opts.align ?? 'center'}
      italic={opts.italic}
      fill={ctx.style.text}
      maxLines={maxLines}
    />
  );
}

/** Teks yang digambar di luar kotak node (mis. di bawah gateway / event). */
function outerLabel(ctx: RenderCtx, cx: number, y: number, size = 11.5) {
  if (ctx.preview) return null;
  const text = ctx.data.label ?? '';
  if (!text.trim()) return null;
  const lines = text.split('\n').slice(0, 3);
  const lineHeight = size * 1.25;
  return (
    <text
      textAnchor="middle"
      fontFamily='Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif'
      fontSize={size}
      fontWeight={500}
      fill={ctx.style.text}
      style={{ userSelect: 'none' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={cx} y={y + i * lineHeight + size * 0.8}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function eventGlyphKind(shape: ShapeKey, trigger: TriggerKind | undefined): GlyphKind | null {
  const t = trigger ?? 'none';
  if (t === 'none') return null;
  if (shape === 'bpmnIntermediateThrow' && t === 'message') return 'sendMessage';
  return t as GlyphKind;
}

/* -------------------------------------------------------------- renderer -- */

export const SHAPE_RENDERERS: Record<ShapeKey, ShapeRenderer> = {
  /* ------------------------------------------------------------ umum ----- */
  textBlock: (ctx) => {
    const { w, h } = ctx;
    const size = ctx.data.fontSize ?? 14;
    const maxLines = Math.max(1, Math.floor(h / (size * 1.3)));
    return (
      <SvgText
        text={ctx.data.label ?? ''}
        x={0}
        y={0}
        width={w}
        height={h}
        size={size}
        weight={600}
        align="center"
        fill={ctx.style.text}
        maxLines={maxLines}
      />
    );
  },

  note: (ctx) => {
    const { w, h } = ctx;
    const fold = Math.min(18, w * 0.18, h * 0.3);
    const d = `M1,1 H${w - fold} L${w - 1},${fold} V${h - 1} H1 Z`;
    return (
      <>
        <path d={d} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} strokeLinejoin="round" />
        <path d={`M${w - fold},1 V${fold} H${w - 1}`} fill="none" stroke={ctx.style.stroke} strokeWidth={SW * 0.8} />
        {label(ctx, { x: 10, y: 8, w: w - 20, h: h - 16 }, { size: 12, weight: 450, align: 'left' })}
      </>
    );
  },

  /* ------------------------------------------------------------ BPMN ----- */
  bpmnStart: (ctx) => eventCircle(ctx, false),
  bpmnEnd: (ctx) => eventCircle(ctx, true),
  bpmnIntermediateCatch: (ctx) => eventCircle(ctx, true, false),
  bpmnIntermediateThrow: (ctx) => eventCircle(ctx, true, false),
  bpmnBoundaryEvent: (ctx) => {
    const { w, h } = ctx;
    const r = Math.min(w, h) / 2 - SW;
    const cx = w / 2;
    const cy = h / 2;
    const glyph = eventGlyphKind('bpmnBoundaryEvent', ctx.data.trigger);
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <circle cx={cx} cy={cy} r={r - 3.4} fill="none" stroke={ctx.style.stroke} strokeWidth={SW} strokeDasharray="4 3" />
        {glyph ? <Glyph kind={glyph} x={cx - r * 0.55} y={cy - r * 0.55} size={r * 1.1} color={ctx.style.stroke} /> : null}
        {outerLabel(ctx, cx, h + 2, 11.5)}
      </>
    );
  },

  bpmnTask: (ctx) => taskBox(ctx, null),
  bpmnUserTask: (ctx) => taskBox(ctx, 'user'),
  bpmnServiceTask: (ctx) => taskBox(ctx, 'gear'),
  bpmnScriptTask: (ctx) => taskBox(ctx, 'script'),
  bpmnSendTask: (ctx) => taskBox(ctx, 'sendMessage'),
  bpmnReceiveTask: (ctx) => taskBox(ctx, 'message'),
  bpmnManualTask: (ctx) => taskBox(ctx, 'manual'),
  bpmnBusinessRuleTask: (ctx) => taskBox(ctx, 'table'),

  bpmnSubProcess: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={10} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <Glyph kind="subProcessPlus" x={w / 2 - 9} y={h - 22} size={18} color={ctx.style.stroke} />
        {label(ctx, { x: 12, y: 10, w: w - 24, h: h - 34 })}
      </>
    );
  },

  bpmnCallActivity: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={2} y={2} width={w - 4} height={h - 4} rx={10} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW * 2.1} />
        {label(ctx, { x: 12, y: 10, w: w - 24, h: h - 20 })}
      </>
    );
  },

  bpmnGatewayExclusive: (ctx) => gateway(ctx, 'x'),
  bpmnGatewayParallel: (ctx) => gateway(ctx, 'plus'),
  bpmnGatewayInclusive: (ctx) => gateway(ctx, 'circle'),
  bpmnGatewayEventBased: (ctx) => gateway(ctx, 'pentagonCircle'),

  bpmnPool: (ctx) => {
    const { w, h } = ctx;
    const band = 34;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <rect x={1} y={1} width={band} height={h - 2} fill={ctx.style.stroke} opacity={0.07} />
        <path d={`M${band},1 V${h - 1}`} stroke={ctx.style.stroke} strokeWidth={SW} />
        {!ctx.preview && (ctx.data.label ?? '').trim() ? (
          <text
            transform={`translate(${band / 2 + 4},${h / 2}) rotate(-90)`}
            textAnchor="middle"
            fontFamily='Inter, "Segoe UI", system-ui, sans-serif'
            fontSize={ctx.data.fontSize ?? 13}
            fontWeight={600}
            fill={ctx.style.text}
            style={{ userSelect: 'none' }}
          >
            {(ctx.data.label ?? '').split('\n')[0]}
          </text>
        ) : null}
      </>
    );
  },

  bpmnLane: (ctx) => {
    const { w, h } = ctx;
    const band = Math.min(34, w * 0.12);
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <rect x={1} y={1} width={band} height={h - 2} fill={ctx.style.stroke} opacity={0.07} />
        <path d={`M${band},1 V${h - 1}`} stroke={ctx.style.stroke} strokeWidth={SW} />
        {!ctx.preview && (ctx.data.label ?? '').trim() ? (
          <text
            transform={`translate(${band / 2 + 4},${h / 2}) rotate(-90)`}
            textAnchor="middle"
            fontFamily='Inter, "Segoe UI", system-ui, sans-serif'
            fontSize={ctx.data.fontSize ?? 12.5}
            fontWeight={600}
            fill={ctx.style.text}
            style={{ userSelect: 'none' }}
          >
            {(ctx.data.label ?? '').split('\n')[0]}
          </text>
        ) : null}
      </>
    );
  },

  bpmnDataObject: (ctx) => {
    const { w, h } = ctx;
    const fold = Math.min(14, w * 0.25, h * 0.2);
    return (
      <>
        <path
          d={`M1,1 H${w - fold} L${w - 1},${fold} V${h - 1} H1 Z`}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
        />
        <path d={`M${w - fold},1 V${fold} H${w - 1}`} fill="none" stroke={ctx.style.stroke} strokeWidth={SW * 0.8} />
        {label(ctx, { x: 5, y: fold + 3, w: w - 10, h: h - fold - 8 }, { size: 11, weight: 500 })}
      </>
    );
  },

  bpmnDataStore: (ctx) => (
    <>
      <Cylinder w={ctx.w} h={ctx.h} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
      {label(ctx, { x: 6, y: ctx.h * 0.24, w: ctx.w - 12, h: ctx.h * 0.66 }, { size: 11, weight: 500 })}
    </>
  ),

  bpmnGroup: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          rx={8}
          fill={ctx.style.fill}
          fillOpacity={0.35}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          strokeDasharray="8 5"
        />
        {label(ctx, { x: 10, y: 6, w: w - 20, h: Math.min(44, h - 12) }, { size: 11.5, weight: 600, align: 'left' })}
      </>
    );
  },

  /* ---------------------------------------------------------- Use case --- */
  ucActor: (ctx) => {
    const { w, h } = ctx;
    const labelH = Math.min(36, h * 0.3);
    return (
      <>
        <ActorFigure w={w} h={h - labelH} stroke={ctx.style.stroke} strokeWidth={1.9} />
        {label(ctx, { x: -6, y: h - labelH, w: w + 12, h: labelH }, { size: 12.5, weight: 600 })}
      </>
    );
  },

  ucUseCase: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        {label(ctx, { x: 16, y: 8, w: w - 32, h: h - 16 })}
      </>
    );
  },

  ucBoundary: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={10} fill={ctx.style.fill} fillOpacity={0.5} stroke={ctx.style.stroke} strokeWidth={SW} />
        {label(ctx, { x: 12, y: 6, w: w - 24, h: Math.min(40, h * 0.25) }, { size: 13, weight: 650 })}
      </>
    );
  },

  /* ---------------------------------------------------------- Activity --- */
  actInitial: (ctx) => {
    const { w, h } = ctx;
    const r = Math.min(w, h) / 2 - 2;
    return (
      <>
        <circle cx={w / 2} cy={h / 2} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={1.4} />
        {outerLabel(ctx, w / 2, h + 2, 11.5)}
      </>
    );
  },

  actFinal: (ctx) => {
    const { w, h } = ctx;
    const r = Math.min(w, h) / 2 - 2;
    return (
      <>
        <circle cx={w / 2} cy={h / 2} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <circle cx={w / 2} cy={h / 2} r={r * 0.62} fill={ctx.style.stroke} />
        {outerLabel(ctx, w / 2, h + 2, 11.5)}
      </>
    );
  },

  actFlowFinal: (ctx) => {
    const { w, h } = ctx;
    const r = Math.min(w, h) / 2 - 2;
    const k = r * 0.62;
    return (
      <>
        <circle cx={w / 2} cy={h / 2} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <path
          d={`M${w / 2 - k},${h / 2 - k} L${w / 2 + k},${h / 2 + k} M${w / 2 + k},${h / 2 - k} L${w / 2 - k},${h / 2 + k}`}
          stroke={ctx.style.stroke}
          strokeWidth={SW * 1.3}
          strokeLinecap="round"
        />
        {outerLabel(ctx, w / 2, h + 2, 11.5)}
      </>
    );
  },

  actAction: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={12} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        {label(ctx, { x: 14, y: 8, w: w - 28, h: h - 16 })}
      </>
    );
  },

  actDecision: (ctx) => decisionLike(ctx, false),
  actMerge: (ctx) => decisionLike(ctx, false),

  actFork: (ctx) => barShape(ctx),
  actJoin: (ctx) => barShape(ctx),

  actObject: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        {label(ctx, { x: 8, y: 5, w: w - 16, h: h - 10 }, { size: 12, weight: 500 })}
      </>
    );
  },

  actPartition: (ctx) => {
    const { w, h } = ctx;
    const head = Math.min(32, h * 0.2);
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={ctx.style.fill} fillOpacity={0.4} stroke={ctx.style.stroke} strokeWidth={SW} />
        <path d={rectPath(1, 1, w - 2, head, 6)} fill={ctx.style.stroke} opacity={0.07} />
        <path d={`M1,${head} H${w - 1}`} stroke={ctx.style.stroke} strokeWidth={SW} />
        {label(ctx, { x: 12, y: 4, w: w - 24, h: head - 8 }, { size: 12.5, weight: 650, align: 'left' })}
      </>
    );
  },

  actSendSignal: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <path
          d={`M2,1 H${w - h / 2} L${w - 1},${h / 2} L${w - h / 2},${h - 1} H2 Z`}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        {label(ctx, { x: 12, y: 8, w: w - 30, h: h - 16 }, { size: 12 })}
      </>
    );
  },

  actReceiveSignal: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <path
          d={`M${w - 2},1 H${h / 2} L1,${h / 2} L${h / 2},${h - 1} H${w - 2} Z`}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        {label(ctx, { x: 24, y: 8, w: w - 34, h: h - 16 }, { size: 12 })}
      </>
    );
  },

  actTimeEvent: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <path
          d={`M1,${h - 1} V${h * 0.32} L${w / 2},1 L${w - 1},${h * 0.32} V${h - 1} Z`}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <Glyph kind="timer" x={w / 2 - 9} y={h * 0.34 - 9} size={18} color={ctx.style.stroke} />
        {label(ctx, { x: 10, y: h * 0.52, w: w - 20, h: h * 0.42 }, { size: 11.5 })}
      </>
    );
  },

  /* ------------------------------------------------------------- Class --- */
  clsClass: (ctx) => classBox(ctx, { stereotype: ctx.data.stereotype, abstract: false, showMethods: true }),
  clsAbstract: (ctx) => classBox(ctx, { stereotype: ctx.data.stereotype ?? 'abstract', abstract: true, showMethods: true }),
  clsInterface: (ctx) => classBox(ctx, { stereotype: ctx.data.stereotype ?? 'interface', abstract: false, showMethods: true }),
  clsEnum: (ctx) => classBox(ctx, { stereotype: ctx.data.stereotype ?? 'enumeration', abstract: false, showMethods: false }),

  clsPackage: (ctx) => {
    const { w, h } = ctx;
    const tabW = Math.min(w * 0.45, 130);
    const tabH = 24;
    return (
      <>
        <path
          d={`M1,${tabH} V1 H${tabW} V${tabH} H${w - 1} V${h - 1} H1 Z`}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        {label(ctx, { x: 10, y: 4, w: tabW - 16, h: tabH - 6 }, { size: 12.5, weight: 650, align: 'left' })}
      </>
    );
  },

  /* --------------------------------------------------------------- DFD --- */
  dfdExternal: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={2} y={2} width={w - 4} height={h - 4} rx={2} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW + 0.2} />
        <rect x={6} y={6} width={w - 12} height={h - 12} rx={1} fill="none" stroke={ctx.style.stroke} strokeWidth={1} opacity={0.4} />
        {label(ctx, { x: 12, y: 10, w: w - 24, h: h - 20 })}
      </>
    );
  },

  dfdProcess: (ctx) => {
    const { w, h } = ctx;
    return (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={12} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <path d={`M1,${h * 0.34} H${w - 1}`} stroke={ctx.style.stroke} strokeWidth={1.2} />
        {ctx.preview || !ctx.data.number ? null : (
          <SvgText
            text={ctx.data.number}
            x={8}
            y={4}
            width={w - 16}
            height={h * 0.34 - 8}
            size={11}
            weight={700}
            align="left"
            fill={ctx.style.text}
          />
        )}
        {label(ctx, { x: 12, y: h * 0.38, w: w - 24, h: h * 0.58 })}
      </>
    );
  },

  dfdProcessCircle: (ctx) => {
    const { w, h } = ctx;
    const r = Math.min(w, h) / 2 - 2;
    return (
      <>
        <circle cx={w / 2} cy={h / 2} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        {ctx.preview || !ctx.data.number ? null : (
          <SvgText
            text={ctx.data.number}
            x={w / 2 - r}
            y={h / 2 - 26}
            width={r * 2}
            height={24}
            size={11}
            weight={700}
            fill={ctx.style.text}
          />
        )}
        {label(ctx, { x: w / 2 - r * 0.72, y: h / 2 - 12, w: r * 1.44, h: 30 }, { size: 12 })}
        <path d={`M${w / 2 - r},${h / 2} H${w / 2 + r}`} stroke={ctx.style.stroke} strokeWidth={1} opacity={0.45} />
      </>
    );
  },

  dfdDataStore: (ctx) => {
    const { w, h } = ctx;
    const pad = 4;
    return (
      <>
        <path
          d={`M${pad},${pad} H${w - pad} M${pad},${h - pad} H${w - pad} M${pad},${pad} V${h - pad}`}
          stroke={ctx.style.stroke}
          strokeWidth={SW}
          fill="none"
          strokeLinecap="square"
        />
        {ctx.preview || !ctx.data.number ? null : (
          <SvgText text={ctx.data.number} x={pad + 6} y={pad + 1} width={w - 24} height={22} size={11} weight={700} align="left" fill={ctx.style.text} />
        )}
        {label(ctx, { x: pad + 20, y: 8, w: w - pad * 2 - 26, h: h - 22 })}
      </>
    );
  },

  dfdDataStoreAlt: (ctx) => {
    const { w, h } = ctx;
    const leftW = Math.min(38, w * 0.22);
    return (
      <>
        <rect x={1} y={1} width={leftW} height={h - 2} rx={3} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
        <path d={`M1,${h * 0.42} H${leftW + 1}`} stroke={ctx.style.stroke} strokeWidth={1} opacity={0.5} />
        {ctx.preview || !ctx.data.number ? null : (
          <SvgText text={ctx.data.number} x={2} y={4} width={leftW - 4} height={h * 0.42 - 6} size={11} weight={700} fill={ctx.style.text} />
        )}
        {label(ctx, { x: leftW + 4, y: 6, w: w - leftW - 10, h: h - 12 })}
      </>
    );
  },
};

/* ---------------------------------------------------------- sub-renderer -- */

function eventCircle(ctx: RenderCtx, doubleRing: boolean, allowLabelOutside = true): ReactNode {
  const { w, h } = ctx;
  const r = Math.min(w, h) / 2 - SW;
  const cx = w / 2;
  const cy = h / 2;
  const glyph = eventGlyphKind(ctx.data.shape, ctx.data.trigger);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW + 0.4} />
      {doubleRing ? <circle cx={cx} cy={cy} r={r - 3.2} fill="none" stroke={ctx.style.stroke} strokeWidth={SW * 0.85} /> : null}
      {glyph ? <Glyph kind={glyph} x={cx - r * 0.5} y={cy - r * 0.5} size={r} color={ctx.style.stroke} /> : null}
      {allowLabelOutside ? outerLabel(ctx, cx, h + 3, 11.5) : null}
    </>
  );
}

function taskBox(ctx: RenderCtx, glyph: GlyphKind | null): ReactNode {
  const { w, h } = ctx;
  const hasGlyph = !!glyph;
  return (
    <>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={10} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
      {glyph ? <Glyph kind={glyph} x={8} y={8} size={17} color={ctx.style.stroke} /> : null}
      {label(
        ctx,
        hasGlyph
          ? { x: 8, y: 26, w: w - 16, h: h - 32 }
          : { x: 10, y: 8, w: w - 20, h: h - 16 },
      )}
    </>
  );
}

function gateway(ctx: RenderCtx, glyph: GlyphKind): ReactNode {
  const { w, h } = ctx;
  const cx = w / 2;
  const cy = h / 2;
  const g = Math.min(w, h) * 0.34;
  return (
    <>
      <path d={diamondPath(1, 1, w - 2, h - 2)} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} strokeLinejoin="round" />
      <Glyph kind={glyph} x={cx - g / 2} y={cy - g / 2} size={g} color={ctx.style.stroke} />
      {outerLabel(ctx, cx, h + 3, 11.5)}
    </>
  );
}

function decisionLike(ctx: RenderCtx, _mirror: boolean): ReactNode {
  const { w, h } = ctx;
  return (
    <>
      <path d={diamondPath(1, 1, w - 2, h - 2)} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} strokeLinejoin="round" />
      {outerLabel(ctx, w / 2, h + 3, 11.5)}
    </>
  );
}

function barShape(ctx: RenderCtx): ReactNode {
  const { w, h } = ctx;
  return (
    <>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={2} fill={ctx.style.stroke} stroke={ctx.style.stroke} strokeWidth={1} />
      {outerLabel(ctx, w / 2, h + 3, 11)}
    </>
  );
}

function classBox(
  ctx: RenderCtx,
  opts: { stereotype?: string; abstract: boolean; showMethods: boolean },
): ReactNode {
  const { w, h } = ctx;
  const size = ctx.data.fontSize ?? 11.5;
  const lineHeight = size * 1.32;
  const pad = 8;
  const textW = w - pad * 2 - 4;
  const nameLines = (ctx.data.label ?? '').split('\n').filter((l) => l.trim().length > 0);
  const nameHeight = Math.max(lineHeight, nameLines.length * lineHeight) + (opts.stereotype ? lineHeight : 0);
  const headerH = Math.max(28, nameHeight + 10);
  const attrs = ctx.data.attributes ?? [];
  const methods = ctx.data.methods ?? [];
  const attrsH = Math.max(lineHeight, attrs.length * lineHeight) + 8;
  const methodsH = opts.showMethods ? Math.max(lineHeight, methods.length * lineHeight) + 8 : 0;

  const renderLines = (
    lines: string[],
    top: number,
    italic = false,
    weight: number | string = 450,
  ) => {
    if (ctx.preview) return null;
    const body = lines.length ? lines : [''];
    return (
      <text
        fontFamily='Inter, "Segoe UI", system-ui, sans-serif'
        fontSize={size}
        fontWeight={weight as number}
        fontStyle={italic ? 'italic' : undefined}
        fill={ctx.style.text}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {body.map((line, i) => (
          <tspan key={i} x={pad} y={top + i * lineHeight + size * 0.82}>
            {line || ' '}
          </tspan>
        ))}
      </text>
    );
  };

  return (
    <>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={ctx.style.fill} stroke={ctx.style.stroke} strokeWidth={SW} />
      {!ctx.preview ? (
        <text
          textAnchor="middle"
          fontFamily='Inter, "Segoe UI", system-ui, sans-serif'
          fontSize={size}
          fill={ctx.style.text}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {opts.stereotype ? (
            <tspan x={w / 2} y={10 + size * 0.9} fontStyle="italic" opacity={0.85}>
              {`«${opts.stereotype}»`}
            </tspan>
          ) : null}
          {nameLines.map((line, i) => (
            <tspan
              key={i}
              x={w / 2}
              y={(opts.stereotype ? 10 + size * 1.9 : 10 + size * 0.9) + i * lineHeight}
              fontWeight={700}
              fontStyle={opts.abstract ? 'italic' : undefined}
            >
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
      <path d={`M1,${headerH + 1} H${w - 1}`} stroke={ctx.style.stroke} strokeWidth={SW} />
      {renderLines(attrs, headerH + 6)}
      {opts.showMethods ? (
        <>
          <path d={`M1,${headerH + attrsH + 1} H${w - 1}`} stroke={ctx.style.stroke} strokeWidth={SW} />
          {renderLines(methods, headerH + attrsH + 6)}
        </>
      ) : null}
      {/* penanda area kosong agar ukuran ternormalisasi terlihat */}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke="none" data-h={headerH + attrsH + methodsH} />
      {textW > 0 ? null : null}
    </>
  );
}

/* -------------------------------------------------- ukuran & meta stensil - */

export interface ShapeMeta {
  label: string;
  group: string;
  width: number;
  height: number;
  defaults?: Partial<NotaNodeData>;
}

export const SHAPE_META: Record<ShapeKey, ShapeMeta> = {
  // umum
  textBlock: { label: 'Teks Bebas', group: 'Umum', width: 170, height: 40, defaults: { label: 'Teks' } },
  note: { label: 'Catatan', group: 'Umum', width: 190, height: 110, defaults: { label: 'Catatan...' } },
  // BPMN
  bpmnStart: { label: 'Start Event', group: 'Event', width: 46, height: 46, defaults: { label: '' } },
  bpmnEnd: { label: 'End Event', group: 'Event', width: 46, height: 46, defaults: { label: '' } },
  bpmnIntermediateCatch: { label: 'Intermediate (Catch)', group: 'Event', width: 46, height: 46, defaults: { label: '' } },
  bpmnIntermediateThrow: { label: 'Intermediate (Throw)', group: 'Event', width: 46, height: 46, defaults: { label: '' } },
  bpmnBoundaryEvent: { label: 'Boundary Event', group: 'Event', width: 40, height: 40, defaults: { label: '' } },
  bpmnTask: { label: 'Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Task' } },
  bpmnUserTask: { label: 'User Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'User Task' } },
  bpmnServiceTask: { label: 'Service Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Service Task' } },
  bpmnScriptTask: { label: 'Script Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Script Task' } },
  bpmnSendTask: { label: 'Send Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Send Task' } },
  bpmnReceiveTask: { label: 'Receive Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Receive Task' } },
  bpmnManualTask: { label: 'Manual Task', group: 'Aktivitas', width: 136, height: 76, defaults: { label: 'Manual Task' } },
  bpmnBusinessRuleTask: { label: 'Business Rule Task', group: 'Aktivitas', width: 150, height: 76, defaults: { label: 'Business Rule' } },
  bpmnSubProcess: { label: 'Sub-Process', group: 'Aktivitas', width: 190, height: 120, defaults: { label: 'Sub-Process' } },
  bpmnCallActivity: { label: 'Call Activity', group: 'Aktivitas', width: 150, height: 76, defaults: { label: 'Call Activity' } },
  bpmnGatewayExclusive: { label: 'Gateway XOR', group: 'Gateway', width: 54, height: 54, defaults: { label: '' } },
  bpmnGatewayParallel: { label: 'Gateway AND', group: 'Gateway', width: 54, height: 54, defaults: { label: '' } },
  bpmnGatewayInclusive: { label: 'Gateway OR', group: 'Gateway', width: 54, height: 54, defaults: { label: '' } },
  bpmnGatewayEventBased: { label: 'Gateway Event', group: 'Gateway', width: 54, height: 54, defaults: { label: '' } },
  bpmnPool: { label: 'Pool / Swimlane', group: 'Kolaborasi', width: 760, height: 260, defaults: { label: 'Pool' } },
  bpmnLane: { label: 'Lane', group: 'Kolaborasi', width: 700, height: 120, defaults: { label: 'Lane' } },
  bpmnDataObject: { label: 'Data Object', group: 'Data', width: 60, height: 74, defaults: { label: 'Dokumen' } },
  bpmnDataStore: { label: 'Data Store', group: 'Data', width: 66, height: 66, defaults: { label: 'Data' } },
  bpmnGroup: { label: 'Group', group: 'Kolaborasi', width: 280, height: 170, defaults: { label: 'Group' } },
  // use case
  ucActor: { label: 'Aktor', group: 'Use Case', width: 76, height: 120, defaults: { label: 'Aktor' } },
  ucUseCase: { label: 'Use Case', group: 'Use Case', width: 172, height: 74, defaults: { label: 'Use Case' } },
  ucBoundary: { label: 'System Boundary', group: 'Use Case', width: 460, height: 340, defaults: { label: 'Sistem' } },
  // activity
  actInitial: { label: 'Initial Node', group: 'Activity', width: 40, height: 40, defaults: { label: '' } },
  actFinal: { label: 'Activity Final', group: 'Activity', width: 44, height: 44, defaults: { label: '' } },
  actFlowFinal: { label: 'Flow Final', group: 'Activity', width: 44, height: 44, defaults: { label: '' } },
  actAction: { label: 'Action', group: 'Activity', width: 156, height: 68, defaults: { label: 'Action' } },
  actDecision: { label: 'Decision', group: 'Activity', width: 56, height: 56, defaults: { label: '' } },
  actMerge: { label: 'Merge', group: 'Activity', width: 56, height: 56, defaults: { label: '' } },
  actFork: { label: 'Fork', group: 'Activity', width: 150, height: 12, defaults: { label: '' } },
  actJoin: { label: 'Join', group: 'Activity', width: 150, height: 12, defaults: { label: '' } },
  actObject: { label: 'Object Node', group: 'Activity', width: 130, height: 52, defaults: { label: 'Objek' } },
  actPartition: { label: 'Partition / Swimlane', group: 'Activity', width: 520, height: 250, defaults: { label: 'Partisi' } },
  actSendSignal: { label: 'Send Signal', group: 'Activity', width: 156, height: 64, defaults: { label: 'Send Signal' } },
  actReceiveSignal: { label: 'Receive Signal', group: 'Activity', width: 156, height: 64, defaults: { label: 'Receive Signal' } },
  actTimeEvent: { label: 'Time Event', group: 'Activity', width: 120, height: 84, defaults: { label: 'Time Event' } },
  // class
  clsClass: { label: 'Class', group: 'Class', width: 220, height: 150, defaults: { label: 'NamaClass', attributes: ['- id: int', '- nama: String'], methods: ['+ getNama(): String'] } },
  clsInterface: { label: 'Interface', group: 'Class', width: 220, height: 130, defaults: { label: 'NamaInterface', methods: ['+ proses(): void'] } },
  clsAbstract: { label: 'Abstract Class', group: 'Class', width: 220, height: 140, defaults: { label: 'AbstractClass', attributes: ['# status: int'], methods: ['+ run(): void'] } },
  clsEnum: { label: 'Enumeration', group: 'Class', width: 200, height: 110, defaults: { label: 'Status', attributes: ['AKTIF', 'NONAKTIF'] } },
  clsPackage: { label: 'Package', group: 'Class', width: 250, height: 170, defaults: { label: 'package' } },
  // dfd
  dfdExternal: { label: 'Entitas Eksternal', group: 'DFD', width: 156, height: 66, defaults: { label: 'Entitas' } },
  dfdProcess: { label: 'Proses (Gane-Sarson)', group: 'DFD', width: 176, height: 88, defaults: { label: 'Proses', number: '1.0' } },
  dfdProcessCircle: { label: 'Proses (Lingkaran)', group: 'DFD', width: 150, height: 110, defaults: { label: 'Proses', number: '1.0' } },
  dfdDataStore: { label: 'Data Store (terbuka)', group: 'DFD', width: 190, height: 62, defaults: { label: 'Tabel', number: 'D1' } },
  dfdDataStoreAlt: { label: 'Data Store (kotak)', group: 'DFD', width: 200, height: 62, defaults: { label: 'Tabel', number: 'D1' } },
};

export function defaultNodeData(shape: ShapeKey): NotaNodeData {
  const meta = SHAPE_META[shape];
  return {
    shape,
    label: meta?.defaults?.label ?? '',
    ...meta?.defaults,
  } as NotaNodeData;
}

/** Tinggi minimum agar isi kelas tidak terpotong. */
export function autoHeight(shape: ShapeKey, data: NotaNodeData, width: number): number | null {
  if (shape !== 'clsClass' && shape !== 'clsInterface' && shape !== 'clsAbstract' && shape !== 'clsEnum') return null;
  const size = data.fontSize ?? 11.5;
  const lineHeight = size * 1.32;
  const pad = 8;
  const textW = width - pad * 2 - 4;
  const st = data.stereotype && shape !== 'clsInterface' ? data.stereotype : shape === 'clsInterface' ? 'interface' : shape === 'clsEnum' ? 'enumeration' : null;
  const nameLines = (data.label ?? '').split('\n').reduce((acc, l) => acc + Math.max(1, Math.ceil(measureText(l, size, 700) / Math.max(40, textW))), 0);
  const headerH = Math.max(28, nameLines * lineHeight + (st ? lineHeight : 0) + 10);
  const attrs = data.attributes ?? [];
  const methods = data.methods ?? [];
  const attrsH = Math.max(lineHeight, attrs.length * lineHeight) + 8;
  const methodsH = shape === 'clsEnum' ? 0 : Math.max(lineHeight, methods.length * lineHeight) + 8;
  return Math.round(headerH + attrsH + methodsH + 2);
}

export function shapeMinSize(shape: ShapeKey): { width: number; height: number } {
  switch (shape) {
    case 'actFork':
    case 'actJoin':
      return { width: 60, height: 8 };
    case 'bpmnLane':
      return { width: 260, height: 70 };
    case 'bpmnPool':
    case 'ucBoundary':
      return { width: 260, height: 140 };
    default:
      return { width: 24, height: 24 };
  }
}

export const SHAPE_LIST: ShapeKey[] = Object.keys(SHAPE_META) as ShapeKey[];
export type { ColorMode };

/* ------------------------------------------- pemetaan bentuk ke diagram --- */

export const SHAPE_DIAGRAM: Record<ShapeKey, DiagramKind> = {
  textBlock: 'bpmn',
  note: 'bpmn',
  bpmnStart: 'bpmn',
  bpmnEnd: 'bpmn',
  bpmnIntermediateCatch: 'bpmn',
  bpmnIntermediateThrow: 'bpmn',
  bpmnBoundaryEvent: 'bpmn',
  bpmnTask: 'bpmn',
  bpmnUserTask: 'bpmn',
  bpmnServiceTask: 'bpmn',
  bpmnScriptTask: 'bpmn',
  bpmnSendTask: 'bpmn',
  bpmnReceiveTask: 'bpmn',
  bpmnManualTask: 'bpmn',
  bpmnBusinessRuleTask: 'bpmn',
  bpmnSubProcess: 'bpmn',
  bpmnCallActivity: 'bpmn',
  bpmnGatewayExclusive: 'bpmn',
  bpmnGatewayParallel: 'bpmn',
  bpmnGatewayInclusive: 'bpmn',
  bpmnGatewayEventBased: 'bpmn',
  bpmnPool: 'bpmn',
  bpmnLane: 'bpmn',
  bpmnDataObject: 'bpmn',
  bpmnDataStore: 'bpmn',
  bpmnGroup: 'bpmn',
  ucActor: 'usecase',
  ucUseCase: 'usecase',
  ucBoundary: 'usecase',
  actInitial: 'activity',
  actFinal: 'activity',
  actFlowFinal: 'activity',
  actAction: 'activity',
  actDecision: 'activity',
  actMerge: 'activity',
  actFork: 'activity',
  actJoin: 'activity',
  actObject: 'activity',
  actPartition: 'activity',
  actSendSignal: 'activity',
  actReceiveSignal: 'activity',
  actTimeEvent: 'activity',
  clsClass: 'class',
  clsInterface: 'class',
  clsAbstract: 'class',
  clsEnum: 'class',
  clsPackage: 'class',
  dfdExternal: 'dfd',
  dfdProcess: 'dfd',
  dfdProcessCircle: 'dfd',
  dfdDataStore: 'dfd',
  dfdDataStoreAlt: 'dfd',
};

const COMMON_SHAPES: ShapeKey[] = ['note', 'textBlock'];

/** Stensil yang relevan untuk jenis diagram tertentu. */
export function shapesFor(kind: DiagramKind): { group: string; items: ShapeKey[] }[] {
  const groups = new Map<string, ShapeKey[]>();
  for (const shape of SHAPE_LIST) {
    if (SHAPE_DIAGRAM[shape] !== kind) continue;
    const group = SHAPE_META[shape].group;
    const list = groups.get(group) ?? [];
    list.push(shape);
    groups.set(group, list);
  }
  const result = [...groups.entries()].map(([group, items]) => ({ group, items }));
  result.push({ group: 'Umum', items: COMMON_SHAPES });
  // letakkan grup "Umum" di akhir, urutan sisanya sesuai deklarasi
  return result;
}
