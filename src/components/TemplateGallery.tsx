import { useMemo, useState } from 'react';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { useDiagram } from '../store/useDiagram';
import { TEMPLATES, templatesFor } from '../lib/templates';
import { kindDescriptions, kindLabels, kindOrder, kindShortLabels } from '../lib/kindLabels';
import { buildScene } from '../lib/exporter';
import type { DiagramKind, DiagramTemplate } from '../types';

const thumbCache = new Map<string, string>();

function templateThumb(template: DiagramTemplate): string {
  const cached = thumbCache.get(template.id);
  if (cached) return cached;
  const { nodes, edges } = template.build();
  const scene = buildScene(nodes, edges, { padding: 18, background: 'white' });
  thumbCache.set(template.id, scene.svg);
  return scene.svg;
}

function Thumb({ template }: { template: DiagramTemplate }) {
  const svg = useMemo(() => templateThumb(template), [template]);
  return (
    <div
      className="nota-thumb h-32 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function TemplateGallery({ empty, onClose }: { empty?: boolean; onClose?: () => void }) {
  const kind = useDiagram((s) => s.kind);
  const loadTemplate = useDiagram((s) => s.loadTemplate);
  const [tab, setTab] = useState<DiagramKind>(kind);

  const items = empty ? templatesFor(kind) : TEMPLATES.filter((t) => t.kind === tab);

  const apply = (template: DiagramTemplate) => {
    loadTemplate(template);
    onClose?.();
  };

  if (empty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-4 text-center">
          <h2 className="flex items-center justify-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
            <Sparkles size={16} className="text-indigo-500" />
            Mulai dari template {kindLabels[kind]}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pilih template siap pakai, atau seret bentuk dari panel kiri ke kanvas kosong ini.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => apply(template)}
              className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:hover:border-indigo-500"
            >
              <Thumb template={template} />
              <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 dark:text-slate-100">
                {template.name.replace(/^\S+\s—\s/, '')}
              </span>
              <span className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{template.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {kindOrder.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === item
                ? 'bg-indigo-500 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {kindShortLabels[item]}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">{kindDescriptions[tab]}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada template untuk jenis ini.</p>
        ) : null}
        {items.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => apply(template)}
            className="group flex gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:hover:border-indigo-500"
          >
            <div className="w-40 shrink-0">
              <Thumb template={template} />
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 group-hover:text-indigo-600 dark:text-slate-100">
                <LayoutTemplate size={13} className="text-indigo-500" />
                {template.name}
              </span>
              <span className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{template.description}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">{kindLabels[template.kind]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
