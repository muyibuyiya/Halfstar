import React, { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { STRATEGIC_RESOURCES } from '../data/megastructures';

type FilterKind =
  | 'all'
  | 'habitable'
  | 'strategic'
  | 'arch'
  | 'leviathan'
  | 'gateway';

export const GalaxySearchModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const enterGalaxyView = useGameStore((s) => s.enterGalaxyView);
  const setSelection = useGameStore((s) => s.setSelection);
  const focusCameraOnSystem = useGameStore((s) => s.focusCameraOnSystem);

  useEffect(() => {
    const onToggle = () => {
      setOpen((prev) => !prev);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.body.getAttribute('data-recording-key') === 'true') return;
      if (e.code === 'Escape' && open) {
        setOpen(false);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const kb = useGameStore.getState().settings.keybindings;
      const searchKey = kb?.searchGalaxy || 'KeyF';
      if (e.code === searchKey && useGameStore.getState().screen === 'playing') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('halfstar:toggle-search', onToggle);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('halfstar:toggle-search', onToggle);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const leviathanSysIds = new Set(
    Object.values(game.fleets)
      .filter((f) => Boolean(f.leviathanId))
      .map((f) => f.systemId)
  );

  const results = game.systemOrder
    .map((id) => game.systems[id])
    .filter((sys) => {
      if (!sys) return false;
      if (q) {
        const matchSys = sys.name.toLowerCase().includes(q);
        const matchPlanet = sys.planets.some((p) =>
          p.name.toLowerCase().includes(q)
        );
        if (!matchSys && !matchPlanet) return false;
      }
      if (filter === 'habitable') {
        return (
          sys.surveyedByPlayer &&
          sys.planets.some((p) => p.habitable && !p.colonizedBy)
        );
      }
      if (filter === 'strategic') {
        return sys.surveyedByPlayer && Boolean(sys.strategicDeposit);
      }
      if (filter === 'arch') {
        return (
          sys.surveyedByPlayer &&
          Boolean(sys.archSite) &&
          sys.archSite?.stage !== 'completed'
        );
      }
      if (filter === 'leviathan') {
        return leviathanSysIds.has(sys.id);
      }
      if (filter === 'gateway') {
        return Boolean(sys.hasGateway);
      }
      return true;
    });

  const handleJump = (sysId: string) => {
    enterGalaxyView();
    setSelection({ type: 'system', id: sysId });
    focusCameraOnSystem(sysId);
    setOpen(false);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-45 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl hud-panel rounded-xl overflow-hidden flex flex-col max-h-[70vh] shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sky-500/25 bg-sky-950/45">
          <Search className="w-4 h-4 text-sky-300 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索星系或行星名称（支持快捷筛选）..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-slate-400 border border-slate-700">
            ESC
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-slate-950/65 border-b border-slate-800 text-[11px]">
          {(
            [
              ['all', '全部星系'],
              ['habitable', '● 未殖民宜居星'],
              ['strategic', '✦ 战略资源'],
              ['arch', '⚱ 考古遗址'],
              ['leviathan', '🐉 远古利维坦'],
              ['gateway', '◎ 跨星系星门'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                filter === id
                  ? 'bg-sky-600/45 border-sky-400 text-white font-semibold'
                  : 'bg-slate-900/75 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
          {results.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              未找到符合条件的星系（部分信息需科研船调查后显现）
            </div>
          ) : (
            results.slice(0, 40).map((sys) => {
              const owner = sys.ownerId ? game.empires[sys.ownerId] : null;
              const uncolHab = sys.planets.filter(
                (p) => p.habitable && !p.colonizedBy
              ).length;
              return (
                <button
                  key={sys.id}
                  onClick={() => handleJump(sys.id)}
                  className="w-full p-2.5 rounded-lg bg-slate-900/75 hover:bg-sky-950/60 border border-slate-800 hover:border-sky-400/60 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {owner && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: owner.color }}
                        />
                      )}
                      <span className="font-bold text-slate-100 truncate">
                        {sys.name}
                      </span>
                      {sys.hasGateway && (
                        <span className="text-cyan-300 text-[10px]">◎ 星门</span>
                      )}
                      {sys.surveyedByPlayer && uncolHab > 0 && (
                        <span className="text-emerald-300 text-[10px]">
                          ● {uncolHab}宜居
                        </span>
                      )}
                      {sys.surveyedByPlayer && sys.strategicDeposit && (
                        <span
                          className={`text-[10px] ${
                            STRATEGIC_RESOURCES[sys.strategicDeposit.type].color
                          }`}
                        >
                          {STRATEGIC_RESOURCES[sys.strategicDeposit.type].symbol}
                          {STRATEGIC_RESOURCES[sys.strategicDeposit.type].shortName}
                        </span>
                      )}
                      {sys.surveyedByPlayer &&
                        sys.archSite &&
                        sys.archSite.stage !== 'completed' && (
                          <span className="text-purple-300 text-[10px]">
                            ⚱ {sys.archSite.siteName}
                          </span>
                        )}
                      {leviathanSysIds.has(sys.id) && (
                        <span className="text-fuchsia-300 text-[10px] font-bold">
                          🐉 利维坦
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {owner
                        ? `归属：${owner.name}`
                        : sys.surveyedByPlayer
                        ? '无主星系 · 已调查'
                        : '未知星系'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sky-300 text-[11px] shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    定位
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
