import { create } from 'zustand';
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import type { DiagramDoc, DiagramKind, DiagramTemplate, NotaEdge, NotaEdgeData, NotaNode, PathStyle, ShapeKey } from '../types';
import { SHAPE_META, autoHeight, defaultNodeData } from '../shapes';
import { dataForEdgeKind, defaultEdgeKind } from '../edges/kinds';
import { assignHandles, alignNodes, distributeNodes, isContainerShape, layoutGraph, type AlignMode, type Direction } from '../lib/layout';
import type { ColorMode } from '../lib/theme';

export interface Snapshot {
  nodes: NotaNode[];
  edges: NotaEdge[];
}

interface ToastMsg {
  id: number;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Bersihkan properti sementara sebelum disimpan ke riwayat / file. */
function cleanNode(node: NotaNode): NotaNode {
  const { selected, dragging, ...rest } = node as NotaNode & { dragging?: boolean };
  return { ...rest, selected: false } as NotaNode;
}

function snapshotOf(nodes: NotaNode[], edges: NotaEdge[]): Snapshot {
  return {
    nodes: nodes.map(cleanNode),
    edges: edges.map((e) => ({ ...e, selected: false })),
  };
}

const MAX_HISTORY = 80;

interface DiagramState {
  kind: DiagramKind;
  name: string;
  nodes: NotaNode[];
  edges: NotaEdge[];
  activeEdgeKind: string;
  newEdgeStyle: { pathStyle?: PathStyle; animated?: boolean };
  theme: ColorMode;
  showGrid: boolean;
  snapToGrid: boolean;
  past: Snapshot[];
  future: Snapshot[];
  pendingShape: ShapeKey | null;
  clipboard: Snapshot | null;
  toasts: ToastMsg[];
  editingNodeId: string | null;
  viewVersion: number;
  showValidation: boolean;

  onNodesChange: (changes: NodeChange<NotaNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<NotaEdge>[]) => void;
  onNodesDelete: (nodes: NotaNode[]) => void;
  onEdgesDelete: (edges: NotaEdge[]) => void;
  connect: (connection: Connection) => void;
  isValidConnection: (connection: Connection | NotaEdge) => boolean;

  setEditingNodeId: (id: string | null) => void;
  toggleValidation: (next?: boolean) => void;
  requestAddShape: (shape: ShapeKey) => void;
  clearPendingShape: () => void;
  addNodeAt: (shape: ShapeKey, position: { x: number; y: number }, options?: { select?: boolean }) => string;

  updateNodeData: (id: string, patch: Partial<NotaNode['data']>, commitMode?: 'soon' | 'now' | 'none') => void;
  updateNodeSize: (id: string, size: { width: number; height: number }) => void;
  updateEdgeData: (id: string, patch: Partial<NotaEdge['data']>, commitMode?: 'soon' | 'now' | 'none') => void;
  updateSelectedNodes: (patch: Partial<NotaNode['data']>) => void;
  reverseEdge: (id: string) => void;

