import React from 'react';
import { Swords, Trophy, Skull, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Fleet } from '../types/game';

function sumFleetHealth(fleets: Fleet[]) {
  let hull = 0;
  let maxHull = 0;
  let shield = 0;
  let maxShield = 0;
  let armor = 0;
  let maxArmor = 0;
  let power = 0;
  let ships = 0;
  for (const f of fleets) {
    power += f.power;
    ships += f.ships.length;
    for (const s of f.ships) {
      hull += s.hull;
      maxHull += s.maxHull;
      shield += s.shield;
      maxShield += s.maxShield;
      armor += s.armor;
      maxArmor += s.maxArmor;
    }
  }
  return { hull, maxHull, shield, maxShield, armor, maxArmor, power, ships };
}

export const BattleOverlay: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const viewMode = useGameStore((s) => s.viewMode);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const dismissBattleReport = useGameStore((s) => s.dismissBattleReport);

  const activeBattle = viewMode === 'system' ? game.battles[activeSystemId] : undefined;
  const report = game.lastBattleReport;

  const playerFleets = activeBattle
    ? activeBattle.attackerFleetIds.map((id) => game.fleets[id]).filter(Boolean)
    : [];
  const enemyFleets = activeBattle
    ? activeBattle.defenderFleetIds.map((id) => game.fleets[id]).filter(Boolean)
    : [];

  const pStats = sumFleetHealth(playerFleets);
  const eStats = sumFleetHealth(enemyFleets);

  return (
    <>
      {/* Live In-System Battle HUD */}
      {activeBattle && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[520px] max-w-[92vw] hud-panel rounded-xl border-rose-500/50 p-3.5 shadow-2xl">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-300 mb-2.5">
            <Swords className="w-4 h-4 animate-pulse" />
            <span>星系实时海战 — {game.systems[activeBattle.systemId]?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Player Side */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-emerald-300">
                <span>我方舰队 ({pStats.ships} 舰)</span>
                <span className="font-mono">⚔ {pStats.power}</span>
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{
                      width: `${pStats.maxShield ? (pStats.shield / pStats.maxShield) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${pStats.maxArmor ? (pStats.armor / pStats.maxArmor) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{
                      width: `${pStats.maxHull ? (pStats.hull / pStats.maxHull) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Hostile Side */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-rose-300">
                <span>敌方武装 ({eStats.ships} 舰)</span>
                <span className="font-mono">☠ {eStats.power}</span>
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{
                      width: `${eStats.maxShield ? (eStats.shield / eStats.maxShield) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${eStats.maxArmor ? (eStats.armor / eStats.maxArmor) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{
                      width: `${eStats.maxHull ? (eStats.hull / eStats.maxHull) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Battle Report Modal */}
      {report && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-xl overflow-hidden ${
              report.victory ? 'hud-panel-gold' : 'hud-panel border-rose-500/60'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                report.victory
                  ? 'border-amber-500/30 bg-amber-950/30'
                  : 'border-rose-500/30 bg-rose-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {report.victory ? (
                  <Trophy className="w-5 h-5 text-amber-400" />
                ) : (
                  <Skull className="w-5 h-5 text-rose-400" />
                )}
                <span className="text-sm font-bold text-white">
                  {report.victory ? '星际海战大捷' : '舰队作战失利'} — {report.systemName}
                </span>
              </div>
              <button
                onClick={dismissBattleReport}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">击毁敌舰</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                    {report.enemyLosses}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">我方战损</div>
                  <div className="text-xl font-mono font-bold text-rose-400 mt-0.5">
                    {report.playerLosses}
                  </div>
                </div>
              </div>

              {report.victory && (
                <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/35 text-center space-y-1">
                  <div className="text-[11px] text-emerald-300 font-semibold">战场残骸回收</div>
                  <div className="font-mono text-slate-100">
                    <span className="text-purple-300 mr-3">⬢ +{report.salvageAlloys} 合金</span>
                    <span className="text-sky-300">◈ +{report.salvageResearch} 科研点</span>
                  </div>
                </div>
              )}

              <button
                onClick={dismissBattleReport}
                className="w-full py-2 rounded-md bg-sky-600/80 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                确认战报
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
