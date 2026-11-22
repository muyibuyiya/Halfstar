import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Sparkles, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const AlertStrip: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const dismissAlert = useGameStore((s) => s.dismissAlert);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);
  const setSelection = useGameStore((s) => s.setSelection);
  const enterGalaxyView = useGameStore((s) => s.enterGalaxyView);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  if (game.alerts.length === 0) return null;

  const visibleAlerts = game.alerts.slice(0, 3);

  return (
    <div className="pointer-events-none fixed top-14 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-1.5 max-w-md w-full px-3">
      {visibleAlerts.map((alert) => {
        const icon =
          alert.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : alert.kind === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : alert.kind === 'discovery' ? (
            <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
          ) : (
            <Bell className="w-4 h-4 text-sky-400 shrink-0" />
          );

        const borderClass =
          alert.kind === 'discovery'
            ? 'border-purple-400/50'
            : alert.kind === 'warning'
            ? 'border-amber-400/50'
            : alert.kind === 'success'
            ? 'border-emerald-400/50'
            : 'border-sky-400/40';

        return (
          <div
            key={alert.id}
            onClick={() => {
              if (alert.openDrawer) {
                setActiveDrawer(alert.openDrawer);
              } else if (alert.planetId && alert.systemId) {
                setSelection({
                  type: 'planet',
                  id: alert.planetId,
                  systemId: alert.systemId,
                });
                focusCameraOnSystem(alert.systemId);
              } else if (alert.systemId) {
                enterGalaxyView();
                focusCameraOnSystem(alert.systemId);
                if (alert.fleetId && game.fleets[alert.fleetId]) {
                  setSelection({ type: 'fleet', id: alert.fleetId });
                } else {
                  setSelection({ type: 'system', id: alert.systemId });
                }
              }
            }}
            className={`pointer-events-auto w-full hud-panel rounded-md px-3 py-2 border ${borderClass} flex items-start gap-2.5 cursor-pointer hover:brightness-110 transition-all`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate">
                {alert.title}
              </div>
              <div className="text-[11px] text-slate-300/90 leading-snug mt-0.5">
                {alert.detail}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissAlert(alert.id);
              }}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
