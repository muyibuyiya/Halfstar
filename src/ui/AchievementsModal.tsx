import React, { useState } from 'react';
import { Award, History, X, CheckCircle2, Lock, Trophy } from 'lucide-react';
import {
  ACHIEVEMENTS,
  loadRunHistory,
  loadUnlockedAchievements,
} from '../data/achievements';
import { formatSavedTime } from '../engine/saveSystem';
import { DIFFICULTIES } from '../data/playableEmpires';

interface Props {
  openTab: 'none' | 'achievements' | 'history';
  onClose: () => void;
}

export const AchievementsModal: React.FC<Props> = ({ openTab, onClose }) => {
  const [tab, setTab] = useState<'achievements' | 'history'>(
    openTab === 'history' ? 'history' : 'achievements'
  );

  React.useEffect(() => {
    if (openTab === 'achievements' || openTab === 'history') {
      setTab(openTab);
    }
  }, [openTab]);

  if (openTab === 'none') return null;

  const unlocked = loadUnlockedAchievements();
  const unlockedCount = Object.keys(unlocked).length;
  const history = loadRunHistory();

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[78vh] hud-panel rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">星海成就与战役战绩</h2>
              <p className="text-[11px] text-slate-400">
                已解锁成就{' '}
                <span className="text-amber-300 font-mono font-bold">
                  {unlockedCount} / {ACHIEVEMENTS.length}
                </span>
                {' · '}历史战绩记录 {history.length} 场
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md bg-slate-950/80 border border-slate-700 p-0.5 text-xs">
              <button
                onClick={() => setTab('achievements')}
                className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer ${
                  tab === 'achievements'
                    ? 'bg-amber-600/50 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                成就 ({unlockedCount}/{ACHIEVEMENTS.length})
              </button>
              <button
                onClick={() => setTab('history')}
                className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer ${
                  tab === 'history'
                    ? 'bg-amber-600/50 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                战绩 ({history.length})
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {tab === 'achievements' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const ts = unlocked[ach.id];
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      ts
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-900/60 border-slate-800 opacity-65'
                    }`}
                  >
                    <div className="mt-0.5">
                      {ts ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-100">{ach.title}</span>
                        {ts && (
                          <span className="text-[10px] text-amber-300/80">
                            {formatSavedTime(ts)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Trophy className="w-10 h-10 mx-auto text-slate-700" />
              <div>尚无已完结战役战绩</div>
              <div className="text-[11px] text-slate-600">
                在战役中达成征服、科技或天灾胜利后，战绩将自动载入史册
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-lg bg-slate-900/80 border border-amber-500/35 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{h.empireName}</span>
                      <span className="text-[11px] font-normal text-sky-300">
                        领袖：{h.leaderName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {DIFFICULTIES[h.difficulty as keyof typeof DIFFICULTIES]?.name ?? '标准'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-300 mt-1">{h.reason}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {h.year} 年达成 · {formatSavedTime(h.timestamp)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400">综合得分</div>
                    <div className="text-xl font-mono font-bold text-amber-300">{h.score}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
