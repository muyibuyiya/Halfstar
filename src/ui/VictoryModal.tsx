import React from 'react';
import { Trophy, Sparkles, RefreshCw } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const VictoryModal: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const dismissVictory = useGameStore((s) => s.dismissVictory);
  const setShowNewGalaxyModal = useGameStore((s) => s.setShowNewGalaxyModal);

  const vic = game.victory;
  if (!vic || !vic.achieved) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md hud-panel-gold rounded-2xl overflow-hidden text-center p-6 space-y-5 shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.45)]">
          <Trophy className="w-8 h-8 text-amber-300" />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
            Halfstar 银河史诗达成 · {vic.year} 年
          </div>
          <h1 className="text-2xl font-extrabold text-white">帝国荣耀胜利！</h1>
          <p className="text-xs text-slate-300 leading-relaxed pt-1">{vic.reason}</p>
        </div>

        <div className="py-3 px-4 rounded-xl bg-slate-950/70 border border-amber-500/30">
          <div className="text-[11px] text-slate-400">最终帝国综合得分</div>
          <div className="text-3xl font-mono font-extrabold text-amber-300 mt-0.5">
            {vic.score}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={dismissVictory}
            className="flex-1 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            继续驰骋星海
          </button>
          <button
            onClick={() => {
              dismissVictory();
              setShowNewGalaxyModal(true);
            }}
            className="flex-1 py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            开启新星海
          </button>
        </div>
      </div>
    </div>
  );
};
