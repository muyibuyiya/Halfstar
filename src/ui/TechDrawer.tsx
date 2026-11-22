import React, { useState } from 'react';
import {
  Atom,
  Leaf,
  Cog,
  X,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Infinity as InfinityIcon,
  ListChecks,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { TECH_CATEGORY_META, TECH_LIST, TECHNOLOGIES } from '../data/technologies';
import {
  getBranchCompletedCount,
  getTechEffectiveCost,
  getUnlockedTierForBranch,
  TIER_UNLOCK_THRESHOLDS,
} from '../engine/techSystem';
import { TechBranch, TechTier } from '../types/game';

const BRANCH_META: Record<
  TechBranch,
  {
    label: string;
    color: string;
    border: string;
    bg: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  physics: {
    label: '物理学',
    color: 'text-sky-300',
    border: 'border-sky-500/40',
    bg: 'from-sky-950/60 to-slate-950/80',
    icon: Atom,
  },
  society: {
    label: '社会学',
    color: 'text-emerald-300',
    border: 'border-emerald-500/40',
    bg: 'from-emerald-950/60 to-slate-950/80',
    icon: Leaf,
  },
  engineering: {
    label: '工程学',
    color: 'text-amber-300',
    border: 'border-amber-500/40',
    bg: 'from-amber-950/60 to-slate-950/80',
    icon: Cog,
  },
};

export const TechDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandChooseResearch = useGameStore((s) => s.commandChooseResearch);

  const [viewTab, setViewTab] = useState<'research' | 'completed'>('research');
  const [filterBranch, setFilterBranch] = useState<'all' | TechBranch>('all');

  if (activeDrawer !== 'tech') return null;

  const empire = game.empires[game.playerEmpireId];
  const baseResearch = Math.max(9, empire.monthlyIncome.research);
  const perBranchMonthly = Number(
    ((baseResearch / 3) * (1 + empire.modifiers.researchMult)).toFixed(1)
  );

  const branches: TechBranch[] = ['physics', 'society', 'engineering'];
  const nonRepeatableTotal = TECH_LIST.filter((t) => !t.isRepeatable).length;

  return (
    <div className="pointer-events-auto fixed top-15 left-16 bottom-4 w-[920px] max-w-[calc(100vw-20rem)] z-30 hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sky-500/25 bg-sky-950/40">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">
              帝国科研中心（12 子学科 · T1~T5 层级攀升 + 稀有/危险/循环科技）
            </h2>
            <p className="text-[11px] text-slate-400">
              每线月推进 <span className="text-sky-300 font-mono">+{perBranchMonthly}</span>
              {empire.resources.research > 0 && (
                <span className="ml-2 text-purple-300">
                  (异常储备科研点：{Math.floor(empire.resources.research)})
                </span>
              )}
              {' · '}已掌握{' '}
              <span className="text-emerald-300 font-mono">
                {empire.completedTechs.length} / {nonRepeatableTotal}
              </span>{' '}
              项科技
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-950/80 border border-slate-700 p-0.5 text-xs">
            <button
              onClick={() => setViewTab('research')}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                viewTab === 'research'
                  ? 'bg-sky-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              三线抽卡
            </button>
            <button
              onClick={() => setViewTab('completed')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer ${
                viewTab === 'completed'
                  ? 'bg-sky-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              已掌握 ({empire.completedTechs.length})
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

      {viewTab === 'research' ? (
        /* 3-Branch Card Draw View */
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3.5">
          {branches.map((branch) => {
            const meta = BRANCH_META[branch];
            const Icon = meta.icon;
            const slot = empire.research[branch];
            const activeTech = slot.activeTechId ? TECHNOLOGIES[slot.activeTechId] : null;
            const activeCost = activeTech ? getTechEffectiveCost(empire, activeTech) : 1;
            const pct = activeTech
              ? Math.min(100, Math.round((slot.progress / activeCost) * 100))
              : 0;
            const monthsLeft = activeTech
              ? Math.max(1, Math.ceil((activeCost - slot.progress) / Math.max(1, perBranchMonthly)))
              : 0;

            const unlockedTier = getUnlockedTierForBranch(empire, branch);
            const branchDone = getBranchCompletedCount(empire, branch);
            const nextTier = unlockedTier < 5 ? ((unlockedTier + 1) as TechTier) : null;
            const nextNeed = nextTier ? Math.max(0, TIER_UNLOCK_THRESHOLDS[nextTier] - branchDone) : 0;

            return (
              <div
                key={branch}
                className={`rounded-lg border ${meta.border} bg-gradient-to-b ${meta.bg} p-3 flex flex-col gap-2.5`}
              >
                {/* Branch Header + Tier Progress */}
                <div className="pb-2 border-b border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-200">
                      当前 T{unlockedTier}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {nextTier ? `再研 ${nextNeed} 项解锁 T${nextTier}` : '已达 T5 终极与循环池'}
                    </span>
                    <span className="font-mono text-sky-300">+{perBranchMonthly}/月</span>
                  </div>
                </div>

                {/* Active Research Card */}
                <div className="p-2.5 rounded-md bg-slate-950/80 border border-slate-700/80">
                  {activeTech ? (
                    <>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white truncate">
                          {activeTech.name}
                          {activeTech.isRepeatable && (
                            <span className="ml-1 text-sky-300 font-mono">
                              Lv.{(empire.repeatableLevels?.[activeTech.id] ?? 0) + 1}
                            </span>
                          )}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0"
                          style={{
                            backgroundColor: `${TECH_CATEGORY_META[activeTech.category].color}22`,
                            color: TECH_CATEGORY_META[activeTech.category].color,
                          }}
                        >
                          {TECH_CATEGORY_META[activeTech.category].name} · T{activeTech.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300 font-medium mb-2">
                        {activeTech.summary}
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>
                          {Math.floor(slot.progress)} / {activeCost}
                        </span>
                        <span>约 {monthsLeft} 月</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-3 text-center text-xs text-amber-300/90">
                      科研线空闲 — 请从下方 4 张候选卡中选择
                    </div>
                  )}
                </div>

                {/* Candidate Cards (4 cards) */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    候选科研卡片 ({slot.options.length})
                  </div>
                  {slot.options.length === 0 ? (
                    <div className="p-3 rounded bg-slate-900/50 text-center text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      当前分支已全部研发！
                    </div>
                  ) : (
                    slot.options.map((techId) => {
                      const tech = TECHNOLOGIES[techId];
                      if (!tech) return null;
                      const isSelected = slot.activeTechId === tech.id;
                      const catMeta = TECH_CATEGORY_META[tech.category];
                      const reqCost = getTechEffectiveCost(empire, tech);
                      const repLvl = empire.repeatableLevels?.[tech.id] ?? 0;

                      const cardStyle = isSelected
                        ? 'bg-sky-900/50 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                        : tech.isDangerous
                        ? 'bg-rose-950/35 border-rose-500/60 hover:border-rose-400'
                        : tech.isRare
                        ? 'bg-purple-950/35 border-purple-500/60 hover:border-purple-400'
                        : 'bg-slate-900/75 border-slate-700/70 hover:border-sky-400/60';

                      return (
                        <button
                          key={tech.id}
                          onClick={() => commandChooseResearch(branch, tech.id)}
                          className={`w-full text-left p-2.5 rounded-md border transition-all cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-100 flex items-center gap-1 truncate">
                              {tech.isDangerous && (
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                              )}
                              {tech.isRepeatable && (
                                <InfinityIcon className="w-3 h-3 text-sky-400 shrink-0" />
                              )}
                              <span className="truncate">{tech.name}</span>
                              {tech.isRepeatable && repLvl > 0 && (
                                <span className="text-[10px] text-sky-300 font-mono">
                                  Lv.{repLvl + 1}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              T{tech.tier} · {reqCost}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-medium"
                              style={{
                                backgroundColor: `${catMeta.color}22`,
                                color: catMeta.color,
                              }}
                            >
                              {catMeta.name}
                            </span>
                            {tech.isRare && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 border border-purple-400/40">
                                稀有
                              </span>
                            )}
                            {tech.isDangerous && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-200 border border-rose-400/40">
                                危险
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-sky-300 mt-1 font-medium">
                            {tech.summary}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {tech.description}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Completed Techs Overview */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            {(
              [
                ['all', '全部学科'],
                ['physics', '物理学'],
                ['society', '社会学'],
                ['engineering', '工程学'],
              ] as const
            ).map(([b, label]) => (
              <button
                key={b}
                onClick={() => setFilterBranch(b)}
                className={`px-3 py-1 rounded border cursor-pointer ${
                  filterBranch === b
                    ? 'bg-sky-600/40 border-sky-400 text-white font-semibold'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {empire.completedTechs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">尚未完成任何科技研发</div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {empire.completedTechs
                .map((id) => TECHNOLOGIES[id])
                .filter((t): t is NonNullable<typeof t> =>
                  Boolean(t && (filterBranch === 'all' || t.branch === filterBranch))
                )
                .map((tech) => {
                  const cat = TECH_CATEGORY_META[tech.category];
                  const repLvl = empire.repeatableLevels?.[tech.id];
                  return (
                    <div
                      key={tech.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-100 truncate">
                          {tech.name}
                          {repLvl ? ` (Lv.${repLvl})` : ''}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded shrink-0"
                          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                        >
                          {cat.name} · T{tech.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300 mt-1">{tech.summary}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
