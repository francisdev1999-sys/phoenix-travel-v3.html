'use client';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  text: string;
}

export default function FieldHelp({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-slate-600 hover:text-slate-400 transition-colors focus:outline-none"
        aria-label="Field help"
      >
        <HelpCircle size={11} />
      </button>
      {open && (
        <div className="absolute left-5 top-0 z-50 w-60 p-2.5 rounded-lg bg-[#0f0f1a] border border-purple-900/40 shadow-xl shadow-black/60 pointer-events-none">
          <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-line">{text}</p>
        </div>
      )}
    </span>
  );
}
