import { ResearchSource } from '@/lib/graph';
import { ExternalLink } from 'lucide-react';
import ConfidenceMeter from './ConfidenceMeter';

const TYPE_COLORS: Record<string, string> = {
  'Academic Paper': '#6366f1',
  'Archaeological Report': '#a16207',
  'Historical Text': '#f59e0b',
  'Religious Text': '#dc2626',
  'Museum Archive': '#06b6d4',
  'Government Document': '#22c55e',
  'News Investigation': '#ec4899',
  'Folklore Collection': '#8b5cf6',
  'Book': '#64748b',
};

interface Props {
  source: ResearchSource;
}

export default function SourceCard({ source }: Props) {
  const color = TYPE_COLORS[source.source_type] ?? '#64748b';

  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
            style={{ color, borderColor: color + '40', background: color + '15' }}
          >
            {source.source_type}
          </span>
          <div className="text-sm font-medium text-slate-200 mt-1 leading-snug">
            &ldquo;{source.title}&rdquo;
          </div>
          {source.author && (
            <div className="text-xs text-slate-500 mt-0.5">
              {source.author}{source.publication_year ? ` · ${source.publication_year}` : ''}
            </div>
          )}
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-500 hover:text-purple-400 transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <ConfidenceMeter score={source.credibility_score} label="Credibility" />
      {source.notes && (
        <p className="text-xs text-slate-500 leading-relaxed border-t border-white/5 pt-2">{source.notes}</p>
      )}
    </div>
  );
}