  setActiveEdgeKind: (kind: string) => void;
  setNewEdgeStyle: (patch: { pathStyle?: PathStyle; animated?: boolean }) => void;
  setKind: (kind: DiagramKind) => void;
  setName: (name: string) => void;
  setTheme: (theme: ColorMode) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  selectOnly: (nodeIds: string[], edgeIds?: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;

  autoLayout: (direction?: Direction) => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;

  commit: () => void;
  commitSoon: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadTemplate: (template: DiagramTemplate) => void;
  loadDoc: (doc: Partial<DiagramDoc> & { nodes: NotaNode[]; edges: NotaEdge[] }) => void;
  reset: (kind?: DiagramKind) => void;
  toDocument: () => DiagramDoc;

  toast: (message: string, level?: ToastMsg['level']) => void;
  dismissToast: (id: number) => void;
}

function normalizeNodes(nodes: NotaNode[]): NotaNode[] {
  return nodes.map((node) => {
    const shape = node.data?.shape ?? 'bpmnTask';
    const data = { ...defaultNodeData(shape), ...node.data, shape };
    const zIndex = isContainerShape(shape) ? 0 : 1;
    return { ...node, data, zIndex: node.zIndex ?? zIndex } as NotaNode;
  });
}

function normalizeEdges(edges: NotaEdge[], kind: DiagramKind): NotaEdge[] {
  return edges.map((edge) => {
    const data = edge.data ?? dataForEdgeKind(defaultEdgeKind(kind), kind);
    const withDefaults = {
      ...dataForEdgeKind((data.kind as string) ?? defaultEdgeKind(kind), kind),
      ...data,
    } as NotaEdgeData;
    return { ...edge, type: 'nota', data: withDefaults } as NotaEdge;
  });
}

export const useDiagram = create<DiagramState>((set, get) => {
  let commitTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCommitted = JSON.stringify(snapshotOf([], []));

  const flushTimer = () => {
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
  };

  const doCommit = () => {
    flushTimer();
    const { nodes, edges, past } = get();
    const current = JSON.stringify(snapshotOf(nodes, edges));
    if (current === lastCommitted) return;
    let previous: Snapshot;
    try {
      previous = JSON.parse(lastCommitted) as Snapshot;
    } catch {
      previous = { nodes: [], edges: [] };
    }
    const nextPast = [...past, previous].slice(-MAX_HISTORY);
    lastCommitted = current;
    set({ past: nextPast, future: [] });
  };

  const syncBaseline = () => {
    lastCommitted = JSON.stringify(snapshotOf(get().nodes, get().edges));
  };

  return {
    kind: 'bpmn',
    name: 'Diagram Baru',
    nodes: [],
    edges: [],
    activeEdgeKind: defaultEdgeKind('bpmn'),
    newEdgeStyle: { animated: false },
    theme: 'light',
    showGrid: true,
    snapToGrid: false,
    past: [],
    future: [],
    pendingShape: null,
    clipboard: null,
    toasts: [],
    editingNodeId: null,
    viewVersion: 0,
    showValidation: false,

    /* --------------------------------------------------------- perubahan -- */
    onNodesChange: (changes) => {
      const state = get();
      let next = applyNodeChanges(changes, state.nodes) as NotaNode[];
      const dragEnded = changes.some((c) => c.type === 'position' && c.dragging === false);
      const dimensionChanged = changes.some((c) => c.type === 'dimensions');
      if (dimensionChanged) {
        next = next.map((node) => {
          const shape = node.data.shape;
          const min = autoHeight(shape, node.data, node.measured?.width ?? node.width ?? 200);
          if (min && (node.height ?? 0) < min) {
            return { ...node, height: min, style: { ...node.style, height: min } };
          }
          return node;
        });
      }
      set({ nodes: next });
      if (dragEnded) {
        const edges = assignHandles(get().nodes, get().edges);
        set({ edges });
        doCommit();
      }
    },

    onEdgesChange: (changes) => {
      const next = applyEdgeChanges(changes, get().edges) as NotaEdge[];
      set({ edges: next });
      if (changes.some((c) => c.type === 'remove' || c.type === 'add')) doCommit();
    },

    onNodesDelete: (deleted) => {
      const ids = new Set(deleted.map((n) => n.id));
      set({ edges: get().edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)) });
      doCommit();
    },

    onEdgesDelete: () => {
      doCommit();
    },

    connect: (connection) => {
      const { nodes, edges, activeEdgeKind, kind } = get();
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const data = { ...dataForEdgeKind(activeEdgeKind, kind), ...get().newEdgeStyle };
      const edge: NotaEdge = {
        id: newId('e'),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'nota',
        data,
        selected: true,
      };
      const deselectedNodes = nodes.map((n) => (n.selected ? { ...n, selected: false } : n));
      const deselectedEdges = edges.map((e) => (e.selected ? { ...e, selected: false } : e));
      const next = addEdge(edge, deselectedEdges) as NotaEdge[];
      set({ nodes: deselectedNodes, edges: assignHandles(deselectedNodes, next) });
      doCommit();
    },

    isValidConnection: (connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return false;
      const exists = get().edges.some(
        (e) =>
          e.source === source &&
          e.target === target &&
          (e.sourceHandle ?? null) === ((connection as NotaEdge).sourceHandle ?? null) &&
          (e.targetHandle ?? null) === ((connection as NotaEdge).targetHandle ?? null),
      );
      return !exists;
    },

    setEditingNodeId: (id) => set({ editingNodeId: id }),
    toggleValidation: (next) => set({ showValidation: next ?? !get().showValidation }),

    /* ------------------------------------------------------------- node -- */
    requestAddShape: (shape) => set({ pendingShape: shape }),
    clearPendingShape: () => set({ pendingShape: null }),

    addNodeAt: (shape, position, options) => {
      const meta = SHAPE_META[shape];
      const id = newId('n');
      // jaga-jaga: koordinat NaN/Infinity bisa muncul sebelum kanvas terukur
      const x = Number.isFinite(position.x) ? Math.round(position.x) : 0;
      const y = Number.isFinite(position.y) ? Math.round(position.y) : 0;
      const node: NotaNode = {
        id,
        type: 'nota',
        position: { x, y },
        width: meta?.width ?? 140,
        height: meta?.height ?? 70,
        style: { width: meta?.width ?? 140, height: meta?.height ?? 70 },
        data: defaultNodeData(shape),
        zIndex: isContainerShape(shape) ? 0 : 1,
        selected: options?.select ?? true,
      };
      const nodes = get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n));
      set({ nodes: [...nodes, node], pendingShape: null });
      if (shape === 'clsClass' || shape === 'clsInterface' || shape === 'clsAbstract' || shape === 'clsEnum') {
        const height = autoHeight(shape, node.data, meta?.width ?? 200);
        if (height) {
          set({
            nodes: get().nodes.map((n) =>
              n.id === id ? { ...n, height, style: { ...n.style, height } } : n,
            ),
          });
        }
      }
      doCommit();
      return id;
    },

