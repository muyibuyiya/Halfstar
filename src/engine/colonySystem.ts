import {
  BuildingId,
  ColonyData,
  DistrictType,
  Empire,
  Planet,
  PlanetClassId,
  PlanetDesignation,
  ResourceKey,
  ResourcePool,
} from '../types/game';
import { BUILDINGS, DISTRICTS, DISTRICT_ORDER } from '../data/districtsAndBuildings';
import { createEmptyResourcePool } from './galaxyGenerator';

export const DESIGNATION_META: Record<
  PlanetDesignation,
  { name: string; summary: string }
> = {
  balanced: { name: '综合发展', summary: '各项产出均衡，无专项偏科' },
  generator: { name: '能源发电星', summary: '本星能量币产出 +18%' },
  mining: { name: '重装矿业星', summary: '本星矿物产出 +18%' },
  farming: { name: '农业粮仓星', summary: '本星食物产出 +20%' },
  forge: { name: '合金铸造星', summary: '本星合金与消费品产出 +18%' },
  research: { name: '学术科研星', summary: '本星科研产出 +18%' },
  fortress: { name: '边疆要塞星', summary: '本星稳定度 +12 · 防御强化' },
};

export function getBaseHabitability(planetClass: PlanetClassId): number {
  switch (planetClass) {
    case 'continental':
    case 'gaia':
      return 100;
    case 'ocean':
    case 'tropical':
      return 80;
    case 'arid':
    case 'tundra':
      return 65;
    case 'desert':
    case 'arctic':
      return 55;
    default:
      return 0;
  }
}

export function createInitialColony(isHomeworld: boolean): ColonyData {
  if (isHomeworld) {
    return {
      districts: {
        city: 2,
        generator: 2,
        mining: 2,
        farming: 2,
      },
      buildings: ['alloy_foundry', 'civilian_industries', 'research_lab'],
      buildQueue: [],
      popGrowthProgress: 18,
      habitability: 100,
      housing: 26,
      amenities: 20,
      stability: 72,
      maxBuildingSlots: 4,
      monthlyNet: createEmptyResourcePool(),
    };
  }
  return {
    districts: {
      city: 1,
      generator: 1,
      mining: 0,
      farming: 0,
    },
    buildings: [],
    buildQueue: [],
    popGrowthProgress: 0,
    habitability: 80,
    housing: 10,
    amenities: 10,
    stability: 60,
    maxBuildingSlots: 3,
    monthlyNet: createEmptyResourcePool(),
  };
}

export function getUsedDistricts(colony: ColonyData): number {
  return (
    colony.districts.city +
    colony.districts.generator +
    colony.districts.mining +
    colony.districts.farming +
    colony.buildQueue.filter((q) => q.kind === 'district').length
  );
}

