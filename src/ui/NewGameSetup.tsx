import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Rocket,
  Dices,
  Sparkles,
  UserCheck,
  Sliders,
  Check,
  Palette,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  CUSTOM_TRAITS,
  DIFFICULTY_LIST,
  EMPIRE_COLOR_PALETTE,
  getPlayableEmpireById,
  PLAYABLE_EMPIRES,
} from '../data/playableEmpires';
import { DifficultyId, GalaxyShape, GalaxySize, HyperlaneDensity } from '../types/game';
import { EmpireEmblem } from './EmpireEmblem';

/** Small 2D mini-preview of the chosen galaxy shape */
const GalaxyShapeMiniPreview: React.FC<{ shape: GalaxyShape; color: string }> = ({
  shape,
  color,
}) => {
  const dots = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 42; i++) {
      const t = (i + 1) / 42;
      let x = 50;
      let y = 50;
      if (shape === 'spiral') {
        const arm = i % 3;
        const r = 8 + Math.pow(t, 0.78) * 38;
        const a = (arm / 3) * Math.PI * 2 + (r / 46) * 3.1;
        x = 50 + Math.cos(a) * r;
        y = 50 + Math.sin(a) * r;
      } else if (shape === 'ring') {
        const a = t * Math.PI * 2 * 2.3;
        const r = 24 + (i % 4) * 5.2;
        x = 50 + Math.cos(a) * r;
        y = 50 + Math.sin(a) * r;
      } else {
        const a = i * 2.39996;
        const r = 8 + Math.sqrt(t) * 37;
        x = 50 + Math.cos(a) * r * 1.1;
        y = 50 + Math.sin(a) * r * 0.82;
      }
      pts.push({ x, y });
    }
    return pts;
  }, [shape]);

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 rounded-lg bg-slate-950/90 border border-slate-800 shrink-0">
      <circle cx="50" cy="50" r="14" fill={color} fillOpacity="0.12" />
      {dots.map((p, idx) => (
        <circle
          key={idx}
          cx={p.x}
          cy={p.y}
          r={idx === 12 ? 2.8 : 1.4}
          fill={idx === 12 ? color : '#cbd5e1'}
          fillOpacity={idx === 12 ? 1 : 0.72}
        />
      ))}
    </svg>
  );
};

