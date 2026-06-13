import { nodes } from '@/lib/graph/nodes';
import { edges } from '@/lib/graph/edges';
import { theories } from '@/lib/data/theories';
import type { NodeCandidate, SourceCandidate } from './types';

const FICTION_KEYWORDS = [
  'cartoon', 'anime', 'manga', 'animated series', 'fictional character',
  'video game character', 'gaming character', 'movie character', 'tv show character',
  'meme', 'tiktok', 'instagram influencer', 'reality tv', 'pop star',
  'scooby', 'mickey', 'batman', 'superman', 'spider-man', 'avengers',
  'marvel comics', 'dc comics', 'disney character',
];

const SPAM_DOMAINS = [
  'blogspot', 'weebly.com', 'wix.com', 'freewebs', 'tripod.com',
  'angelfire.com', 'geocities', 'yolasite.com', 'sitew.com',
];

function edgeCountForNode(nodeId: string): number {
  return edges.filter(e => e.from === nodeId || e.to === nodeId).length;
}

function sourceCountForNode(nodeId: string): number {
  const theory = theories.find(t => t.id === nodeId);
  return theory?.sources?.length ?? 0;
}

export function runNodeRules(): NodeCandidate[] {
  const candidates: NodeCandidate[] = [];

  for (const node of nodes) {
    const flagReasons: string[] = [];
    const titleLower = node.title.toLowerCase();
    const descLower = node.description.toLowerCase();
    const tagsLower = node.tags.map(t => t.toLowerCase());

    for (const kw of FICTION_KEYWORDS) {
      if (titleLower.includes(kw) || descLower.includes(kw) || tagsLower.some(t => t.includes(kw))) {
        flagReasons.push(`Fiction/pop-culture keyword detected: "${kw}"`);
        break;
      }
    }

    if (node.confidence_score < 0.15) {
      flagReasons.push(`Extremely low confidence score: ${node.confidence_score}`);
    }

    const edgeCount = edgeCountForNode(node.id);
    if (edgeCount === 0) {
      flagReasons.push('Orphan node: no connections to any other nodes');
    }

    if (flagReasons.length > 0) {
      candidates.push({
        id: node.id,
        title: node.title,
        category: node.category,
        descriptionSummary: node.description.slice(0, 300),
        tags: node.tags,
        sourceCount: sourceCountForNode(node.id),
        relationshipCount: edgeCount,
        evidenceLevel: node.evidence_level,
        confidenceScore: node.confidence_score,
        flagReasons,
      });
    }
  }

  return candidates;
}

export function runSourceRules(): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];

  for (const theory of theories) {
    if (!theory.sources) continue;

    for (const source of theory.sources) {
      const flagReasons: string[] = [];

      if (!source.title || source.title.trim().length < 2) {
        flagReasons.push('Missing or extremely short source title');
      }

      if (!source.type) {
        flagReasons.push('Missing source type');
      }

      if (!source.author && !source.year && source.type !== 'ancient_text') {
        flagReasons.push('No author and no year (non-ancient text)');
      }

      if (source.url) {
        try {
          const hostname = new URL(source.url).hostname.toLowerCase();
          for (const spam of SPAM_DOMAINS) {
            if (hostname.includes(spam)) {
              flagReasons.push(`Low-quality domain detected: ${hostname}`);
              break;
            }
          }
        } catch {
          flagReasons.push('Malformed URL');
        }
      }

      if (flagReasons.length > 0) {
        let domain: string | undefined;
        if (source.url) {
          try { domain = new URL(source.url).hostname; } catch { /* skip */ }
        }

        candidates.push({
          id: `${theory.id}::${source.title ?? 'untitled'}`,
          title: source.title ?? 'Untitled',
          url: source.url,
          domain,
          sourceType: source.type,
          linkedNodeId: theory.id,
          linkedNodeTitle: theory.title,
          author: source.author,
          year: source.year,
          flagReasons,
        });
      }
    }
  }

  return candidates;
}
