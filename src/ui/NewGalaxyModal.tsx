import React, { useState } from 'react';
import { X, Dices, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { GalaxyShape, GalaxySize } from '../types/game';

export const NewGalaxyModal: React.FC = () => {
  const show = useGameStore((s) => s.showNewGalaxyModal);
  const currentConfig = useGameStore((s) => s.game.config);
  const setShow = useGameStore((s) => s.setShowNewGalaxyModal);
  const newGalaxy = useGameStore((s) => s.newGalaxy);

  const [size, setSize] = useState<GalaxySize>(currentConfig.size);
  const [shape, setShape] = useState<GalaxyShape>(currentConfig.shape);
  const [seed, setSeed] = useState<number>(currentConfig.seed);

  if (!show) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md hud-panel-gold rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/25 bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold tracking-wide text-amber-100">
              生成新银河星图
            </h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Galaxy Size */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">银河规模</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'small', label: '小型 (32 星系)' },
                  { id: 'medium', label: '中型 (52 星系)' },
                  { id: 'large', label: '大型 (76 星系)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSize(opt.id)}
                  className={`py-2 px-2 rounded border font-medium cursor-pointer transition-colors ${
                    size === opt.id
                      ? 'bg-sky-600/35 border-sky-400 text-sky-100'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Galaxy Shape */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">星系形态</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'spiral', label: '三旋臂螺旋' },
                  { id: 'elliptical', label: '椭圆星盘' },
                  { id: 'ring', label: '环状星带' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setShape(opt.id)}
                  className={`py-2 px-2 rounded border font-medium cursor-pointer transition-colors ${
                    shape === opt.id
                      ? 'bg-sky-600/35 border-sky-400 text-sky-100'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Random Seed */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">星图种子</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 1)}
                className="flex-1 px-3 py-1.5 rounded bg-slate-950/90 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-sky-400"
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 90000000) + 10000000)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
                随机
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={() => newGalaxy({ size, shape, seed })}
              className="px-4 py-2 rounded bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold shadow-lg cursor-pointer"
            >
              生成并开启新星海
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
