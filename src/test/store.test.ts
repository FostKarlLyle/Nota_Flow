import { beforeEach, describe, expect, it } from 'vitest';
import { useDiagram } from '../store/useDiagram';
import { TEMPLATES } from '../lib/templates';
import { dataForEdgeKind } from '../edges/kinds';

const reset = () => useDiagram.getState().reset('bpmn');

describe('store diagram', () => {
  beforeEach(() => {
    reset();
  });

  it('menambah elemen di posisi tertentu', () => {
    const id = useDiagram.getState().addNodeAt('bpmnTask', { x: 40, y: 60 });
    const node = useDiagram.getState().nodes.find((n) => n.id === id);
    expect(node).toBeTruthy();
    expect(node!.position).toEqual({ x: 40, y: 60 });
    expect(node!.data.shape).toBe('bpmnTask');
  });

  it('membuat konektor dengan gaya default diagram', () => {
    const a = useDiagram.getState().addNodeAt('bpmnStart', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnEnd', { x: 300, y: 0 });
    useDiagram.getState().connect({ source: a, target: b, sourceHandle: 'right-s', targetHandle: 'left-t' });
    const edges = useDiagram.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.kind).toBe('bpmn.sequence');
    expect(edges[0].sourceHandle).toBe('right-s');
  });

  it('menolak konektor duplikat dan loop ke diri sendiri', () => {
    const a = useDiagram.getState().addNodeAt('bpmnTask', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnTask', { x: 300, y: 0 });
    const state = useDiagram.getState();
    state.connect({ source: a, target: b, sourceHandle: 'right-s', targetHandle: 'left-t' });
    expect(useDiagram.getState().isValidConnection({ source: a, target: b, sourceHandle: 'right-s', targetHandle: 'left-t' })).toBe(false);
    expect(useDiagram.getState().isValidConnection({ source: a, target: a, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(useDiagram.getState().edges).toHaveLength(1);
  });

  it('mendukung undo & redo', () => {
    const id = useDiagram.getState().addNodeAt('bpmnTask', { x: 10, y: 10 });
    expect(useDiagram.getState().nodes).toHaveLength(1);
    useDiagram.getState().undo();
    expect(useDiagram.getState().nodes).toHaveLength(0);
    useDiagram.getState().redo();
    expect(useDiagram.getState().nodes.map((n) => n.id)).toEqual([id]);
  });

  it('menghapus elemen sekaligus konektornya', () => {
    const a = useDiagram.getState().addNodeAt('bpmnTask', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnTask', { x: 200, y: 0 });
    useDiagram.getState().connect({ source: a, target: b, sourceHandle: null, targetHandle: null });
    useDiagram.getState().selectOnly([a]);
    useDiagram.getState().deleteSelected();
    expect(useDiagram.getState().nodes.map((n) => n.id)).toEqual([b]);
    expect(useDiagram.getState().edges).toHaveLength(0);
  });

  it('menyalin dan menempel elemen beserta konektornya', () => {
    const a = useDiagram.getState().addNodeAt('bpmnTask', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnTask', { x: 200, y: 0 });
    useDiagram.getState().connect({ source: a, target: b, sourceHandle: null, targetHandle: null });
    useDiagram.getState().selectOnly([a, b], useDiagram.getState().edges.map((e) => e.id));
    useDiagram.getState().copySelection();
    useDiagram.getState().pasteClipboard();
    const state = useDiagram.getState();
    expect(state.nodes).toHaveLength(4);
    expect(state.edges).toHaveLength(2);
    const pasted = state.nodes.filter((n) => n.position.x >= 40 && n.position.y >= 40);
    expect(pasted).toHaveLength(2);
  });

  it('menerapkan properti ke banyak elemen terpilih', () => {
    const a = useDiagram.getState().addNodeAt('bpmnTask', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnTask', { x: 200, y: 0 });
    useDiagram.getState().selectOnly([a, b]);
    useDiagram.getState().updateSelectedNodes({ fill: '#dcfce7' });
    expect(useDiagram.getState().nodes.every((n) => n.data.fill === '#dcfce7')).toBe(true);
  });

  it('memuat template dan dapat mengekspor dokumen', () => {
    const template = TEMPLATES.find((t) => t.id === 'bpmn-simple')!;
    useDiagram.getState().loadTemplate(template);
    const state = useDiagram.getState();
    expect(state.kind).toBe('bpmn');
    expect(state.nodes.length).toBeGreaterThan(5);
    expect(state.nodes.every((n) => n.type === 'nota')).toBe(true);
    expect(state.edges.every((e) => e.type === 'nota' && !!e.data?.kind)).toBe(true);
    const doc = state.toDocument();
    expect(doc.nodes.length).toBe(state.nodes.length);
    expect(doc.edges.length).toBe(state.edges.length);
    expect(doc.nodes.every((n) => !n.selected)).toBe(true);
  });

  it('memperbarui data konektor termasuk arah balik', () => {
    const a = useDiagram.getState().addNodeAt('bpmnTask', { x: 0, y: 0 });
    const b = useDiagram.getState().addNodeAt('bpmnTask', { x: 200, y: 0 });
    useDiagram.getState().connect({ source: a, target: b, sourceHandle: null, targetHandle: null });
    const edgeId = useDiagram.getState().edges[0].id;
    useDiagram.getState().updateEdgeData(edgeId, { label: 'cek stok', pathStyle: 'straight' }, 'now');
    expect(useDiagram.getState().edges[0].data?.label).toBe('cek stok');
    useDiagram.getState().reverseEdge(edgeId);
    expect(useDiagram.getState().edges[0].source).toBe(b);
    expect(useDiagram.getState().edges[0].target).toBe(a);
  });

  it('mengubah ukuran node mengikuti properti', () => {
    const id = useDiagram.getState().addNodeAt('bpmnPool', { x: 0, y: 0 });
    useDiagram.getState().updateNodeSize(id, { width: 900, height: 300 });
    const node = useDiagram.getState().nodes.find((n) => n.id === id)!;
    expect(node.width).toBe(900);
    expect(node.style?.width).toBe(900);
  });

  it('menyediakan jenis konektor bawaan untuk tiap diagram', () => {
    for (const kind of ['bpmn', 'usecase', 'activity', 'class', 'dfd'] as const) {
      useDiagram.getState().setKind(kind);
      const edge = dataForEdgeKind(useDiagram.getState().activeEdgeKind, kind);
      expect(edge.kind).toBeTruthy();
    }
  });
});
