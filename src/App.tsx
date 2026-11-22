import React, { useEffect, useState } from 'react';
import { ThreeViewport } from './renderer/ThreeViewport';
import { TitleScreen } from './ui/TitleScreen';
import { NewGameSetup } from './ui/NewGameSetup';
import { TopBar } from './ui/TopBar';
import { LeftSidebar } from './ui/LeftSidebar';
import { Outliner } from './ui/Outliner';
import { SelectionPanel } from './ui/SelectionPanel';
import { PlanetDrawer } from './ui/PlanetDrawer';
import { TechDrawer } from './ui/TechDrawer';
import { MarketDrawer } from './ui/MarketDrawer';
import { ShipDesignerDrawer } from './ui/ShipDesignerDrawer';
import { DiplomacyDrawer } from './ui/DiplomacyDrawer';
import { TraditionsDrawer } from './ui/TraditionsDrawer';
import { SituationDrawer } from './ui/SituationDrawer';
import { EventModal } from './ui/EventModal';
import { VictoryModal } from './ui/VictoryModal';
import { BattleOverlay } from './ui/BattleOverlay';
import { AlertStrip } from './ui/AlertStrip';
import { ContextMenu } from './ui/ContextMenu';
import { NewGalaxyModal } from './ui/NewGalaxyModal';
import { SaveLoadModal } from './ui/SaveLoadModal';
import { PauseMenuModal } from './ui/PauseMenuModal';
import { CodexModal } from './ui/CodexModal';
import { GuideModal, SettingsModal } from './ui/SettingsAndGuideModals';
import { Minimap } from './ui/Minimap';
import { AchievementsModal } from './ui/AchievementsModal';
import { GalaxySearchModal } from './ui/GalaxySearchModal';
import { useGameStore } from './store/useGameStore';
import { bgm } from './engine/bgm';

const SPEED_MS: Record<1 | 2 | 3 | 4, number> = {
  1: 750,
  2: 350,
  3: 150,
  4: 60,
};

