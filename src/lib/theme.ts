import type { NotaNodeData, ShapeKey, StrokeStyle } from '../types';

export type ColorMode = 'light' | 'dark';

export interface ShapeStyle {
  fill: string;
  stroke: string;
  text: string;
}

/** Pasangan warna default per grup stensil (mode terang & gelap). */
interface StylePair {
  light: ShapeStyle;
  dark: ShapeStyle;
}

const pair = (lf: string, ls: string, lt: string, df: string, ds: string, dt: string): StylePair => ({
  light: { fill: lf, stroke: ls, text: lt },
  dark: { fill: df, stroke: ds, text: dt },
});

export const SHAPE_STYLES: Partial<Record<ShapeKey, StylePair>> = {
  // -- BPMN ----------------------------------------------------------------
  bpmnStart: pair('#dcfce7', '#15803d', '#14532d', '#0f3d26', '#4ade80', '#bbf7d0'),
  bpmnEnd: pair('#fee2e2', '#b91c1c', '#7f1d1d', '#40191d', '#f87171', '#fecaca'),
  bpmnIntermediateCatch: pair('#e0f2fe', '#0369a1', '#0c4a6e', '#0e2f45', '#38bdf8', '#bae6fd'),
  bpmnIntermediateThrow: pair('#e0f2fe', '#0369a1', '#0c4a6e', '#0e2f45', '#38bdf8', '#bae6fd'),
  bpmnBoundaryEvent: pair('#e0f2fe', '#0369a1', '#0c4a6e', '#0e2f45', '#38bdf8', '#bae6fd'),
  bpmnTask: pair('#ffffff', '#475569', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  bpmnUserTask: pair('#eef2ff', '#4f46e5', '#312e81', '#232a5c', '#818cf8', '#e0e7ff'),
  bpmnServiceTask: pair('#ecfeff', '#0891b2', '#155e75', '#0d3a49', '#22d3ee', '#cffafe'),
  bpmnScriptTask: pair('#fefce8', '#ca8a04', '#713f12', '#3f3010', '#facc15', '#fef9c3'),
  bpmnSendTask: pair('#f0fdf4', '#16a34a', '#14532d', '#123524', '#4ade80', '#dcfce7'),
  bpmnReceiveTask: pair('#f0fdf4', '#16a34a', '#14532d', '#123524', '#4ade80', '#dcfce7'),
  bpmnManualTask: pair('#fff7ed', '#ea580c', '#7c2d12', '#43200e', '#fb923c', '#ffedd5'),
  bpmnBusinessRuleTask: pair('#fdf4ff', '#a855f7', '#581c87', '#331347', '#c084fc', '#f3e8ff'),
  bpmnSubProcess: pair('#f8fafc', '#475569', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  bpmnCallActivity: pair('#f8fafc', '#334155', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  bpmnGatewayExclusive: pair('#fef3c7', '#d97706', '#78350f', '#3d2a0e', '#fbbf24', '#fde68a'),
  bpmnGatewayParallel: pair('#dbeafe', '#2563eb', '#1e3a8a', '#16264f', '#60a5fa', '#bfdbfe'),
  bpmnGatewayInclusive: pair('#dcfce7', '#16a34a', '#14532d', '#123524', '#4ade80', '#dcfce7'),
  bpmnGatewayEventBased: pair('#f3e8ff', '#9333ea', '#581c87', '#331347', '#c084fc', '#f3e8ff'),
  bpmnPool: pair('#ffffff', '#334155', '#0f172a', '#111a2b', '#64748b', '#e2e8f0'),
  bpmnLane: pair('#ffffff', '#64748b', '#0f172a', '#111a2b', '#64748b', '#e2e8f0'),
  bpmnDataObject: pair('#f8fafc', '#64748b', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  bpmnDataStore: pair('#f8fafc', '#64748b', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  bpmnGroup: pair('#f1f5f9', '#94a3b8', '#334155', '#1a2434', '#64748b', '#cbd5e1'),
  // -- Use case ------------------------------------------------------------
  ucActor: pair('#ffffff', '#0f172a', '#0f172a', '#0b1220', '#e2e8f0', '#e2e8f0'),
  ucUseCase: pair('#eef2ff', '#4f46e5', '#312e81', '#232a5c', '#818cf8', '#e0e7ff'),
  ucBoundary: pair('#ffffff', '#94a3b8', '#334155', '#111a2b', '#64748b', '#cbd5e1'),
  // -- Activity ------------------------------------------------------------
  actInitial: pair('#0f172a', '#0f172a', '#0f172a', '#e2e8f0', '#e2e8f0', '#e2e8f0'),
  actFinal: pair('#ffffff', '#0f172a', '#0f172a', '#0b1220', '#e2e8f0', '#e2e8f0'),
  actFlowFinal: pair('#ffffff', '#0f172a', '#0f172a', '#0b1220', '#e2e8f0', '#e2e8f0'),
  actAction: pair('#f0fdfa', '#0d9488', '#134e4a', '#123332', '#2dd4bf', '#ccfbf1'),
  actDecision: pair('#fef3c7', '#d97706', '#78350f', '#3d2a0e', '#fbbf24', '#fde68a'),
  actMerge: pair('#fef3c7', '#d97706', '#78350f', '#3d2a0e', '#fbbf24', '#fde68a'),
  actFork: pair('#0f172a', '#0f172a', '#0f172a', '#e2e8f0', '#e2e8f0', '#e2e8f0'),
  actJoin: pair('#0f172a', '#0f172a', '#0f172a', '#e2e8f0', '#e2e8f0', '#e2e8f0'),
  actObject: pair('#f8fafc', '#64748b', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  actPartition: pair('#ffffff', '#94a3b8', '#334155', '#111a2b', '#64748b', '#cbd5e1'),
  actSendSignal: pair('#f0fdfa', '#0d9488', '#134e4a', '#123332', '#2dd4bf', '#ccfbf1'),
  actReceiveSignal: pair('#f0fdfa', '#0d9488', '#134e4a', '#123332', '#2dd4bf', '#ccfbf1'),
  actTimeEvent: pair('#f0fdfa', '#0d9488', '#134e4a', '#123332', '#2dd4bf', '#ccfbf1'),
  // -- Class ---------------------------------------------------------------
  clsClass: pair('#ffffff', '#4338ca', '#0f172a', '#141d33', '#818cf8', '#e2e8f0'),
  clsInterface: pair('#ffffff', '#7c3aed', '#0f172a', '#141d33', '#a78bfa', '#e2e8f0'),
  clsAbstract: pair('#ffffff', '#4338ca', '#0f172a', '#141d33', '#818cf8', '#e2e8f0'),
  clsEnum: pair('#ffffff', '#0891b2', '#0f172a', '#141d33', '#22d3ee', '#e2e8f0'),
  clsPackage: pair('#f8fafc', '#475569', '#0f172a', '#1e293b', '#94a3b8', '#e2e8f0'),
  // -- DFD -----------------------------------------------------------------
  dfdExternal: pair('#e0f2fe', '#0284c7', '#0c4a6e', '#0e2f45', '#38bdf8', '#bae6fd'),
  dfdProcess: pair('#dcfce7', '#16a34a', '#14532d', '#123524', '#4ade80', '#dcfce7'),
  dfdDataStore: pair('#fef3c7', '#d97706', '#78350f', '#3d2a0e', '#fbbf24', '#fde68a'),
  dfdDataStoreAlt: pair('#fef3c7', '#d97706', '#78350f', '#3d2a0e', '#fbbf24', '#fde68a'),
  // -- Umum ----------------------------------------------------------------
  note: pair('#fefce8', '#eab308', '#422006', '#3b3312', '#facc15', '#fef9c3'),
  textBlock: pair('transparent', 'transparent', '#0f172a', 'transparent', 'transparent', '#e2e8f0'),
};

export function shapeStyle(shape: ShapeKey, data: NotaNodeData, mode: ColorMode): ShapeStyle {
  const base = SHAPE_STYLES[shape] ?? SHAPE_STYLES.bpmnTask!;
  const resolved = mode === 'dark' ? base.dark : base.light;
  return {
    fill: data.fill ?? resolved.fill,
    stroke: data.stroke ?? resolved.stroke,
    text: data.textColor ?? resolved.text,
  };
}

export function dashArray(style: StrokeStyle | undefined, width = 1): string | undefined {
  if (style === 'dashed') return `${5 * width} ${4 * width}`;
  if (style === 'dotted') return `${1.5 * width} ${3 * width}`;
  return undefined;
}

/** Palet warna untuk mengubah isi/garis node. */
export const NODE_COLORS: { name: string; value: string }[] = [
  { name: 'Putih', value: '#ffffff' },
  { name: 'Biru', value: '#dbeafe' },
  { name: 'Indigo', value: '#e0e7ff' },
  { name: 'Ungu', value: '#f3e8ff' },
  { name: 'Merah', value: '#fee2e2' },
  { name: 'Oranye', value: '#ffedd5' },
  { name: 'Kuning', value: '#fef3c7' },
  { name: 'Hijau', value: '#dcfce7' },
  { name: 'Teal', value: '#ccfbf1' },
  { name: 'Abu', value: '#f1f5f9' },
];

export const STROKE_COLORS: { name: string; value: string }[] = [
  { name: 'Tinta', value: '#0f172a' },
  { name: 'Abu', value: '#64748b' },
  { name: 'Slate', value: '#334155' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Hijau', value: '#16a34a' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Merah', value: '#dc2626' },
];
