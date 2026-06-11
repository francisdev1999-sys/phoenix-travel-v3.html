'use client';
import { ChevronRight, Telescope } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';

export default function Breadcrumb() {
  const { navContext, currentView, navigateToUniverse, navigateToGalaxy, navigateToCluster } = useUserStore();

  // Only show on galaxy-hierarchy views
  const hierarchyViews = ['galaxy', 'cluster', 'node', 'research-graph'];
  if (!hierarchyViews.includes(currentView)) return null;

  const { galaxySlug, galaxyName, clusterSlug, clusterName, nodeName } = navContext;

  const crumbs: { label: string; onClick: () => void; active: boolean }[] = [
    {
      label:   'Universe',
      onClick: navigateToUniverse,
      active:  false,
    },
  ];

  if (galaxySlug && galaxyName) {
    crumbs.push({
      label:   galaxyName,
      onClick: () => navigateToGalaxy(galaxySlug, galaxyName),
      active:  currentView === 'galaxy',
    });
  }

  if (clusterSlug && clusterName && galaxySlug && galaxyName) {
    crumbs.push({
      label:   clusterName,
      onClick: () => navigateToCluster(galaxySlug, galaxyName, clusterSlug, clusterName),
      active:  currentView === 'cluster',
    });
  }

  if (nodeName) {
    crumbs.push({
      label:   nodeName,
      onClick: () => {},
      active:  true,
    });
  }

  const total = crumbs.length;

  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1 py-0.5 max-w-full"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <Telescope size={11} className="text-purple-500 flex-shrink-0" />

      {crumbs.map((crumb, i) => {
        // On mobile: truncate non-active intermediate crumbs so the active
        // (last) crumb is always visible. "Universe" stays as a short label.
        // Any crumb that is neither first nor last gets a tighter max-width.
        const isMidCrumb = i > 0 && i < total - 1;
        const isLast     = i === total - 1;

        return (
          <div key={i} className="flex items-center gap-1 flex-shrink-0 min-w-0">
            {i > 0 && <ChevronRight size={9} className="text-slate-700 flex-shrink-0" />}
            <button
              onClick={crumb.active ? undefined : crumb.onClick}
              disabled={crumb.active}
              title={crumb.label}
              className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                crumb.active
                  ? 'text-white cursor-default'
                  : 'text-slate-500 hover:text-purple-300 cursor-pointer'
              } ${
                isMidCrumb
                  ? 'max-w-[5rem] sm:max-w-none overflow-hidden text-ellipsis'
                  : isLast
                  ? 'max-w-[8rem] sm:max-w-none overflow-hidden text-ellipsis'
                  : ''
              }`}
            >
              {crumb.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
