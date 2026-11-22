import { EmpireModifiers } from '../types/game';

export interface ResolutionDef {
  id: string;
  name: string;
  category: 'science' | 'economy' | 'military' | 'custodian';
  summary: string;
  description: string;
  effects: Partial<EmpireModifiers>;
  custodianOnly?: boolean;
}

export const RESOLUTIONS: ResolutionDef[] = [
  {
    id: 'res_research_charter',
    name: '《星际科研宪章》',
    category: 'science',
    summary: '全银河成员国科研速度 +15%',
    description: '建立跨文明学术数据库与联合实验室标准，推动全银河科技加速演进。',
    effects: { researchMult: 0.15 },
  },
  {
    id: 'res_free_trade',
    name: '《银河自由贸易法》',
    category: 'economy',
    summary: '全银河成员国能量币产出 +15%',
    description: '取消跨星系贸易壁垒，统一超空间商路结算货币体系。',
    effects: { energyMult: 0.15 },
  },
  {
    id: 'res_naval_expansion',
    name: '《星海联防扩军令》',
    category: 'military',
    summary: '舰队容量 +30 · 武器伤害 +10%',
    description: '面对未知深空威胁，议会授权各成员国大规模扩编星际海军。',
    effects: { fleetCapBonus: 30, shipWeaponBonus: 0.1 },
  },
  {
    id: 'res_ecological_protection',
    name: '《宇宙生态保护法》',
    category: 'economy',
    summary: '全星球宜居度 +10% · 食物产出 +15%',
    description: '严格规范行星开发环保标准，大幅提升外星宜居度与生态农业产量。',
    effects: { habitabilityBonus: 10, foodMult: 0.15 },
  },
  {
    id: 'res_galactic_industrialization',
    name: '《星际重工业法案》',
    category: 'economy',
    summary: '矿物产出 +15% · 合金产出 +12%',
    description: '整合银河矿脉供应链，优先保障各成员国重工业与巨构建设需求。',
    effects: { mineralsMult: 0.15, alloysMult: 0.12 },
  },
  {
    id: 'res_custodian_act',
    name: '《银河监护人任命案》',
    category: 'custodian',
    summary: '授予我方「银河监护人」至高权柄：武器 +15% · 凝聚力 +25% · 威望 +40%',
    description: '在风云动荡的星海纪元，议会将全银河最高防务与仲裁权托付于最强大的文明。',
    effects: { shipWeaponBonus: 0.15, unityMult: 0.25, diplomaticWeightMult: 0.4 },
    custodianOnly: true,
  },
];

export const RESOLUTION_BY_ID: Record<string, ResolutionDef> = Object.fromEntries(
  RESOLUTIONS.map((r) => [r.id, r])
);
