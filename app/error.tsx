'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="fixed inset-0 bg-[#000005] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white mb-1">Something went wrong</h1>
          <p className="text-xs text-slate-500">
            An unexpected error occurred. You can try refreshing — if it persists, the issue has been logged.
          </p>
          {error.digest && (
            <p className="text-[10px] text-slate-700 mt-2 font-mono">ref: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 transition-all mx-auto"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