export const App: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const paused = useGameStore((s) => s.game.paused);
  const speed = useGameStore((s) => s.game.speed);
  useGameStore((s) => s.tickVersion);
  const toast = useGameStore((s) => s.toast);
  const showAchievementsModal = useGameStore((s) => s.showAchievementsModal);
  const setShowAchievementsModal = useGameStore((s) => s.setShowAchievementsModal);
  const [showHotkeys, setShowHotkeys] = useState(false);

  // Start ambient BGM on first user pointer interaction + sync mood
  useEffect(() => {
    const startBgmOnce = () => {
      bgm.ensureStarted();
      window.removeEventListener('pointerdown', startBgmOnce);
    };
    window.addEventListener('pointerdown', startBgmOnce);
    return () => window.removeEventListener('pointerdown', startBgmOnce);
  }, []);

  useEffect(() => {
    const state = useGameStore.getState();
    if (screen !== 'playing') {
      bgm.playMood('title');
    } else if (state.game.victory?.achieved) {
      bgm.playMood('victory');
    } else if (state.game.crisis.triggered && !state.game.crisis.defeated) {
      bgm.playMood('crisis');
    } else if (Object.keys(state.game.battles).length > 0) {
      bgm.playMood('combat');
    } else {
      // A sprawling empire gets its own theme; otherwise explore (which
      // alternates between bgm_explore_1 and bgm_explore_2).
      const ownedSystems = Object.values(state.game.systems).filter(
        (sys) => sys.ownerId === state.game.playerEmpireId
      ).length;
      bgm.playMood(ownedSystems >= 8 ? 'empire' : 'explore');
    }
  }, [screen, useGameStore.getState().tickVersion]);

  // Main simulation heartbeat (only ticks when actively playing!)
  useEffect(() => {
    if (screen !== 'playing' || paused) return;
    const ms = SPEED_MS[speed];
    const timer = window.setInterval(() => {
      useGameStore.getState().stepDay();
    }, ms);
    return () => window.clearInterval(timer);
  }, [screen, paused, speed]);

  // Global Stellaris-like hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const store = useGameStore.getState();

      if (e.code === 'Escape') {
        if (store.showCodexModal) store.setShowCodexModal(false);
        else if (store.showSettingsModal) store.setShowSettingsModal(false);
        else if (store.showGuideModal) store.setShowGuideModal(false);
        else if (store.showSaveModal !== 'none') store.setShowSaveModal('none');
        else if (store.screen === 'playing') {
          if (store.contextMenu) store.openContextMenu(null);
          else if (store.showNewGalaxyModal) store.setShowNewGalaxyModal(false);
          else if (store.activeDrawer !== 'none') store.setActiveDrawer('none');
          else if (store.showPauseMenu) store.setShowPauseMenu(false);
          else if (store.selection) store.setSelection(null);
          else store.setShowPauseMenu(true);
        }
        return;
      }

      if (store.screen !== 'playing') return;

      if (e.code === 'Space') {
        e.preventDefault();
        store.togglePause();
      } else if (e.code === 'Home') {
        e.preventDefault();
        const homeId = store.game.empires[store.game.playerEmpireId]?.homeSystemId;
        if (homeId) {
          store.enterGalaxyView();
          store.focusCameraOnSystem(homeId);
        }
      } else if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setShowHotkeys((v) => !v);
      } else if (e.code === 'Digit1') {
        store.setSpeed(1);
      } else if (e.code === 'Digit2') {
        store.setSpeed(2);
      } else if (e.code === 'Digit3') {
        store.setSpeed(3);
      } else if (e.code === 'Digit4') {
        store.setSpeed(4);
      } else if (e.code === 'KeyE') {
        store.toggleViewMode();
      } else if (e.code === 'F1') {
        e.preventDefault();
        store.toggleDrawer('tech');
      } else if (e.code === 'F2') {
        e.preventDefault();
        store.toggleDrawer('market');
      } else if (e.code === 'F3') {
        e.preventDefault();
        store.toggleDrawer('ship_designer');
      } else if (e.code === 'F4') {
        e.preventDefault();
        store.toggleDrawer('diplomacy');
      } else if (e.code === 'F5') {
        e.preventDefault();
        store.toggleDrawer('traditions');
      } else if (e.code === 'F6') {
        e.preventDefault();
        store.toggleDrawer('situation');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040711] text-slate-100">
      {screen === 'title' && <TitleScreen />}
      {screen === 'setup' && <NewGameSetup />}

      {screen === 'playing' && (
        <>
          <ThreeViewport />
          <TopBar />
          <LeftSidebar />
          <Outliner />
          <Minimap />
          <SelectionPanel />
          <GalaxySearchModal />
          {showHotkeys && (
            <div
              onClick={() => setShowHotkeys(false)}
              className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md hud-panel rounded-xl p-5 space-y-3 text-xs shadow-2xl border border-sky-400/40"
              >
                <div className="flex items-center justify-between border-b border-sky-500/25 pb-2">
                  <span className="text-sm font-bold text-white">⌨ 快捷键速查表</span>
                  <button
                    onClick={() => setShowHotkeys(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    ['Space', '暂停 / 继续时间'],
                    ['1 / 2 / 3 / 4', '切换 1x ~ 4x 流速'],
                    ['E', '切换 银河 / 3D星系视图'],
                    ['F', '星图全局搜索与筛选'],
                    ['Home', '镜头秒回帝国母星系'],
                    ['WASD / 方向键', '平移星图镜头'],
                    ['F1 ~ F6', '科研 / 市场 / 舰船 / 外交 / 传统 / 局势'],
                    ['? / Esc', '速查表 / 关闭当前窗口'],
                  ].map(([k, desc]) => (
                    <div
                      key={k}
                      className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-sky-500/40 text-sky-300 font-mono text-[10px]">
                        {k}
                      </kbd>
                      <span className="text-slate-300 text-right">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <PlanetDrawer />
          <TechDrawer />
          <MarketDrawer />
          <ShipDesignerDrawer />
          <DiplomacyDrawer />
          <TraditionsDrawer />
          <SituationDrawer />
          <BattleOverlay />
          <EventModal />
          <VictoryModal />
          <AlertStrip />
          <ContextMenu />
          <NewGalaxyModal />
          <PauseMenuModal />
        </>
      )}

      {/* Global Modals (Accessible from both Title Screen & In-Game) */}
      <SaveLoadModal />
      <CodexModal />
      <SettingsModal />
      <GuideModal />
      <AchievementsModal
        openTab={showAchievementsModal}
        onClose={() => setShowAchievementsModal('none')}
      />

      {/* Bottom-center Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-[60]">
          <div
            className={`px-4 py-2 rounded-md text-xs font-medium shadow-2xl border backdrop-blur-md ${
              toast.kind === 'error'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-100'
                : toast.kind === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100'
                : 'bg-sky-950/90 border-sky-400/60 text-sky-100'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
