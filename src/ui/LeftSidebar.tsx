import React from 'react';
import {
  Sparkles,
  FlaskConical,
  Wrench,
  Handshake,
  Store,
  ScrollText,
  Network,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

import {
  getAvailableAscensionSlots,
  getNextTraditionUnityCost,
} from '../data/traditions';

export const LeftSidebar: React.FC = () => {
  const showHyperlanes = useGameStore((s) => s.showHyperlanes);
  const showBorders = useGameStore((s) => s.showBorders);
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const toggleHyperlanes = useGameStore((s) => s.toggleHyperlanes);
  const toggleBorders = useGameStore((s) => s.toggleBorders);
  const toggleDrawer = useGameStore((s) => s.toggleDrawer);
  const setShowNewGalaxyModal = useGameStore((s) => s.setShowNewGalaxyModal);

  const empire = game.empires[game.playerEmpireId];
  const hasIdleTech =
    (!empire.research.physics.activeTechId && empire.research.physics.options.length > 0) ||
    (!empire.research.society.activeTechId && empire.research.society.options.length > 0) ||
    (!empire.research.engineering.activeTechId && empire.research.engineering.options.length > 0);

  const hasActiveWar = Object.values(game.relations).some((r) => r.atWar);
  const canAffordTradition =
    empire.unlockedTraditions.length < 9 &&
    empire.resources.unity >= getNextTraditionUnityCost(empire.unlockedTraditions.length);
  const hasFreeAscension =
    getAvailableAscensionSlots(empire.unlockedTraditions) > empire.unlockedAscensions.length;

  return (
    <nav className="pointer-events-auto fixed top-15 left-3 z-20 flex flex-col gap-1.5">
      {/* Map & Galaxy Controls */}
      <div className="hud-panel rounded-lg p-1.5 flex flex-col gap-1">
        <button
          onClick={() => setShowNewGalaxyModal(true)}
          title="重新生成银河星图"
          className="w-9 h-9 rounded flex items-center justify-center text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={toggleHyperlanes}
          title={showHyperlanes ? '隐藏超空间航道' : '显示超空间航道'}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            showHyperlanes
              ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Network className="w-4 h-4" />
        </button>

        <button
          onClick={toggleBorders}
          title={showBorders ? '隐藏势力疆域' : '显示势力疆域'}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            showBorders
              ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Active Empire Systems + Upcoming Milestone Systems */}
      <div className="hud-panel rounded-lg p-1.5 flex flex-col gap-1">
        <button
          onClick={() => toggleDrawer('tech')}
          title="科技研发（三线抽卡） [F1]"
          className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'tech'
              ? 'bg-sky-500/35 text-white border border-sky-400/70'
              : 'text-sky-300 hover:bg-sky-500/20 hover:text-white'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          {hasIdleTech && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => toggleDrawer('market')}
          title="星际内部市场 [F2]"
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'market'
              ? 'bg-amber-500/35 text-amber-100 border border-amber-400/70'
              : 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-100'
          }`}
        >
          <Store className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleDrawer('ship_designer')}
          title="帝国舰船设计器 [F3]"
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'ship_designer'
              ? 'bg-emerald-500/35 text-emerald-100 border border-emerald-400/70'
              : 'text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleDrawer('diplomacy')}
          title="星际外交与通讯 [F4]"
          className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'diplomacy'
              ? 'bg-purple-500/35 text-purple-100 border border-purple-400/70'
              : 'text-purple-300 hover:bg-purple-500/20 hover:text-purple-100'
          }`}
        >
          <Handshake className="w-4 h-4" />
          {hasActiveWar && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => toggleDrawer('traditions')}
          title="帝国传统与飞升天赋 [F5]"
          className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'traditions'
              ? 'bg-teal-500/35 text-teal-100 border border-teal-400/70'
              : 'text-teal-300 hover:bg-teal-500/20 hover:text-teal-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {(canAffordTradition || hasFreeAscension) && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => toggleDrawer('situation')}
          title="局势日志、胜利进度与存档 [F6]"
          className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawer === 'situation'
              ? 'bg-sky-500/35 text-white border border-sky-400/70'
              : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          {game.crisis.triggered && !game.crisis.defeated && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>
    </nav>
  );
};
