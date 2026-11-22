import { BuildingId, DistrictType, ResourceKey } from '../types/game';

export interface DistrictDef {
  id: DistrictType;
  name: string;
  color: string;
  mineralCost: number;
  buildDays: number;
  housing: number;
  amenities: number;
  buildingSlots: number;
  output: Partial<Record<ResourceKey, number>>;
  upkeep: Partial<Record<ResourceKey, number>>;
  description: string;
}

export const DISTRICTS: Record<DistrictType, DistrictDef> = {
  city: {
    id: 'city',
    name: '城市区划',
    color: '#38bdf8',
    mineralCost: 220,
    buildDays: 45,
    housing: 6,
    amenities: 4,
    buildingSlots: 1,
    output: {},
    upkeep: { energy: 2 },
    description: '提供大量住房、舒适度，并额外解锁 1 个星球建筑槽位。',
  },
  generator: {
    id: 'generator',
    name: '发电区划',
    color: '#fbbf24',
    mineralCost: 160,
    buildDays: 35,
    housing: 2,
    amenities: 0,
    buildingSlots: 0,
    output: { energy: 12 },
    upkeep: { energy: 1 },
    description: '利用聚变反应堆与轨道集能网，稳定产出大量能量币。',
  },
  mining: {
    id: 'mining',
    name: '采矿区划',
    color: '#fb7185',
    mineralCost: 160,
    buildDays: 35,
    housing: 2,
    amenities: 0,
    buildingSlots: 0,
    output: { minerals: 12 },
    upkeep: { energy: 1 },
    description: '深层地壳自动化采掘设施，产出用于建设与工业的矿物。',
  },
  farming: {
    id: 'farming',
    name: '农业区划',
    color: '#34d399',
    mineralCost: 160,
    buildDays: 35,
    housing: 2,
    amenities: 0,
    buildingSlots: 0,
    output: { food: 12 },
    upkeep: { energy: 1 },
    description: '生态农场与水培穹顶，为帝国人口增长提供充足食物。',
  },
};

export const DISTRICT_ORDER: DistrictType[] = ['city', 'generator', 'mining', 'farming'];

export interface BuildingDef {
  id: BuildingId;
  name: string;
  category: 'industry' | 'research' | 'society' | 'military';
  mineralCost: number;
  buildDays: number;
  amenities: number;
  stabilityBonus: number;
  popGrowthBonus: number;
  energyPlanetBonus: number;
  mineralsPlanetBonus: number;
  output: Partial<Record<ResourceKey, number>>;
  upkeep: Partial<Record<ResourceKey, number>>;
  requiredTech?: string;
  uniquePerPlanet?: boolean;
  description: string;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  alloy_foundry: {
    id: 'alloy_foundry',
    name: '合金铸造厂',
    category: 'industry',
    mineralCost: 240,
    buildDays: 50,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: { alloys: 10 },
    upkeep: { minerals: 14, energy: 2 },
    description: '将原矿精炼为高强度星舰合金，用于前哨站、殖民与造舰。',
  },
  civilian_industries: {
    id: 'civilian_industries',
    name: '民用工业',
    category: 'industry',
    mineralCost: 220,
    buildDays: 45,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: { consumerGoods: 12 },
    upkeep: { minerals: 10, energy: 2 },
    description: '生产满足公民日常需求与科研机构消耗的消费品。',
  },
  research_lab: {
    id: 'research_lab',
    name: '科研实验室',
    category: 'research',
    mineralCost: 240,
    buildDays: 50,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: { research: 15 },
    upkeep: { consumerGoods: 4, energy: 2 },
    description: '加速物理、社会与工程三条科技线的研发进度。',
  },
  holotheater: {
    id: 'holotheater',
    name: '全息剧院',
    category: 'society',
    mineralCost: 180,
    buildDays: 40,
    amenities: 14,
    stabilityBonus: 4,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: { unity: 6 },
    upkeep: { consumerGoods: 2, energy: 2 },
    description: '提供大量舒适度与凝聚力，显著提升星球稳定度。',
  },
  monument: {
    id: 'monument',
    name: '星际纪念碑',
    category: 'society',
    mineralCost: 200,
    buildDays: 45,
    amenities: 4,
    stabilityBonus: 3,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: { unity: 12 },
    upkeep: { energy: 2 },
    uniquePerPlanet: true,
    description: '铭记帝国荣耀的宏伟建筑，产出大量凝聚力。',
  },
  stronghold: {
    id: 'stronghold',
    name: '行星要塞',
    category: 'military',
    mineralCost: 220,
    buildDays: 45,
    amenities: 0,
    stabilityBonus: 10,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: {},
    upkeep: { energy: 2 },
    description: '强化行星治安与防御，大幅提升星球稳定度。',
  },
  gene_clinic: {
    id: 'gene_clinic',
    name: '基因诊所',
    category: 'society',
    mineralCost: 260,
    buildDays: 55,
    amenities: 8,
    stabilityBonus: 0,
    popGrowthBonus: 0.25,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: {},
    upkeep: { consumerGoods: 2, energy: 2 },
    requiredTech: 'soc_gene_mapping',
    uniquePerPlanet: true,
    description: '先进生物医疗中心，使本星球人口增长速度 +25%。',
  },
  energy_grid: {
    id: 'energy_grid',
    name: '行星电网枢纽',
    category: 'industry',
    mineralCost: 260,
    buildDays: 55,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0.25,
    mineralsPlanetBonus: 0,
    output: { energy: 4 },
    upkeep: { energy: 1 },
    requiredTech: 'phy_global_grid',
    uniquePerPlanet: true,
    description: '统筹全星球输电网络，使本星球能量币产出 +25%。',
  },
  mineral_purification: {
    id: 'mineral_purification',
    name: '矿物提纯中心',
    category: 'industry',
    mineralCost: 260,
    buildDays: 55,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0.25,
    output: { minerals: 4 },
    upkeep: { energy: 2 },
    requiredTech: 'eng_mineral_purification',
    uniquePerPlanet: true,
    description: '高效重工业选矿设施，使本星球矿物产出 +25%。',
  },
  strategic_refinery: {
    id: 'strategic_refinery',
    name: '战略资源合成厂',
    category: 'industry',
    mineralCost: 260,
    buildDays: 55,
    amenities: 0,
    stabilityBonus: 0,
    popGrowthBonus: 0,
    energyPlanetBonus: 0,
    mineralsPlanetBonus: 0,
    output: {},
    upkeep: { minerals: 12, energy: 3 },
    description: '将原矿合成易爆微粒、异星天然气与稀有水晶（各 +1/月），供建筑升级与高级装备使用。',
  },
};

export const BUILDING_LIST = Object.values(BUILDINGS);
