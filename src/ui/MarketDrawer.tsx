import React from 'react';
import { Store, X, Gem, Wheat, Hexagon, Package, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { MarketCommodity } from '../types/game';
import { BASE_MARKET_PRICES } from '../engine/simulation';

const COMMODITIES: Array<{
  id: MarketCommodity;
  label: string;
  color: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'minerals', label: '矿物', color: 'text-rose-400', icon: Gem },
  { id: 'food', label: '食物', color: 'text-emerald-400', icon: Wheat },
  { id: 'consumerGoods', label: '消费品', color: 'text-orange-300', icon: Package },
  { id: 'alloys', label: '合金', color: 'text-purple-300', icon: Hexagon },
];

export const MarketDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandMarketTrade = useGameStore((s) => s.commandMarketTrade);

  if (activeDrawer !== 'market') return null;

  const empire = game.empires[game.playerEmpireId];
  const amounts = [50, 200, 500];

  return (
    <div className="pointer-events-auto fixed top-15 left-16 w-[520px] max-w-[calc(100vw-20rem)] z-30 hud-panel-gold rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/25 bg-amber-950/25">
        <div className="flex items-center gap-2.5">
          <Store className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-amber-100">星际内部市场</h2>
            <p className="text-[11px] text-slate-400">
              当前能量币储备：
              <span className="text-amber-300 font-mono font-bold ml-1">
                ⚡ {Math.floor(empire.resources.energy)}
              </span>
              {' · '}市场手续费 20%（价格随大额交易波动并逐月回稳）
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

      <div className="p-4 space-y-3 text-xs">
        {COMMODITIES.map((c) => {
          const Icon = c.icon;
          const price = game.market.prices[c.id];
          const base = BASE_MARKET_PRICES[c.id];
          const stock = Math.floor(empire.resources[c.id]);
          const buyUnit = (price * 1.2).toFixed(2);
          const sellUnit = (price * 0.8).toFixed(2);

          return (
            <div
              key={c.id}
              className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${c.color}`} />
                  <span className="font-bold text-slate-100">{c.label}</span>
                  <span className="text-[11px] text-slate-400 font-mono">库存 {stock}</span>
                </div>
                <div className="text-[11px] font-mono">
                  <span className="text-slate-400">基准价 </span>
                  <span
                    className={
                      price > base * 1.05
                        ? 'text-rose-400'
                        : price < base * 0.95
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }
                  >
                    ⚡ {price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Buy buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 w-14 shrink-0">
                    <ArrowDownLeft className="w-3 h-3" />
                    买入({buyUnit})
                  </span>
                  {amounts.map((amt) => (
                    <button
                      key={`b_${amt}`}
                      onClick={() => commandMarketTrade(c.id, 'buy', amt)}
                      className="flex-1 py-1 rounded bg-emerald-950/70 hover:bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                {/* Sell buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-amber-300 flex items-center gap-0.5 w-14 shrink-0">
                    <ArrowUpRight className="w-3 h-3" />
                    卖出({sellUnit})
                  </span>
                  {amounts.map((amt) => (
                    <button
                      key={`s_${amt}`}
                      onClick={() => commandMarketTrade(c.id, 'sell', amt)}
                      className="flex-1 py-1 rounded bg-amber-950/60 hover:bg-amber-800/70 border border-amber-500/40 text-amber-200 font-mono text-[11px] cursor-pointer"
                    >
                      -{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
