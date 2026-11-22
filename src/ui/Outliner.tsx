import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Wrench,
  Shield,
  Globe2,
  Star,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { fleetStatusLabel } from '../engine/fleetStatus';

export const Outliner: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);
  const enterSystemView = useGameStore((s) => s.enterSystemView);

  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({
    colonies: true,
    starbases: true,
    military: true,
    civilian: true,
  });

  const toggleSec = (k: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [k]: !prev[k] }));

  const ownedSystems = game.systemOrder
    .map((id) => game.systems[id])
    .filter((s) => s.ownerId === game.playerEmpireId);

  const colonies = ownedSystems.flatMap((sys) =>
    sys.planets
      .filter((p) => p.colonizedBy === game.playerEmpireId)
      .map((p) => ({ planet: p, system: sys }))
  );

  const fleets = Object.values(game.fleets).filter((f) => f.ownerId === game.playerEmpireId);
  const militaryFleets = fleets.filter((f) => f.shipType === 'corvette');
  const civilianFleets = fleets.filter((f) => f.shipType !== 'corvette');

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="展开右侧大纲栏"
        className="pointer-events-auto fixed top-16 right-3 z-20 p-2 rounded hud-panel text-sky-300 hover:text-white cursor-pointer"
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="pointer-events-auto fixed top-15 right-3 bottom-4 w-60 z-20 hud-panel rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sky-500/20 bg-sky-950/30">
        <span className="text-xs font-bold tracking-wider text-sky-200 uppercase">
          帝国大纲
        </span>
        <button
          onClick={() => setCollapsed(true)}
          title="收起大纲栏"
          className="text-slate-400 hover:text-sky-200 cursor-pointer"
        >
          <PanelRightClose className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {/* Colonies */}
        <div>
          <button
            onClick={() => toggleSec('colonies')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-800/60 rounded cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {openSections.colonies ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Globe2 className="w-3.5 h-3.5" />
              殖民星球 ({colonies.length})
            </span>
          </button>
          {openSections.colonies && (
            <div className="mt-1 space-y-1">
              {colonies.map(({ planet, system }) => {
                const active = selection?.type === 'planet' && selection.id === planet.id;
                return (
                  <div
                    key={planet.id}
                    onClick={() => {
                      setSelection({ type: 'planet', id: planet.id, systemId: system.id });
                      focusCameraOnSystem(system.id);
                    }}
                    onDoubleClick={() => enterSystemView(system.id)}
                    className={`px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-900/50 border-sky-400/70 text-white'
                        : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{planet.name}</span>
                      <span className="text-[10px] text-sky-300 font-mono">
                        人口 {planet.popCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{system.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Owned Systems / Starbases */}
        <div>
          <button
            onClick={() => toggleSec('starbases')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-sky-300 hover:bg-slate-800/60 rounded cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {openSections.starbases ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Star className="w-3.5 h-3.5" />
              已控星系 ({ownedSystems.length})
            </span>
          </button>
          {openSections.starbases && (
            <div className="mt-1 space-y-1">
              {ownedSystems.map((sys) => {
                const active = selection?.type === 'system' && selection.id === sys.id;
                return (
                  <div
                    key={sys.id}
                    onClick={() => {
                      setSelection({ type: 'system', id: sys.id });
                      focusCameraOnSystem(sys.id);
                    }}
                    onDoubleClick={() => enterSystemView(sys.id)}
                    className={`px-2 py-1 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-900/50 border-sky-400/70 text-white'
                        : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <span className="truncate">{sys.name}</span>
                    <span className="text-[10px] text-sky-400">
                      {sys.starbaseLevel >= 2 ? '星港' : '前哨站'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Civilian Ships */}
        <div>
          <button
            onClick={() => toggleSec('civilian')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-slate-800/60 rounded cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {openSections.civilian ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Compass className="w-3.5 h-3.5" />
              民用舰船 ({civilianFleets.length})
            </span>
          </button>
          {openSections.civilian && (
            <div className="mt-1 space-y-1">
              {civilianFleets.map((fleet) => {
                const active = selection?.type === 'fleet' && selection.id === fleet.id;
                const isIdle = fleet.orders.length === 0 && !fleet.inTransit && !fleet.autoSurvey;
                return (
                  <div
                    key={fleet.id}
                    onClick={() => {
                      setSelection({ type: 'fleet', id: fleet.id });
                      focusCameraOnSystem(fleet.systemId);
                    }}
                    onDoubleClick={() => enterSystemView(fleet.systemId)}
                    className={`px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-900/50 border-sky-400/70 text-white'
                        : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        {fleet.shipType === 'science' ? (
                          <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                        ) : (
                          <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        {fleet.name}
                      </span>
                      {fleet.autoSurvey && (
                        <span className="text-[9px] px-1 rounded bg-sky-500/30 text-sky-200">
                          自动
                        </span>
                      )}
                      {isIdle ? (
                        <span className="flex items-center gap-1 text-[9px] px-1 rounded bg-amber-500/25 text-amber-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          空闲
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" title="任务执行中" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {fleetStatusLabel(fleet, game.systems)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Military Fleets */}
        <div>
          <button
            onClick={() => toggleSec('military')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-800/60 rounded cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {openSections.military ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Shield className="w-3.5 h-3.5" />
              军事舰队 ({militaryFleets.length})
            </span>
          </button>
          {openSections.military && (
            <div className="mt-1 space-y-1">
              {militaryFleets.map((fleet) => {
                const active = selection?.type === 'fleet' && selection.id === fleet.id;
                return (
                  <div
                    key={fleet.id}
                    onClick={() => {
                      setSelection({ type: 'fleet', id: fleet.id });
                      focusCameraOnSystem(fleet.systemId);
                    }}
                    onDoubleClick={() => enterSystemView(fleet.systemId)}
                    className={`px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-900/50 border-sky-400/70 text-white'
                        : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            fleet.inCombat
                              ? 'bg-rose-500 animate-pulse'
                              : fleet.inTransit || fleet.orders.length > 0
                              ? 'bg-sky-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        {fleet.name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                        ⚔ {fleet.power}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      护卫舰 x{fleet.shipCount} · {fleet.statusText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Hint */}
      <div className="px-3 py-2 border-t border-sky-500/15 bg-slate-950/60 text-[10px] text-slate-400 leading-relaxed">
        <div>左键拖拽平移 · 右键拖拽旋转俯仰</div>
        <div>按 <kbd className="px-1 rounded bg-slate-800 text-sky-300">?</kbd> 查快捷键 · <kbd className="px-1 rounded bg-slate-800 text-sky-300">Home</kbd> 回母星</div>
      </div>
    </aside>
  );
};
