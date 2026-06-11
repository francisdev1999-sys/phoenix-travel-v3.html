/**
 * Nexus Archive — Galaxy Taxonomy
 *
 * 8 top-level Galaxies that group all 28 research Categories.
 * Galaxy → Category (Cluster) → Node is the navigation hierarchy.
 *
 * Single source of truth used by:
 *   - prisma/seed.ts (DB seeding)
 *   - /api/galaxies (API responses)
 *   - GalaxyView, ClusterView (UI rendering)
 */

export interface GalaxyDef {
  slug:        string;
  name:        string;
  description: string;
  icon:        string;   // lucide-react icon name
  color:       string;   // hex accent color
  order:       number;
  categories:  string[]; // Category.name values that belong to this galaxy
}

export const GALAXIES: GalaxyDef[] = [
  {
    slug:        'ancient-knowledge',
    name:        'Ancient Knowledge',
    description: 'Lost civilizations, archaeological mysteries, ancient sites, texts, and technologies that challenge or expand our understanding of the ancient world.',
    icon:        'Landmark',
    color:       '#ca8a04',
    order:       1,
    categories:  [
      'Ancient Civilization',
      'Ancient Site',
      'Artifact',
      'Lost Knowledge',
      'Ancient Technology',
      'Ancient Text',
      'Forbidden Archaeology',
      'Alternative History',
    ],
  },
  {
    slug:        'anomalies',
    name:        'Anomalies & Unexplained',
    description: 'UFO encounters, unexplained phenomena, extraterrestrial theories, and modern mysteries that resist conventional explanation.',
    icon:        'CircleDot',
    color:       '#16a34a',
    order:       2,
    categories:  [
      'UFO / UAP',
      'Extraterrestrial Hypothesis',
      'Unexplained Phenomenon',
      'Modern Mystery',
    ],
  },
  {
    slug:        'government-power',
    name:        'Government & Power',
    description: 'Classified programs, intelligence operations, state secrecy, and the hidden machinery of institutional power.',
    icon:        'Shield',
    color:       '#0369a1',
    order:       3,
    categories:  [
      'Government Program',
      'Government Secrecy',
      'Intelligence Operation',
      'Secret Project',
    ],
  },
  {
    slug:        'religion-mythology',
    name:        'Religion & Mythology',
    description: 'Religious traditions, mythological narratives, esoteric systems, and sacred symbolism across human history.',
    icon:        'Flame',
    color:       '#b91c1c',
    order:       4,
    categories:  [
      'Religion',
      'Mythology',
      'Esoterica',
      'Symbolism',
    ],
  },
  {
    slug:        'conspiracy-society',
    name:        'Conspiracy & Society',
    description: 'Contested theories, historical controversies, whistleblowers, and the intersection of hidden agendas with public life.',
    icon:        'Network',
    color:       '#7c3aed',
    order:       5,
    categories:  [
      'Conspiracy Theory',
      'Historical Controversy',
      'Whistleblower',
    ],
  },
  {
    slug:        'life-biology',
    name:        'Life & Biology',
    description: 'Disease outbreaks, pandemics, biological threats, and events at the frontier of human health and biosecurity.',
    icon:        'Dna',
    color:       '#e11d48',
    order:       6,
    categories:  [
      'Disease & Pandemic',
    ],
  },
  {
    slug:        'entities',
    name:        'People & Organizations',
    description: 'Key individuals, groups, agencies, and institutions whose actions shaped events of investigative significance.',
    icon:        'Users',
    color:       '#475569',
    order:       7,
    categories:  [
      'Historical Figure',
      'Organization',
    ],
  },
  {
    slug:        'technology-cosmos',
    name:        'Technology & Cosmos',
    description: 'Modern and emerging technologies, space exploration, and humanity\'s relationship with the cosmos.',
    icon:        'Satellite',
    color:       '#0891b2',
    order:       8,
    categories:  [
      'Technology',
    ],
  },
];

// Flat lookup: Category name → Galaxy slug
export const CATEGORY_TO_GALAXY: Record<string, string> = Object.fromEntries(
  GALAXIES.flatMap(g => g.categories.map(c => [c, g.slug])),
);

// Galaxy slug → GalaxyDef
export const GALAXY_BY_SLUG: Record<string, GalaxyDef> = Object.fromEntries(
  GALAXIES.map(g => [g.slug, g]),
);
