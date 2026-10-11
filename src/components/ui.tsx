import { ChevronDown, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

export function Section({
  title,
  children,
  defaultOpen = true,
  icon,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 py-3 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {icon}
          {title}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10.5px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${inputClass} resize-y leading-relaxed ${mono ? 'font-mono text-[11px]' : ''}`}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (!Number.isNaN(next)) onChange(next);
      }}
      className={inputClass}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
  disabled?: boolean;
}) {
  const groups = options.reduce<Record<string, typeof options>>((acc, option) => {
    const key = option.group ?? '';
    acc[key] = [...(acc[key] ?? []), option];
    return acc;
  }, {});
  const hasGroups = Object.keys(groups).some((key) => key !== '');
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} appearance-none pr-7 disabled:opacity-50`}
      >
        {hasGroups
          ? Object.entries(groups).map(([group, items]) => (
              <optgroup key={group || 'lain'} label={group || 'Lainnya'}>
                {items.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-4.5 w-8 shrink-0 rounded-full transition ${checked ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      style={{ height: 18, width: 32 }}
    >
      <span
        className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 16 : 2, height: 14, width: 14 }}
      />
    </button>
  );
}

export function SwatchRow({
  colors,
  value,
  onChange,
  allowNone,
}: {
  colors: { name: string; value: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((color) => {
        const active = (value ?? '').toLowerCase() === color.value.toLowerCase();
        return (
          <button
            key={color.value}
            type="button"
            title={color.name}
            onClick={() => onChange(color.value)}
            className={`h-5 w-5 rounded-md border transition ${active ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:scale-110'}`}
            style={{ background: color.value, borderColor: 'rgba(15,23,42,0.15)' }}
          />
        );
      })}
      <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-600">
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-400">
          RGB
        </span>
        <input
          type="color"
          value={value ?? '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute -left-2 -top-2 h-10 w-10 cursor-pointer opacity-0"
        />
      </label>
      {allowNone ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="Pakai warna bawaan"
          className="flex h-5 items-center gap-1 rounded-md border border-slate-200 px-1.5 text-[10px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X size={10} /> Reset
        </button>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-3xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className={`w-full ${width} rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ count, level }: { count: number; level: 'error' | 'warning' | 'info' }) {
  if (!count) return null;
  const color =
    level === 'error'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
      : level === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
        : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>{count}</span>;
}