export function computeColonyEconomy(
  planet: Planet,
  empire: Empire
): { income: ResourcePool; upkeep: ResourcePool; popGrowthRate: number } {
  const income = createEmptyResourcePool();
  const upkeep = createEmptyResourcePool();
  const colony = planet.colony;
  if (!colony) return { income, upkeep, popGrowthRate: 0 };

  const mods = empire.modifiers;
  const habitability = Math.min(
    100,
    Math.max(20, getBaseHabitability(planet.planetClass) + mods.habitabilityBonus)
  );
  colony.habitability = habitability;

  // Housing, amenities, building slots, planet bonuses
  let housing = 4; // Capital base housing
  let amenities = 10; // Capital base amenities
  let stabilityBonus = 0;
  let planetEnergyBonus = 0;
  let planetMineralsBonus = 0;
  let planetPopGrowthBonus = 0;

  for (const dType of DISTRICT_ORDER) {
    const count = colony.districts[dType];
    const def = DISTRICTS[dType];
    housing += def.housing * count;
    amenities += def.amenities * count;
  }

  const getBuildingLevelMult = (idx: number): number => {
    const lvl = colony.buildingLevels?.[idx] ?? 1;
    return lvl === 3 ? 2.8 : lvl === 2 ? 1.85 : 1;
  };

  colony.buildings.forEach((bId, idx) => {
    const def = BUILDINGS[bId];
    if (!def) return;
    const mult = getBuildingLevelMult(idx);
    amenities += Math.round(def.amenities * mult);
    stabilityBonus += Math.round(def.stabilityBonus * mult);
    planetEnergyBonus += def.energyPlanetBonus * mult;
    planetMineralsBonus += def.mineralsPlanetBonus * mult;
    planetPopGrowthBonus += def.popGrowthBonus * mult;
  });

  // Pops consume 1 housing and 1 amenity each
  const desig = colony.designation ?? 'balanced';
  const netHousing = housing - planet.popCount;
  const netAmenities = amenities - planet.popCount;
  let stability = 55 + stabilityBonus + (desig === 'fortress' ? 12 : 0);
  stability += Math.max(-20, Math.min(20, netAmenities * 1.2));
  if (netHousing < 0) stability += Math.max(-20, netHousing * 3);
  if (habitability < 70) stability -= Math.round((70 - habitability) * 0.25);
  stability = Math.max(15, Math.min(100, Math.round(stability)));

  colony.housing = housing;
  colony.amenities = netAmenities;
  colony.stability = stability;
  colony.maxBuildingSlots = Math.min(6, 2 + colony.districts.city);

  // Workforce efficiency: each district/building wants ~2 pops; if pops < slots, scale gracefully (min 0.55 so new colonies work well)
  const totalSlots =
    colony.districts.generator +
    colony.districts.mining +
    colony.districts.farming +
    colony.buildings.length;
  const desiredPops = Math.max(2, totalSlots * 2);
  const workforceFactor = Math.min(1.15, Math.max(0.6, planet.popCount / desiredPops));
  const stabilityFactor = 0.7 + (stability / 100) * 0.5; // 50% -> 0.95x, 70% -> 1.05x, 100% -> 1.2x
  const habitabilityFactor = 0.65 + (habitability / 100) * 0.35;
  const overallMult = workforceFactor * stabilityFactor * habitabilityFactor;

  // Capital base output
  income.energy += 6;
  income.unity += 4;
  income.research += 3;

  // District outputs & upkeeps
  for (const dType of DISTRICT_ORDER) {
    const count = colony.districts[dType];
    if (count <= 0) continue;
    const def = DISTRICTS[dType];
    for (const [k, v] of Object.entries(def.output)) {
      income[k as ResourceKey] += (v ?? 0) * count;
    }
    for (const [k, v] of Object.entries(def.upkeep)) {
      upkeep[k as ResourceKey] += (v ?? 0) * count;
    }
  }

  // Building outputs & upkeeps (scaled by Lv.1/Lv.2/Lv.3)
  colony.buildings.forEach((bId, idx) => {
    const def = BUILDINGS[bId];
    if (!def) return;
    const mult = getBuildingLevelMult(idx);
    for (const [k, v] of Object.entries(def.output)) {
      income[k as ResourceKey] += Math.round((v ?? 0) * mult);
    }
    for (const [k, v] of Object.entries(def.upkeep)) {
      upkeep[k as ResourceKey] += Math.round((v ?? 0) * mult);
    }
  });

  // Apply planet designation + empire modifiers to income
  const desEnergy = desig === 'generator' ? 0.18 : 0;
  const desMinerals = desig === 'mining' ? 0.18 : 0;
  const desFood = desig === 'farming' ? 0.2 : 0;
  const desForge = desig === 'forge' ? 0.18 : 0;
  const desResearch = desig === 'research' ? 0.18 : 0;

  income.energy = Math.round(
    income.energy * overallMult * (1 + mods.energyMult + planetEnergyBonus + desEnergy)
  );
  income.minerals = Math.round(
    income.minerals * overallMult * (1 + mods.mineralsMult + planetMineralsBonus + desMinerals)
  );
  income.food = Math.round(income.food * overallMult * (1 + mods.foodMult + desFood));
  income.alloys = Math.round(income.alloys * overallMult * (1 + mods.alloysMult + desForge));
  income.consumerGoods = Math.round(
    income.consumerGoods * overallMult * (1 + mods.consumerGoodsMult + desForge)
  );
  income.research = Math.round(income.research * overallMult * (1 + mods.researchMult + desResearch));
  income.unity = Math.round(income.unity * overallMult * (1 + mods.unityMult));

  // Pop upkeep (scaled slightly by low habitability)
  const habUpkeepMult = 1 + Math.max(0, (100 - habitability) / 200);
  upkeep.food += Math.round(planet.popCount * 0.45 * habUpkeepMult);
  upkeep.consumerGoods += Math.round(planet.popCount * 0.35 * habUpkeepMult);

  // Store planet net summary
  const net = createEmptyResourcePool();
  (Object.keys(net) as ResourceKey[]).forEach((k) => {
    net[k] = Number((income[k] - upkeep[k]).toFixed(1));
  });
  colony.monthlyNet = net;

  // Monthly pop growth rate (points toward 100)
  const housingGrowthPenalty = netHousing < 0 ? 0.45 : 1;
  const popGrowthRate =
    6.5 *
    (0.5 + (habitability / 100) * 0.5) *
    (1 + mods.popGrowthMult + planetPopGrowthBonus) *
    housingGrowthPenalty;

  return { income, upkeep, popGrowthRate };
}