    updateNodeData: (id, patch, commitMode = 'soon') => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id !== id) return node;
          const data = { ...node.data, ...patch };
          const height = autoHeight(data.shape, data, node.measured?.width ?? node.width ?? 200) ?? undefined;
          if (height && node.height && height > node.height) {
            return { ...node, data, height, style: { ...node.style, height } };
          }
          return { ...node, data };
        }),
      });
      if (commitMode === 'now') doCommit();
      else if (commitMode === 'soon') get().commitSoon();
    },

    updateNodeSize: (id, size) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, width: size.width, height: size.height, style: { ...node.style, width: size.width, height: size.height } } : node,
        ),
      });
    },

    updateEdgeData: (id, patch, commitMode = 'soon') => {
      set({
        edges: get().edges.map((edge) =>
          edge.id === id
            ? ({ ...edge, data: { ...(edge.data ?? { kind: 'gen.arrow' }), ...patch } } as NotaEdge)
            : edge,
        ),
      });
      if (commitMode === 'now') doCommit();
      else if (commitMode === 'soon') get().commitSoon();
    },

    updateSelectedNodes: (patch) => {
      set({
        nodes: get().nodes.map((node) => (node.selected ? { ...node, data: { ...node.data, ...patch } } : node)),
      });
      get().commitSoon();
    },

    reverseEdge: (id) => {
      set({
        edges: get().edges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                source: edge.target,
                target: edge.source,
                sourceHandle: edge.targetHandle,
                targetHandle: edge.sourceHandle,
              }
            : edge,
        ),
      });
      doCommit();
    },

    /* ---------------------------------------------------------- pengaturan */
    setActiveEdgeKind: (kind) => set({ activeEdgeKind: kind }),
    setNewEdgeStyle: (patch) => set({ newEdgeStyle: { ...get().newEdgeStyle, ...patch } }),
    setKind: (kind) => set({ kind }),
    setName: (name) => set({ name }),
    setTheme: (theme) => set({ theme }),
    toggleGrid: () => set({ showGrid: !get().showGrid }),
    toggleSnap: () => set({ snapToGrid: !get().snapToGrid }),

    /* -------------------------------------------------------------- pilih - */
    selectOnly: (nodeIds, edgeIds = []) => {
      const nodeSet = new Set(nodeIds);
      const edgeSet = new Set(edgeIds);
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: nodeSet.has(n.id) })),
        edges: get().edges.map((e) => ({ ...e, selected: edgeSet.has(e.id) })),
      });
    },

    selectAll: () => {
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: true })),
        edges: get().edges.map((e) => ({ ...e, selected: true })),
      });
    },

    clearSelection: () => {
      set({
        nodes: get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
        edges: get().edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      });
    },

    deleteSelected: () => {
      const { nodes, edges } = get();
      const removed = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      const nextNodes = nodes.filter((n) => !n.selected);
      const nextEdges = edges.filter(
        (e) => !e.selected && !removed.has(e.source) && !removed.has(e.target),
      );
      if (nextNodes.length === nodes.length && nextEdges.length === edges.length) return;
      set({ nodes: nextNodes, edges: nextEdges });
      doCommit();
    },

    duplicateSelected: () => {
      const { nodes, edges } = get();
      const selected = nodes.filter((n) => n.selected);
      if (!selected.length) return;
      const idMap = new Map<string, string>();
      const clones = selected.map((node) => {
        const id = newId('n');
        idMap.set(node.id, id);
        return {
          ...cleanNode(node),
          id,
          position: { x: node.position.x + 32, y: node.position.y + 32 },
          selected: true,
        } as NotaNode;
      });
      const clonedEdges = edges
        .filter((e) => e.selected && idMap.has(e.source) && idMap.has(e.target))
        .map((edge) => ({
          ...edge,
          id: newId('e'),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
          selected: false,
        }));
      set({
        nodes: [...nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...clones],
        edges: [...edges.map((e) => (e.selected ? { ...e, selected: false } : e)), ...clonedEdges],
      });
      doCommit();
    },

    copySelection: () => {
      const { nodes, edges } = get();
      const selected = nodes.filter((n) => n.selected);
      if (!selected.length) return;
      const ids = new Set(selected.map((n) => n.id));
      set({
        clipboard: snapshotOf(selected, edges.filter((e) => ids.has(e.source) && ids.has(e.target))),
      });
      get().toast(`${selected.length} elemen disalin`, 'info');
    },

    pasteClipboard: () => {
      const clip = get().clipboard;
      if (!clip || !clip.nodes.length) return;
      const idMap = new Map<string, string>();
      const nodes = clip.nodes.map((node) => {
        const id = newId('n');
        idMap.set(node.id, id);
        return { ...cleanNode(node), id, position: { x: node.position.x + 40, y: node.position.y + 40 }, selected: true } as NotaNode;
      });
      const edges = clip.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((edge) => ({
          ...edge,
          id: newId('e'),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
          selected: false,
        }));
      set({
        nodes: [...get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...nodes],
        edges: [...get().edges.map((e) => (e.selected ? { ...e, selected: false } : e)), ...edges],
      });
      doCommit();
    },

    /* ------------------------------------------------------------ tata letak */
    autoLayout: (direction = 'LR') => {
      const { nodes, edges } = get();
      const laidOut = layoutGraph(nodes, edges, { direction });
      const withHandles = assignHandles(laidOut, edges);
      set({ nodes: laidOut, edges: withHandles });
      doCommit();
    },

    alignSelected: (mode) => {
      set({ nodes: alignNodes(get().nodes, mode) });
      doCommit();
    },

    distributeSelected: (axis) => {
      set({ nodes: distributeNodes(get().nodes, axis) });
      doCommit();
    },

    /* --------------------------------------------------------------- undo - */
    commit: doCommit,
    commitSoon: () => {
      flushTimer();
      commitTimer = setTimeout(() => {
        commitTimer = null;
        doCommit();
      }, 500);
    },

    undo: () => {
      const { past, future, nodes, edges } = get();
      if (!past.length) return;
      flushTimer();
      const previous = past[past.length - 1];
      const current = snapshotOf(nodes, edges);
      set({
        nodes: previous.nodes,
        edges: previous.edges,
        past: past.slice(0, -1),
        future: [current, ...future].slice(0, MAX_HISTORY),
      });
      syncBaseline();
    },

    redo: () => {
      const { past, future, nodes, edges } = get();
      if (!future.length) return;
      flushTimer();
      const next = future[0];
      const current = snapshotOf(nodes, edges);
      set({
        nodes: next.nodes,
        edges: next.edges,
        future: future.slice(1),
        past: [...past, current].slice(-MAX_HISTORY),
      });
      syncBaseline();
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    /* ----------------------------------------------------------- dokumen -- */
    loadTemplate: (template) => {
      flushTimer();
      const { nodes, edges } = template.build();
      const normalizedNodes = normalizeNodes(nodes);
      const normalizedEdges = normalizeEdges(edges, template.kind);
      set({
        kind: template.kind,
        name: template.name,
        nodes: normalizedNodes,
        edges: assignHandles(normalizedNodes, normalizedEdges),
        past: [],
        future: [],
        activeEdgeKind: defaultEdgeKind(template.kind),
        viewVersion: get().viewVersion + 1,
      });
      syncBaseline();
    },

    loadDoc: (doc) => {
      flushTimer();
      const kind = doc.kind ?? get().kind;
      const normalizedNodes = normalizeNodes(doc.nodes ?? []);
      const normalizedEdges = normalizeEdges(doc.edges ?? [], kind);
      set({
        kind,
        name: doc.name ?? 'Diagram',
        nodes: normalizedNodes,
        edges: assignHandles(normalizedNodes, normalizedEdges),
        past: [],
        future: [],
        activeEdgeKind: defaultEdgeKind(kind),
        viewVersion: get().viewVersion + 1,
      });
      syncBaseline();
    },

    reset: (kind) => {
      const nextKind = kind ?? get().kind;
      set({
        kind: nextKind,
        nodes: [],
        edges: [],
        past: [],
        future: [],
        name: 'Diagram Baru',
        activeEdgeKind: defaultEdgeKind(nextKind),
        viewVersion: get().viewVersion + 1,
      });
      syncBaseline();
    },

    toDocument: () => {
      const { nodes, edges, kind, name } = get();
      return {
        id: 'doc',
        name,
        kind,
        nodes: nodes.map(cleanNode),
        edges: edges.map((e) => ({ ...e, selected: false })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },

    /* -------------------------------------------------------------- toast - */
    toast: (message, level = 'info') => {
      const id = Date.now() + Math.random();
      set({ toasts: [...get().toasts, { id, message, level }] });
      setTimeout(() => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, 3200);
    },

    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  };
});
