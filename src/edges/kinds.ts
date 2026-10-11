import type { DiagramKind, EdgeArrow, NotaEdgeData, PathStyle, StrokeStyle } from '../types';

export interface EdgeKindDef {
  id: string;
  label: string;
  kinds: DiagramKind[] | 'all';
  endArrow?: EdgeArrow;
  startArrow?: EdgeArrow;
  strokeStyle?: StrokeStyle;
  pathStyle?: PathStyle;
  defaultLabel?: string;
  hint?: string;
}

/**
 * Daftar jenis konektor. `id` dipakai sebagai nilai `data.kind`.
 * Nama mengikuti konvensi UML/BPMN/DFD.
 */
export const EDGE_KINDS: EdgeKindDef[] = [
  /* BPMN ------------------------------------------------------------------ */
  { id: 'bpmn.sequence', label: 'Sequence Flow', kinds: ['bpmn'], endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'smoothstep', hint: 'Urutan aktivitas di dalam satu pool' },
  { id: 'bpmn.conditional', label: 'Conditional Flow', kinds: ['bpmn'], endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'smoothstep', hint: 'Sequence flow dengan kondisi' },
  { id: 'bpmn.default', label: 'Default Flow', kinds: ['bpmn'], endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'smoothstep', hint: 'Jalur default dari gateway' },
  { id: 'bpmn.message', label: 'Message Flow', kinds: ['bpmn'], startArrow: 'dot', endArrow: 'arrow', strokeStyle: 'dashed', pathStyle: 'smoothstep', hint: 'Komunikasi antar pool' },
  { id: 'bpmn.association', label: 'Association', kinds: ['bpmn'], endArrow: 'none', strokeStyle: 'dotted', pathStyle: 'straight' },
  { id: 'bpmn.dataAssoc', label: 'Data Association', kinds: ['bpmn'], endArrow: 'arrow', strokeStyle: 'dotted', pathStyle: 'straight' },
  /* Use case -------------------------------------------------------------- */
  { id: 'uc.association', label: 'Asosiasi', kinds: ['usecase'], endArrow: 'none', strokeStyle: 'solid', pathStyle: 'straight', hint: 'Aktor berinteraksi dengan use case' },
  { id: 'uc.include', label: '«include»', kinds: ['usecase'], endArrow: 'arrow', strokeStyle: 'dashed', pathStyle: 'straight', defaultLabel: '«include»' },
  { id: 'uc.extend', label: '«extend»', kinds: ['usecase'], endArrow: 'arrow', strokeStyle: 'dashed', pathStyle: 'straight', defaultLabel: '«extend»' },
  { id: 'uc.generalization', label: 'Generalisasi', kinds: ['usecase'], endArrow: 'triangle', strokeStyle: 'solid', pathStyle: 'straight' },
  /* Activity -------------------------------------------------------------- */
  { id: 'act.control', label: 'Control Flow', kinds: ['activity'], endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'smoothstep' },
  { id: 'act.object', label: 'Object Flow', kinds: ['activity'], endArrow: 'arrow', strokeStyle: 'solid', pathStyle: 'smoothstep' },
  /* Class ----------------------------------------------------------------- */
  { id: 'cls.association', label: 'Asosiasi', kinds: ['class'], endArrow: 'none', strokeStyle: 'solid', pathStyle: 'straight' },
  { id: 'cls.directed', label: 'Asosiasi Berarah', kinds: ['class'], endArrow: 'arrow', strokeStyle: 'solid', pathStyle: 'straight' },
  { id: 'cls.aggregation', label: 'Agregasi', kinds: ['class'], startArrow: 'diamond', endArrow: 'none', strokeStyle: 'solid', pathStyle: 'straight', hint: '◁— bagian yang dapat berdiri sendiri' },
  { id: 'cls.composition', label: 'Komposisi', kinds: ['class'], startArrow: 'diamondFilled', endArrow: 'none', strokeStyle: 'solid', pathStyle: 'straight', hint: '◆— bagian yang tidak terpisahkan' },
  { id: 'cls.inheritance', label: 'Inheritance', kinds: ['class'], endArrow: 'triangle', strokeStyle: 'solid', pathStyle: 'straight' },
  { id: 'cls.realization', label: 'Realization', kinds: ['class'], endArrow: 'triangle', strokeStyle: 'dashed', pathStyle: 'straight' },
  { id: 'cls.dependency', label: 'Dependency', kinds: ['class'], endArrow: 'arrow', strokeStyle: 'dashed', pathStyle: 'straight' },
  /* DFD ------------------------------------------------------------------- */
  { id: 'dfd.flow', label: 'Aliran Data', kinds: ['dfd'], endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'smoothstep' },
  { id: 'dfd.flowOpen', label: 'Aliran Data (terbuka)', kinds: ['dfd'], endArrow: 'arrow', strokeStyle: 'solid', pathStyle: 'smoothstep' },
  { id: 'dfd.flowDashed', label: 'Aliran Data (putus-putus)', kinds: ['dfd'], endArrow: 'arrowFilled', strokeStyle: 'dashed', pathStyle: 'smoothstep' },
  /* Umum ------------------------------------------------------------------ */
  { id: 'gen.arrow', label: 'Panah', kinds: 'all', endArrow: 'arrowFilled', strokeStyle: 'solid', pathStyle: 'bezier' },
  { id: 'gen.line', label: 'Garis', kinds: 'all', endArrow: 'none', strokeStyle: 'solid', pathStyle: 'straight' },
  { id: 'gen.dashed', label: 'Garis Putus-putus', kinds: 'all', endArrow: 'none', strokeStyle: 'dashed', pathStyle: 'straight' },
  { id: 'gen.dotted', label: 'Garis Titik', kinds: 'all', endArrow: 'none', strokeStyle: 'dotted', pathStyle: 'straight' },
];

