import { StarSystem } from '../types/game';

export interface StarbaseTierDef {
  level: 1 | 2 | 3 | 4;
  name: string;
  upgradeAlloyCost: number;
  baseHp: number;
  baseDps: number;
  maxPlatforms: number;
  upkeepEnergy: number;
  requiredTech?: string;
}

export const STARBASE_TIERS: Record<1 | 2 | 3 | 4, StarbaseTierDef> = {
  1: {
    level: 1,
    name: '恒星前哨站',
    upgradeAlloyCost: 100,
    baseHp: 280,
    baseDps: 10,
    maxPlatforms: 1,
    upkeepEnergy: 1,
  },
  2: {
    level: 2,
    name: '恒星星港',
    upgradeAlloyCost: 200,
    baseHp: 680,
    baseDps: 26,
    maxPlatforms: 3,
    upkeepEnergy: 2,
  },
  3: {
    level: 3,
    name: '恒星星堡',
    upgradeAlloyCost: 420,
    baseHp: 1650,
    baseDps: 62,
    maxPlatforms: 5,
    upkeepEnergy: 4,
    requiredTech: 'eng_star_citadel',
  },
  4: {
    level: 4,
    name: '擎天堡要塞',
    upgradeAlloyCost: 850,
    baseHp: 3600,
    baseDps: 135,
    maxPlatforms: 8,
    upkeepEnergy: 7,
    requiredTech: 'eng_mega_engineering',
  },
};

export const DEFENSE_PLATFORM_ALLOY_COST = 120;

export function getStarbaseMaxHp(sys: StarSystem): number {
  if (sys.starbaseLevel === 0) return 0;
  const tier = STARBASE_TIERS[sys.starbaseLevel];
  return tier.baseHp + (sys.defensePlatforms ?? 0) * 320;
}

export function getStarbaseDps(sys: StarSystem): number {
  if (sys.starbaseLevel === 0) return 0;
  const tier = STARBASE_TIERS[sys.starbaseLevel];
  return tier.baseDps + (sys.defensePlatforms ?? 0) * 20;
}

export function getStarbasePower(sys: StarSystem): number {
  if (sys.starbaseLevel === 0) return 0;
  const hp = getStarbaseMaxHp(sys);
  const dps = getStarbaseDps(sys);
  return Math.round(Math.sqrt(hp * dps) * 0.7);
}

export function syncStarbaseStats(sys: StarSystem, healFull = false): void {
  const maxHp = getStarbaseMaxHp(sys);
  sys.starbaseMaxHp = maxHp;
  if (healFull || sys.starbaseHp === undefined) {
    sys.starbaseHp = maxHp;
  } else {
    sys.starbaseHp = Math.min(maxHp, sys.starbaseHp);
  }
}
