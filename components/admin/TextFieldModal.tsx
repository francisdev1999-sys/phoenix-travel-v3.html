'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';

interface Props {
  label:      string;
  value:      string;
  onSave:     (value: string) => void;
  onClose:    () => void;
  minLength?: number;
  hint?:      string;
}

export default function TextFieldModal({ label, value, onSave, onClose, minLength, hint }: Props) {
  const [text, setText] = useState(value);
  const ref             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(text.length, text.length);
  }, [text.length]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = !minLength || text.trim().length >= minLength;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-3 bg-slate-950 border border-purple-900/40 rounded-2xl shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wide">{label}</label>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors">
            <X size={14} />
          </button>
        </div>

        {hint && <p className="text-[10px] text-slate-500">{hint}</p>}

        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={14}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60 resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600">{text.length} chars{minLength ? ` (min ${minLength})` : ''}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { onSave(text); onClose(); }}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 transition-colors disabled:opacity-40"
            >
              <Save size={11} />Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
