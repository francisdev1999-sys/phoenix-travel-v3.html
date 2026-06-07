'use client';
import { SOURCE_TYPE_COLORS, STATUS_COLORS, CREDIBILITY_LABEL } from '@/lib/source-credibility';
import { SourceRecord } from '@/lib/source-types';
import { ExternalLink, Link2 } from 'lucide-react';

interface Props {
  source: SourceRecord;
  onClick?: () => void;
  compact?: boolean;
}

export default function SourceCard({ source, onClick, compact }: Props) {
  const typeColor  = SOURCE_TYPE_COLORS[source.sourceType]  ?? '#94a3b8';
  const statColor  = STATUS_COLORS[source.status]           ?? '#94a3b8';
  const credLabel  = CREDIBILITY_LABEL(source.credibilityScore);
  const credColor  = source.credibilityScore >= 0.75 ? '#22c55e'
                   : source.credibilityScore >= 0.5  ? '#eab308'
                   :                                   '#ef4444';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-purple-900/30 bg-white/5 p-3 transition-all ${
        onClick ? 'cursor-pointer hover:bg-white/10 hover:border-purple-500/40' : ''
      }`}
    >
      {/* Type + status row */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44` }}
        >
          {source.sourceType}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
          style={{ background: statColor + '22', color: statColor }}
        >
          {source.status.replace('_', ' ')}
        </span>
        {source.links && source.links.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
            <Link2 size={10} />
            {source.links.length} link{source.links.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">
        {source.title}
      </p>

      {!compact && (
        <>
          {/* Author / year */}
          <p className="text-xs text-slate-400 mb-2">
            {[source.author, source.publicationYear].filter(Boolean).join(' · ')}
            {source.journal && ` — ${source.journal}`}
          </p>

          {/* Credibility bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${source.credibilityScore * 100}%`, background: credColor }}
              />
            </div>
            <span className="text-[10px] font-medium" style={{ color: credColor }}>
              {credLabel} ({Math.round(source.credibilityScore * 100)}%)
            </span>
          </div>

          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 mt-2"
            >
              <ExternalLink size={10} />
              View source
            </a>
          )}
        </>
      )}
    </div>
  );
}
