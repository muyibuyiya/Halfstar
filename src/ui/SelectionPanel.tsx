import React from 'react';
import {
  Compass,
  Wrench,
  Shield,
  Orbit,
  Sparkles,
  Flag,
  Pickaxe,
  FlaskConical,
  X,
  Radar,
  Anchor,
  ArrowUpCircle,
  Trash2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { STAR_CLASSES } from '../data/starClasses';
import { PLANET_CLASSES } from '../data/planetClasses';
import { getOutpostCost } from '../engine/commands';
import {
  getFleetCompositionSummary,
  getShipBuildCostAndDays,
  isHullUnlocked,
} from '../engine/shipSystem';
import {
  DEFENSE_PLATFORM_ALLOY_COST,
  getStarbasePower,
  STARBASE_TIERS,
} from '../engine/starbaseSystem';
import { HULL_CLASSES, HULL_ORDER } from '../data/ships';
import { fleetStatusLabel, hasOutpostOrderFor } from '../engine/fleetStatus';
import { TECHNOLOGIES } from '../data/technologies';
import {
  MEGASTRUCTURE_LIST,
  MEGASTRUCTURES,
  STRATEGIC_RESOURCES,
} from '../data/megastructures';

export const SelectionPanel: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const enterSystemView = useGameStore((s) => s.enterSystemView);
  const commandSurvey = useGameStore((s) => s.commandSurvey);
  const commandToggleAutoSurvey = useGameStore((s) => s.commandToggleAutoSurvey);
  const commandBuildOutpost = useGameStore((s) => s.commandBuildOutpost);
  const commandBuildStations = useGameStore((s) => s.commandBuildStations);
  const commandUpgradeStarport = useGameStore((s) => s.commandUpgradeStarport);
  const commandQueueShipBuild = useGameStore((s) => s.commandQueueShipBuild);
  const commandCancelShipBuild = useGameStore((s) => s.commandCancelShipBuild);
  const commandReturnToStarport = useGameStore((s) => s.commandReturnToStarport);
  const commandStartMegastructure = useGameStore((s) => s.commandStartMegastructure);
  const commandMergeFleets = useGameStore((s) => s.commandMergeFleets);
  const commandReinforceFleet = useGameStore((s) => s.commandReinforceFleet);
  const commandBuildDefensePlatform = useGameStore((s) => s.commandBuildDefensePlatform);
  const commandToggleAutoBuild = useGameStore((s) => s.commandToggleAutoBuild);
  const commandUpgradeFleet = useGameStore((s) => s.commandUpgradeFleet);
  const commandStartExcavation = useGameStore((s) => s.commandStartExcavation);
  const commandBuildGateway = useGameStore((s) => s.commandBuildGateway);
  const commandToggleFleetEvasive = useGameStore((s) => s.commandToggleFleetEvasive);
  const commandSetRallyPoint = useGameStore((s) => s.commandSetRallyPoint);
  const commandBuyCurator = useGameStore((s) => s.commandBuyCurator);
  const commandBuyTrader = useGameStore((s) => s.commandBuyTrader);

  if (!selection) return null;

  const scienceShip = Object.values(game.fleets).find(
    (f) => f.ownerId === game.playerEmpireId && f.shipType === 'science'
  );
  const constructorShip = Object.values(game.fleets).find(
    (f) => f.ownerId === game.playerEmpireId && f.shipType === 'construction'
  );

  // 1. Fleet Selection Panel
  if (selection.type === 'fleet') {
    const fleet = game.fleets[selection.id];
    if (!fleet) return null;
    const curSys = game.systems[fleet.systemId];
    const topOrder = fleet.orders[0];
    const progress =
      topOrder && 'progress' in topOrder ? Math.min(100, Math.round(topOrder.progress)) : null;

    const outpostCost = curSys
      ? getOutpostCost(game, game.playerEmpireId, curSys.id)
      : null;

    const unbuiltMining =
      curSys?.planets.filter(
        (p) => p.deposit && p.deposit.type !== 'research' && p.stationType === 'none'
      ).length ?? 0;
    const unbuiltResearch =
      curSys?.planets.filter(
        (p) => p.deposit && p.deposit.type === 'research' && p.stationType === 'none'
      ).length ?? 0;
    const outpostQueued = curSys
      ? hasOutpostOrderFor(game.fleets, game.playerEmpireId, curSys.id)
      : false;

    return (
      <div className="pointer-events-auto fixed bottom-4 left-16 z-20 w-88 hud-panel rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-sky-500/25 bg-sky-950/35">
          <div className="flex items-center gap-2">
            {fleet.shipType === 'science' ? (
              <Compass className="w-4 h-4 text-sky-400" />
            ) : fleet.shipType === 'construction' ? (
              <Wrench className="w-4 h-4 text-amber-400" />
            ) : (
              <Shield className="w-4 h-4 text-emerald-400" />
            )}
            <div>
              <div className="text-sm font-bold text-slate-100">{fleet.name}</div>
              <div className="text-[11px] text-slate-400">
                {fleet.shipType === 'science'
                  ? '科研探索舰'
                  : fleet.shipType === 'construction'
                  ? '深空工程船'
                  : `${getFleetCompositionSummary(fleet) || `战舰 x${fleet.shipCount}`} · 战力 ${fleet.power}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelection(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>当前位置</span>
            <button
              onClick={() => curSys && enterSystemView(curSys.id)}
              className="text-sky-300 hover:underline font-medium cursor-pointer"
            >
              {curSys?.name ?? '超空间'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>执行状态</span>
              <span className="text-sky-200">{fleetStatusLabel(fleet, game.systems)}</span>
            </div>
            {progress !== null && (
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Military Fleet Aggregate Health Bars + Repair Button */}
          {fleet.shipType === 'corvette' && fleet.ships.length > 0 && (() => {
            const totHull = fleet.ships.reduce((s, x) => s + x.hull, 0);
            const maxHull = fleet.ships.reduce((s, x) => s + x.maxHull, 0);
            const totShield = fleet.ships.reduce((s, x) => s + x.shield, 0);
            const maxShield = fleet.ships.reduce((s, x) => s + x.maxShield, 0);
            const totArmor = fleet.ships.reduce((s, x) => s + x.armor, 0);
            const maxArmor = fleet.ships.reduce((s, x) => s + x.maxArmor, 0);
            const damaged = totHull < maxHull - 1 || totArmor < maxArmor - 1;
            return (
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-sky-300 mb-0.5">
                      <span>护盾</span>
                      <span className="font-mono">{Math.round((totShield / Math.max(1, maxShield)) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-400" style={{ width: `${(totShield / Math.max(1, maxShield)) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-amber-300 mb-0.5">
                      <span>装甲</span>
                      <span className="font-mono">{Math.round((totArmor / Math.max(1, maxArmor)) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${(totArmor / Math.max(1, maxArmor)) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-emerald-300 mb-0.5">
                      <span>船体</span>
                      <span className="font-mono">{Math.round((totHull / Math.max(1, maxHull)) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${(totHull / Math.max(1, maxHull)) * 100}%` }} />
                    </div>
                  </div>
                </div>
                {damaged && (
                  <button
                    onClick={() => commandReturnToStarport(fleet.id)}
                    className="w-full py-1.5 rounded bg-emerald-950/70 hover:bg-emerald-800/75 border border-emerald-500/50 text-emerald-200 text-[11px] font-medium cursor-pointer"
                  >
                    返回最近己方星港维修
                  </button>
                )}

                {/* Fleet Merge, Retrofit Upgrade & One-Click Shipyard Reinforce */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => commandUpgradeFleet(fleet.id)}
                    title={`在己方星港将舰队所有战舰升级为最新设计图（消耗 ${Math.max(25, fleet.ships.length * 30)} 合金）`}
                    className="px-2 py-1 rounded bg-amber-950/75 hover:bg-amber-800/80 border border-amber-400/60 text-amber-200 text-[11px] font-semibold cursor-pointer"
                  >
                    一键改装 (⬢{Math.max(25, fleet.ships.length * 30)})
                  </button>
                  {Object.values(game.fleets).some(
                    (f) =>
                      f.id !== fleet.id &&
                      f.ownerId === fleet.ownerId &&
                      f.shipType === 'corvette' &&
                      !f.inTransit &&
                      f.systemId === fleet.systemId
                  ) && (
                    <button
                      onClick={() => commandMergeFleets(fleet.id)}
                      className="px-2 py-1 rounded bg-sky-900/75 hover:bg-sky-700/80 border border-sky-400/50 text-sky-100 text-[11px] font-semibold cursor-pointer"
                    >
                      合并同星系舰队
                    </button>
                  )}

                  {(['corvette', 'destroyer', 'cruiser'] as const)
                    .filter((h) => isHullUnlocked(game.empires[game.playerEmpireId], h))
                    .map((h) => {
                      const info = getShipBuildCostAndDays(game.empires[game.playerEmpireId], h);
                      return (
                        <button
                          key={h}
                          onClick={() => commandReinforceFleet(fleet.id, h)}
                          title={`在最近己方星港下达「${info.label}」补员订单（${info.alloyCost} 合金）`}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-purple-950/70 border border-slate-700 hover:border-purple-400/60 text-purple-200 text-[10px] font-mono cursor-pointer"
                        >
                          +补{HULL_CLASSES[h].name.slice(0, 2)}(⬢{info.alloyCost})
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-700/60">
            {fleet.shipType === 'science' && (
              <>
                <button
                  onClick={() => commandToggleAutoSurvey(fleet.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                    fleet.autoSurvey
                      ? 'bg-sky-500/30 border-sky-400 text-sky-100'
                      : 'bg-slate-800/80 border-slate-600/70 text-slate-200 hover:border-sky-400/60'
                  }`}
                >
                  <Radar className="w-3.5 h-3.5" />
                  {fleet.autoSurvey ? '停止自动探索' : '自动探索银河'}
                </button>
                {curSys && !curSys.surveyedByPlayer && (
                  <button
                    onClick={() => commandSurvey(fleet.id, curSys.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-400/50 text-emerald-100 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    调查当前星系
                  </button>
                )}
              </>
            )}

            {fleet.shipType === 'construction' && (
              <button
                onClick={() => commandToggleAutoBuild(fleet.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                  fleet.autoBuild
                    ? 'bg-amber-500/30 border-amber-400 text-amber-100'
                    : 'bg-slate-800/80 border-slate-600/70 text-slate-200 hover:border-amber-400/60'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                {fleet.autoBuild ? '停止自动建设' : '自动建设轨道站'}
              </button>
            )}

            {fleet.shipType === 'construction' && curSys && (
              <>
                {curSys.ownerId === null && curSys.surveyedByPlayer && outpostCost && (
                  <button
                    onClick={() => commandBuildOutpost(fleet.id, curSys.id)}
                    disabled={outpostQueued}
                    title={outpostQueued ? '已有工程船在前往/建造该星系的前哨站' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border ${
                      outpostQueued
                        ? 'bg-slate-800/60 border-slate-600/50 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-900/60 hover:bg-amber-800/70 border-amber-400/50 text-amber-100 cursor-pointer'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {outpostQueued
                      ? '前哨站建造中…'
                      : `建造前哨站 (${outpostCost.alloys}合金 / ${outpostCost.influence}影响)`}
                  </button>
                )}
                {curSys.ownerId === game.playerEmpireId && unbuiltMining > 0 && (
                  <button
                    onClick={() => commandBuildStations(fleet.id, curSys.id, 'mining')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800/90 hover:bg-slate-700 border border-amber-400/40 text-amber-200 cursor-pointer"
                  >
                    <Pickaxe className="w-3.5 h-3.5" />
                    建开采站 ({unbuiltMining}处)
                  </button>
                )}
                {curSys.ownerId === game.playerEmpireId && unbuiltResearch > 0 && (
                  <button
                    onClick={() => commandBuildStations(fleet.id, curSys.id, 'research')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800/90 hover:bg-slate-700 border border-sky-400/40 text-sky-200 cursor-pointer"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    建科研站 ({unbuiltResearch}处)
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => commandToggleFleetEvasive(fleet.id)}
              title="规避姿态：进入含敌对舰队或利维坦星系前自动中止跃迁并告警"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                fleet.evasive
                  ? 'bg-emerald-900/55 border-emerald-400/60 text-emerald-100'
                  : 'bg-slate-800/80 border-slate-600/70 text-slate-300 hover:border-slate-500'
              }`}
            >
              {fleet.evasive ? '🛡 规避姿态' : '⚔ 主动姿态'}
            </button>
          </div>

          <div className="text-[10px] text-slate-400">
            提示：在银河星图中 <span className="text-sky-300">右键点击任意星系</span> 可快捷派遣该舰船。
          </div>
        </div>
      </div>
    );
  }

  // 2. Planet Selection is handled by the dedicated PlanetDrawer
  if (selection.type === 'planet') {
    return null;
  }

  // 3. Star System Selection Panel
  const sys = game.systems[selection.id];
  if (!sys) return null;
  const starDef = STAR_CLASSES[sys.starClass];
  const outpostCost = getOutpostCost(game, game.playerEmpireId, sys.id);
  const unbuiltMining = sys.planets.filter(
    (p) => p.deposit && p.deposit.type !== 'research' && p.stationType === 'none'
  ).length;
  const unbuiltResearch = sys.planets.filter(
    (p) => p.deposit && p.deposit.type === 'research' && p.stationType === 'none'
  ).length;
  const outpostQueued = hasOutpostOrderFor(game.fleets, game.playerEmpireId, sys.id);

  return (
    <div className="pointer-events-auto fixed bottom-4 left-16 z-20 w-96 hud-panel rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-sky-500/25 bg-sky-950/35">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: starDef.color,
                boxShadow: `0 0 8px ${starDef.glowColor}`,
              }}
            />
            <span className="text-sm font-bold text-slate-100">{sys.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {starDef.name}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
            <span>
              {sys.ownerId
                ? `归属：${game.empires[sys.ownerId]?.name} (${sys.starbaseLevel >= 2 ? '星港' : '前哨站'})`
                : sys.surveyedByPlayer
                ? '无主星系 · 已完成调查'
                : '未知星系 · 尚未调查'}
            </span>
            {sys.surveyedByPlayer && sys.strategicDeposit && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 font-mono ${
                  STRATEGIC_RESOURCES[sys.strategicDeposit.type].color
                }`}
              >
                {STRATEGIC_RESOURCES[sys.strategicDeposit.type].symbol}{' '}
                {STRATEGIC_RESOURCES[sys.strategicDeposit.type].shortName} +
                {sys.strategicDeposit.amount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => enterSystemView(sys.id)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-sky-600/35 hover:bg-sky-600/55 border border-sky-400/60 text-sky-100 cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5" />
            3D 星系
          </button>
          <button
            onClick={() => setSelection(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2.5 text-xs">
        {/* Quick Dispatch Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {!sys.surveyedByPlayer && scienceShip && (
            <button
              onClick={() => commandSurvey(scienceShip.id, sys.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-sky-900/70 hover:bg-sky-800/80 border border-sky-400/50 text-sky-100 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              派遣科研船调查
            </button>
          )}
          {sys.surveyedByPlayer && sys.ownerId === null && constructorShip && (
            <button
              onClick={() => commandBuildOutpost(constructorShip.id, sys.id)}
              disabled={outpostQueued}
              title={outpostQueued ? '已有工程船在前往/建造该星系的前哨站' : undefined}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border ${
                outpostQueued
                  ? 'bg-slate-800/60 border-slate-600/50 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-900/65 hover:bg-amber-800/75 border-amber-400/55 text-amber-100 cursor-pointer'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {outpostQueued
                ? '前哨站建造中…'
                : `建造前哨站 (${outpostCost.alloys}合金 · ${outpostCost.influence}影响)`}
            </button>
          )}
          {sys.ownerId === game.playerEmpireId && constructorShip && unbuiltMining > 0 && (
            <button
              onClick={() => commandBuildStations(constructorShip.id, sys.id, 'mining')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-amber-400/45 text-amber-200 cursor-pointer"
            >
              <Pickaxe className="w-3.5 h-3.5" />
              建开采站 ({unbuiltMining})
            </button>
          )}
          {sys.ownerId === game.playerEmpireId && constructorShip && unbuiltResearch > 0 && (
            <button
              onClick={() => commandBuildStations(constructorShip.id, sys.id, 'research')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-sky-400/45 text-sky-200 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              建科研站 ({unbuiltResearch})
            </button>
          )}
          {sys.ownerId === game.playerEmpireId && sys.starbaseLevel >= 1 && sys.starbaseLevel < 4 && (() => {
            const nextTier = STARBASE_TIERS[(sys.starbaseLevel + 1) as 2 | 3 | 4];
            return (
              <button
                onClick={() => commandUpgradeStarport(sys.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800/75 border border-purple-400/55 text-purple-100 cursor-pointer"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                升级「{nextTier.name}」({nextTier.upgradeAlloyCost}合金)
              </button>
            );
          })()}
          {sys.ownerId === game.playerEmpireId && sys.starbaseLevel >= 1 && (() => {
            const tier = STARBASE_TIERS[sys.starbaseLevel as 1 | 2 | 3 | 4];
            const curPlat = sys.defensePlatforms ?? 0;
            const sbPower = getStarbasePower(sys);
            return (
              <button
                onClick={() => commandBuildDefensePlatform(sys.id)}
                title={`当前恒星基地战力 ⚔ ${sbPower} · 防御平台 ${curPlat}/${tier.maxPlatforms}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-emerald-900/60 border border-emerald-500/45 text-emerald-200 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                防御平台 {curPlat}/{tier.maxPlatforms} (⚔{sbPower} · ⬢{DEFENSE_PLATFORM_ALLOY_COST})
              </button>
            );
          })()}
        </div>

        {/* Starport Shipyard Section */}
        {sys.ownerId === game.playerEmpireId && sys.starbaseLevel >= 2 && (
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-sky-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Anchor className="w-3 h-3" />
                星港船坞（建造舰船）
              </span>
              <span className="text-[10px] text-slate-400">
                队列 {sys.shipyardQueue.length}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(['science', 'construction', ...HULL_ORDER] as const).map((kind) => {
                const empire = game.empires[game.playerEmpireId];
                const unlocked =
                  kind === 'science' || kind === 'construction' || isHullUnlocked(empire, kind);
                const info = getShipBuildCostAndDays(empire, kind);
                const shortLabel =
                  kind === 'science'
                    ? '科研船'
                    : kind === 'construction'
                    ? '工程船'
                    : HULL_CLASSES[kind].name;
                const reqTechName =
                  kind !== 'science' && kind !== 'construction' && HULL_CLASSES[kind].requiredTech
                    ? TECHNOLOGIES[HULL_CLASSES[kind].requiredTech!]?.name
                    : '';
                return (
                  <button
                    key={kind}
                    onClick={() => commandQueueShipBuild(sys.id, kind)}
                    title={
                      unlocked
                        ? `建造 ${info.label}（${info.alloyCost} 合金 · ${info.buildDays} 天）`
                        : `需研发科技「${reqTechName}」解锁`
                    }
                    className={`px-2 py-1.5 rounded border text-left cursor-pointer transition-colors ${
                      unlocked
                        ? 'bg-slate-900/90 hover:bg-sky-900/60 border-slate-700 hover:border-sky-400/60'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-50'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-slate-100 truncate">
                      {!unlocked ? '🔒 ' : ''}
                      {shortLabel}
                    </div>
                    <div className="text-[9px] text-purple-300 font-mono">
                      {unlocked ? `⬢${info.alloyCost} · ${info.buildDays}天` : `需${reqTechName.slice(0, 5)}`}
                    </div>
                  </button>
                );
              })}
            </div>

            {sys.shipyardQueue.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-800">
                {sys.shipyardQueue.slice(0, 3).map((item, idx) => {
                  const empire = game.empires[game.playerEmpireId];
                  const info = getShipBuildCostAndDays(empire, item.shipKind);
                  const pct = Math.min(100, Math.round((item.progress / item.totalDays) * 100));
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-[10px] bg-slate-900/70 px-2 py-1 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="text-slate-200 truncate">{info.label}</span>
                          <span className="font-mono text-sky-300">
                            {idx === 0 ? `${pct}%` : '排队'}
                          </span>
                        </div>
                        {idx === 0 && (
                          <div className="w-full h-1 rounded-full bg-slate-800 mt-0.5 overflow-hidden">
                            <div
                              className="h-full bg-sky-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => commandCancelShipBuild(sys.id, item.id)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Archaeological Site Section */}
        {sys.surveyedByPlayer && sys.archSite && (
          <div className="p-2.5 rounded-lg bg-purple-950/35 border border-purple-400/45 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-200">
                ⚱ 上古考古遗址：{sys.archSite.siteName}
              </span>
              <span className="text-[10px] font-mono text-purple-300">
                {sys.archSite.stage === 'completed'
                  ? '✓ 已出土圣物'
                  : sys.archSite.stage === 'excavating'
                  ? `发掘中 ${Math.round(sys.archSite.progress)}%`
                  : '待挖掘'}
              </span>
            </div>
            {sys.archSite.stage === 'excavating' && (
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all"
                  style={{ width: `${sys.archSite.progress}%` }}
                />
              </div>
            )}
            {sys.archSite.stage === 'undiscovered' && (
              <button
                onClick={() => commandStartExcavation(sys.id)}
                className="w-full py-1.5 rounded bg-purple-700/75 hover:bg-purple-600 text-white text-[11px] font-semibold cursor-pointer"
              >
                派遣帝国考古队发掘遗址（解锁帝国圣物）
              </button>
            )}
          </div>
        )}

        {/* Neutral Space Enclave Interaction Card */}
        {sys.exploredByPlayer && sys.enclave && (
          <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-400/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-200">
                🏛 中立飞地：{sys.enclave.name}
              </span>
              <span className="text-[10px] text-teal-300/80">
                {sys.enclave.type === 'curator' ? '学者研究所' : '星际商人工会'}
              </span>
            </div>
            {sys.enclave.type === 'curator' ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => commandBuyCurator('research_boost')}
                  className="p-1.5 rounded bg-sky-900/65 hover:bg-sky-800 border border-sky-400/50 text-left cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-sky-100">聘请学者顾问</div>
                  <div className="text-[9px] text-amber-300">⚡350 · 5年科研 +15%</div>
                </button>
                <button
                  onClick={() => commandBuyCurator('leviathan_intel')}
                  className="p-1.5 rounded bg-purple-900/65 hover:bg-purple-800 border border-purple-400/50 text-left cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-purple-100">利维坦弱点档案</div>
                  <div className="text-[9px] text-amber-300">⚡300 · 对巨兽伤害 +30%</div>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => commandBuyTrader('volatileMotes')}
                  className="p-1.5 rounded bg-amber-950/65 hover:bg-amber-900 border border-amber-500/45 text-center cursor-pointer"
                >
                  <div className="text-[10px] font-semibold text-amber-200">+15 易爆微粒</div>
                  <div className="text-[9px] text-slate-300">⚡280</div>
                </button>
                <button
                  onClick={() => commandBuyTrader('exoticGases')}
                  className="p-1.5 rounded bg-emerald-950/65 hover:bg-emerald-900 border border-emerald-500/45 text-center cursor-pointer"
                >
                  <div className="text-[10px] font-semibold text-emerald-200">+15 异星气</div>
                  <div className="text-[9px] text-slate-300">⚡280</div>
                </button>
                <button
                  onClick={() => commandBuyTrader('rareCrystals')}
                  className="p-1.5 rounded bg-sky-950/65 hover:bg-sky-900 border border-sky-500/45 text-center cursor-pointer"
                >
                  <div className="text-[10px] font-semibold text-sky-200">+15 稀有水晶</div>
                  <div className="text-[9px] text-slate-300">⚡280</div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cross-Galaxy Gateway & Rally Point Section */}
        {sys.ownerId === game.playerEmpireId && (
          <div className="p-2.5 rounded-lg bg-slate-950/75 border border-cyan-500/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-cyan-200">
                  ◎ 跨星系星门网络
                </div>
                <div className="text-[10px] text-slate-400">
                  {sys.hasGateway
                    ? '已激活 · 己方星门间 1 跳瞬移'
                    : '需「擎天堡要塞」或「巨型工程学」'}
                </div>
              </div>
              {sys.hasGateway ? (
                <span className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-[10px] font-semibold">
                  ✓ 已激活
                </span>
              ) : (
                <button
                  onClick={() => commandBuildGateway(sys.id)}
                  className="px-2.5 py-1.5 rounded bg-cyan-900/65 hover:bg-cyan-700/75 border border-cyan-400/50 text-cyan-100 text-[11px] font-medium cursor-pointer shrink-0"
                >
                  建造星门 (⬢450)
                </button>
              )}
            </div>
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                全帝国新建战舰自动飞往集结点合编
              </span>
              <button
                onClick={() => commandSetRallyPoint(sys.id)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                  game.empires[game.playerEmpireId]?.rallySystemId === sys.id
                    ? 'bg-emerald-600/40 border-emerald-400 text-emerald-100'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {game.empires[game.playerEmpireId]?.rallySystemId === sys.id
                  ? '✓ 当前集结点'
                  : '🚩 设为集结点'}
              </button>
            </div>
          </div>
        )}

        {/* Megastructures Builder & Status Section */}
        {sys.ownerId === game.playerEmpireId && (
          <div className="p-2.5 rounded-lg bg-slate-950/75 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                银河巨构工程
              </span>
              {!game.empires[game.playerEmpireId].completedTechs.includes('eng_mega_engineering') && (
                <span className="text-[9px] text-purple-300">需科技：巨构工程学 (T4)</span>
              )}
            </div>

            {sys.megastructure ? (
              (() => {
                const mDef = MEGASTRUCTURES[sys.megastructure.type];
                const pct = Math.min(
                  100,
                  Math.round((sys.megastructure.progress / sys.megastructure.totalDays) * 100)
                );
                return (
                  <div className="p-2 rounded bg-slate-900/85 border border-amber-500/40 space-y-1">
                    <div className="flex justify-between font-semibold text-amber-200">
                      <span>{mDef.name}</span>
                      <span className="font-mono text-[10px]">
                        {sys.megastructure.stage === 'completed' ? '✓ 已竣工运行' : `建造中 ${pct}%`}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-300">{mDef.summary}</div>
                    {sys.megastructure.stage === 'building' && (
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {MEGASTRUCTURE_LIST.map((m) => {
                  const empire = game.empires[game.playerEmpireId];
                  const unlocked = empire.completedTechs.includes(m.requiredTech);
                  const alreadyBuilt = Object.values(game.systems).some(
                    (s) => s.ownerId === empire.id && s.megastructure?.type === m.id
                  );
                  return (
                    <button
                      key={m.id}
                      onClick={() => commandStartMegastructure(sys.id, m.id)}
                      title={`${m.name}：${m.summary}（${m.alloyCost} 合金 · ${m.buildDays} 天）`}
                      className={`px-2 py-1.5 rounded border text-left cursor-pointer transition-colors ${
                        unlocked && !alreadyBuilt
                          ? 'bg-slate-900/90 hover:bg-amber-950/60 border-slate-700 hover:border-amber-400/60'
                          : 'bg-slate-950/50 border-slate-800/80 opacity-45'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-amber-100 truncate">
                        {alreadyBuilt ? '✓ ' : !unlocked ? '🔒 ' : ''}
                        {m.name}
                      </div>
                      <div className="text-[9px] text-purple-300 font-mono">
                        {alreadyBuilt ? '已建造' : `⬢${m.alloyCost}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Planet List */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
            行星与轨道天体 ({sys.planets.length})
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {sys.planets.map((p) => {
              const pDef = PLANET_CLASSES[p.planetClass];
              return (
                <div
                  key={p.id}
                  onClick={() => setSelection({ type: 'planet', id: p.id, systemId: sys.id })}
                  className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/65 hover:bg-slate-800/80 border border-slate-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pDef.baseColor }}
                    />
                    <span className="text-slate-200 truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{pDef.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                    {p.habitable && (
                      <span
                        className={`px-1.5 py-0.2 rounded ${
                          p.colonizedBy
                            ? 'bg-sky-500/30 text-sky-200'
                            : 'bg-emerald-500/25 text-emerald-300'
                        }`}
                      >
                        {p.colonizedBy ? '殖民地' : `宜居(${p.size})`}
                      </span>
                    )}
                    {p.surveyed && p.deposit && (
                      <span className="text-amber-300 font-mono">
                        {p.deposit.type === 'energy' && `⚡+${p.deposit.amount}`}
                        {p.deposit.type === 'minerals' && `◆+${p.deposit.amount}`}
                        {p.deposit.type === 'research' && `◈+${p.deposit.amount}`}
                        {p.deposit.type === 'alloys' && `⬢+${p.deposit.amount}`}
                        {p.stationType !== 'none' ? ' ✓' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
