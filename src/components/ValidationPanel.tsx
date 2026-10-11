import { useMemo } from 'react';
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { useDiagram } from '../store/useDiagram';
import { summarize, validateDiagram } from '../lib/validate';
import type { Issue } from '../types';

const LEVEL_STYLE: Record<Issue['level'], { icon: typeof Info; className: string; label: string }> = {
  error: { icon: CircleAlert, className: 'text-rose-500', label: 'Error' },
  warning: { icon: TriangleAlert, className: 'text-amber-500', label: 'Perhatian' },
  info: { icon: Info, className: 'text-sky-500', label: 'Saran' },
};

export function ValidationPanel({ onFocusNode }: { onFocusNode: (nodeId: string) => void }) {
  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  const kind = useDiagram((s) => s.kind);
  const show = useDiagram((s) => s.showValidation);
  const toggleValidation = useDiagram((s) => s.toggleValidation);
  const selectOnly = useDiagram((s) => s.selectOnly);

  const issues = useMemo(() => validateDiagram(nodes, edges, kind), [nodes, edges, kind]);
  const stats = summarize(issues);

  if (!show) return null;

  return (
    <div className="absolute right-4 top-4 z-20 w-[330px] max-w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">Pemeriksaan diagram</span>
        <button
          type="button"
          onClick={() => toggleValidation(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-slate-200 px-3 py-2 text-[11px] dark:border-slate-700">
        <span className="text-rose-500">{stats.error} error</span>
        <span className="text-amber-500">{stats.warning} perhatian</span>
        <span className="text-sky-500">{stats.info} saran</span>
      </div>

      <div className="max-h-[46vh] overflow-y-auto p-2">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={15} />
            Diagram sudah sesuai aturan dasar {kind.toUpperCase()}.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {issues.map((issue) => {
              const style = LEVEL_STYLE[issue.level];
              const Icon = style.icon;
              const clickable = !!issue.nodeId || !!issue.edgeId;
              return (
                <li key={issue.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => {
                      if (issue.nodeId) onFocusNode(issue.nodeId);
                      else if (issue.edgeId) selectOnly([], [issue.edgeId]);
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                      clickable ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : 'cursor-default'
                    }`}
                  >
                    <Icon size={14} className={`mt-0.5 shrink-0 ${style.className}`} />
                    <span>
                      <span className="block text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">{issue.message}</span>
                      {issue.hint ? (
                        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-slate-400">{issue.hint}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
