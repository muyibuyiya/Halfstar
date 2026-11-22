import React, { useState, useEffect } from 'react';
import { Wrench, X, Crosshair, Shield, Heart, Zap, Save, Lock, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  DEFENSE_LIST,
  getDefenseDef,
  getWeaponDef,
  HULL_CLASSES,
  HULL_ORDER,
  WEAPON_LIST,
} from '../data/ships';
import { DefenseType, ShipHullClass, WeaponType } from '../types/game';
import { computeShipDesignStats, isHullUnlocked } from '../engine/shipSystem';
import { TECHNOLOGIES } from '../data/technologies';

export const ShipDesignerDrawer: React.FC = () => {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.tickVersion);
  const commandUpdateShipDesign = useGameStore((s) => s.commandUpdateShipDesign);

  const empire = game.empires[game.playerEmpireId];
  const [selectedHull, setSelectedHull] = useState<ShipHullClass>('corvette');
  const [weapons, setWeapons] = useState<WeaponType[]>(
    empire.shipDesigns.corvette.weapons
  );
  const [defenses, setDefenses] = useState<DefenseType[]>(
    empire.shipDesigns.corvette.defenses
  );

  useEffect(() => {
    const d = empire.shipDesigns[selectedHull];
    if (d) {
      setWeapons([...d.weapons]);
      setDefenses([...d.defenses]);
    }
  }, [selectedHull, activeDrawer]);

  if (activeDrawer !== 'ship_designer') return null;

  const hullDef = HULL_CLASSES[selectedHull];
  const hullUnlocked = isHullUnlocked(empire, selectedHull);
  const currentDesign = empire.shipDesigns[selectedHull] ?? {
    hullClass: selectedHull,
    name: hullDef.name,
    weapons: [...hullDef.defaultWeapons],
    defenses: [...hullDef.defaultDefenses],
  };

  const unlockedWeapons = WEAPON_LIST.filter(
    (w) => !w.requiredTech || empire.completedTechs.includes(w.requiredTech)
  );
  const unlockedDefenses = DEFENSE_LIST.filter(
    (d) => !d.requiredTech || empire.completedTechs.includes(d.requiredTech)
  );

  const previewStats = computeShipDesignStats(
    {
      hullClass: selectedHull,
      name: currentDesign.name,
      weapons,
      defenses,
    },
    empire.modifiers
  );

  const setWeaponSlot = (idx: number, next: WeaponType) => {
    setWeapons((prev) => prev.map((w, i) => (i === idx ? next : w)));
  };

  const setDefenseSlot = (idx: number, next: DefenseType) => {
    setDefenses((prev) => prev.map((d, i) => (i === idx ? next : d)));
  };

  // One-click auto-equip highest tier unlocked weapons & defenses!
  const handleAutoUpgrade = () => {
    const bestWep = [...unlockedWeapons].sort((a, b) => b.damage - a.damage)[0];
    const bestShield = [...unlockedDefenses]
      .filter((d) => d.family === 'shield')
      .sort((a, b) => b.shieldBonus - a.shieldBonus)[0];
    const bestArmor = [...unlockedDefenses]
      .filter((d) => d.family === 'armor')
      .sort((a, b) => b.armorBonus - a.armorBonus)[0];

    if (bestWep) {
      setWeapons(Array.from({ length: hullDef.weaponSlots }, () => bestWep.id));
    }
    setDefenses(
      Array.from({ length: hullDef.defenseSlots }, (_, idx) =>
        idx % 2 === 0 ? bestShield?.id ?? 'shield_1' : bestArmor?.id ?? 'armor_1'
      )
    );
  };

  return (
    <div className="pointer-events-auto fixed top-15 left-16 bottom-4 w-[860px] max-w-[calc(100vw-20rem)] z-30 hud-panel rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sky-500/25 bg-sky-950/40">
        <div className="flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white">帝国舰船设计器（T1~T5 代际武装）</h2>
            <p className="text-[11px] text-slate-400">
              已解锁武装 {unlockedWeapons.length}/{WEAPON_LIST.length} · 已解锁防御{' '}
              {unlockedDefenses.length}/{DEFENSE_LIST.length}（随物理/工程科技解锁高阶装备）
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoUpgrade}
            className="px-2.5 py-1.5 rounded bg-amber-950/70 hover:bg-amber-800/70 border border-amber-400/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            一键装配最高级组件
          </button>
          <button
            onClick={() => setActiveDrawer('none')}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hull Class Tabs (5 classes including Titan!) */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 overflow-x-auto">
        {HULL_ORDER.map((h) => {
          const def = HULL_CLASSES[h];
          const unlocked = isHullUnlocked(empire, h);
          const active = selectedHull === h;
          return (
            <button
              key={h}
              onClick={() => setSelectedHull(h)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                active
                  ? 'bg-sky-600/35 border-sky-400 text-white'
                  : unlocked
                  ? 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                  : 'bg-slate-950/70 border-slate-800 text-slate-500'
              }`}
            >
              {!unlocked && <Lock className="w-3 h-3" />}
              {def.name}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-12 gap-4 text-xs">
        {/* Left: Slots Config */}
        <div className="col-span-7 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-sky-100">{currentDesign.name}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{hullDef.description}</p>
            </div>
            {!hullUnlocked && hullDef.requiredTech && (
              <span className="px-2 py-1 rounded bg-rose-950/70 border border-rose-500/50 text-rose-200 text-[10px] shrink-0">
                需科技：{TECHNOLOGIES[hullDef.requiredTech]?.name}
              </span>
            )}
          </div>

          {/* Weapon Slots */}
          <div>
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              武器槽位 ({hullDef.weaponSlots})
            </div>
            <div className="space-y-2">
              {weapons.map((wId, idx) => {
                const curW = getWeaponDef(wId);
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">武器槽 #{idx + 1}</span>
                      <select
                        value={curW.id}
                        onChange={(e) => setWeaponSlot(idx, e.target.value)}
                        className="bg-slate-950 border border-sky-500/40 rounded px-2 py-1 text-xs text-sky-100 focus:outline-none focus:border-sky-400 cursor-pointer"
                      >
                        {WEAPON_LIST.map((w) => {
                          const ok = !w.requiredTech || empire.completedTechs.includes(w.requiredTech);
                          return (
                            <option key={w.id} value={w.id} disabled={!ok}>
                              [T{w.tier}] {w.name} (伤害{w.damage})
                              {!ok && w.requiredTech
                                ? ` — 需「${TECHNOLOGIES[w.requiredTech]?.name}」`
                                : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="text-[10px] text-slate-400">{curW.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Defense Slots */}
          <div>
            <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              防御槽位 ({hullDef.defenseSlots})
            </div>
            <div className="space-y-2">
              {defenses.map((dId, idx) => {
                const curD = getDefenseDef(dId);
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">防御槽 #{idx + 1}</span>
                      <select
                        value={curD.id}
                        onChange={(e) => setDefenseSlot(idx, e.target.value)}
                        className="bg-slate-950 border border-emerald-500/40 rounded px-2 py-1 text-xs text-emerald-100 focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        {DEFENSE_LIST.map((d) => {
                          const ok = !d.requiredTech || empire.completedTechs.includes(d.requiredTech);
                          const statTxt =
                            d.shieldBonus > 0
                              ? `盾+${d.shieldBonus}`
                              : d.armorBonus > 0
                              ? `甲+${d.armorBonus}`
                              : `船+${d.hullBonus}`;
                          return (
                            <option key={d.id} value={d.id} disabled={!ok}>
                              [T{d.tier}] {d.name} ({statTxt})
                              {!ok && d.requiredTech
                                ? ` — 需「${TECHNOLOGIES[d.requiredTech]?.name}」`
                                : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="text-[10px] text-slate-400">{curD.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Stats Card */}
        <div className="col-span-5 flex flex-col justify-between p-4 rounded-lg bg-slate-950/75 border border-sky-500/25">
          <div className="space-y-3">
            <div className="text-center pb-3 border-b border-slate-800">
              <div className="text-[11px] text-slate-400">预计单舰战斗力</div>
              <div className="text-3xl font-mono font-bold text-emerald-400 mt-0.5">
                ⚔ {previewStats.power}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  船体生命
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {previewStats.maxHull}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  能量护盾
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {previewStats.maxShield}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  纳米装甲
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {previewStats.maxArmor}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  日均火力
                </span>
                <span className="font-mono font-bold text-rose-300">{previewStats.dps}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">闪避率</span>
                <span className="font-mono text-slate-200">
                  {Math.round(previewStats.evasion * 100)}%
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">单舰造价</span>
                <span className="font-mono font-bold text-purple-300">
                  ⬢ {previewStats.alloyCost} 合金
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">船坞工期</span>
                <span className="font-mono text-slate-200">{previewStats.buildDays} 天</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => commandUpdateShipDesign(selectedHull, weapons, defenses)}
            className="mt-4 w-full py-2.5 rounded-md bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            保存舰船设计
          </button>
        </div>
      </div>
    </div>
  );
};
