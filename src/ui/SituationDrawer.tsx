import React, { useRef } from 'react';
import {
  ScrollText,
  X,
  Trophy,
  AlertOctagon,
  Save,
  FolderOpen,
  Download,
  Upload,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { computeEmpireScore } from '../engine/crisisSystem';
import { getEmpireStats } from '../engine/diplomacySystem';
import { computeDiplomaticWeight } from '../engine/simulation';
import { EmpireEmblem, getEmblemKeyForEmpire } from './EmpireEmblem';

export const SituationDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandTriggerCrisis = useGameStore((s) => s.commandTriggerCrisis);
  const saveToLocalStorage = useGameStore((s) => s.saveToLocalStorage);
  const loadFromLocalStorage = useGameStore((s) => s.loadFromLocalStorage);
  const importSaveJson = useGameStore((s) => s.importSaveJson);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (activeDrawer !== 'situation') return null;

  const player = game.empires[game.playerEmpireId];
  const totalSystems = game.systemOrder.length;
  const playerSystems = Object.values(game.systems).filter(
    (s) => s.ownerId === player.id
  ).length;
  const domPct = Math.round((playerSystems / Math.max(1, totalSystems)) * 100);
  const techPct = Math.min(100, Math.round((player.completedTechs.length / 12) * 100));

  const rankings = Object.values(game.empires)
    .map((e) => ({
      empire: e,
      score: computeEmpireScore(game, e.id),
    }))
    .sort((a, b) => b.score - a.score);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halfstar_${game.date.year}_${game.date.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pointer-events-auto fixed top-15 left-16 bottom-4 w-[680px] max-w-[calc(100vw-20rem)] z-30 hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
        <div className="flex items-center gap-2.5">
          <ScrollText className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white">局势日志、胜利进度与存档中心</h2>
            <p className="text-[11px] text-slate-400">
              达成任意胜利条件即赢得本局 · 支持本地存档与 JSON 文件导出/导入
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveDrawer('none')}
          className="text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Victory Conditions */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            银河胜利条件
          </div>

          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-2.5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-200 font-medium">征服胜利：控制全银河 ≥ 50% 星系</span>
                <span className="font-mono text-sky-300">
                  {playerSystems}/{totalSystems} ({domPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400"
                  style={{ width: `${Math.min(100, domPct * 2)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-200 font-medium">科技胜利：掌握 ≥ 12 项帝国科技</span>
                <span className="font-mono text-emerald-300">
                  {player.completedTechs.length} / 12 ({techPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${techPct}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <div className="font-medium text-rose-200 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  天灾胜利：击溃「虚空撕裂者」异次元入侵（默认 2215 年降临）
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  状态：
                  {game.crisis.defeated
                    ? '已击溃天灾！'
                    : game.crisis.triggered
                    ? `入侵进行中（裂隙坐标：${game.systems[game.crisis.portalSystemId ?? '']?.name ?? '未知'}）`
                    : '尚未触发'}
                </div>
              </div>
              {!game.crisis.triggered && (
                <button
                  onClick={commandTriggerCrisis}
                  className="px-2.5 py-1.5 rounded bg-rose-950/75 hover:bg-rose-800/80 border border-rose-500/60 text-rose-100 text-[11px] font-semibold cursor-pointer shrink-0"
                >
                  提前召唤天灾
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empire Power History Trend Chart */}
        {game.history && game.history.length >= 2 && (() => {
          const pts = game.history;
          const maxVal = Math.max(
            500,
            ...pts.map((p) => Math.max(p.playerScore, p.topAiScore))
          );
          const toX = (i: number) => 12 + (i / Math.max(1, pts.length - 1)) * 276;
          const toY = (v: number) => 88 - (v / maxVal) * 76;
          const playerPath = pts.map((p, i) => `${toX(i)},${toY(p.playerScore)}`).join(' ');
          const aiPath = pts.map((p, i) => `${toX(i)},${toY(p.topAiScore)}`).join(' ');
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-sky-200 uppercase tracking-wider">
                  帝国国力崛起趋势图 ({pts[0].year}–{pts[pts.length - 1].year})
                </span>
                <span className="flex items-center gap-3 text-[10px]">
                  <span className="text-sky-400">━ 我方得分</span>
                  <span className="text-amber-400">━ 最强 AI 得分</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <svg viewBox="0 0 300 96" className="w-full h-24">
                  <line x1="12" y1="88" x2="288" y2="88" stroke="#1e293b" strokeWidth="1" />
                  <line x1="12" y1="50" x2="288" y2="50" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="3 3" />
                  <line x1="12" y1="12" x2="288" y2="12" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="3 3" />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="1.8" points={aiPath} />
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="2.2" points={playerPath} />
                </svg>
              </div>
            </div>
          );
        })()}

        {/* Empire Ledger & Rankings Table */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
            银河列强综合排行榜（Empire Ledger）
          </div>
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/65">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px]">
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2">文明名称</th>
                  <th className="py-2 px-2 text-right">星系</th>
                  <th className="py-2 px-2 text-right">殖民地</th>
                  <th className="py-2 px-2 text-right">舰队战力</th>
                  <th className="py-2 px-2 text-right">科技</th>
                  <th className="py-2 px-2 text-right">外交权重</th>
                  <th className="py-2 px-2.5 text-right">总分</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map(({ empire, score }, idx) => {
                  const st = getEmpireStats(game, empire.id);
                  const dw = computeDiplomaticWeight(game, empire.id);
                  return (
                    <tr
                      key={empire.id}
                      className={`border-b border-slate-800/60 last:border-b-0 ${
                        empire.isPlayer ? 'bg-sky-950/45' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <EmpireEmblem
                            empireId={getEmblemKeyForEmpire(
                              empire,
                              empire.isPlayer ? game.config.empirePresetId : undefined
                            )}
                            color={empire.color}
                            className="w-4 h-4 shrink-0"
                          />
                          <span className="font-semibold text-slate-100 truncate max-w-[140px]">
                            {empire.isFallenEmpire ? '♛ ' : ''}
                            {empire.name}
                          </span>
                          {empire.isPlayer && (
                            <span className="text-[9px] text-sky-300">(我方)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-200">
                        {st.systems}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-300">
                        {st.colonies}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-rose-300">
                        {st.fleetPower}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-sky-300">
                        {empire.completedTechs.length}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-indigo-300">
                        {dw}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-300">
                        {score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save & Load */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            存档与读档
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => saveToLocalStorage()}
              className="py-2 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-800/70 border border-emerald-500/50 text-emerald-100 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              保存至浏览器本地
            </button>
            <button
              onClick={loadFromLocalStorage}
              className="py-2 px-3 rounded-lg bg-sky-950/60 hover:bg-sky-800/70 border border-sky-500/50 text-sky-100 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              读取本地存档
            </button>
            <button
              onClick={handleExportJson}
              className="py-2 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              导出 .JSON 存档文件
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              导入 .JSON 存档文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    importSaveJson(reader.result);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