export function edgeKindDef(id: string | undefined): EdgeKindDef | undefined {
  if (!id) return undefined;
  return EDGE_KINDS.find((k) => k.id === id);
}

export function edgeKindsFor(kind: DiagramKind): EdgeKindDef[] {
  const specific = EDGE_KINDS.filter((k) => k.kinds !== 'all' && (k.kinds as DiagramKind[]).includes(kind));
  const generic = EDGE_KINDS.filter((k) => k.kinds === 'all');
  return [...specific, ...generic];
}

/** Jenis konektor pertama untuk sebuah diagram (dipakai saat menggambar koneksi baru). */
export function defaultEdgeKind(kind: DiagramKind): string {
  const map: Record<DiagramKind, string> = {
    bpmn: 'bpmn.sequence',
    usecase: 'uc.association',
    activity: 'act.control',
    class: 'cls.association',
    dfd: 'dfd.flow',
  };
  return map[kind];
}

export function dataForEdgeKind(id: string, kind: DiagramKind): NotaEdgeData {
  const def = edgeKindDef(id);
  const fallback = edgeKindDef(defaultEdgeKind(kind));
  const use = def && (def.kinds === 'all' || (def.kinds as DiagramKind[]).includes(kind)) ? def : fallback;
  return {
    kind: use?.id ?? 'gen.arrow',
    label: use?.defaultLabel ?? '',
    pathStyle: use?.pathStyle ?? 'bezier',
    strokeStyle: use?.strokeStyle ?? 'solid',
    startArrow: use?.startArrow ?? 'none',
    endArrow: use?.endArrow ?? 'arrowFilled',
    animated: false,
  };
}

export const PATH_STYLE_LABELS: Record<PathStyle, string> = {
  straight: 'Lurus',
  bezier: 'Kurva',
  smoothstep: 'Siku halus',
  step: 'Siku tajam',
};

export const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
  solid: 'Solid',
  dashed: 'Putus-putus',
  dotted: 'Titik-titik',
};

export const ARROW_LABELS: Record<EdgeArrow, string> = {
  none: 'Tanpa',
  arrow: 'Panah terbuka',
  arrowFilled: 'Panah solid',
  triangle: 'Segitiga kosong',
  diamond: 'Belah ketupat',
  diamondFilled: 'Belah ketupat solid',
  dot: 'Bulat',
  openDot: 'Bulat kosong',
};
