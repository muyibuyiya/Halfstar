import React, { useState } from 'react';
import {
  Globe2,
  X,
  Users,
  ShieldCheck,
  Home,
  Smile,
  Plus,
  Hammer,
  Rocket,
  Lock,
  Trash2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PLANET_CLASSES } from '../data/planetClasses';
import {
  BUILDING_LIST,
  BUILDINGS,
  DISTRICT_ORDER,
  DISTRICTS,
} from '../data/districtsAndBuildings';
import { DESIGNATION_META, getUsedDistricts } from '../engine/colonySystem';
import {
  COLONIZE_ALLOY_COST,
  COLONIZE_CG_COST,
  COLONIZE_FOOD_COST,
} from '../engine/simulation';
import { BuildingId, PlanetDesignation } from '../types/game';
import { TECHNOLOGIES } from '../data/technologies';
import { getBuildingUpgradeCost } from '../engine/commands';

export const PlanetDrawer: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const commandColonize = useGameStore((s) => s.commandColonize);
  const commandQueueDistrict = useGameStore((s) => s.commandQueueDistrict);
  const commandQueueBuilding = useGameStore((s) => s.commandQueueBuilding);
  const commandCancelBuild = useGameStore((s) => s.commandCancelBuild);
  const commandStartTerraforming = useGameStore((s) => s.commandStartTerraforming);
  const commandSetPlanetDesignation = useGameStore((s) => s.commandSetPlanetDesignation);
  const commandTogglePlanetAutoManage = useGameStore((s) => s.commandTogglePlanetAutoManage);
  const commandUpgradeBuilding = useGameStore((s) => s.commandUpgradeBuilding);
  const commandResettlePop = useGameStore((s) => s.commandResettlePop);

  const [showBuildPicker, setShowBuildPicker] = useState(false);
  const [resettleDest, setResettleDest] = useState('');

  if (selection?.type !== 'planet') return null;
  const sys = game.systems[selection.systemId];
  const planet = sys?.planets.find((p) => p.id === selection.id);
  if (!sys || !planet) return null;

  const pDef = PLANET_CLASSES[planet.planetClass];
  const empire = game.empires[game.playerEmpireId];
  const colony = planet.colony;

  // Uncolonized planet view (compact bottom-left card with Colonize CTA if habitable)
  if (!planet.colonizedBy || !colony) {
    const canColonize =
      planet.habitable &&
      sys.ownerId === game.playerEmpireId &&
      planet.colonizingProgress === null;

    return (
      <div className="pointer-events-auto fixed bottom-4 left-16 z-25 w-96 hud-panel rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-sky-500/25 bg-sky-950/35">
          <div className="flex items-center gap-2">
            <Globe2
              className={`w-4 h-4 ${planet.habitable ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <div>
              <div className="text-sm font-bold text-slate-100">{planet.name}</div>
              <div className="text-[11px] text-slate-400">
                {pDef.name} · 规模 {planet.size} · {sys.name}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelection({ type: 'system', id: sys.id })}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <p className="text-slate-300 leading-relaxed">{pDef.description}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">宜居状态</div>
              <div
                className={`font-semibold mt-0.5 ${
                  planet.habitable ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {planet.colonizingProgress !== null
                  ? `正在殖民 (${Math.round(planet.colonizingProgress)}%)`
                  : planet.habitable
                  ? '适宜建立殖民地'
                  : '不可宜居'}
              </div>
            </div>

            <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">轨道矿藏</div>
              <div className="font-semibold mt-0.5 text-slate-200">
                {!planet.surveyed
                  ? '尚未调查'
                  : planet.deposit
                  ? `${
                      planet.deposit.type === 'energy'
                        ? '能量币'
                        : planet.deposit.type === 'minerals'
                        ? '矿物'
                        : planet.deposit.type === 'alloys'
                        ? '合金'
                        : '科研点'
                    } +${planet.deposit.amount}${planet.stationType !== 'none' ? ' (开采中)' : ''}`
                  : '无轨道矿藏'}
              </div>
            </div>
          </div>

          {planet.colonizingProgress !== null && (
            <div>
              <div className="flex justify-between text-[11px] text-emerald-300 mb-1">
                <span>殖民前哨建设进度</span>
                <span className="font-mono">{Math.round(planet.colonizingProgress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all"
                  style={{ width: `${Math.min(100, planet.colonizingProgress)}%` }}
                />
              </div>
            </div>
          )}

          {canColonize && (
            <button
              onClick={() => commandColonize(sys.id, planet.id)}
              className="w-full py-2 px-3 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              派遣殖民船建立殖民地 ({COLONIZE_ALLOY_COST}合金 / {COLONIZE_FOOD_COST}食物 /{' '}
              {COLONIZE_CG_COST}消费品)
            </button>
          )}

          {/* Terraforming on owned uncolonized planets (Habitable or Barren) */}
          {sys.ownerId === game.playerEmpireId &&
            (planet.habitable || planet.planetClass === 'barren') &&
            planet.planetClass !== 'gaia' && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                {planet.terraforming ? (
                  <div>
                    <div className="flex justify-between text-[11px] text-teal-300 mb-1">
                      <span>
                        环境改造中 → {PLANET_CLASSES[planet.terraforming.targetClass].name}
                      </span>
                      <span className="font-mono">
                        {Math.round(
                          (planet.terraforming.progress / planet.terraforming.totalDays) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-teal-400"
                        style={{
                          width: `${
                            (planet.terraforming.progress / planet.terraforming.totalDays) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {planet.planetClass !== 'continental' && (
                      <button
                        onClick={() => commandStartTerraforming(sys.id, planet.id, 'continental')}
                        className="flex-1 py-1.5 px-2 rounded bg-sky-950/75 hover:bg-sky-800/80 border border-sky-500/40 text-sky-200 text-[11px] cursor-pointer"
                      >
                        改造为大陆星 (⚡500)
                      </button>
                    )}
                    <button
                      onClick={() => commandStartTerraforming(sys.id, planet.id, 'gaia')}
                      className="flex-1 py-1.5 px-2 rounded bg-emerald-950/75 hover:bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 text-[11px] cursor-pointer"
                    >
                      重塑为盖亚星 (⚡900)
                    </button>
                  </div>
                )}
              </div>
            )}

          {planet.habitable && sys.ownerId !== game.playerEmpireId && (
            <div className="text-[11px] text-amber-300/90 bg-amber-950/35 border border-amber-500/30 rounded px-2.5 py-1.5">
              提示：需先派遣工程船在「{sys.name}」建造恒星前哨站，方可殖民此星球。
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full Colonized Planet Management Panel
  const usedDistricts = getUsedDistricts(colony);
  const queuedBuildingsCount = colony.buildQueue.filter((q) => q.kind === 'building').length;
  const freeBuildingSlots =
    colony.maxBuildingSlots - colony.buildings.length - queuedBuildingsCount;

  return (
    <div className="pointer-events-auto fixed bottom-4 left-16 z-25 w-[540px] max-w-[calc(100vw-20rem)] max-h-[calc(100vh-5rem)] hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sky-500/25 bg-gradient-to-r from-sky-950/60 to-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full border-2 border-sky-400/70 shadow-inner shrink-0"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${pDef.secondaryColor}, ${pDef.baseColor})`,
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{planet.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200">
                {pDef.name}
              </span>
              <span className="text-[10px] text-emerald-300 font-mono">
                宜居 {colony.habitability}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {sys.name} · 区划容量 {usedDistricts}/{planet.size}
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

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-slate-950/50 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">人口</span>
              <span className="font-mono font-bold text-white">{planet.popCount}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-0.5 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, colony.popGrowthProgress)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck
            className={`w-4 h-4 shrink-0 ${
              colony.stability >= 60
                ? 'text-emerald-400'
                : colony.stability >= 40
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          />
          <div>
            <div className="text-[10px] text-slate-400">稳定度</div>
            <div className="font-mono font-bold text-slate-100">{colony.stability}%</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Home
            className={`w-4 h-4 shrink-0 ${
              colony.housing >= planet.popCount ? 'text-sky-300' : 'text-rose-400'
            }`}
          />
          <div>
            <div className="text-[10px] text-slate-400">住房</div>
            <div className="font-mono font-bold text-slate-100">
              {colony.housing - planet.popCount >= 0 ? '+' : ''}
              {colony.housing - planet.popCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Smile
            className={`w-4 h-4 shrink-0 ${
              colony.amenities >= 0 ? 'text-teal-300' : 'text-rose-400'
            }`}
          />
          <div>
            <div className="text-[10px] text-slate-400">舒适度</div>
            <div className="font-mono font-bold text-slate-100">
              {colony.amenities >= 0 ? `+${colony.amenities}` : colony.amenities}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Planet Designation & AI Auto-Governor */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-sky-500/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-sky-300 font-semibold shrink-0">星球专精：</span>
            <select
              value={colony.designation ?? 'balanced'}
              onChange={(e) =>
                commandSetPlanetDesignation(sys.id, planet.id, e.target.value as PlanetDesignation)
              }
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {(Object.keys(DESIGNATION_META) as PlanetDesignation[]).map((d) => (
                <option key={d} value={d}>
                  {DESIGNATION_META[d].name}（{DESIGNATION_META[d].summary}）
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => commandTogglePlanetAutoManage(sys.id, planet.id)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer shrink-0 transition-colors ${
              colony.autoManage
                ? 'bg-emerald-600/40 border-emerald-400 text-emerald-100'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {colony.autoManage ? '✓ AI托管建设中' : '开启AI托管'}
          </button>
        </div>

        {/* Pop Resettlement (when player owns >= 2 colonies) */}
        {(() => {
          const otherColonies: Array<{ sysId: string; planetId: string; label: string }> = [];
          for (const s of Object.values(game.systems)) {
            for (const p of s.planets) {
              if (p.colonizedBy === game.playerEmpireId && p.colony && p.id !== planet.id) {
                otherColonies.push({
                  sysId: s.id,
                  planetId: p.id,
                  label: `${p.name} (${s.name} · ${p.popCount}人口)`,
                });
              }
            }
          }
          if (otherColonies.length === 0 || planet.popCount <= 1) return null;
          const activeVal =
            resettleDest && otherColonies.some((c) => `${c.sysId}|${c.planetId}` === resettleDest)
              ? resettleDest
              : `${otherColonies[0].sysId}|${otherColonies[0].planetId}`;
          const [toSysId, toPlanetId] = activeVal.split('|');
          return (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/75 border border-slate-800">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[11px] text-amber-300 font-semibold shrink-0">
                  人口迁移：
                </span>
                <select
                  value={activeVal}
                  onChange={(e) => setResettleDest(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none flex-1 min-w-0 cursor-pointer"
                >
                  {otherColonies.map((c) => (
                    <option key={c.planetId} value={`${c.sysId}|${c.planetId}`}>
                      迁往 {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => commandResettlePop(sys.id, planet.id, toSysId, toPlanetId)}
                className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-700/75 border border-amber-500/50 text-amber-100 text-[11px] font-semibold cursor-pointer shrink-0"
              >
                迁移 1 人口 (⚡60)
              </button>
            </div>
          );
        })()}

        {/* Terraforming status / action for colonized planets */}
        {planet.planetClass !== 'gaia' && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/75 border border-slate-800">
            {planet.terraforming ? (
              <div className="w-full">
                <div className="flex justify-between text-[11px] text-teal-300 mb-1">
                  <span>
                    行星环境改造 → {PLANET_CLASSES[planet.terraforming.targetClass].name}
                  </span>
                  <span className="font-mono">
                    {Math.round(
                      (planet.terraforming.progress / planet.terraforming.totalDays) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-400"
                    style={{
                      width: `${
                        (planet.terraforming.progress / planet.terraforming.totalDays) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="text-[11px] text-slate-300">
                  环境重塑（提升至 100% 宜居度）
                </span>
                <div className="flex gap-1.5">
                  {planet.planetClass !== 'continental' && (
                    <button
                      onClick={() => commandStartTerraforming(sys.id, planet.id, 'continental')}
                      className="px-2 py-1 rounded bg-sky-950/80 hover:bg-sky-800 border border-sky-500/40 text-sky-200 text-[10px] cursor-pointer"
                    >
                      大陆化 (⚡500)
                    </button>
                  )}
                  <button
                    onClick={() => commandStartTerraforming(sys.id, planet.id, 'gaia')}
                    className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-200 text-[10px] cursor-pointer"
                  >
                    盖亚重塑 (⚡900)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Colony Net Output Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 mr-1">本星净产：</span>
          {(
            [
              ['energy', '⚡', 'text-amber-300'],
              ['minerals', '◆', 'text-rose-300'],
              ['food', '✿', 'text-emerald-300'],
              ['alloys', '⬢', 'text-purple-300'],
              ['consumerGoods', '▣', 'text-orange-300'],
              ['research', '◈', 'text-sky-300'],
              ['unity', '✦', 'text-teal-300'],
            ] as const
          ).map(([key, sym, color]) => {
            const val = colony.monthlyNet[key];
            if (val === 0) return null;
            return (
              <span
                key={key}
                className={`px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 font-mono ${
                  val > 0 ? color : 'text-rose-400'
                }`}
              >
                {sym} {val > 0 ? `+${val}` : val}
              </span>
            );
          })}
        </div>

        {/* 4 Districts */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
              行星区划 ({usedDistricts}/{planet.size})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DISTRICT_ORDER.map((dKey) => {
              const def = DISTRICTS[dKey];
              const count = colony.districts[dKey];
              return (
                <div
                  key={dKey}
                  className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800 hover:border-slate-600 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="font-semibold text-slate-100">{def.name}</span>
                      <span className="font-mono text-sky-300 font-bold">x{count}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {dKey === 'city'
                        ? `+${def.housing}住房 +${def.buildingSlots}建筑槽`
                        : `+${Object.values(def.output)[0]}产出 · +${def.housing}住房`}
                    </div>
                  </div>
                  <button
                    onClick={() => commandQueueDistrict(sys.id, planet.id, dKey)}
                    disabled={usedDistricts >= planet.size}
                    title={`建造 ${def.name} (${def.mineralCost} 矿物, ${def.buildDays} 天)`}
                    className="px-2 py-1 rounded bg-sky-900/70 hover:bg-sky-700/80 disabled:opacity-40 border border-sky-500/40 text-sky-100 text-[11px] font-medium shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {def.mineralCost}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Building Slots */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
              行星建筑 ({colony.buildings.length}/{colony.maxBuildingSlots})
            </span>
            {freeBuildingSlots > 0 && (
              <button
                onClick={() => setShowBuildPicker((v) => !v)}
                className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/50 text-emerald-200 cursor-pointer"
              >
                {showBuildPicker ? '收起建筑目录' : '+ 建造新建筑'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, idx) => {
              const bId = colony.buildings[idx];
              const isUnlocked = idx < colony.maxBuildingSlots;

              if (bId) {
                const bDef = BUILDINGS[bId];
                const bLvl = (colony.buildingLevels?.[idx] ?? 1) as 1 | 2 | 3;
                const upgCost = getBuildingUpgradeCost(bId, bLvl);
                const mult = bLvl === 3 ? 2.8 : bLvl === 2 ? 1.85 : 1;
                return (
                  <div
                    key={idx}
                    title={bDef.description}
                    className="p-2 rounded-lg bg-sky-950/45 border border-sky-500/35 flex flex-col justify-between min-h-[68px] gap-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sky-100 text-[11px] truncate">
                        {bDef.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1 rounded shrink-0 ${
                          bLvl === 3
                            ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                            : bLvl === 2
                            ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Lv.{bLvl}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {bId === 'strategic_refinery'
                        ? `+${bLvl} 全部三种战略资源`
                        : Object.entries(bDef.output)
                            .map(
                              ([k, v]) =>
                                `+${Math.round((v ?? 0) * mult)} ${
                                  k === 'alloys'
                                    ? '合金'
                                    : k === 'consumerGoods'
                                    ? '消费品'
                                    : k === 'research'
                                    ? '科研'
                                    : k === 'unity'
                                    ? '凝聚'
                                    : k === 'energy'
                                    ? '能量'
                                    : '矿物'
                                }`
                            )
                            .join(' ') ||
                          (bDef.stabilityBonus > 0
                            ? `+${Math.round(bDef.stabilityBonus * mult)} 稳定`
                            : '') ||
                          (bDef.popGrowthBonus > 0
                            ? `+${Math.round(bDef.popGrowthBonus * mult * 100)}% 增长`
                            : '')}
                    </div>
                    {upgCost && (
                      <button
                        onClick={() => commandUpgradeBuilding(sys.id, planet.id, idx)}
                        title={`升级至 Lv.${bLvl + 1}：消耗 ${upgCost.minerals} 矿物 + ${upgCost.strategicAmount} ${upgCost.strategicName}`}
                        className="mt-0.5 w-full py-0.5 rounded bg-purple-900/55 hover:bg-purple-700/70 border border-purple-400/40 text-purple-100 text-[9px] font-medium cursor-pointer truncate"
                      >
                        ⬆ 升级 (◆{upgCost.minerals}+{upgCost.strategicAmount}{upgCost.strategicName.slice(0, 2)})
                      </button>
                    )}
                  </div>
                );
              }

              if (isUnlocked) {
                return (
                  <button
                    key={idx}
                    onClick={() => setShowBuildPicker(true)}
                    className="p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/80 border border-dashed border-slate-600 text-slate-400 hover:text-sky-200 flex items-center justify-center gap-1 min-h-[54px] cursor-pointer text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    空建筑槽
                  </button>
                );
              }

              return (
                <div
                  key={idx}
                  title="建造「城市区划」可解锁此建筑槽"
                  className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/70 text-slate-600 flex items-center justify-center gap-1 min-h-[54px] text-[10px]"
                >
                  <Lock className="w-3 h-3" />
                  需城市区划
                </div>
              );
            })}
          </div>

          {/* Building Picker Drawer */}
          {showBuildPicker && freeBuildingSlots > 0 && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/90 border border-sky-500/35 space-y-1.5">
              <div className="text-[10px] text-sky-300 font-semibold mb-1">
                选择要建造的行星建筑：
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {BUILDING_LIST.map((b) => {
                  const lockedByTech =
                    b.requiredTech && !empire.completedTechs.includes(b.requiredTech);
                  const alreadyUnique =
                    b.uniquePerPlanet && colony.buildings.includes(b.id as BuildingId);
                  return (
                    <div
                      key={b.id}
                      className={`p-2 rounded border flex items-center justify-between gap-2 ${
                        lockedByTech || alreadyUnique
                          ? 'bg-slate-900/40 border-slate-800 opacity-55'
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-sky-400/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100">{b.name}</span>
                          {lockedByTech && b.requiredTech && (
                            <span className="text-[9px] px-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                              需科技：{TECHNOLOGIES[b.requiredTech]?.name}
                            </span>
                          )}
                          {alreadyUnique && (
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                              已建造
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{b.description}</div>
                      </div>
                      <button
                        disabled={Boolean(lockedByTech || alreadyUnique)}
                        onClick={() => {
                          const res = commandQueueBuilding(sys.id, planet.id, b.id);
                          if (res.ok) setShowBuildPicker(false);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-700/70 hover:bg-sky-600 disabled:opacity-35 text-white text-[11px] font-medium shrink-0 cursor-pointer"
                      >
                        ◆ {b.mineralCost}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Build Queue */}
        {colony.buildQueue.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hammer className="w-3.5 h-3.5" />
              建造队列 ({colony.buildQueue.length})
            </div>
            <div className="space-y-1.5">
              {colony.buildQueue.map((item, idx) => {
                const name =
                  item.kind === 'district'
                    ? DISTRICTS[item.targetId as keyof typeof DISTRICTS].name
                    : BUILDINGS[item.targetId as BuildingId].name;
                const pct = Math.min(100, Math.round((item.progress / item.totalDays) * 100));
                return (
                  <div
                    key={item.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-700/80 flex items-center gap-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-100 font-medium">
                          {idx === 0 ? '施工中：' : '排队中：'}
                          {name}
                        </span>
                        <span className="font-mono text-amber-300">
                          {idx === 0 ? `${pct}% (${item.totalDays - item.progress}天)` : '等待'}
                        </span>
                      </div>
                      {idx === 0 && (
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => commandCancelBuild(sys.id, planet.id, item.id)}
                      title="取消建造并退还矿物"
                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