export const NewGameSetup: React.FC = () => {
  const setupPresetId = useGameStore((s) => s.setupPresetId);
  const setScreen = useGameStore((s) => s.setScreen);
  const newGalaxy = useGameStore((s) => s.newGalaxy);

  const initialPreset = getPlayableEmpireById(setupPresetId);
  const [empireId, setEmpireId] = useState<string>(initialPreset.id);
  const [leaderId, setLeaderId] = useState<string>(initialPreset.leaders[0].id);

  // Customization
  const [customEmpireName, setCustomEmpireName] = useState<string>(initialPreset.name);
  const [customLeaderName, setCustomLeaderName] = useState<string>(initialPreset.leaders[0].name);
  const [customHomeworldName, setCustomHomeworldName] = useState<string>(
    initialPreset.homeworldName
  );
  const [customColor, setCustomColor] = useState<string>(initialPreset.color);
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);

  // Galaxy & Rules
  const [difficulty, setDifficulty] = useState<DifficultyId>('ensign');
  const [size, setSize] = useState<GalaxySize>('medium');
  const [shape, setShape] = useState<GalaxyShape>('spiral');
  const [aiCount, setAiCount] = useState<number>(4);
  const [hyperlaneDensity, setHyperlaneDensity] = useState<HyperlaneDensity>('normal');
  const [crisisYear, setCrisisYear] = useState<number>(2215);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 90000000) + 10000000);

  const curEmpire = getPlayableEmpireById(empireId);
  const curLeader = curEmpire.leaders.find((l) => l.id === leaderId) ?? curEmpire.leaders[0];

  const handleSelectEmpire = (id: string) => {
    const emp = getPlayableEmpireById(id);
    setEmpireId(emp.id);
    setLeaderId(emp.leaders[0].id);
    setCustomEmpireName(emp.name);
    setCustomLeaderName(emp.leaders[0].name);
    setCustomHomeworldName(emp.homeworldName);
    setCustomColor(emp.color);
  };

  const handleSelectLeader = (lId: string) => {
    const l = curEmpire.leaders.find((x) => x.id === lId);
    if (!l) return;
    setLeaderId(l.id);
    setCustomLeaderName(l.name);
  };

  // Trait points calculation (base 2 pts; positive costs 1, negative refunds +1, max 1 negative)
  const spentPoints = selectedTraitIds.reduce((sum, id) => {
    const t = CUSTOM_TRAITS.find((x) => x.id === id);
    return sum + (t?.cost ?? 0);
  }, 0);
  const remainingPoints = 2 - spentPoints;
  const negativeCount = selectedTraitIds.filter(
    (id) => (CUSTOM_TRAITS.find((x) => x.id === id)?.cost ?? 0) < 0
  ).length;

  const toggleTrait = (traitId: string) => {
    const tr = CUSTOM_TRAITS.find((t) => t.id === traitId);
    if (!tr) return;
    if (selectedTraitIds.includes(traitId)) {
      // Removing a negative trait is only allowed if remainingPoints wouldn't drop below 0
      if (tr.cost < 0 && remainingPoints - 1 < 0) return;
      setSelectedTraitIds((prev) => prev.filter((id) => id !== traitId));
      return;
    }
    if (tr.cost > 0 && remainingPoints < tr.cost) return;
    if (tr.cost < 0 && negativeCount >= 1) return;
    setSelectedTraitIds((prev) => [...prev, traitId]);
  };

  const handleStart = () => {
    newGalaxy({
      size,
      shape,
      seed,
      difficulty,
      aiCount,
      hyperlaneDensity,
      crisisYear,
      empirePresetId: empireId,
      leaderId: curLeader.id,
      customEmpireName,
      customLeaderName,
      customColor,
      customHomeworldName,
      selectedTraitIds,
    });
  };

  return (
    <div className="w-screen h-screen bg-[#040712] text-slate-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 px-6 border-b border-sky-500/20 bg-slate-950/85 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('title')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回主界面
          </button>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">创建新星海征程</h1>
            <p className="text-[11px] text-slate-400">
              选择星际帝国与领袖、自由配点特质，并定制你的银河法则
            </p>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.4)] cursor-pointer"
        >
          <Rocket className="w-4 h-4" />
          开启星海征程
        </button>
      </header>

      {/* 2-Column Main Setup Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: Empire -> Leader -> Customization & Traits */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Select Empire */}
            <section className="hud-panel rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                1. 选择星际帝国与种族
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLAYABLE_EMPIRES.map((emp) => {
                  const active = emp.id === empireId;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmpire(emp.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-900/45 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <EmpireEmblem
                          empireId={emp.id}
                          color={emp.color}
                          className="w-6 h-6 shrink-0"
                        />
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {emp.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {emp.ethicsLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-950/60 rounded px-3 py-2 border border-slate-800/80 flex items-center justify-between gap-2">
                <span>{curEmpire.description}</span>
                <span className="text-sky-300 font-semibold shrink-0">{curEmpire.baseSummary}</span>
              </div>
            </section>

            {/* Step 2: Select Leader (Multi-leader per Empire + Three-Body Easter Eggs!) */}
            <section className="hud-panel rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                2. 选择帝国领袖（同文明多流派）
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {curEmpire.leaders.map((leader) => {
                  const active = leader.id === curLeader.id;
                  return (
                    <button
                      key={leader.id}
                      onClick={() => handleSelectLeader(leader.id)}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.18)]'
                          : 'bg-slate-900/75 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="text-xs font-bold text-white">
                          {leader.title} · {leader.name}
                        </div>
                        {leader.tag && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-600/35 border border-purple-400/60 text-purple-200 text-[9px] font-semibold">
                            {leader.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-300 font-medium mt-1">
                        {leader.summary}
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-1 leading-relaxed">
                        「{leader.quote}」
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Free Customization + Stellaris Trait Points */}
            <section className="hud-panel rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  3. 自由定制与帝国特质配点
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-teal-500/40 text-teal-300">
                  剩余特质点数：{remainingPoints}
                </span>
              </div>

              {/* Name & Color inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">帝国名称</label>
                  <input
                    value={customEmpireName}
                    onChange={(e) => setCustomEmpireName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">领袖姓名</label>
                  <input
                    value={customLeaderName}
                    onChange={(e) => setCustomLeaderName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">母星名称</label>
                  <input
                    value={customHomeworldName}
                    onChange={(e) => setCustomHomeworldName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] text-slate-400">疆域主色：</span>
                {EMPIRE_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCustomColor(c)}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                      customColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Traits Grid */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400">
                  正面特质（每项消耗 1 点）与负面特质（最多选 1 项，返还 +1 点）：
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {CUSTOM_TRAITS.map((tr) => {
                    const selected = selectedTraitIds.includes(tr.id);
                    const isNeg = tr.cost < 0;
                    const disabled =
                      !selected &&
                      ((tr.cost > 0 && remainingPoints < tr.cost) ||
                        (isNeg && negativeCount >= 1));

                    return (
                      <button
                        key={tr.id}
                        onClick={() => toggleTrait(tr.id)}
                        disabled={disabled}
                        className={`text-left p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          selected
                            ? isNeg
                              ? 'bg-rose-950/55 border-rose-400 text-rose-100'
                              : 'bg-teal-950/55 border-teal-400 text-teal-100'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-[11px] flex items-center gap-1">
                            {selected && <Check className="w-3 h-3" />}
                            {tr.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              isNeg ? 'text-rose-300' : 'text-teal-300'
                            }`}
                          >
                            {isNeg ? '+1点' : '-1点'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {tr.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT 5 COLS: Galaxy & Difficulty Rules */}
          <div className="lg:col-span-5 space-y-5">
            <section className="hud-panel rounded-xl p-5 space-y-4 text-xs">
              <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                银河与游戏规则
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">游戏难度</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_LIST.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`text-left p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        difficulty === d.id
                          ? 'bg-sky-900/45 border-sky-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{d.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {d.summary}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Galaxy Shape + Mini Preview */}
              <div className="flex items-center gap-3 pt-1">
                <GalaxyShapeMiniPreview shape={shape} color={customColor} />
                <div className="flex-1 space-y-2">
                  <label className="block text-slate-300 font-semibold">银河形态</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['spiral', '三旋臂'],
                        ['elliptical', '椭圆盘'],
                        ['ring', '环状带'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setShape(id)}
                        className={`py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer ${
                          shape === id
                            ? 'bg-sky-600/35 border-sky-400 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Galaxy Size */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">银河规模</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['small', '小型 (32星系)'],
                      ['medium', '中型 (52星系)'],
                      ['large', '大型 (76星系)'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSize(id)}
                      className={`py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer ${
                        size === id
                          ? 'bg-sky-600/35 border-sky-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hyperlane Density */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">超空间航道密度</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['sparse', '稀疏（强咽喉）'],
                      ['normal', '标准'],
                      ['dense', '密集（多航路）'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setHyperlaneDensity(id)}
                      className={`py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer ${
                        hyperlaneDensity === id
                          ? 'bg-sky-600/35 border-sky-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Empires Count */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300 font-semibold">AI 帝国数量</label>
                  <span className="font-mono text-sky-300 font-bold">{aiCount} 个</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Endgame Crisis Year */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">后期天灾降临年份</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      [2210, '2210(快)'],
                      [2215, '2215(标)'],
                      [2225, '2225(慢)'],
                      [0, '关闭'],
                    ] as const
                  ).map(([yr, label]) => (
                    <button
                      key={yr}
                      onClick={() => setCrisisYear(yr)}
                      className={`py-1.5 px-1.5 rounded border text-[11px] font-medium cursor-pointer ${
                        crisisYear === yr
                          ? 'bg-rose-900/50 border-rose-400 text-rose-100'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">星图种子</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 1)}
                    className="flex-1 px-3 py-1.5 rounded bg-slate-950/90 border border-slate-700 font-mono text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 90000000) + 10000000)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    随机
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
