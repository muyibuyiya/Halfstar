import { EmpireModifiers } from '../types/game';

export type TraditionTreeId = 'discovery' | 'prosperity' | 'supremacy';

export interface TraditionPerkDef {
  id: string;
  tree: TraditionTreeId;
  name: string;
  summary: string;
  description: string;
  effects: Partial<EmpireModifiers>;
}

export interface TraditionTreeDef {
  id: TraditionTreeId;
  name: string;
  color: string;
  description: string;
  perks: TraditionPerkDef[];
}

export interface AscensionPerkDef {
  id: string;
  name: string;
  summary: string;
  description: string;
  effects: Partial<EmpireModifiers>;
}

export const TRADITION_TREES: TraditionTreeDef[] = [
  {
    id: 'discovery',
    name: '探索传统',
    color: '#38bdf8',
    description: '崇尚未知与求知精神，大幅加速帝国科研、轨道开采与异星适应能力。',
    perks: [
      {
        id: 'trad_disc_1',
        tree: 'discovery',
        name: '启蒙科研院',
        summary: '科研速度 +15%',
        description: '整合各殖民地顶尖学者，显著提升三条科技线的研发效率。',
        effects: { researchMult: 0.15 },
      },
      {
        id: 'trad_disc_2',
        tree: 'discovery',
        name: '深空测绘网络',
        summary: '轨道站产出 +25%',
        description: '精密轨道传感器使所有采矿站与科研站产量大幅提高。',
        effects: { stationOutputMult: 0.25 },
      },
      {
        id: 'trad_disc_3',
        tree: 'discovery',
        name: '星海开拓者',
        summary: '全星球宜居度 +10%',
        description: '先进环境工程让公民在各类外星生态圈中安居乐业。',
        effects: { habitabilityBonus: 10 },
      },
    ],
  },
  {
    id: 'prosperity',
    name: '繁荣传统',
    color: '#fbbf24',
    description: '专注工业产线与经济循环，锻造富可敌国的银河经济引擎。',
    perks: [
      {
        id: 'trad_pros_1',
        tree: 'prosperity',
        name: '标准工业化',
        summary: '能量币 +15% · 矿物 +15%',
        description: '全帝国统一工业标准，显著提升基础能源与矿产产出。',
        effects: { energyMult: 0.15, mineralsMult: 0.15 },
      },
      {
        id: 'trad_pros_2',
        tree: 'prosperity',
        name: '精益冶炼体系',
        summary: '合金 +15% · 消费品 +15%',
        description: '优化合金铸造厂与民用工业流程，扩大高端制造盈余。',
        effects: { alloysMult: 0.15, consumerGoodsMult: 0.15 },
      },
      {
        id: 'trad_pros_3',
        tree: 'prosperity',
        name: '黄金繁荣纪元',
        summary: '人口增长 +18% · 凝聚力 +15%',
        description: '富裕稳定的生活环境迎来殖民地人口爆发式增长。',
        effects: { popGrowthMult: 0.18, unityMult: 0.15 },
      },
    ],
  },
  {
    id: 'supremacy',
    name: '霸权传统',
    color: '#f43f5e',
    description: '以钢铁舰队铸就银河秩序，强化海战火力、舰船船体与疆域扩张。',
    perks: [
      {
        id: 'trad_supr_1',
        tree: 'supremacy',
        name: '星际海军学院',
        summary: '舰队武器伤害 +18%',
        description: '严苛的舰队战术演练使全军武器齐射更具毁灭性。',
        effects: { shipWeaponBonus: 0.18 },
      },
      {
        id: 'trad_supr_2',
        tree: 'supremacy',
        name: '战时船坞体制',
        summary: '舰船船体生命 +18%',
        description: '强化造船厂装甲焊接工艺，大幅延长战舰战场存活时间。',
        effects: { shipHullBonus: 0.18 },
      },
      {
        id: 'trad_supr_3',
        tree: 'supremacy',
        name: '铁血扩张主义',
        summary: '前哨站影响力消耗 -20%',
        description: '帝国的星际主权不容置疑，显著降低疆域扩张成本。',
        effects: { outpostInfluenceDiscount: 0.2 },
      },
    ],
  },
];

export const ALL_TRADITION_PERKS: Record<string, TraditionPerkDef> = {};
for (const tree of TRADITION_TREES) {
  for (const perk of tree.perks) {
    ALL_TRADITION_PERKS[perk.id] = perk;
  }
}

export const ASCENSION_PERKS: AscensionPerkDef[] = [
  {
    id: 'asc_technological_ascendancy',
    name: '科技飞升',
    summary: '全帝国科研速度 +25%',
    description: '我们的文明已触及宇宙真理的边缘，科技树突破速度将令全银河望尘莫及。',
    effects: { researchMult: 0.25 },
  },
  {
    id: 'asc_galactic_force_projection',
    name: '银河武力投送',
    summary: '舰队武器伤害 +25% · 船体生命 +25%',
    description: '无敌的星际无畏舰队足以正面碾碎任何外星霸权与异次元天灾。',
    effects: { shipWeaponBonus: 0.25, shipHullBonus: 0.25 },
  },
  {
    id: 'asc_utopian_abundance',
    name: '星际乌托邦',
    summary: '能量/矿物/合金/食物 产出全 +20%',
    description: '高度自动化的后稀缺星际社会，为帝国提供源源不断的战略物资。',
    effects: { energyMult: 0.2, mineralsMult: 0.2, alloysMult: 0.2, foodMult: 0.2 },
  },
];

export const ASCENSION_BY_ID: Record<string, AscensionPerkDef> = Object.fromEntries(
  ASCENSION_PERKS.map((a) => [a.id, a])
);

export function getNextTraditionUnityCost(unlockedCount: number): number {
  return Math.round(120 + unlockedCount * 75);
}

export function getAvailableAscensionSlots(unlockedTraditions: string[]): number {
  let completedTrees = 0;
  for (const tree of TRADITION_TREES) {
    if (tree.perks.every((p) => unlockedTraditions.includes(p.id))) {
      completedTrees++;
    }
  }
  return completedTrees;
}
