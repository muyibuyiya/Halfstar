import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { MapMode, StarSystem } from '../types/game';

export function getSystemMapModeColor(
  sys: StarSystem,
  mapMode: MapMode,
  playerEmpireId: string,
  empires: Record<string, { color: string }>,
  relations: Record<string, { opinion: number; atWar: boolean; discovered: boolean }>
): string | null {
  if (mapMode === 'empire') {
    if (!sys.ownerId) return null;
    return empires[sys.ownerId]?.color ?? '#38bdf8';
  }

  if (mapMode === 'diplomacy') {
    if (!sys.ownerId) return null;
    if (sys.ownerId === playerEmpireId) return '#38bdf8';
    const rel = relations[sys.ownerId];
    if (!rel || !rel.discovered) return '#64748b';
    if (rel.atWar) return '#f43f5e';
    if (rel.opinion >= 20) return '#10b981';
    if (rel.opinion <= -20) return '#fb7185';
    return '#fbbf24';
  }

  // habitability & strategic resource mode
  if (!sys.surveyedByPlayer) return null;
  const hasUncolonizedHab = sys.planets.some((p) => p.habitable && !p.colonizedBy);
  if (hasUncolonizedHab) return '#22c55e';
  if (sys.strategicDeposit) return '#a855f7';
  if (sys.ownerId === playerEmpireId) return '#0284c7';
  return null;
}

export const Minimap: React.FC = () => {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const mapMode = useGameStore((s) => s.mapMode);
  const setMapMode = useGameStore((s) => s.setMapMode);
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);
  const enterGalaxyView = useGameStore((s) => s.enterGalaxyView);

  const bound =
    game.config.size === 'small' ? 175 : game.config.size === 'medium' ? 215 : 255;

  const toMini = (coord: number) => 50 + (coord / bound) * 44;

  const selectedSysId =
    selection?.type === 'system'
      ? selection.id
      : selection?.type === 'planet'
      ? selection.systemId
      : selection?.type === 'fleet'
      ? game.fleets[selection.id]?.systemId
      : null;

  return (
    <div className="pointer-events-auto fixed bottom-4 right-66 z-20 w-44 hud-panel rounded-xl overflow-hidden shadow-2xl">
      {/* Map Mode Quick Switcher */}
      <div className="grid grid-cols-3 border-b border-sky-500/20 bg-slate-950/70 text-[10px]">
        {(
          [
            ['empire', '疆域'],
            ['diplomacy', '外交'],
            ['habitability', '宜居/战略'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className={`py-1 font-medium transition-colors cursor-pointer ${
              mapMode === mode
                ? 'bg-sky-600/45 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Radar SVG */}
      <div className="p-2 bg-slate-950/60">
        <svg viewBox="0 0 100 100" className="w-full h-36 rounded-lg bg-[#040814]">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#1e293b"
            strokeWidth="0.6"
            strokeDasharray="2 2"
          />
          <circle cx="50" cy="50" r="22" fill="none" stroke="#1e293b" strokeWidth="0.5" />

          {/* Hyperlanes */}
          {game.systemOrder.map((id) => {
            const sys = game.systems[id];
            const x1 = toMini(sys.x);
            const y1 = toMini(sys.y);
            return sys.hyperlanes
              .filter((nId) => id < nId)
              .map((nId) => {
                const nSys = game.systems[nId];
                if (!nSys) return null;
                return (
                  <line
                    key={`${id}_${nId}`}
                    x1={x1}
                    y1={y1}
                    x2={toMini(nSys.x)}
                    y2={toMini(nSys.y)}
                    stroke={sys.exploredByPlayer || nSys.exploredByPlayer ? '#334155' : '#0f172a'}
                    strokeWidth="0.55"
                  />
                );
              });
          })}

          {/* Star Systems */}
          {game.systemOrder.map((id) => {
            const sys = game.systems[id];
            const cx = toMini(sys.x);
            const cy = toMini(sys.y);
            const modeColor = getSystemMapModeColor(
              sys,
              mapMode,
              game.playerEmpireId,
              game.empires,
              game.relations
            );
            const isSel = selectedSysId === id;

            return (
              <g
                key={id}
                onClick={() => {
                  enterGalaxyView();
                  focusCameraOnSystem(id);
                  setSelection({ type: 'system', id });
                }}
                className="cursor-pointer"
              >
                {modeColor && (
                  <circle cx={cx} cy={cy} r="4.2" fill={modeColor} fillOpacity="0.28" />
                )}
                {isSel && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="3.8"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.9"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={sys.ownerId ? 1.9 : 1.3}
                  fill={
                    modeColor ??
                    (sys.exploredByPlayer ? '#cbd5e1' : '#475569')
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
