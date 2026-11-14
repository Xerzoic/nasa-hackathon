import { lazy, Suspense, useCallback, useState } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import {
  TabNavigation,
  type WorkspaceTab,
} from './components/layout/TabNavigation'
import { DualMapView } from './components/maps/DualMapView'
import { CitationDrawer } from './components/ui/CitationDrawer'
import { getSite } from './data/analogs_dataset'
import { useMapSync } from './hooks/useMapSync'
import type { DimensionWeights } from './types'
import { DEFAULT_WEIGHTS } from './utils/constants'

/**
 * The charting stack is only needed by the comparison dashboard, so it is
 * code-split away from the initial map bundle.
 */
const ComparisonDashboard = lazy(() =>
  import('./components/dashboard/ComparisonDashboard').then((module) => ({
    default: module.ComparisonDashboard,
  })),
)

/**
 * The configurator owns the 60-pairing ranking and the printable brief, so it
 * ships as its own chunk rather than inflating the initial map payload.
 */
const MissionConfigurator = lazy(() =>
  import('./components/configurator/MissionConfigurator').then((module) => ({
    default: module.MissionConfigurator,
  })),
)

/**
 * Application shell. Selection and mission weights live here so the map,
 * dashboard and configurator workspaces always describe the same pairing.
 */
function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('map')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [citationsOpen, setCitationsOpen] = useState(false)
  const [weights, setWeights] = useState<DimensionWeights>({
    ...DEFAULT_WEIGHTS,
  })
  const sync = useMapSync(weights)

  /**
   * Stable close handler: the drawer restores focus and scroll lock in an
   * effect keyed on this callback, so a new identity each render would re-run
   * that effect and yank focus back to the close button.
   */
  const closeCitations = useCallback(() => setCitationsOpen(false), [])

  function selectSite(siteId: string) {
    const site = getSite(siteId)
    if (site.body === 'earth') {
      sync.selectEarthSite(siteId)
      return
    }
    sync.selectTargetSite(siteId)
  }

  function compareSite(siteId: string) {
    selectSite(siteId)
    setActiveTab('dashboard')
  }

  function openPairing(earthSiteId: string, targetSiteId: string) {
    sync.selectPairing(earthSiteId, targetSiteId)
    setActiveTab('dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col text-ink">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        citationsOpen={citationsOpen}
        onOpenCitations={() => setCitationsOpen(true)}
      />

      <CitationDrawer open={citationsOpen} onClose={closeCitations} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          open={sidebarOpen}
          sync={sync}
          weights={weights}
          onSelectSite={selectSite}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <main
            key={activeTab}
            id="workspace-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            data-workspace-tab={activeTab}
            className="workspace-panel flex-1 px-2 py-3 sm:px-3 xl:px-4"
          >
            {activeTab === 'map' ? (
              <DualMapView
                sync={sync}
                onCompareSite={compareSite}
                onOpenComparison={() => setActiveTab('dashboard')}
              />
            ) : activeTab === 'dashboard' ? (
              <Suspense
                fallback={
                  <div
                    role="status"
                    className="rounded-xl border border-hairline bg-panel/70 px-5 py-12 text-center text-sm text-ink-muted"
                  >
                    Loading comparison workspace…
                  </div>
                }
              >
                <ComparisonDashboard
                  earthSiteId={sync.selectedEarthId}
                  targetSiteId={sync.selectedTargetId}
                  weights={weights}
                  onOpenMap={() => setActiveTab('map')}
                />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <div
                    role="status"
                    className="rounded-xl border border-hairline bg-panel/70 px-5 py-12 text-center text-sm text-ink-muted"
                  >
                    Loading mission configurator…
                  </div>
                }
              >
                <MissionConfigurator
                  weights={weights}
                  onWeightsChange={setWeights}
                  onSelectPairing={openPairing}
                  selectedPairingId={sync.pairing.id}
                />
              </Suspense>
            )}
          </main>

          <footer className="border-t border-hairline px-4 py-3">
            <p className="text-[0.6875rem] text-ink-dim">
              Built for the 2026 NASA Space Apps Challenge. All planetary data
              courtesy of NASA science missions and archives: GIBS, Moon Trek,
              Mars Trek and the Common Metadata Repository.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App
