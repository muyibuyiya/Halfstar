import React, { useState } from 'react';
import {
  Zap,
  Gem,
  Wheat,
  Hexagon,
  Package,
  FlaskConical,
  Sparkles,
  Crown,
  Pause,
  Play,
  FastForward,
  Globe,
  Orbit,
  Menu,
  Search,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { ResourceKey } from '../types/game';
import { STRATEGIC_RESOURCE_LIST } from '../data/megastructures';
import { computeEmpireSize } from '../engine/empireSize';
import { EmpireEmblem, getEmblemKeyForEmpire } from './EmpireEmblem';

interface ResourceMeta {
  key: ResourceKey;
  label: string;
  color: string;
  icon: React.FC<{ className?: string }>;
}

const RESOURCES: ResourceMeta[] = [
  { key: 'energy', label: '能量币', color: 'text-amber-300', icon: Zap },
  { key: 'minerals', label: '矿物', color: 'text-rose-400', icon: Gem },
  { key: 'food', label: '食物', color: 'text-emerald-400', icon: Wheat },
  { key: 'alloys', label: '合金', color: 'text-purple-300', icon: Hexagon },
  { key: 'consumerGoods', label: '消费品', color: 'text-orange-300', icon: Package },
  { key: 'research', label: '科研产出', color: 'text-sky-300', icon: FlaskConical },
  { key: 'unity', label: '凝聚力', color: 'text-teal-300', icon: Sparkles },
  { key: 'influence', label: '影响力', color: 'text-indigo-300', icon: Crown },
];

export const TopBar: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const viewMode = useGameStore((s) => s.viewMode);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const togglePause = useGameStore((s) => s.togglePause);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const toggleViewMode = useGameStore((s) => s.toggleViewMode);
  const setShowPauseMenu = useGameStore((s) => s.setShowPauseMenu);
  const toggleDrawer = useGameStore((s) => s.toggleDrawer);
  const enterGalaxyView = useGameStore((s) => s.enterGalaxyView);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);

  const [hoveredRes, setHoveredRes] = useState<ResourceKey | null>(null);
  const [hoveredStrategic, setHoveredStrategic] = useState(false);
  const [hoveredSize, setHoveredSize] = useState(false);
  const empireSize = computeEmpireSize(game, game.playerEmpireId);

  const empire = game.empires[game.playerEmpireId];
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${game.date.year}.${pad(game.date.month)}.${pad(game.date.day)}`;

  return (
    <header className="pointer-events-auto fixed top-0 left-0 right-0 h-12 z-30 hud-panel border-t-0 border-x-0 flex items-center justify-between px-3 gap-3">
      {/* Left: Empire Emblem & Resources */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => {
            enterGalaxyView();
            focusCameraOnSystem(empire.homeSystemId);
          }}
          title="点击镜头飞回母星系（快捷键 Home）"
          className="flex items-center gap-2 pr-3 border-r border-sky-500/20 shrink-0 text-left hover:opacity-90 cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-md border border-white/25 flex items-center justify-center shadow-lg bg-slate-950/80"
            style={{ boxShadow: `0 0 12px ${empire.color}33` }}
          >
            <EmpireEmblem
              empireId={getEmblemKeyForEmpire(empire, game.config.empirePresetId)}
              color={empire.color}
              className="w-6 h-6"
            />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold tracking-wide text-sky-100">
              {empire.name}
            </div>
            <div className="text-[10px] text-sky-400/85">
              {empire.leaderTitle ? `${empire.leaderTitle}·${empire.leaderName}` : 'Halfstar v1.7'}
            </div>
          </div>
        </button>

        {/* Resource Counters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const stock = Math.floor(empire.resources[r.key]);
            const net = empire.monthlyNet[r.key];
            const netStr = `${net >= 0 ? '+' : ''}${Number.isInteger(net) ? net : net.toFixed(1)}`;
            const isHovered = hoveredRes === r.key;
            const isDeficitAlert = r.key !== 'research' && net < 0 && stock < 120;
            const handleResClick = () => {
              if (r.key === 'research') toggleDrawer('tech');
              else if (r.key === 'unity') toggleDrawer('traditions');
              else if (r.key === 'influence') toggleDrawer('diplomacy');
              else toggleDrawer('market');
            };

            return (
              <div
                key={r.key}
                onClick={handleResClick}
                onMouseEnter={() => setHoveredRes(r.key)}
                onMouseLeave={() => setHoveredRes(null)}
                className={`relative flex items-center gap-1.5 px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                  isDeficitAlert
                    ? 'bg-rose-950/65 border-rose-500/80 animate-pulse'
                    : 'bg-slate-900/70 border-slate-700/50 hover:border-sky-400/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                <div className="flex items-baseline gap-1 text-xs font-mono">
                  {r.key !== 'research' && (
                    <span className="text-slate-100 font-semibold">{stock}</span>
                  )}
                  <span
                    className={`text-[11px] font-medium ${
                      net > 0
                        ? 'text-emerald-400'
                        : net < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {netStr}
                  </span>
                </div>

                {/* Hover Tooltip Breakdown */}
                {isHovered && (
                  <div className="fixed top-13 z-50 w-56 p-2.5 rounded-md hud-panel text-xs shadow-2xl pointer-events-none">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-sky-500/20">
                      <span className={`font-bold ${r.color}`}>{r.label}</span>
                      <span className="font-mono text-slate-300">
                        {r.key === 'research' ? `月产出 ${netStr}` : `储量 ${stock}`}
                      </span>
                    </div>

                    {empire.incomeDetails[r.key].length > 0 && (
                      <div className="mb-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                          月度产出
                        </div>
                        {empire.incomeDetails[r.key].map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-slate-300 truncate pr-2">{item.label}</span>
                            <span className="text-emerald-400 font-mono">+{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {empire.upkeepDetails[r.key].length > 0 && (
                      <div className="mb-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                          月度维护
                        </div>
                        {empire.upkeepDetails[r.key].map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-slate-300 truncate pr-2">{item.label}</span>
                            <span className="text-rose-400 font-mono">-{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between pt-1.5 border-t border-slate-700/60 font-semibold">
                      <span className="text-slate-200">月度净增长</span>
                      <span
                        className={`font-mono ${
                          net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {netStr}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Strategic Resources Compact Pill */}
          <div
            onMouseEnter={() => setHoveredStrategic(true)}
            onMouseLeave={() => setHoveredStrategic(false)}
            className="relative flex items-center gap-1.5 px-2 py-1 rounded bg-purple-950/50 border border-purple-500/40 hover:border-purple-400 transition-colors cursor-default shrink-0 text-xs font-mono"
          >
            {STRATEGIC_RESOURCE_LIST.map((sr) => {
              const val = Math.floor(empire.strategicResources?.[sr.key] ?? 0);
              const net = empire.monthlyStrategicNet?.[sr.key] ?? 0;
              return (
                <span
                  key={sr.key}
                  className={`${sr.color} flex items-center gap-0.5 text-[11px]`}
                >
                  <span>{sr.symbol}</span>
                  <span>{val}</span>
                  {net > 0 && <span className="text-[9px] text-emerald-400">+{net}</span>}
                </span>
              );
            })}

            {hoveredStrategic && (
              <div className="fixed top-13 z-50 w-60 p-2.5 rounded-md hud-panel text-xs shadow-2xl pointer-events-none">
                <div className="font-bold text-purple-300 pb-1.5 mb-1.5 border-b border-purple-500/25">
                  稀有战略资源储备
                </div>
                <div className="space-y-1.5">
                  {STRATEGIC_RESOURCE_LIST.map((sr) => {
                    const val = Math.floor(empire.strategicResources?.[sr.key] ?? 0);
                    const net = empire.monthlyStrategicNet?.[sr.key] ?? 0;
                    return (
                      <div key={sr.key} className="text-[11px]">
                        <div className="flex justify-between font-semibold">
                          <span className={sr.color}>
                            {sr.symbol} {sr.name}
                          </span>
                          <span className="font-mono text-slate-200">
                            {val} ({net >= 0 ? `+${net}` : net}/月)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{sr.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Empire Size Indicator Pill */}
          <div
            onMouseEnter={() => setHoveredSize(true)}
            onMouseLeave={() => setHoveredSize(false)}
            className={`relative flex items-center gap-1 px-2 py-1 rounded border cursor-default shrink-0 text-[11px] font-mono ${
              empireSize.sprawlOver > 0
                ? 'bg-amber-950/55 border-amber-500/50 text-amber-200'
                : 'bg-slate-900/75 border-slate-700/70 text-slate-200'
            }`}
          >
            <span>🏛</span>
            <span className="font-bold">{empireSize.total}</span>
            <span className="text-slate-400">/{empireSize.threshold}</span>

            {hoveredSize && (
              <div className="fixed top-13 z-50 w-60 p-2.5 rounded-md hud-panel text-xs shadow-2xl pointer-events-none space-y-1">
                <div className="font-bold text-sky-300 pb-1 border-b border-sky-500/25 flex justify-between">
                  <span>帝国规模（Empire Size）</span>
                  <span className="font-mono">{empireSize.total}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">控制星系</span>
                  <span className="font-mono text-slate-200">+{empireSize.systemsPart}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">殖民地星球</span>
                  <span className="font-mono text-slate-200">+{empireSize.coloniesPart}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">帝国总人口</span>
                  <span className="font-mono text-slate-200">+{empireSize.popsPart}</span>
                </div>
                <div className="pt-1 border-t border-slate-700/60 text-[11px]">
                  {empireSize.sprawlOver > 0 ? (
                    <div className="text-amber-300 space-y-0.5">
                      <div>超出阈值 +{empireSize.sprawlOver}：</div>
                      <div>
                        科技成本 +{Math.round((empireSize.techCostMult - 1) * 100)}% · 传统成本 +
                        {Math.round((empireSize.traditionCostMult - 1) * 100)}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-emerald-300">
                      未超阈值（≤100），科技与传统无额外惩罚
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: View Switch + Date & Speed Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('halfstar:toggle-search'))}
          title="星图全局检索与筛选 (快捷键 F)"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-sky-400/60 text-slate-200 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-sky-300" />
          <kbd className="text-[10px] text-slate-400">F</kbd>
        </button>
        <button
          onClick={toggleViewMode}
          title="切换银河星图 / 3D星系视图 (快捷键 E)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-sky-950/80 hover:bg-sky-900/90 border border-sky-400/50 text-sky-100 transition-colors cursor-pointer"
        >
          {viewMode === 'galaxy' ? (
            <>
              <Orbit className="w-3.5 h-3.5 text-sky-300" />
              <span>进入星系</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-amber-300" />
              <span>返回银河 ({game.systems[activeSystemId]?.name})</span>
            </>
          )}
          <kbd className="ml-1 px-1 py-0.2 text-[10px] rounded bg-slate-900/90 text-slate-400 border border-slate-700">
            E
          </kbd>
        </button>

        {/* Time Controls */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            game.paused
              ? 'bg-amber-950/50 border-amber-500/60'
              : 'bg-slate-900/80 border-sky-500/35'
          }`}
        >
          <button
            onClick={togglePause}
            title="暂停 / 继续 (快捷键 Space)"
            className={`p-1 rounded transition-colors cursor-pointer ${
              game.paused
                ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/45'
                : 'text-sky-300 hover:bg-sky-500/20'
            }`}
          >
            {game.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <span
            onClick={togglePause}
            className="font-mono text-xs font-semibold tracking-wider text-slate-100 cursor-pointer min-w-[78px] text-center"
          >
            {dateStr}
          </span>

          <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700/70">
            {([1, 2, 3, 4] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                title={`速度 ${spd}x (快捷键 ${spd})`}
                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  !game.paused && game.speed >= spd
                    ? 'bg-sky-500/40 text-sky-100 border border-sky-400/60'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {spd === 4 ? <FastForward className="w-2.5 h-2.5" /> : spd}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowPauseMenu(true)}
          title="打开暂停菜单 / 存档 / 返回主界面 (Esc)"
          className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-sky-400/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
