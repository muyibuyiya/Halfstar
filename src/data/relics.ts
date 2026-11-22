import { EmpireModifiers, ResourcePool } from '../types/game';

export interface RelicDef {
  id: string;
  siteName: string;
  relicName: string;
  passiveSummary: string;
  activeSummary: string;
  activeUnityCost: number;
  cooldownDays: number;
  passiveEffects: Partial<EmpireModifiers>;
  activeReward: Partial<ResourcePool>;
  description: string;
}

export const RELICS: RelicDef[] = [
  {
    id: 'relic_precursor_core',
    siteName: '先驱者星门遗址',
    relicName: '先驱者量子核心',
    passiveSummary: '被动：全帝国科研速度 +15%',
    activeSummary: '激活：立即获得 +260 科研储备点',
    activeUnityCost: 90,
    cooldownDays: 360,
    passiveEffects: { researchMult: 0.15 },
    activeReward: { research: 260 },
    description: '运转百万年未曾停歇的先驱者超算核心，至今仍在吐露宇宙深处的数学真理。',
  },
  {
    id: 'relic_star_forge',
    siteName: '上古恒星熔炉残骸',
    relicName: '上古恒星熔炉核心',
    passiveSummary: '被动：合金产出 +15% · 矿物 +10%',
    activeSummary: '激活：立即锻造 +350 合金',
    activeUnityCost: 90,
    cooldownDays: 360,
    passiveEffects: { alloysMult: 0.15, mineralsMult: 0.1 },
    activeReward: { alloys: 350 },
    description: '能够直接将恒星等离子体凝结为高强度战舰合金的奇迹装置。',
  },
  {
    id: 'relic_droplet_matrix',
    siteName: '沉睡的水滴墓穴',
    relicName: '强互作用力镜面核心',
    passiveSummary: '被动：舰队装甲 +22% · 船体 +10%',
    activeSummary: '激活：立即获得 +260 合金 · +220 能量币',
    activeUnityCost: 90,
    cooldownDays: 360,
    passiveEffects: { shipArmorBonus: 0.22, shipHullBonus: 0.1 },
    activeReward: { alloys: 260, energy: 220 },
    description: '【三体圣物】从远古文明墓穴发掘的完美镜面水滴残片，蕴含令人窒息的强核力工艺。',
  },
  {
    id: 'relic_shroud_orb',
    siteName: '虚境灵能圣坛',
    relicName: '高维虚境水晶球',
    passiveSummary: '被动：凝聚力 +20% · 舰队闪避 +10%',
    activeSummary: '激活：立即获得 +220 凝聚力 · +65 影响力',
    activeUnityCost: 80,
    cooldownDays: 360,
    passiveEffects: { unityMult: 0.2, shipEvasionBonus: 0.1 },
    activeReward: { unity: 220, influence: 65 },
    description: '映照着高维灵能微光的神秘晶球，能极大凝聚全帝国的意志。',
  },
  {
    id: 'relic_dark_compass',
    siteName: '暗物质星图神殿',
    relicName: '暗物质星图罗盘',
    passiveSummary: '被动：舰队航速 +25% · 轨道站产出 +20%',
    activeSummary: '激活：立即获得 +420 能量币 · +300 矿物',
    activeUnityCost: 90,
    cooldownDays: 360,
    passiveEffects: { shipSpeedMult: 0.25, stationOutputMult: 0.2 },
    activeReward: { energy: 420, minerals: 300 },
    description: '指向银河隐秘航道与富矿星云的远古导航圣物。',
  },
];

export const RELIC_BY_ID: Record<string, RelicDef> = Object.fromEntries(
  RELICS.map((r) => [r.id, r])
);