/**
 * AI Colony Governor: automatically queues matching districts or buildings when autoManage is enabled.
 */
export function runColonyAutoManage(planet: Planet, empire: Empire): boolean {
  const colony = planet.colony;
  if (!colony || !colony.autoManage) return false;
  if (colony.buildQueue.length > 0) return false;
  if (empire.resources.minerals < 280) return false;

  const desig = colony.designation ?? 'balanced';
  const used = getUsedDistricts(colony);
  const freeSlots = colony.maxBuildingSlots - colony.buildings.length;

  // 1. Ensure housing / amenities first
  if (colony.housing - planet.popCount <= 1 && used < planet.size) {
    empire.resources.minerals -= DISTRICTS.city.mineralCost;
    colony.buildQueue.push({
      id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind: 'district',
      targetId: 'city',
      progress: 0,
      totalDays: DISTRICTS.city.buildDays,
    });
    return true;
  }

  if (colony.amenities < 0 && freeSlots > 0) {
    empire.resources.minerals -= BUILDINGS.holotheater.mineralCost;
    colony.buildQueue.push({
      id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind: 'building',
      targetId: 'holotheater',
      progress: 0,
      totalDays: BUILDINGS.holotheater.buildDays,
    });
    return true;
  }

  // 2. Build specialized buildings if slots available
  if (freeSlots > 0) {
    let pickB: BuildingId | null = null;
    if (desig === 'forge') pickB = 'alloy_foundry';
    else if (desig === 'research') pickB = 'research_lab';
    else if (desig === 'fortress') pickB = 'stronghold';
    else if (empire.monthlyNet.consumerGoods < 4) pickB = 'civilian_industries';
    else if (empire.monthlyNet.alloys < 16) pickB = 'alloy_foundry';
    else pickB = 'research_lab';

    if (pickB && empire.resources.minerals >= BUILDINGS[pickB].mineralCost) {
      empire.resources.minerals -= BUILDINGS[pickB].mineralCost;
      colony.buildQueue.push({
        id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'building',
        targetId: pickB,
        progress: 0,
        totalDays: BUILDINGS[pickB].buildDays,
      });
      return true;
    }
  }

  // 3. Build specialized districts
  if (used < planet.size) {
    let pickD: DistrictType = 'mining';
    if (desig === 'generator') pickD = 'generator';
    else if (desig === 'mining') pickD = 'mining';
    else if (desig === 'farming') pickD = 'farming';
    else if (desig === 'forge' || desig === 'research') pickD = 'city';
    else {
      // Balanced: pick whichever basic resource has lowest net
      if (empire.monthlyNet.energy < empire.monthlyNet.minerals) pickD = 'generator';
      else if (empire.monthlyNet.food < 6) pickD = 'farming';
      else pickD = 'mining';
    }

    if (empire.resources.minerals >= DISTRICTS[pickD].mineralCost) {
      empire.resources.minerals -= DISTRICTS[pickD].mineralCost;
      colony.buildQueue.push({
        id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        kind: 'district',
        targetId: pickD,
        progress: 0,
        totalDays: DISTRICTS[pickD].buildDays,
      });
      return true;
    }
  }

  return false;
}
