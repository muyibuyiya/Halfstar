import React, { useState } from 'react';
import {
  Handshake,
  X,
  HeartHandshake,
  Gift,
  FlaskConical,
  Coins,
  ShieldCheck,
  Swords,
  Flag,
  MapPin,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getPresetByPersonality } from '../data/aiEmpires';
import { getEmpireStats } from '../engine/diplomacySystem';
import { computeDiplomaticWeight } from '../engine/simulation';
import { RESOLUTION_BY_ID, RESOLUTIONS } from '../data/galacticCommunity';
import { EmpireEmblem, getEmblemKeyForEmpire } from './EmpireEmblem';

export const DiplomacyDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);
  const enterGalaxyView = useGameStore((s) => s.enterGalaxyView);

  const commandDiplomacyImprove = useGameStore((s) => s.commandDiplomacyImprove);
  const commandDiplomacyGift = useGameStore((s) => s.commandDiplomacyGift);
  const commandDiplomacyTogglePact = useGameStore((s) => s.commandDiplomacyTogglePact);
  const commandDiplomacyDeclareWar = useGameStore((s) => s.commandDiplomacyDeclareWar);
  const commandDiplomacyOfferPeace = useGameStore((s) => s.commandDiplomacyOfferPeace);
  const commandDemandVassal = useGameStore((s) => s.commandDemandVassal);
  const commandFormFederation = useGameStore((s) => s.commandFormFederation);
  const commandProposeResolution = useGameStore((s) => s.commandProposeResolution);
  const commandCastVote = useGameStore((s) => s.commandCastVote);
  const commandEspionage = useGameStore((s) => s.commandEspionage);

  const aiEmpires = Object.values(game.empires).filter((e) => !e.isPlayer);
  const discovered = aiEmpires.filter((e) => game.relations[e.id]?.discovered);
  const undiscoveredCount = aiEmpires.length - discovered.length;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'bilateral' | 'community'>('bilateral');

  if (activeDrawer !== 'diplomacy') return null;

  const activeEmpire =
    discovered.find((e) => e.id === selectedId) ?? discovered[0] ?? null;
  const activeRel = activeEmpire ? game.relations[activeEmpire.id] : null;
  const preset = activeEmpire ? getPresetByPersonality(activeEmpire.personality) : undefined;
  const playerStats = getEmpireStats(game, game.playerEmpireId);
  const aiStats = activeEmpire ? getEmpireStats(game, activeEmpire.id) : null;

  return (
    <div className="pointer-events-auto fixed top-15 left-16 bottom-4 w-[800px] max-w-[calc(100vw-20rem)] z-30 hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
        <div className="flex items-center gap-2.5">
          <Handshake className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white">星际外交与通讯中心</h2>
            <p className="text-[11px] text-slate-400">
              已接触外星文明 {discovered.length} 个
              {undiscoveredCount > 0 && ` · 尚有 ${undiscoveredCount} 个未知文明潜藏在迷雾深空`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-950/80 border border-slate-700 p-0.5 text-xs">
            <button
              onClick={() => setTab('bilateral')}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab === 'bilateral'
                  ? 'bg-purple-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              双边外交 ({discovered.length})
            </button>
            <button
              onClick={() => setTab('community')}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab === 'community'
                  ? 'bg-purple-600/50 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              银河议会 {game.galacticCommunity?.founded ? '●' : '(未成立)'}
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

      {tab === 'community' ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!game.galacticCommunity?.founded ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="text-sm font-bold text-slate-200">银河共同体议会尚未成立</div>
              <p className="max-w-md mx-auto">
                当您与至少 2 个常规外星文明建立「第一次接触」后，全银河共同体议会将自动召开，届时可按外交权重提出并表决影响全银河的星际决议！
              </p>
            </div>
          ) : (
            (() => {
              const gc = game.galacticCommunity;
              const myWeight = computeDiplomaticWeight(game, game.playerEmpireId);
              const activeRes = gc.activeProposalId ? RESOLUTION_BY_ID[gc.activeProposalId] : null;
              return (
                <>
                  <div className="p-3.5 rounded-xl bg-purple-950/35 border border-purple-400/45 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>银河共同体议会</span>
                        {gc.custodianEmpireId === game.playerEmpireId && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-200">
                            ★ 银河监护人
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        已通过全银河法案 {gc.passedResolutions.length} 项
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">我方外交权重</div>
                      <div className="text-xl font-mono font-bold text-purple-300">{myWeight}</div>
                    </div>
                  </div>

                  {/* Active Vote Box */}
                  {activeRes && (
                    <div className="p-4 rounded-xl bg-sky-950/45 border border-sky-400/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-200 text-sm">
                          正在表决：{activeRes.name}
                        </span>
                        <span className="font-mono text-amber-300">
                          剩余 {gc.voteDaysLeft} 天截止
                        </span>
                      </div>
                      <div className="text-emerald-300 font-medium">{activeRes.summary}</div>
                      <div className="flex gap-2">
                        {(
                          [
                            ['yes', '投赞成票', 'bg-emerald-700/80 border-emerald-400'],
                            ['no', '投反对票', 'bg-rose-700/80 border-rose-400'],
                            ['abstain', '弃权', 'bg-slate-700 border-slate-500'],
                          ] as const
                        ).map(([v, label, cls]) => (
                          <button
                            key={v}
                            onClick={() => commandCastVote(v)}
                            className={`flex-1 py-1.5 rounded border font-semibold cursor-pointer ${
                              gc.playerVote === v
                                ? `${cls} text-white`
                                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {gc.playerVote === v ? `✓ ${label}` : label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Catalog */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {RESOLUTIONS.map((r) => {
                      const passed = gc.passedResolutions.includes(r.id);
                      const isVoting = gc.activeProposalId === r.id;
                      return (
                        <div
                          key={r.id}
                          className={`p-3 rounded-lg border flex flex-col justify-between gap-2 ${
                            passed
                              ? 'bg-emerald-950/35 border-emerald-500/50'
                              : isVoting
                              ? 'bg-sky-950/40 border-sky-400/60'
                              : 'bg-slate-900/75 border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-100">{r.name}</span>
                              {passed && (
                                <span className="text-[10px] text-emerald-400 font-semibold">
                                  ✓ 已生效
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-sky-300 mt-1">{r.summary}</div>
                            <p className="text-[10px] text-slate-400 mt-1">{r.description}</p>
                          </div>
                          {!passed && !gc.activeProposalId && (
                            <button
                              onClick={() => commandProposeResolution(r.id)}
                              className="w-full py-1.5 rounded bg-purple-700/70 hover:bg-purple-600 text-white font-semibold cursor-pointer"
                            >
                              提交议会表决
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()
          )}
        </div>
      ) : discovered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <Handshake className="w-10 h-10 text-slate-600" />
          <div className="text-sm font-semibold text-slate-300">尚未与任何智慧外星文明建立接触</div>
          <p className="text-xs text-slate-400 max-w-sm">
            派遣科研船向银河深处探索，一旦进入或邻近其他文明的疆域，将自动触发「第一次接触」并开启星际外交！
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Left: Contacts List */}
          <div className="col-span-4 border-r border-slate-800 overflow-y-auto p-2.5 space-y-1.5 bg-slate-950/40">
            {discovered.map((emp) => {
              const rel = game.relations[emp.id];
              const isSelected = activeEmpire?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-900/45 border-sky-400/80'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: emp.color }}
                      />
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {emp.name}
                      </span>
                    </div>
                    {rel.atWar ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600/80 text-white font-bold shrink-0">
                        交战
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-mono font-semibold shrink-0 ${
                          rel.opinion >= 20
                            ? 'text-emerald-400'
                            : rel.opinion <= -20
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {rel.opinion > 0 ? `+${rel.opinion}` : rel.opinion}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{emp.ethicsLabel}</span>
                    <span>
                      {rel.researchPact ? '🔬' : ''}
                      {rel.commercialPact ? '💰' : ''}
                      {rel.nonAggression ? '🕊' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Empire Diplomacy Detail */}
          {activeEmpire && activeRel && aiStats && (
            <div className="col-span-8 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Empire Banner */}
              <div
                className="p-4 rounded-xl border bg-slate-950/75 space-y-2"
                style={{ borderColor: `${activeEmpire.color}66` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-lg border-2 flex items-center justify-center bg-slate-950/80"
                      style={{
                        borderColor: activeEmpire.color,
                        boxShadow: `0 0 14px ${activeEmpire.color}33`,
                      }}
                    >
                      <EmpireEmblem
                        empireId={getEmblemKeyForEmpire(activeEmpire)}
                        color={activeEmpire.color}
                        className="w-8 h-8"
                      />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{activeEmpire.name}</div>
                      <div className="text-[11px] text-slate-300">
                        {preset?.personalityLabel} · {activeEmpire.ethicsLabel}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      enterGalaxyView();
                      focusCameraOnSystem(activeEmpire.homeSystemId);
                      setActiveDrawer('none');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    定位首都
                  </button>
                </div>

                <p className="italic text-slate-300/90 bg-slate-900/70 rounded px-3 py-2 border-l-2 border-sky-400/60">
                  「{activeEmpire.greeting}」
                </p>
              </div>

              {/* Relative Power & Opinion */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="text-[10px] text-slate-400">外交关系</div>
                  <div
                    className={`text-lg font-mono font-bold mt-0.5 ${
                      activeRel.atWar
                        ? 'text-rose-400'
                        : activeRel.opinion >= 20
                        ? 'text-emerald-400'
                        : activeRel.opinion <= -20
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {activeRel.atWar
                      ? '全面战争'
                      : `${activeRel.opinion > 0 ? '+' : ''}${activeRel.opinion}`}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="text-[10px] text-slate-400">星系 / 殖民地</div>
                  <div className="text-lg font-mono font-bold text-slate-100 mt-0.5">
                    {aiStats.systems} / {aiStats.colonies}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="text-[10px] text-slate-400">舰队战力对比</div>
                  <div className="text-lg font-mono font-bold text-sky-300 mt-0.5">
                    ⚔ {aiStats.fleetPower}
                    <span className="text-[10px] font-normal text-slate-400 ml-1">
                      (我方 {playerStats.fleetPower})
                    </span>
                  </div>
                </div>
              </div>

              {/* War Exhaustion Bar (if at war) */}
              {activeRel.atWar && (
                <div className="p-3 rounded-lg bg-rose-950/35 border border-rose-500/45 space-y-2">
                  <div className="flex items-center justify-between text-rose-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Swords className="w-4 h-4" />
                      战争态势（攻占敌方星系即可直接并入我方版图）
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">我方厌战度</span>
                        <span className="font-mono text-rose-300">
                          {Math.round(activeRel.playerWarExhaustion)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${activeRel.playerWarExhaustion}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">敌方厌战度</span>
                        <span className="font-mono text-emerald-300">
                          {Math.round(activeRel.aiWarExhaustion)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${activeRel.aiWarExhaustion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Diplomatic Actions */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
                  外交互动与条约
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => commandDiplomacyImprove(activeEmpire.id)}
                    className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-sky-900/50 border border-slate-700 hover:border-sky-400/60 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <HeartHandshake className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">派遣外交使团 (+25关系)</div>
                      <div className="text-[10px] text-slate-400">消耗 25 影响力</div>
                    </div>
                  </button>

                  <button
                    onClick={() => commandDiplomacyGift(activeEmpire.id)}
                    className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-400/60 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">赠送外交礼物 (+25关系)</div>
                      <div className="text-[10px] text-slate-400">消耗 200 能量币</div>
                    </div>
                  </button>

                  <button
                    onClick={() => commandDiplomacyTogglePact(activeEmpire.id, 'nonAggression')}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                      activeRel.nonAggression
                        ? 'bg-emerald-950/50 border-emerald-400/70'
                        : 'bg-slate-900/80 border-slate-700 hover:border-emerald-400/60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">
                        {activeRel.nonAggression ? '✓ 已签：互不侵犯条约' : '签署互不侵犯条约'}
                      </div>
                      <div className="text-[10px] text-slate-400">需好感度 ≥ 10 · 防止突袭</div>
                    </div>
                  </button>

                  <button
                    onClick={() => commandDiplomacyTogglePact(activeEmpire.id, 'researchPact')}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                      activeRel.researchPact
                        ? 'bg-sky-950/50 border-sky-400/70'
                        : 'bg-slate-900/80 border-slate-700 hover:border-sky-400/60'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">
                        {activeRel.researchPact ? '✓ 已签：星际科研协议' : '签署星际科研协议'}
                      </div>
                      <div className="text-[10px] text-slate-400">需好感度 ≥ 20 · +8 科研/月</div>
                    </div>
                  </button>

                  <button
                    onClick={() => commandDiplomacyTogglePact(activeEmpire.id, 'commercialPact')}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                      activeRel.commercialPact
                        ? 'bg-amber-950/50 border-amber-400/70'
                        : 'bg-slate-900/80 border-slate-700 hover:border-amber-400/60'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">
                        {activeRel.commercialPact ? '✓ 已签：星际商业协定' : '签署星际商业协定'}
                      </div>
                      <div className="text-[10px] text-slate-400">需好感度 ≥ 20 · +15 能量币/月</div>
                    </div>
                  </button>

                  {!activeRel.atWar ? (
                    <button
                      onClick={() => commandDiplomacyDeclareWar(activeEmpire.id)}
                      className="p-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-800/70 border border-rose-500/60 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-rose-100">正式宣战</div>
                        <div className="text-[10px] text-rose-300/80">可派遣舰队攻占其星系</div>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => commandDiplomacyOfferPeace(activeEmpire.id)}
                      className="p-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-400/60 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <Flag className="w-4 h-4 text-emerald-300 shrink-0" />
                      <div>
                        <div className="font-semibold text-emerald-100">提议现状议和</div>
                        <div className="text-[10px] text-emerald-200/80">双方保留当前占领疆域</div>
                      </div>
                    </button>
                  )}

                  {/* Vassal & Federation High-Level Diplomacy */}
                  <button
                    onClick={() => commandDemandVassal(activeEmpire.id)}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                      activeRel.isVassal
                        ? 'bg-purple-950/60 border-purple-400'
                        : 'bg-slate-900/80 border-purple-500/45 hover:bg-purple-950/40'
                    }`}
                  >
                    <Swords className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-100">
                        {activeRel.isVassal ? '✓ 附庸朝贡国' : '要求臣服（收为附庸）'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {activeRel.isVassal ? '每月上缴 25% 能量与矿物' : '需战力 ≥1.4倍 或战局压制'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => commandFormFederation(activeEmpire.id)}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                      activeRel.inFederation
                        ? 'bg-sky-950/60 border-sky-400'
                        : 'bg-slate-900/80 border-sky-500/45 hover:bg-sky-950/40'
                    }`}
                  >
                    <Handshake className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-sky-100">
                        {activeRel.inFederation ? '✓ 星际联邦盟友' : '组建星际联邦'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {activeRel.inFederation ? '共享全视野、科研与商业协定' : '需好感度 ≥ 45 · 共享视野'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* v1.5 Espionage Operations */}
                {(() => {
                  const playerEmp = game.empires[game.playerEmpireId];
                  const readyDay = playerEmp?.espionageCooldowns?.[activeEmpire.id] ?? 0;
                  const cdLeft = Math.max(0, readyDay - game.date.totalDays);
                  return (
                    <div className="pt-3 border-t border-slate-800/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                          🕵 间谍情报行动
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cdLeft > 0 ? `潜伏冷却中（余 ${cdLeft} 天）` : '情报网就绪'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          disabled={cdLeft > 0}
                          onClick={() => commandEspionage(activeEmpire.id, 'steal_tech')}
                          className="p-2 rounded-lg bg-slate-900/80 hover:bg-purple-950/50 disabled:opacity-45 border border-purple-500/40 text-left cursor-pointer"
                        >
                          <div className="font-semibold text-purple-200">窃取科技</div>
                          <div className="text-[10px] text-slate-400">35 影响 · +180 科研</div>
                        </button>
                        <button
                          disabled={cdLeft > 0}
                          onClick={() => commandEspionage(activeEmpire.id, 'sabotage_starbase')}
                          className="p-2 rounded-lg bg-slate-900/80 hover:bg-rose-950/50 disabled:opacity-45 border border-rose-500/40 text-left cursor-pointer"
                        >
                          <div className="font-semibold text-rose-200">破坏星港</div>
                          <div className="text-[10px] text-slate-400">45 影响 · 重创基地防御</div>
                        </button>
                        <button
                          disabled={cdLeft > 0}
                          onClick={() => commandEspionage(activeEmpire.id, 'sow_discord')}
                          className="p-2 rounded-lg bg-slate-900/80 hover:bg-amber-950/50 disabled:opacity-45 border border-amber-500/40 text-left cursor-pointer"
                        >
                          <div className="font-semibold text-amber-200">挑拨离间</div>
                          <div className="text-[10px] text-slate-400">30 影响 · 削弱敌库/+90凝聚</div>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
