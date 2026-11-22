import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, Lock, Star, Scroll, Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  ASCENSION_PERKS,
  getAvailableAscensionSlots,
  getNextTraditionUnityCost,
  TRADITION_TREES,
} from '../data/traditions';
import { EDICTS } from '../data/edicts';
import { TECHNOLOGIES } from '../data/technologies';
import {
  getOfficerLevelMult,
  OFFICER_POOL,
  OFFICER_RECRUIT_UNITY_COST,
} from '../data/leaders';
import { RELICS } from '../data/relics';
import { DEFAULT_POLICIES, POLICY_GROUPS } from '../data/policies';
import { EmpirePolicies } from '../types/game';
import { computeEmpireSize } from '../engine/empireSize';
import { evaluateEmpireFactions } from '../data/factions';
import { BECOME_CRISIS_STAGES } from '../engine/commands';

export const TraditionsDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandUnlockTradition = useGameStore((s) => s.commandUnlockTradition);
  const commandUnlockAscension = useGameStore((s) => s.commandUnlockAscension);
  const commandToggleEdict = useGameStore((s) => s.commandToggleEdict);
  const commandRecruitOfficer = useGameStore((s) => s.commandRecruitOfficer);
  const commandAssignAdmiral = useGameStore((s) => s.commandAssignAdmiral);
  const commandActivateRelic = useGameStore((s) => s.commandActivateRelic);
  const commandSetPolicy = useGameStore((s) => s.commandSetPolicy);
  const commandAdvanceBecomeCrisis = useGameStore((s) => s.commandAdvanceBecomeCrisis);

  const [tab, setTab] = useState<'traditions' | 'edicts' | 'policies' | 'factions' | 'officers' | 'relics'>('traditions');

  if (activeDrawer !== 'traditions') return null;

  const empire = game.empires[game.playerEmpireId];
  const empireSize = computeEmpireSize(game, game.playerEmpireId);
  const nextCost = Math.round(
    getNextTraditionUnityCost(empire.unlockedTraditions.length) *
      empireSize.traditionCostMult
  );
  const factions = evaluateEmpireFactions(game, game.playerEmpireId);
  const ascensionSlots = getAvailableAscensionSlots(empire.unlockedTraditions);
  const freeAscensionSlots = ascensionSlots - empire.unlockedAscensions.length;
  const activeEdicts = empire.activeEdicts ?? [];

  return (
    <div className="pointer-events-auto fixed top-15 left-16 bottom-4 w-[860px] max-w-[calc(100vw-20rem)] z-30 hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sky-500/25 bg-sky-950/40">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-teal-300" />
          <div>
            <h2 className="text-sm font-bold text-white">帝国传统、飞升天赋与战略法令</h2>
            <p className="text-[11px] text-slate-400">
              当前凝聚力：
              <span className="text-teal-300 font-mono font-bold ml-1">
                ✦ {Math.floor(empire.resources.unity)}
              </span>
              {' · '}下一项传统需{' '}
              <span className="text-amber-300 font-mono font-bold">{nextCost}</span> 凝聚力
              {' · '}已启用法令 <span className="text-sky-300 font-mono">{activeEdicts.length}</span> 项
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-950/80 border border-slate-700 p-0.5 text-xs">
            <button
              onClick={() => setTab('traditions')}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab === 'traditions'
                  ? 'bg-teal-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              传统与飞升
            </button>
            <button
              onClick={() => setTab('edicts')}
              className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer ${
                tab === 'edicts'
                  ? 'bg-teal-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scroll className="w-3.5 h-3.5" />
              帝国法令 ({activeEdicts.length})
            </button>
            <button
              onClick={() => setTab('policies')}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab === 'policies'
                  ? 'bg-sky-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              帝国政策
            </button>
            <button
              onClick={() => setTab('factions')}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab === 'factions'
                  ? 'bg-amber-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              国内派系
            </button>
            <button
              onClick={() => setTab('officers')}
              className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer ${
                tab === 'officers'
                  ? 'bg-teal-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              领袖内阁 ({empire.officers?.length ?? 0})
            </button>
            <button
              onClick={() => setTab('relics')}
              className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer ${
                tab === 'relics'
                  ? 'bg-purple-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚱ 圣物库 ({empire.relics?.length ?? 0}/{RELICS.length})
            </button>
          </div>
          <button
            onClick={() => setActiveDrawer('none')}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {tab === 'traditions' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* 3 Tradition Trees */}
          <div className="grid grid-cols-3 gap-3.5">
            {TRADITION_TREES.map((tree) => {
              const unlockedInTree = tree.perks.filter((p) =>
                empire.unlockedTraditions.includes(p.id)
              ).length;
              const completed = unlockedInTree === tree.perks.length;

              return (
                <div
                  key={tree.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5"
                  style={{ borderColor: completed ? `${tree.color}88` : undefined }}
                >
                  <div className="pb-2 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: tree.color }}>
                        {tree.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {unlockedInTree}/{tree.perks.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {tree.description}
                    </p>
                  </div>

                  <div className="space-y-2 flex-1">
                    {tree.perks.map((perk) => {
                      const isUnlocked = empire.unlockedTraditions.includes(perk.id);
                      const canAfford = empire.resources.unity >= nextCost;
                      return (
                        <button
                          key={perk.id}
                          disabled={isUnlocked}
                          onClick={() => commandUnlockTradition(perk.id)}
                          className={`w-full text-left p-2.5 rounded-md border transition-all ${
                            isUnlocked
                              ? 'bg-emerald-950/40 border-emerald-500/50 cursor-default'
                              : canAfford
                              ? 'bg-slate-900/80 border-slate-700 hover:border-teal-400 cursor-pointer'
                              : 'bg-slate-900/50 border-slate-800 opacity-70 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100">{perk.name}</span>
                            {isUnlocked ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <span className="text-[10px] font-mono text-teal-300">✦{nextCost}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-sky-300 mt-0.5 font-medium">
                            {perk.summary}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{perk.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ascension Perks Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/25 via-slate-950/80 to-purple-950/25 border border-amber-500/35 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                  帝国飞升天赋 (已激活 {empire.unlockedAscensions.length} / 已解锁槽位 {ascensionSlots})
                </span>
              </div>
              {freeAscensionSlots > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/25 text-amber-200 animate-pulse font-semibold">
                  有 {freeAscensionSlots} 个可用飞升槽位！
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ASCENSION_PERKS.map((asc) => {
                const active = empire.unlockedAscensions.includes(asc.id);
                const locked = !active && freeAscensionSlots <= 0;
                return (
                  <button
                    key={asc.id}
                    disabled={active}
                    onClick={() => commandUnlockAscension(asc.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      active
                        ? 'bg-amber-900/35 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.2)] cursor-default'
                        : locked
                        ? 'bg-slate-900/50 border-slate-800 opacity-60 cursor-pointer'
                        : 'bg-slate-900/85 border-amber-500/50 hover:bg-amber-950/40 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-100">{asc.name}</span>
                      {active ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      ) : locked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <span className="text-[10px] text-amber-300 font-semibold">可激活</span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-300 font-semibold mt-1">
                      {asc.summary}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {asc.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Become the Crisis: 4th Endgame Victory Path */}
          {(() => {
            const stage = empire.becomeCrisisStage ?? 0;
            const nextDef = stage < 4 ? BECOME_CRISIS_STAGES[stage] : null;
            return (
              <div className="pt-3 border-t border-rose-500/30">
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 via-slate-950/85 to-purple-950/60 border border-rose-500/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-rose-200 flex items-center gap-2">
                        ☠ 化身天灾：归零者 / 二向箔降维工程（第 4 终局路线）
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        需先解锁 ≥2 项飞升天赋。推进 4 阶段工程将引发全银河 AI 联合宣战围剿，完成最终阶段即触发「宇宙归零胜利」！
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-rose-900/60 border border-rose-400/50 text-rose-100 font-mono font-bold text-xs shrink-0">
                      阶段 {stage} / 4
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-all"
                      style={{ width: `${(stage / 4) * 100}%` }}
                    />
                  </div>
                  {nextDef ? (
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="text-[11px] text-rose-200/90">
                        <span className="font-semibold">{nextDef.name}</span> · {nextDef.summary}
                      </div>
                      <button
                        onClick={commandAdvanceBecomeCrisis}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                      >
                        推进工程（⬢{nextDef.alloys} · ◉{nextDef.darkMatter}暗物质
                        {nextDef.unity > 0 ? ` · ✦${nextDef.unity}` : ''}）
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-fuchsia-300">
                      ✓ 宇宙归零工程已完成！
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : tab === 'edicts' ? (
        /* Empire Edicts Tab */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            帝国法令可随时开启或关闭。启用中的法令将按月消耗对应资源（凝聚力 / 能量币 / 食物）并提供强大的全局战略加成。
          </div>

          <div className="grid grid-cols-2 gap-3">
            {EDICTS.map((ed) => {
              const isActive = activeEdicts.includes(ed.id);
              const lockedByTech =
                ed.requiredTech && !empire.completedTechs.includes(ed.requiredTech);
              const resLabel =
                ed.upkeepResource === 'unity'
                  ? '✦ 凝聚力'
                  : ed.upkeepResource === 'energy'
                  ? '⚡ 能量币'
                  : '✿ 食物';

              return (
                <button
                  key={ed.id}
                  onClick={() => commandToggleEdict(ed.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-950/55 border-teal-400 shadow-[0_0_16px_rgba(45,212,191,0.2)]'
                      : lockedByTech
                      ? 'bg-slate-950/40 border-slate-800 opacity-55'
                      : 'bg-slate-900/80 border-slate-800 hover:border-sky-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                      {lockedByTech && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                      {ed.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-teal-500/25 text-teal-200 font-semibold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      -{ed.monthlyUpkeep} {resLabel}/月
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300 font-medium mt-1">
                    {ed.summary}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {ed.description}
                  </p>
                  {lockedByTech && ed.requiredTech && (
                    <div className="mt-1.5 text-[10px] text-purple-300">
                      需研发科技：{TECHNOLOGIES[ed.requiredTech]?.name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : tab === 'officers' ? (
        /* Empire Officers & Council Tab */
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Active Roster */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              在役帝国将领与首席科学家 ({empire.officers?.length ?? 0})
            </div>
            {(empire.officers?.length ?? 0) === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 text-center">
                尚未招募将领或首席科学家 — 从下方英才库消耗 {OFFICER_RECRUIT_UNITY_COST} 凝聚力招募！
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {(empire.officers ?? []).map((off) => {
                  const mult = getOfficerLevelMult(off.level);
                  const playerMilFleets = Object.values(game.fleets).filter(
                    (f) => f.ownerId === game.playerEmpireId && f.shipType === 'corvette'
                  );
                  return (
                    <div
                      key={off.id}
                      className="p-3 rounded-lg bg-slate-900/80 border border-sky-500/35 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{off.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/25 text-sky-200">
                            {off.role === 'admiral' ? '海军上将' : '首席科学家'} · Lv.{off.level}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300">
                          倍率 {mult.toFixed(2)}x
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300">{off.traitName} · {off.traitSummary}</div>
                      {off.level < 5 && (
                        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${off.xp}%` }} />
                        </div>
                      )}
                      {off.role === 'admiral' && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400">指派舰队：</span>
                          <select
                            value={off.assignedFleetId ?? ''}
                            onChange={(e) =>
                              commandAssignAdmiral(off.id, e.target.value || null)
                            }
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 cursor-pointer"
                          >
                            <option value="">待命（未指派）</option>
                            {playerMilFleets.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} (⚔{f.power})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {off.role === 'scientist' && (
                        <div className="text-[10px] text-sky-300/80 pt-1 border-t border-slate-800">
                          ✓ 已自动进驻帝国最高科学院，每月积累科研经验升级
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recruit Pool */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
              帝国英才招募库（每名消耗 ✦ {OFFICER_RECRUIT_UNITY_COST} 凝聚力）
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {OFFICER_POOL.map((tpl) => {
                const hired = (empire.officers ?? []).some((o) => o.templateId === tpl.id);
                return (
                  <div
                    key={tpl.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                      hired
                        ? 'bg-emerald-950/25 border-emerald-500/40 opacity-65'
                        : 'bg-slate-900/75 border-slate-800 hover:border-teal-400/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{tpl.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {tpl.role === 'admiral' ? '上将' : '科学家'}
                        </span>
                        {tpl.isEasterEgg && (
                          <span className="text-[9px] px-1 rounded bg-purple-600/35 text-purple-200">
                            三体彩蛋
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-300 mt-0.5">{tpl.traitName}</div>
                      <div className="text-[10px] text-slate-400">{tpl.traitSummary}</div>
                    </div>
                    <button
                      disabled={hired}
                      onClick={() => commandRecruitOfficer(tpl.id)}
                      className="px-2.5 py-1.5 rounded bg-teal-700/75 hover:bg-teal-600 disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      {hired ? '已服役' : `招募 ✦${OFFICER_RECRUIT_UNITY_COST}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : tab === 'policies' ? (
        /* Empire Policies Tab */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-sky-950/35 border border-sky-500/35 text-slate-300">
            帝国战略政策决定科研倾斜方向、商业航线转化与海军作战学说，切换后立即对全国生效且无维护成本。
          </div>
          <div className="space-y-4">
            {POLICY_GROUPS.map((group) => {
              const currentVal = (empire.policies ?? DEFAULT_POLICIES)[group.key];
              return (
                <div
                  key={group.key}
                  className="p-4 rounded-xl bg-slate-900/75 border border-slate-700/80 space-y-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{group.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{group.description}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {group.options.map((opt) => {
                      const active = currentVal === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            commandSetPolicy(
                              group.key,
                              opt.id as EmpirePolicies[typeof group.key]
                            )
                          }
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-sky-900/55 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-100">{opt.label}</span>
                            {active && (
                              <span className="text-[9px] px-1 rounded bg-sky-500/30 text-sky-200">
                                生效中
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">{opt.summary}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === 'factions' ? (
        /* Internal Domestic Factions Tab */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/35 text-slate-300">
            国内政治派系会实时审视你的帝国政策、外交立场与舰队建设。派系满意度 ≥ 60% 时，每月将为帝国额外贡献 <span className="text-teal-300 font-semibold">凝聚力</span> 与 <span className="text-indigo-300 font-semibold">影响力</span>！
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {factions.map((fac) => (
              <div
                key={fac.id}
                className="p-4 rounded-xl bg-slate-900/75 border border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: fac.color }}
                      />
                      {fac.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{fac.ideology}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-mono font-bold ${
                        fac.approval >= 75
                          ? 'text-emerald-300'
                          : fac.approval >= 60
                          ? 'text-sky-300'
                          : 'text-amber-300'
                      }`}
                    >
                      满意度 {fac.approval}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      +{fac.unityIncome} 凝聚 · +{fac.influenceIncome} 影响/月
                    </div>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${fac.approval}%`, backgroundColor: fac.color }}
                  />
                </div>
                <div className="space-y-1.5 pt-1">
                  {fac.issues.map((iss, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className={iss.satisfied ? 'text-slate-200' : 'text-slate-500'}>
                        {iss.satisfied ? '✓ ' : '○ '}
                        {iss.label}
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          iss.satisfied ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        +{iss.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empire Relics Vault Tab */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-purple-950/35 border border-purple-500/35 text-slate-300">
            探索银河并占领带有「⚱ 上古考古遗址」的星系，派遣考古队发掘即可永久获得帝国圣物。圣物自带强力被动光环，并可定期消耗凝聚力激活爆发效果！
          </div>
          <div className="grid grid-cols-2 gap-3">
            {RELICS.map((r) => {
              const owned = empire.relics?.includes(r.id);
              const readyDay = empire.relicCooldowns?.[r.id] ?? 0;
              const cdLeft = Math.max(0, readyDay - game.date.totalDays);
              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                    owned
                      ? 'bg-purple-950/40 border-purple-400/60 shadow-[0_0_16px_rgba(168,85,247,0.18)]'
                      : 'bg-slate-900/55 border-slate-800 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-100 text-sm">
                        ⚱ {owned ? r.relicName : '未知上古圣物'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {owned ? '✓ 已典藏' : `遗址：${r.siteName}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-300 font-medium mt-1">
                      {r.passiveSummary}
                    </div>
                    <div className="text-[11px] text-amber-300 mt-0.5">{r.activeSummary}</div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {owned && (
                    <button
                      disabled={cdLeft > 0}
                      onClick={() => commandActivateRelic(r.id)}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-45 text-white font-semibold cursor-pointer"
                    >
                      {cdLeft > 0
                        ? `圣物充能中（剩余 ${cdLeft} 天）`
                        : `激活圣物（消耗 ✦${r.activeUnityCost} 凝聚力）`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
