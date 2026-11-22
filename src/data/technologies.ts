import {
  BuildingId,
  DefenseType,
  EmpireModifiers,
  ShipHullClass,
  TechBranch,
  TechCategory,
  TechTier,
  WeaponType,
} from '../types/game';
import { PHYSICS_TECHS } from './techPhysics';
import { SOCIETY_TECHS } from './techSociety';
import { ENGINEERING_TECHS } from './techEngineering';

export interface TechDef {
  id: string;
  name: string;
  branch: TechBranch;
  category: TechCategory;
  tier: TechTier;
  cost: number;
  weight: number;
  prerequisites?: string[];
  isRare?: boolean;
  isDangerous?: boolean;
  isRepeatable?: boolean;
  effects: Partial<EmpireModifiers>;
  unlocksBuilding?: BuildingId;
  unlocksHull?: ShipHullClass;
  unlocksWeapon?: WeaponType;
  unlocksDefense?: DefenseType;
  summary: string;
  description: string;
}

export const TECH_CATEGORY_META: Record<
  TechCategory,
  { name: string; branch: TechBranch; color: string }
> = {
  computing: { name: '计算学', branch: 'physics', color: '#38bdf8' },
  field_manipulation: { name: '场操纵', branch: 'physics', color: '#60a5fa' },
  particles: { name: '粒子物理', branch: 'physics', color: '#818cf8' },
  biology: { name: '生物学', branch: 'society', color: '#34d399' },
  new_worlds: { name: '新世界', branch: 'society', color: '#4ade80' },
  military_theory: { name: '军事理论', branch: 'society', color: '#fb7185' },
  statecraft: { name: '治国术', branch: 'society', color: '#2dd4bf' },
  psionics: { name: '灵能学', branch: 'society', color: '#c084fc' },
  industry: { name: '工业学', branch: 'engineering', color: '#fbbf24' },
  materials: { name: '材料学', branch: 'engineering', color: '#f97316' },
  propulsion: { name: '推进学', branch: 'engineering', color: '#facc15' },
  voidcraft: { name: '虚空工艺', branch: 'engineering', color: '#a78bfa' },
};

export const TECH_LIST: TechDef[] = [
  ...PHYSICS_TECHS,
  ...SOCIETY_TECHS,
  ...ENGINEERING_TECHS,
];

export const TECHNOLOGIES: Record<string, TechDef> = Object.fromEntries(
  TECH_LIST.map((t) => [t.id, t])
);

export function createDefaultModifiers(): EmpireModifiers {
  return {
    energyMult: 0,
    mineralsMult: 0,
    foodMult: 0,
    alloysMult: 0,
    consumerGoodsMult: 0,
    researchMult: 0,
    unityMult: 0,
    popGrowthMult: 0,
    habitabilityBonus: 0,
    outpostInfluenceDiscount: 0,
    stationOutputMult: 0,
    shipHullBonus: 0,
    shipWeaponBonus: 0,
    shipShieldBonus: 0,
    shipArmorBonus: 0,
    shipSpeedMult: 0,
    shipEvasionBonus: 0,
    shipBuildSpeedMult: 0,
    fleetCapBonus: 0,
    diplomaticWeightMult: 0,
  };
}
