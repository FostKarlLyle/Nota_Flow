import { Keyboard, Lightbulb, MousePointer2 } from 'lucide-react';
import { Modal } from './ui';

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Klik ganda', description: 'Ubah teks elemen langsung di kanvas' },
  { keys: 'Seret titik tepi', description: 'Membuat konektor antar elemen' },
  { keys: 'Shift + klik', description: 'Memilih beberapa elemen' },
  { keys: 'Ctrl / ⌘ + A', description: 'Pilih semua elemen' },
  { keys: 'Ctrl / ⌘ + C lalu V', description: 'Menyalin dan menempel elemen' },
  { keys: 'Ctrl / ⌘ + D', description: 'Menduplikasi elemen terpilih' },
  { keys: 'Delete / Backspace', description: 'Menghapus elemen terpilih' },
  { keys: 'Ctrl / ⌘ + Z', description: 'Undo' },
  { keys: 'Ctrl / ⌘ + Shift + Z', description: 'Redo' },
  { keys: 'L', description: 'Rapikan tata letak otomatis (kiri → kanan)' },
  { keys: 'T', description: 'Rapikan tata letak otomatis (atas → bawah)' },
  { keys: 'H', description: 'Sesuaikan tampilan ke seluruh diagram' },
  { keys: 'Ctrl / ⌘ + S', description: 'Unduh diagram sebagai berkas JSON' },
  { keys: 'G', description: 'Tampilkan / sembunyikan grid' },
];

const TIPS: { title: string; body: string }[] = [
  {
    title: 'BPMN',
    body: 'Gunakan Start/End Event, Task, dan Gateway. Alur antar pool memakai Message Flow (putus-putus), sedangkan alur di dalam pool memakai Sequence Flow.',
  },
  {
    title: 'Use Case',
    body: 'Letakkan aktor di luar System Boundary dan use case di dalamnya. Relasi «include» dipakai untuk langkah wajib, «extend» untuk fitur tambahan.',
  },
  {
    title: 'Activity',
    body: 'Selalu mulai dari Initial Node (lingkaran penuh) dan akhiri dengan Activity Final. Pakai Fork/Join untuk proses paralel dan Decision untuk percabangan.',
  },
  {
    title: 'Class Diagram',
    body: 'Isi atribut dan metode lewat panel Properti (satu baris per item). Pakai relasi Inheritance untuk "adalah", Composition untuk "memiliki dan menyatu".',
  },
  {
    title: 'DFD',
    body: 'Keseimbangan aliran: apa yang masuk ke sebuah proses harus ada keluarannya. Entitas eksternal tidak boleh terhubung langsung ke data store.',
  },
];

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Panduan & pintasan" width="max-w-2xl">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <MousePointer2 size={14} className="text-indigo-500" /> Cara pakai singkat
          </h3>
          <ol className="space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <li>1. Pilih jenis diagram di toolbar, lalu pilih template atau mulai dari kanvas kosong.</li>
            <li>2. Seret bentuk dari panel kiri ke kanvas.</li>
            <li>3. Tarik dari titik di tepi elemen ke elemen lain untuk menyambung.</li>
            <li>4. Atur teks, warna, dan detail lain di panel Properti (kanan).</li>
            <li>5. Cek aturan diagram lewat tombol Validasi, lalu ekspor PNG/SVG/JSON.</li>
          </ol>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Keyboard size={14} className="text-indigo-500" /> Pintasan
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {SHORTCUTS.map((item) => (
              <div key={item.keys} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  {item.keys}
                </kbd>
                <span className="text-right text-[11px] text-slate-500 dark:text-slate-400">{item.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Lightbulb size={14} className="text-indigo-500" /> Catatan notasi
          </h3>
          <div className="space-y-2">
            {TIPS.map((tip) => (
              <div key={tip.title} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{tip.title}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
