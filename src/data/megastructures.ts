import {
  EmpireModifiers,
  MegastructureType,
  ResourceKey,
  StrategicResourceKey,
} from '../types/game';

export interface StrategicResourceMeta {
  key: StrategicResourceKey;
  name: string;
  shortName: string;
  color: string;
  symbol: string;
  description: string;
}

export const STRATEGIC_RESOURCES: Record<StrategicResourceKey, StrategicResourceMeta> = {
  volatileMotes: {
    key: 'volatileMotes',
    name: '易爆微粒',
    shortName: '微粒',
    color: 'text-orange-400',
    symbol: '✴',
    description: '蕴含极高动能与化学能的稀有微粒，产自星云与熔融富矿星系。',
  },
  exoticGases: {
    key: 'exoticGases',
    name: '异星天然气',
    shortName: '异星气',
    color: 'text-emerald-400',
    symbol: '☁',
    description: '提炼自气态巨行星与星云的高能稀有气体，用于护盾与科研加速。',
  },
  rareCrystals: {
    key: 'rareCrystals',
    name: '稀有水晶',
    shortName: '水晶',
    color: 'text-amber-300',
    symbol: '❖',
    description: '具备完美光学聚焦特性的天然晶体，产自脉冲星与小行星带。',
  },
  darkMatter: {
    key: 'darkMatter',
    name: '暗物质',
    shortName: '暗物质',
    color: 'text-purple-400',
    symbol: '◉',
    description: '仅在黑洞与中子星视界边缘采集到的神秘物质，驱动终极护盾与巨构。',
  },
};

export const STRATEGIC_RESOURCE_LIST = Object.values(STRATEGIC_RESOURCES);

export interface MegastructureDef {
  id: MegastructureType;
  name: string;
  alloyCost: number;
  buildDays: number;
  requiredTech: string;
  color: string;
  monthlyIncome: Partial<Record<ResourceKey, number>>;
  effects: Partial<EmpireModifiers>;
  revealsGalaxy?: boolean;
  summary: string;
  description: string;
}

export const MEGASTRUCTURES: Record<MegastructureType, MegastructureDef> = {
  dyson_sphere: {
    id: 'dyson_sphere',
    name: '戴森球',
    alloyCost: 1200,
    buildDays: 95,
    requiredTech: 'eng_mega_engineering',
    color: '#fbbf24',
    monthlyIncome: { energy: 240 },
    effects: { energyMult: 0.2 },
    summary: '月产 +240 能量币 · 全帝国能量 +20%',
    description: '以巨型太阳能收集环网包裹恒星，为帝国提供取之不尽的恒星级能源。',
  },
  matter_decompressor: {
    id: 'matter_decompressor',
    name: '物质解压器',
    alloyCost: 1200,
    buildDays: 95,
    requiredTech: 'eng_mega_engineering',
    color: '#a855f7',
    monthlyIncome: { minerals: 200, alloys: 55 },
    effects: { mineralsMult: 0.2 },
    summary: '月产 +200 矿物 · +55 合金 · 全帝国矿物 +20%',
    description: '利用引力井射线从恒星/致密天体核心直接抽取高纯度矿物与合金流。',
  },
  science_nexus: {
    id: 'science_nexus',
    name: '科学枢纽',
    alloyCost: 1100,
    buildDays: 85,
    requiredTech: 'eng_mega_engineering',
    color: '#38bdf8',
    monthlyIncome: { research: 140 },
    effects: { researchMult: 0.25 },
    summary: '月产 +140 科研点 · 全帝国科研速度 +25%',
    description: '汇聚全银河顶尖智慧与量子超算的轨道学术圣殿。',
  },
  mega_shipyard: {
    id: 'mega_shipyard',
    name: '巨型星际船坞',
    alloyCost: 1100,
    buildDays: 85,
    requiredTech: 'eng_mega_engineering',
    color: '#34d399',
    monthlyIncome: { alloys: 30 },
    effects: { shipBuildSpeedMult: 0.85, shipWeaponBonus: 0.15, shipHullBonus: 0.15, fleetCapBonus: 50 },
    summary: '造舰速度 +85% · 舰队火力/船体 +15% · 舰容 +50',
    description: '数十条自动化主力舰装配轨道同时运转，瞬间下水庞大星际无畏舰队。',
  },
  sentry_array: {
    id: 'sentry_array',
    name: '全银河哨兵阵列',
    alloyCost: 950,
    buildDays: 75,
    requiredTech: 'eng_mega_engineering',
    color: '#2dd4bf',
    monthlyIncome: { unity: 60 },
    effects: { shipEvasionBonus: 0.12, diplomaticWeightMult: 0.25 },
    revealsGalaxy: true,
    summary: '永久揭开全银河迷雾与测绘 · 凝聚力 +60 · 闪避 +12%',
    description: '覆盖全银河的超光速快子雷达阵列，任何星系与外星舰队皆无所遁形。',
  },
};

export const MEGASTRUCTURE_LIST = Object.values(MEGASTRUCTURES);
