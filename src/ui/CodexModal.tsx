import React, { useState } from 'react';
import { BookOpen, X, Swords, FlaskConical, Building2, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { DEFENSE_LIST, HULL_CLASSES, HULL_ORDER, WEAPON_LIST } from '../data/ships';
import { TECH_LIST } from '../data/technologies';
import { BUILDING_LIST } from '../data/districtsAndBuildings';

export const CodexModal: React.FC = () => {
  const show = useGameStore((s) => s.showCodexModal);
  const setShow = useGameStore((s) => s.setShowCodexModal);
  const [tab, setTab] = useState<'combat' | 'tech' | 'buildings' | 'advanced' | 'victory'>('combat');

  if (!show) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[80vh] hud-panel rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-white">星海百科（Halfstar Codex）</h2>
              <p className="text-[11px] text-slate-400">
                查阅舰队克制、全学科科技树、行星建筑与银河胜利机制
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 text-xs">
          {(
            [
              ['combat', '舰船与克制', Swords],
              ['tech', `科技目录 (${TECH_LIST.length})`, FlaskConical],
              ['buildings', `行星建筑 (${BUILDING_LIST.length})`, Building2],
              ['advanced', '巨构·圣物·利维坦', BookOpen],
              ['victory', '胜利与天灾', Trophy],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 border cursor-pointer ${
                tab === id
                  ? 'bg-sky-600/35 border-sky-400 text-white font-semibold'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
          {tab === 'combat' && (
            <>
              <div>
                <div className="font-bold text-amber-300 mb-2">武器系统（三角克制）</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {WEAPON_LIST.map((w) => (
                    <div key={w.id} className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
                      <div className="flex justify-between font-bold text-slate-100">
                        <span>{w.name}</span>
                        <span className="font-mono text-rose-300">伤害 {w.damage}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-bold text-sky-300 mb-2">防御模块</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {DEFENSE_LIST.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
                      <div className="font-bold text-slate-100">{d.name}</div>
                      <p className="text-[11px] text-slate-400 mt-1">{d.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-bold text-emerald-300 mb-2">四级战舰船体</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {HULL_ORDER.map((h) => {
                    const def = HULL_CLASSES[h];
                    return (
                      <div key={h} className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
                        <div className="flex justify-between font-bold text-slate-100">
                          <span>{def.name}</span>
                          <span className="font-mono text-purple-300">
                            基础 {def.baseAlloyCost} 合金 · {def.weaponSlots}武/{def.defenseSlots}防
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{def.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'tech' && (
            <div className="grid grid-cols-2 gap-2.5">
              {TECH_LIST.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-100">{t.name}</span>
                    <span className="text-[10px] font-mono text-sky-300">
                      {t.branch === 'physics' ? '物理' : t.branch === 'society' ? '社会' : '工程'} · T{t.tier} · {t.cost}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-1 font-medium">{t.summary}</div>
                  <p className="text-[10px] text-slate-400 mt-1">{t.description}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'buildings' && (
            <div className="grid grid-cols-2 gap-2.5">
              {BUILDING_LIST.map((b) => (
                <div key={b.id} className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>{b.name}</span>
                    <span className="font-mono text-rose-300">◆ {b.mineralCost} 矿物</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{b.description}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'advanced' && (
            <div className="space-y-3 leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-cyan-500/35">
                <div className="font-bold text-cyan-300 mb-1">◎ 跨星系星门网络 & 巨型建筑</div>
                研发「擎天堡要塞」或「巨型工程学」后，可在己方星系建造跨星系星门（450 合金），己方任意星门间支持舰队 1 跳瞬移；还可修建戴森球、物质解压器、科研枢纽等 5 大 3D 巨构。
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-purple-500/35">
                <div className="font-bold text-purple-300 mb-1">✦ 战略资源与建筑 3 阶升级</div>
                开采星系矿脉或在殖民地修建「战略资源精炼厂」获取易爆微粒、异星天然气、稀有水晶，可将行星建筑从 Lv.1 升级至 Lv.2（1.85×）与 Lv.3（2.8×），走精兵高种田路线！
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-amber-500/35">
                <div className="font-bold text-amber-300 mb-1">🏛 帝国规模与国内派系</div>
                星系、殖民地与人口会累积帝国规模（基础阈值 100），超出后科技与传统成本按比例上升；满足国内四大派系诉求可每月额外提供凝聚力与影响力。
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-fuchsia-500/35">
                <div className="font-bold text-fuchsia-300 mb-1">🐉 远古利维坦、考古圣物与中期危机</div>
                银河深处盘踞着「以太星龙」「维度恐惧」「强互作用力水滴」等远古利维坦，讨伐可获海量暗物质与科研；发掘「⚱ 考古遗址」可永久获得帝国圣物；2208 年前后还将爆发「星际大可汗」中期危机，2212 年起失落帝国可能苏醒！
              </div>
            </div>
          )}

          {tab === 'victory' && (
            <div className="space-y-3 leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800">
                <div className="font-bold text-sky-300 mb-1">1. 征服胜利（银河霸权）</div>
                通过和平扩张前哨站或星际战争吞并敌国，控制全银河至少 50% 的星系。
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800">
                <div className="font-bold text-emerald-300 mb-1">2. 科技胜利（超级文明）</div>
                累计完成至少 12 项跨学科帝国科技研发，迈入星海巅峰。
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-rose-500/35">
                <div className="font-bold text-rose-300 mb-1">3. 天灾胜利（拯救银河）</div>
                异次元入侵者「虚空撕裂者」将于设定年份（默认 2215 年）撕裂边疆星系。针对其强护盾特点配置高动能磁轨炮主力舰队，将其全歼即可拯救银河获胜！
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
