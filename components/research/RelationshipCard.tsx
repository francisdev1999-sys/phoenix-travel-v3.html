import { GraphEdge, GraphNode, EVIDENCE_COLORS } from '@/lib/graph';
import ConfidenceMeter from './ConfidenceMeter';

const TYPE_LABELS: Record<string, string> = {
  historical: 'Historical',
  geographical: 'Geographical',
  textual: 'Textual',
  thematic: 'Thematic',
  influence: 'Influence',
  contradictory: 'Contradictory',
};

const TYPE_COLORS: Record<string, string> = {
  historical: '#a16207',
  geographical: '#06b6d4',
  textual: '#8b5cf6',
  thematic: '#6366f1',
  influence: '#22c55e',
  contradictory: '#ef4444',
};

interface Props {
  edge: GraphEdge;
  neighbor: GraphNode;
  direction?: 'from' | 'to';
}

export default function RelationshipCard({ edge, neighbor, direction }: Props) {
  const typeColor = TYPE_COLORS[edge.relationship_type] ?? '#64748b';
  const typeLabel = TYPE_LABELS[edge.relationship_type] ?? edge.relationship_type;
  const nodeColor = neighbor.color ?? '#7c3aed';

  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm"
          style={{ background: nodeColor + '25', border: `1px solid ${nodeColor}50` }}
        >
          {neighbor.icon ?? '◈'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white">{neighbor.title}</span>
            {direction && (
              <span className="text-xs text-slate-600">
                {direction === 'from' ? '← from' : '→ to'}
              </span>
            )}
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
            style={{ color: typeColor, borderColor: typeColor + '40', background: typeColor + '15' }}
          >
            {typeLabel}
          </span>
        </div>
        <div className="text-xs font-bold flex-shrink-0" style={{ color: EVIDENCE_COLORS.debated }}>
          ×{Math.round(edge.strength_score * 10) / 10}
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{edge.explanation}</p>

      <div className="p-2 rounded bg-black/20 border border-white/5">
        <div className="text-[10px] text-slate-600 mb-1 uppercase tracking-widest">Evidence Basis</div>
        <p className="text-xs text-slate-500 leading-relaxed">{edge.evidence_basis}</p>
      </div>

      <ConfidenceMeter score={edge.confidence_score} />
    </div>
  );
}
