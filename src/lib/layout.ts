import dagre from 'dagre';
import type { NotaEdge, NotaNode, ShapeKey } from '../types';
import { SHAPE_META } from '../shapes';

export type Direction = 'TB' | 'LR' | 'BT' | 'RL';

/** Bentuk yang tidak diikutkan dalam perhitungan auto-layout (wadah & anotasi). */
export const NON_FLOW_SHAPES: ShapeKey[] = [
  'bpmnPool',
  'bpmnLane',
  'bpmnGroup',
  'ucBoundary',
  'actPartition',
  'note',
  'textBlock',
];

export function isContainerShape(shape: ShapeKey): boolean {
  return (
    shape === 'bpmnPool' ||
    shape === 'bpmnLane' ||
    shape === 'ucBoundary' ||
    shape === 'actPartition' ||
    shape === 'bpmnGroup' ||
    shape === 'bpmnSubProcess'
  );
}

export function nodeSize(node: NotaNode): { width: number; height: number } {
  const measured = (node as { measured?: { width?: number; height?: number } }).measured;
  const meta = SHAPE_META[node.data.shape];
  const width = node.width ?? measured?.width ?? meta?.width ?? 120;
  const height = node.height ?? measured?.height ?? meta?.height ?? 60;
  return { width, height };
}

export interface LayoutOptions {
  direction?: Direction;
  nodeSep?: number;
  rankSep?: number;
  /** id node yang diikutkan; bila kosong semua node alur */
  onlyNodeIds?: string[];
}

export function layoutGraph(nodes: NotaNode[], edges: NotaEdge[], options: LayoutOptions = {}): NotaNode[] {
  const { direction = 'LR', nodeSep = 60, rankSep = 90 } = options;
  const include = new Set(
    options.onlyNodeIds ?? nodes.filter((n) => !NON_FLOW_SHAPES.includes(n.data.shape)).map((n) => n.id),
  );
  const flowNodes = nodes.filter((n) => include.has(n.id) && !NON_FLOW_SHAPES.includes(n.data.shape));
  if (flowNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep, marginx: 20, marginy: 20, ranker: 'network-simplex' });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of flowNodes) {
    const { width, height } = nodeSize(node);
    g.setNode(node.id, { width, height });
  }

  const seen = new Set<string>();
  for (const edge of edges) {
    if (!include.has(edge.source) || !include.has(edge.target)) continue;
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue;
    const key = `${edge.source}->${edge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    g.setEdge(edge.source, edge.target, {}, key);
  }

  dagre.layout(g);

  const positioned = new Map<string, { x: number; y: number }>();
  for (const id of g.nodes()) {
    const node = g.node(id) as { x: number; y: number; width: number; height: number };
    positioned.set(id, { x: Math.round(node.x - node.width / 2), y: Math.round(node.y - node.height / 2) });
  }

  return nodes.map((node) => {
    const pos = positioned.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}

type Side = 'top' | 'right' | 'bottom' | 'left';

/** Tentukan sisi handle terbaik untuk tiap konektor berdasarkan posisi relatif node. */
export function assignHandles(nodes: NotaNode[], edges: NotaEdge[]): NotaEdge[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((edge) => {
    const source = map.get(edge.source);
    const target = map.get(edge.target);
    if (!source || !target) return edge;
    const a = nodeSize(source);
    const b = nodeSize(target);
    const ax = source.position.x + a.width / 2;
    const ay = source.position.y + a.height / 2;
    const bx = target.position.x + b.width / 2;
    const by = target.position.y + b.height / 2;

    const { sourceSide, targetSide } = bestSides(ax, ay, bx, by, a, b);
    const sourceHandle = `${sourceSide}-s`;
    const targetHandle = `${targetSide}-t`;
    if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) return edge;
    return { ...edge, sourceHandle, targetHandle };
  });
}

export function bestSides(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  a: { width: number; height: number },
  b: { width: number; height: number },
): { sourceSide: Side; targetSide: Side } {
  const dx = bx - ax;
  const dy = by - ay;
  // bandingkan jarak tepi secara horizontal vs vertikal
  const gapX = Math.abs(dx) - (a.width + b.width) / 2;
  const gapY = Math.abs(dy) - (a.height + b.height) / 2;

  if (gapX >= gapY) {
    if (dx >= 0) return { sourceSide: 'right', targetSide: 'left' };
    return { sourceSide: 'left', targetSide: 'right' };
  }
  if (dy >= 0) return { sourceSide: 'bottom', targetSide: 'top' };
  return { sourceSide: 'top', targetSide: 'bottom' };
}

/* ------------------------------------------------------------ perataan --- */

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export function alignNodes(nodes: NotaNode[], mode: AlignMode): NotaNode[] {
  const selected = nodes.filter((n) => n.selected);
  if (selected.length < 2) return nodes;
  const boxes = selected.map((n) => ({ node: n, size: nodeSize(n) }));
  const minX = Math.min(...boxes.map((b) => b.node.position.x));
  const maxX = Math.max(...boxes.map((b) => b.node.position.x + b.size.width));
  const minY = Math.min(...boxes.map((b) => b.node.position.y));
  const maxY = Math.max(...boxes.map((b) => b.node.position.y + b.size.height));

  return nodes.map((node) => {
    const box = boxes.find((b) => b.node.id === node.id);
    if (!box) return node;
    const { width, height } = box.size;
    switch (mode) {
      case 'left':
        return { ...node, position: { ...node.position, x: minX } };
      case 'right':
        return { ...node, position: { ...node.position, x: maxX - width } };
      case 'center':
        return { ...node, position: { ...node.position, x: (minX + maxX) / 2 - width / 2 } };
      case 'top':
        return { ...node, position: { ...node.position, y: minY } };
      case 'bottom':
        return { ...node, position: { ...node.position, y: maxY - height } };
      case 'middle':
        return { ...node, position: { ...node.position, y: (minY + maxY) / 2 - height / 2 } };
      default:
        return node;
    }
  });
}

export function distributeNodes(nodes: NotaNode[], axis: 'horizontal' | 'vertical', gap = 40): NotaNode[] {
  const selected = nodes.filter((n) => n.selected);
  if (selected.length < 3) return nodes;
  const boxes = selected
    .map((n) => ({ node: n, size: nodeSize(n) }))
    .sort((a, b) =>
      axis === 'horizontal' ? a.node.position.x - b.node.position.x : a.node.position.y - b.node.position.y,
    );
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  const totalSize = boxes.reduce((sum, b) => sum + (axis === 'horizontal' ? b.size.width : b.size.height), 0);
  const span =
    axis === 'horizontal'
      ? last.node.position.x + last.size.width - first.node.position.x
      : last.node.position.y + last.size.height - first.node.position.y;
  const step = (span - totalSize) / Math.max(1, boxes.length - 1);

  let cursor = axis === 'horizontal' ? first.node.position.x : first.node.position.y;
  const positions = new Map<string, number>();
  for (const box of boxes) {
    positions.set(box.node.id, cursor);
    cursor += (axis === 'horizontal' ? box.size.width : box.size.height) + Math.max(step, gap * 0.2);
  }

  return nodes.map((node) => {
    const value = positions.get(node.id);
    if (value === undefined) return node;
    return axis === 'horizontal'
      ? { ...node, position: { ...node.position, x: Math.round(value) } }
      : { ...node, position: { ...node.position, y: Math.round(value) } };
  });
}
