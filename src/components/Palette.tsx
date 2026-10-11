import { useMemo, useState } from 'react';
import { Info, MousePointerClick, Search, Wand2, Zap } from 'lucide-react';
import { SHAPE_META, SHAPE_RENDERERS, defaultNodeData, shapesFor } from '../shapes';
import { shapeStyle } from '../lib/theme';
import { useRenderTheme } from '../lib/renderTheme';
import { useDiagram } from '../store/useDiagram';
import { SHAPE_DRAG_MIME } from '../lib/constants';
import { ARROW_LABELS, PATH_STYLE_LABELS, dataForEdgeKind, edgeKindDef, edgeKindsFor } from '../edges/kinds';
import { kindLabels } from '../lib/kindLabels';
import type { NotaNodeData, PathStyle, ShapeKey } from '../types';
import { SelectInput, Toggle } from './ui';

const PREVIEW_W = 52;
const PREVIEW_H = 34;

/** Pratinjau mini memakai renderer asli. */
function ShapePreview({ shape, dark }: { shape: ShapeKey; dark: boolean }) {
  const meta = SHAPE_META[shape];
  const data = useMemo<NotaNodeData>(() => ({ ...defaultNodeData(shape), label: '' }), [shape]);
  const style = shapeStyle(shape, data, dark ? 'dark' : 'light');
  const renderer = SHAPE_RENDERERS[shape];
  const w = meta.width;
  const h = meta.height;
  const scale = Math.min(1, PREVIEW_W / w, PREVIEW_H / h);
  return (
    <svg width={Math.max(8, w * scale)} height={Math.max(6, h * scale)} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {renderer({ w, h, data, style, selected: false, preview: true })}
    </svg>
  );
}

export function Palette() {
  const kind = useDiagram((s) => s.kind);
  const theme = useRenderTheme();
  const requestAddShape = useDiagram((s) => s.requestAddShape);
  const activeEdgeKind = useDiagram((s) => s.activeEdgeKind);
  const setActiveEdgeKind = useDiagram((s) => s.setActiveEdgeKind);
  const newEdgeStyle = useDiagram((s) => s.newEdgeStyle);
  const setNewEdgeStyle = useDiagram((s) => s.setNewEdgeStyle);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const all = shapesFor(kind);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all
      .map((group) => ({ ...group, items: group.items.filter((s) => SHAPE_META[s].label.toLowerCase().includes(q) || s.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [kind, query]);

  const edgeKinds = useMemo(() => edgeKindsFor(kind), [kind]);
  const activeDef = useMemo(() => dataForEdgeKind(activeEdgeKind, kind), [activeEdgeKind, kind]);
  const activeHint = useMemo(() => edgeKindDef(activeEdgeKind)?.hint, [activeEdgeKind]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 p-3 dark:border-slate-700">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari stensil..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <MousePointerClick size={13} className="mt-0.5 shrink-0" />
          Klik untuk menaruh di tengah kanvas, atau seret langsung ke posisi yang diinginkan.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.group} className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {group.group}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((shape) => {
                const meta = SHAPE_META[shape];
                return (
                  <button
                    key={shape}
                    type="button"
                    draggable
                    title={meta.label}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(SHAPE_DRAG_MIME, shape);
                      event.dataTransfer.setData('text/plain', shape);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => requestAddShape(shape)}
                    className="group flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500"
                  >
                    <span className="flex h-[38px] items-center justify-center">
                      <ShapePreview shape={shape} dark={theme.mode === 'dark'} />
                    </span>
                    <span className="text-[10.5px] font-medium leading-tight text-slate-600 group-hover:text-indigo-600 dark:text-slate-300 dark:group-hover:text-indigo-300">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada stensil yang cocok.</p>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <Wand2 size={12} /> Konektor baru
        </h3>
        <div className="space-y-2">
          <SelectInput
            value={activeEdgeKind}
            onChange={(value) => setActiveEdgeKind(value)}
            options={edgeKinds.map((def) => ({ value: def.id, label: def.label }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectInput
              value={newEdgeStyle.pathStyle ?? activeDef.pathStyle ?? 'smoothstep'}
              onChange={(value) => setNewEdgeStyle({ pathStyle: value as PathStyle })}
              options={(Object.keys(PATH_STYLE_LABELS) as PathStyle[]).map((key) => ({ value: key, label: PATH_STYLE_LABELS[key] }))}
            />
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-700">
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Zap size={11} /> Animasi
              </span>
              <Toggle checked={!!newEdgeStyle.animated} onChange={(next) => setNewEdgeStyle({ animated: next })} />
            </div>
          </div>
          {activeHint ? (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <Info size={12} className="mt-0.5 shrink-0" />
              {activeHint}
            </p>
          ) : null}
          <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <div className="font-medium text-slate-600 dark:text-slate-300">{kindLabels[kind]} · panah</div>
            <div className="mt-0.5">
              {ARROW_LABELS[activeDef.startArrow ?? 'none']} → {ARROW_LABELS[activeDef.endArrow ?? 'arrowFilled']}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
