import { EmpireModifiers, ResourceKey } from '../types/game';

export interface EdictDef {
  id: string;
  name: string;
  upkeepResource: ResourceKey;
  monthlyUpkeep: number;
  requiredTech?: string;
  deterrenceBonus?: number;
  summary: string;
  description: string;
  effects: Partial<EmpireModifiers>;
}

export const EDICTS: EdictDef[] = [
  {
    id: 'edict_capacity_subsidies',
    name: '发电产能补贴',
    upkeepResource: 'unity',
    monthlyUpkeep: 8,
    summary: '全帝国能量币产出 +20%',
    description: '由帝国行政部门提供专项补贴，刺激各殖民地发电区划满负荷运转。',
    effects: { energyMult: 0.2 },
  },
  {
    id: 'edict_mining_subsidies',
    name: '深层采矿补贴',
    upkeepResource: 'unity',
    monthlyUpkeep: 8,
    summary: '全帝国矿物产出 +20%',
    description: '配发额外自动化采掘配额，大幅提高矿业殖民地与轨道矿站效率。',
    effects: { mineralsMult: 0.2 },
  },
  {
    id: 'edict_research_grants',
    name: '星海科研资助令',
    upkeepResource: 'unity',
    monthlyUpkeep: 10,
    summary: '全学科科研速度 +20%',
    description: '设立帝国最高科学院专项基金，全面提速三条科技线的突破进度。',
    effects: { researchMult: 0.2 },
  },
  {
    id: 'edict_alloy_mobilization',
    name: '战时合金总动员',
    upkeepResource: 'energy',
    monthlyUpkeep: 18,
    summary: '合金产出 +20% · 船坞造舰速度 +25%',
    description: '优先保障军工铸造厂能源供应，全速扩充帝国星际舰队。',
    effects: { alloysMult: 0.2, shipBuildSpeedMult: 0.25 },
  },
  {
    id: 'edict_fleet_overdrive',
    name: '舰队反应堆超频',
    upkeepResource: 'energy',
    monthlyUpkeep: 24,
    summary: '舰队武器伤害 +18% · 护盾容量 +15%',
    description: '解除所有服役战舰的反应堆安全限制，在决战期间爆发最强战力。',
    effects: { shipWeaponBonus: 0.18, shipShieldBonus: 0.15 },
  },
  {
    id: 'edict_map_the_stars',
    name: '群星大测绘法令',
    upkeepResource: 'unity',
    monthlyUpkeep: 6,
    summary: '超空间航速 +30% · 轨道站产出 +20%',
    description: '全力支持深空探索船队，加速超空间航行与轨道资源勘探。',
    effects: { shipSpeedMult: 0.3, stationOutputMult: 0.2 },
  },
  {
    id: 'edict_nutritional_plenitude',
    name: '丰饶时代配给令',
    upkeepResource: 'food',
    monthlyUpkeep: 12,
    summary: '人口增长 +22% · 凝聚力产出 +12%',
    description: '开放帝国战略粮仓提供优渥营养配给，迎来各殖民地生育高峰。',
    effects: { popGrowthMult: 0.22, unityMult: 0.12 },
  },
  {
    id: 'edict_dark_forest_deterrence',
    name: '黑暗森林威慑广播',
    upkeepResource: 'unity',
    monthlyUpkeep: 14,
    requiredTech: 'phy_gravitational_broadcast',
    deterrenceBonus: 0.65,
    summary: '【三体专属】AI 极难主动宣战 · 凝聚力 +25% · 武器 +15%',
    description: '全天候将引力波发射阵列对准敌对星系，以同归于尽的坐标广播维系星海和平。',
    effects: { unityMult: 0.25, shipWeaponBonus: 0.15, diplomaticWeightMult: 0.35 },
  },
];

export const EDICT_BY_ID: Record<string, EdictDef> = Object.fromEntries(
  EDICTS.map((e) => [e.id, e])
);
