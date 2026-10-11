import { useMemo } from 'react';
import {
  Copy,
  LayoutGrid,
  Move,
  Palette,
  Ruler,
  Settings2,
  Shapes,
  Trash2,
  Type,
} from 'lucide-react';
import { useDiagram } from '../store/useDiagram';
import { SHAPE_META, autoHeight, shapesFor } from '../shapes';
import { NODE_COLORS, STROKE_COLORS } from '../lib/theme';
import { ARROW_LABELS, PATH_STYLE_LABELS, STROKE_STYLE_LABELS, edgeKindsFor } from '../edges/kinds';
import { kindLabels } from '../lib/kindLabels';
import type { EdgeArrow, NotaEdge, NotaNode, PathStyle, ShapeKey, StrokeStyle, TriggerKind } from '../types';
import { Field, NumberInput, Section, SelectInput, SwatchRow, TextArea, TextInput, Toggle } from './ui';
import { nodeSize } from '../lib/layout';

const EVENT_SHAPES: ShapeKey[] = ['bpmnStart', 'bpmnEnd', 'bpmnIntermediateCatch', 'bpmnIntermediateThrow', 'bpmnBoundaryEvent'];

const TRIGGER_OPTIONS = [
  { value: 'none', label: 'Tanpa ikon' },
  { value: 'message', label: 'Pesan (message)' },
  { value: 'timer', label: 'Waktu (timer)' },
  { value: 'error', label: 'Error' },
  { value: 'signal', label: 'Sinyal' },
  { value: 'conditional', label: 'Kondisional' },
  { value: 'terminate', label: 'Terminate' },
  { value: 'escalation', label: 'Eskalasi' },
];

const CLASS_SHAPES: ShapeKey[] = ['clsClass', 'clsInterface', 'clsAbstract', 'clsEnum'];

