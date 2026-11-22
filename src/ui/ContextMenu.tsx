import React from 'react';
import { Compass, Flag, Navigation, Orbit, Pickaxe, FlaskConical } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getOutpostCost } from '../engine/commands';

export const ContextMenu: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const contextMenu = useGameStore((s) => s.contextMenu);
  const selection = useGameStore((s) => s.selection);
  const openContextMenu = useGameStore((s) => s.openContextMenu);
  const enterSystemView = useGameStore((s) => s.enterSystemView);
  const commandMove = useGameStore((s) => s.commandMove);
  const commandSurvey = useGameStore((s) => s.commandSurvey);
  const commandBuildOutpost = useGameStore((s) => s.commandBuildOutpost);
  const commandBuildStations = useGameStore((s) => s.commandBuildStations);

  if (!contextMenu) return null;
  const sys = game.systems[contextMenu.systemId];
  if (!sys) return null;

  const selectedFleet = selection?.type === 'fleet' ? game.fleets[selection.id] : null;
  const scienceShip =
    selectedFleet?.shipType === 'science'
      ? selectedFleet
      : Object.values(game.fleets).find(
          (f) => f.ownerId === game.playerEmpireId && f.shipType === 'science'
        );
  const constructorShip =
    selectedFleet?.shipType === 'construction'
      ? selectedFleet
      : Object.values(game.fleets).find(
          (f) => f.ownerId === game.playerEmpireId && f.shipType === 'construction'
        );

  const outpostCost = getOutpostCost(game, game.playerEmpireId, sys.id);
  const unbuiltMining = sys.planets.filter(
    (p) => p.deposit && p.deposit.type !== 'research' && p.stationType === 'none'
  ).length;
  const unbuiltResearch = sys.planets.filter(
    (p) => p.deposit && p.deposit.type === 'research' && p.stationType === 'none'
  ).length;

  // Keep menu inside viewport
  const left = Math.min(contextMenu.screenX, window.innerWidth - 240);
  const top = Math.min(contextMenu.screenY, window.innerHeight - 240);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40"
      onClick={() => openContextMenu(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu(null);
      }}
    >
      <div
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        className="fixed w-56 hud-panel rounded-md py-1.5 text-xs shadow-2xl border border-sky-400/50"
      >
        <div className="px-3 py-1.5 border-b border-sky-500/20 text-[11px] font-bold text-sky-200 flex items-center justify-between">
          <span>{sys.name}</span>
          <span className="text-[10px] font-normal text-slate-400">
            {sys.ownerId ? '已控制' : sys.surveyedByPlayer ? '已调查' : '未调查'}
          </span>
        </div>

        <div className="py-1">
          {selectedFleet && (
            <button
              onClick={() => commandMove(selectedFleet.id, sys.id)}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-500/20 text-slate-100 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              移动「{selectedFleet.name}」至此
            </button>
          )}

          {!sys.surveyedByPlayer && scienceShip && (
            <button
              onClick={() => commandSurvey(scienceShip.id, sys.id)}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-500/20 text-sky-200 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              派遣科研船调查星系
            </button>
          )}

          {sys.surveyedByPlayer && sys.ownerId === null && constructorShip && (
            <button
              onClick={() => commandBuildOutpost(constructorShip.id, sys.id)}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-amber-500/20 text-amber-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                建造前哨站
              </span>
              <span className="text-[10px] text-amber-300/80 font-mono">
                {outpostCost.alloys}/{outpostCost.influence}
              </span>
            </button>
          )}

          {sys.ownerId === game.playerEmpireId && constructorShip && unbuiltMining > 0 && (
            <button
              onClick={() => commandBuildStations(constructorShip.id, sys.id, 'mining')}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-amber-500/20 text-amber-200 cursor-pointer"
            >
              <Pickaxe className="w-3.5 h-3.5 text-amber-400" />
              建造开采站 ({unbuiltMining}处)
            </button>
          )}

          {sys.ownerId === game.playerEmpireId && constructorShip && unbuiltResearch > 0 && (
            <button
              onClick={() => commandBuildStations(constructorShip.id, sys.id, 'research')}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-500/20 text-sky-200 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
              建造科研站 ({unbuiltResearch}处)
            </button>
          )}

          <div className="my-1 border-t border-slate-700/60" />

          <button
            onClick={() => enterSystemView(sys.id)}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-700/60 text-slate-200 cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5 text-slate-300" />
            进入 3D 星系视图
          </button>
        </div>
      </div>
    </div>
  );
};
