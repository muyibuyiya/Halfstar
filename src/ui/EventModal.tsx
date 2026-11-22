import React from 'react';
import { Sparkles, AlertOctagon, Compass } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const EventModal: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandResolveEvent = useGameStore((s) => s.commandResolveEvent);

  const ev = game.activeEvent;
  if (!ev) return null;

  const isCrisis = ev.category === 'crisis';
  const isAnomaly = ev.category === 'anomaly';

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-lg rounded-xl overflow-hidden shadow-2xl ${
          isCrisis
            ? 'hud-panel border-rose-500/70'
            : 'hud-panel-gold'
        }`}
      >
        {/* Atmospheric Banner Header */}
        <div
          className={`relative px-5 py-5 border-b overflow-hidden ${
            isCrisis
              ? 'bg-gradient-to-r from-rose-950 via-purple-950 to-slate-950 border-rose-500/40'
              : isAnomaly
              ? 'bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-950 border-sky-400/35'
              : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/35'
          }`}
        >
          <div className="relative z-10 flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                isCrisis
                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-300'
                  : isAnomaly
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                  : 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              }`}
            >
              {isCrisis ? (
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              ) : isAnomaly ? (
                <Compass className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-300/80">
                {ev.subtitle}
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">{ev.title}</h2>
            </div>
          </div>
        </div>

        {/* Prose & Choices */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-200/95 leading-relaxed bg-slate-950/55 p-3.5 rounded-lg border border-slate-800/80">
            {ev.description}
          </p>

          <div className="space-y-2">
            {ev.choices.map((c) => (
              <button
                key={c.id}
                onClick={() => commandResolveEvent(c.id)}
                className="w-full text-left px-4 py-2.5 rounded-lg bg-slate-900/85 hover:bg-sky-900/55 border border-slate-700 hover:border-sky-400/70 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-100 group-hover:text-white">
                  {c.label}
                </div>
                <div className="text-[11px] text-emerald-300/90 font-mono mt-0.5">
                  {c.effectText}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