export function Inspector() {
  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  const kind = useDiagram((s) => s.kind);

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const selectedEdges = useMemo(() => edges.filter((e) => e.selected), [edges]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Settings2 size={14} /> Properti
        </span>
        <span className="text-[10.5px] text-slate-400">
          {selectedNodes.length ? `${selectedNodes.length} elemen` : selectedEdges.length ? `${selectedEdges.length} konektor` : 'tidak ada pilihan'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-8">
        {selectedNodes.length === 1 && selectedEdges.length === 0 ? (
          <NodeEditor node={selectedNodes[0]} kind={kind} />
        ) : selectedNodes.length > 1 ? (
          <MultiEditor count={selectedNodes.length} />
        ) : selectedEdges.length >= 1 && selectedNodes.length === 0 ? (
          <EdgeEditor edge={selectedEdges[0]} kind={kind} count={selectedEdges.length} />
        ) : (
          <EmptyState kind={kind} />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- kosong -- */

function EmptyState({ kind }: { kind: string }) {
  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  return (
    <div className="space-y-4 pt-4 text-xs text-slate-500 dark:text-slate-400">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diagram aktif</div>
        <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100">
          {kindLabels[kind as keyof typeof kindLabels] ?? kind}
        </div>
        <div className="mt-1 flex gap-3 text-[11px]">
          <span>{nodes.length} elemen</span>
          <span>{edges.length} konektor</span>
        </div>
      </div>
      <div className="space-y-2 leading-relaxed">
        <p className="font-medium text-slate-600 dark:text-slate-300">Tips cepat</p>
        <ul className="space-y-1.5">
          <li>• Klik ganda elemen untuk mengubah teksnya langsung di kanvas.</li>
          <li>• Tarik dari titik di tepi elemen untuk membuat konektor.</li>
          <li>• Pilih beberapa elemen lalu pakai perataan di panel ini.</li>
          <li>• Tekan <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">L</kbd> untuk merapikan tata letak otomatis.</li>
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- node -- */

function NodeEditor({ node, kind }: { node: NotaNode; kind: Parameters<typeof shapesFor>[0] }) {
  const updateNodeData = useDiagram((s) => s.updateNodeData);
  const updateNodeSize = useDiagram((s) => s.updateNodeSize);
  const applyChanges = useDiagram((s) => s.onNodesChange);
  const duplicateSelected = useDiagram((s) => s.duplicateSelected);
  const deleteSelected = useDiagram((s) => s.deleteSelected);
  const data = node.data;
  const size = nodeSize(node);
  const meta = SHAPE_META[data.shape];

  const shapeOptions = useMemo(
    () =>
      shapesFor(kind).flatMap((group) =>
        group.items.map((shape) => ({ value: shape, label: SHAPE_META[shape].label, group: group.group })),
      ),
    [kind],
  );

  const setPosition = (patch: { x?: number; y?: number }) => {
    applyChanges([
      {
        id: node.id,
        type: 'position',
        position: { x: patch.x ?? node.position.x, y: patch.y ?? node.position.y },
        dragging: false,
      },
    ]);
    useDiagram.getState().commit();
  };

  const changeShape = (shape: ShapeKey) => {
    const newMeta = SHAPE_META[shape];
    updateNodeData(node.id, { shape }, 'none');
    updateNodeSize(node.id, { width: newMeta.width, height: newMeta.height });
    const next = autoHeight(shape, { ...data, shape }, newMeta.width);
    if (next) updateNodeSize(node.id, { width: newMeta.width, height: next });
    useDiagram.getState().commit();
  };

  return (
    <div>
      <div className="pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{meta?.label ?? data.shape}</span>
        </div>
      </div>

      <Section title="Isi" icon={<Type size={12} />}>
        <Field label="Teks / nama">
          <TextArea value={data.label ?? ''} rows={2} onChange={(value) => updateNodeData(node.id, { label: value }, 'soon')} />
        </Field>
        {EVENT_SHAPES.includes(data.shape) ? (
          <Field label="Ikon event" hint="Menentukan simbol di dalam lingkaran event BPMN.">
            <SelectInput
              value={(data.trigger as string) ?? 'none'}
              onChange={(value) => updateNodeData(node.id, { trigger: value as TriggerKind }, 'now')}
              options={TRIGGER_OPTIONS}
            />
          </Field>
        ) : null}
        {data.shape.startsWith('dfd') ? (
          <Field label="Nomor" hint="Misalnya 1.0 untuk proses atau D1 untuk data store.">
            <TextInput value={data.number ?? ''} onChange={(value) => updateNodeData(node.id, { number: value }, 'soon')} />
          </Field>
        ) : null}
        <Field label="Ubah bentuk">
          <SelectInput value={data.shape} onChange={(value) => changeShape(value as ShapeKey)} options={shapeOptions} />
        </Field>
      </Section>

      {CLASS_SHAPES.includes(data.shape) ? (
        <Section title="Detail class" icon={<LayoutGrid size={12} />}>
          <Field label="Stereotype" hint="Contoh: interface, abstract, entity, boundary, control.">
            <TextInput value={data.stereotype ?? ''} onChange={(value) => updateNodeData(node.id, { stereotype: value }, 'soon')} />
          </Field>
          <Field label="Atribut" hint="Satu atribut per baris, misalnya - nama: String">
            <TextArea
              mono
              rows={4}
              value={(data.attributes ?? []).join('\n')}
              onChange={(value) => updateNodeData(node.id, { attributes: value.split('\n') }, 'soon')}
            />
          </Field>
          {data.shape !== 'clsEnum' ? (
            <Field label="Metode" hint="Satu metode per baris, misalnya + hitung(): double">
              <TextArea
                mono
                rows={4}
                value={(data.methods ?? []).join('\n')}
                onChange={(value) => updateNodeData(node.id, { methods: value.split('\n') }, 'soon')}
              />
            </Field>
          ) : null}
        </Section>
      ) : null}

      <Section title="Warna & garis" icon={<Palette size={12} />}>
        <Field label="Warna isi">
          <SwatchRow colors={NODE_COLORS} value={data.fill} onChange={(value) => updateNodeData(node.id, { fill: value }, 'now')} allowNone />
        </Field>
        <Field label="Warna garis">
          <SwatchRow colors={STROKE_COLORS} value={data.stroke} onChange={(value) => updateNodeData(node.id, { stroke: value }, 'now')} allowNone />
        </Field>
        <Field label="Gaya garis">
          <SelectInput
            value={data.strokeStyle ?? 'solid'}
            onChange={(value) => updateNodeData(node.id, { strokeStyle: value as StrokeStyle }, 'now')}
            options={(Object.keys(STROKE_STYLE_LABELS) as StrokeStyle[]).map((key) => ({ value: key, label: STROKE_STYLE_LABELS[key] }))}
          />
        </Field>
        <Field label={`Ukuran teks: ${data.fontSize ?? 'bawaan'}`}>
          <input
            type="range"
            min={8}
            max={24}
            step={0.5}
            value={data.fontSize ?? 12.5}
            onChange={(event) => updateNodeData(node.id, { fontSize: Number(event.target.value) }, 'none')}
            onMouseUp={() => useDiagram.getState().commit()}
            className="w-full accent-indigo-500"
          />
        </Field>
      </Section>

      <Section title="Ukuran & posisi" icon={<Ruler size={12} />}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Lebar">
            <NumberInput
              value={size.width}
              min={16}
              onChange={(value) => {
                updateNodeSize(node.id, { width: value, height: size.height });
                useDiagram.getState().commit();
              }}
            />
          </Field>
          <Field label="Tinggi">
            <NumberInput
              value={size.height}
              min={12}
              onChange={(value) => {
                updateNodeSize(node.id, { width: size.width, height: value });
                useDiagram.getState().commit();
              }}
            />
          </Field>
          <Field label="X">
            <NumberInput value={node.position.x} onChange={(value) => setPosition({ x: value })} />
          </Field>
          <Field label="Y">
            <NumberInput value={node.position.y} onChange={(value) => setPosition({ y: value })} />
          </Field>
        </div>
      </Section>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={duplicateSelected}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Copy size={13} /> Duplikat
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-2 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <Trash2 size={13} /> Hapus
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- beberapa -- */

const ALIGNMENTS: { mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'; label: string }[] = [
  { mode: 'left', label: 'Kiri' },
  { mode: 'center', label: 'Tengah' },
  { mode: 'right', label: 'Kanan' },
  { mode: 'top', label: 'Atas' },
  { mode: 'middle', label: 'Tengah' },
  { mode: 'bottom', label: 'Bawah' },
];

function MultiEditor({ count }: { count: number }) {
  const alignSelected = useDiagram((s) => s.alignSelected);
  const distributeSelected = useDiagram((s) => s.distributeSelected);
  const updateSelectedNodes = useDiagram((s) => s.updateSelectedNodes);
  const deleteSelected = useDiagram((s) => s.deleteSelected);

  return (
    <div>
      <div className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {count} elemen dipilih
      </div>

      <Section title="Perataan" icon={<Move size={12} />}>
        <div className="grid grid-cols-3 gap-1.5">
          {ALIGNMENTS.map((item) => (
            <button
              key={`${item.mode}-${item.label}`}
              type="button"
              onClick={() => alignSelected(item.mode)}
              className="rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => distributeSelected('horizontal')}
            className="rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sebar horizontal
          </button>
          <button
            type="button"
            onClick={() => distributeSelected('vertical')}
            className="rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sebar vertikal
          </button>
        </div>
      </Section>

      <Section title="Warna semua elemen" icon={<Palette size={12} />}>
        <Field label="Warna isi">
          <SwatchRow colors={NODE_COLORS} value={undefined} onChange={(value) => updateSelectedNodes({ fill: value })} allowNone />
        </Field>
        <Field label="Warna garis">
          <SwatchRow colors={STROKE_COLORS} value={undefined} onChange={(value) => updateSelectedNodes({ stroke: value })} allowNone />
        </Field>
      </Section>

      <div className="pt-4">
        <button
          type="button"
          onClick={deleteSelected}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-2 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <Trash2 size={13} /> Hapus {count} elemen
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- edge -- */

function EdgeEditor({ edge, kind, count }: { edge: NotaEdge; kind: Parameters<typeof edgeKindsFor>[0]; count: number }) {
  const updateEdgeData = useDiagram((s) => s.updateEdgeData);
  const deleteSelected = useDiagram((s) => s.deleteSelected);
  const nodes = useDiagram((s) => s.nodes);
  const reverseEdge = useDiagram((s) => s.reverseEdge);
  const data = edge.data ?? { kind: 'gen.arrow' };

  const kindOptions = edgeKindsFor(kind).map((def) => ({ value: def.id, label: def.label }));
  const sourceLabel = nodes.find((n) => n.id === edge.source)?.data.label || SHAPE_META[nodes.find((n) => n.id === edge.source)?.data.shape ?? 'bpmnTask']?.label;
  const targetLabel = nodes.find((n) => n.id === edge.target)?.data.label || SHAPE_META[nodes.find((n) => n.id === edge.target)?.data.shape ?? 'bpmnTask']?.label;

  return (
    <div>
      <div className="pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Konektor{count > 1 ? ` (${count} terpilih)` : ''}
        </div>
        <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
          {sourceLabel} → {targetLabel}
        </div>
      </div>

      <Section title="Jenis & label" icon={<Shapes size={12} />}>
        <Field label="Jenis konektor">
          <SelectInput
            value={data.kind}
            onChange={(value) => {
              const def = edgeKindsFor(kind).find((item) => item.id === value);
              updateEdgeData(
                edge.id,
                {
                  kind: value,
                  startArrow: def?.startArrow ?? 'none',
                  endArrow: def?.endArrow ?? 'arrowFilled',
                  strokeStyle: def?.strokeStyle ?? 'solid',
                  pathStyle: def?.pathStyle ?? 'bezier',
                  label: (data.label ?? '').trim().length === 0 ? def?.defaultLabel ?? '' : data.label,
                },
                'now',
              );
            }}
            options={kindOptions}
          />
        </Field>
        <Field label="Label" hint="Bisa dikosongkan. Gunakan Enter untuk baris baru.">
          <TextArea value={data.label ?? ''} rows={2} onChange={(value) => updateEdgeData(edge.id, { label: value }, 'soon')} />
        </Field>
      </Section>

      <Section title="Bentuk garis" icon={<Move size={12} />}>
        <Field label="Rute">
          <SelectInput
            value={data.pathStyle ?? 'bezier'}
            onChange={(value) => updateEdgeData(edge.id, { pathStyle: value as PathStyle }, 'now')}
            options={(Object.keys(PATH_STYLE_LABELS) as PathStyle[]).map((key) => ({ value: key, label: PATH_STYLE_LABELS[key] }))}
          />
        </Field>
        <Field label="Gaya garis">
          <SelectInput
            value={data.strokeStyle ?? 'solid'}
            onChange={(value) => updateEdgeData(edge.id, { strokeStyle: value as StrokeStyle }, 'now')}
            options={(Object.keys(STROKE_STYLE_LABELS) as StrokeStyle[]).map((key) => ({ value: key, label: STROKE_STYLE_LABELS[key] }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ujung awal">
            <SelectInput
              value={data.startArrow ?? 'none'}
              onChange={(value) => updateEdgeData(edge.id, { startArrow: value as EdgeArrow }, 'now')}
              options={(Object.keys(ARROW_LABELS) as EdgeArrow[]).map((key) => ({ value: key, label: ARROW_LABELS[key] }))}
            />
          </Field>
          <Field label="Ujung akhir">
            <SelectInput
              value={data.endArrow ?? 'arrowFilled'}
              onChange={(value) => updateEdgeData(edge.id, { endArrow: value as EdgeArrow }, 'now')}
              options={(Object.keys(ARROW_LABELS) as EdgeArrow[]).map((key) => ({ value: key, label: ARROW_LABELS[key] }))}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Garis bergerak</span>
          <Toggle checked={!!data.animated} onChange={(next) => updateEdgeData(edge.id, { animated: next }, 'now')} />
        </div>
        <Field label="Warna garis">
          <SwatchRow colors={STROKE_COLORS} value={data.color} onChange={(value) => updateEdgeData(edge.id, { color: value }, 'now')} allowNone />
        </Field>
        <button
          type="button"
          onClick={() => reverseEdge(edge.id)}
          className="w-full rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Balik arah konektor
        </button>
      </Section>

      <div className="pt-4">
        <button
          type="button"
          onClick={deleteSelected}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-2 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <Trash2 size={13} /> Hapus konektor
        </button>
      </div>
    </div>
  );
}
