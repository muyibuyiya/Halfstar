import {
  BuildingId,
  DefenseType,
  DistrictType,
  EmpirePolicies,
  GameStateData,
  MarketCommodity,
  MegastructureType,
  PlanetClassId,
  PlanetDesignation,
  ShipHullClass,
  StrategicResourceKey,
  TechBranch,
  WeaponType,
} from '../types/game';
import { DEFAULT_POLICIES } from '../data/policies';
import { sfx } from './sfx';
import { computeEmpireSize } from './empireSize';
import { findHyperlanePath, getMinJumpsFromEmpire } from './pathfinding';
import {
  BASE_MARKET_PRICES,
  COLONIZE_ALLOY_COST,
  COLONIZE_CG_COST,
  COLONIZE_FOOD_COST,
  OUTPOST_ALLOY_COST,
  OUTPOST_BASE_INFLUENCE_COST,
  recalculateEmpireEconomy,
  STATION_MINERAL_COST,
} from './simulation';
import { BUILDINGS, DISTRICTS } from '../data/districtsAndBuildings';
import { getUsedDistricts } from './colonySystem';
import { TECHNOLOGIES } from '../data/technologies';
import {
  getShipBuildCostAndDays,
  isHullUnlocked,
  STARPORT_UPGRADE_ALLOY_COST,
  createShipInstance,
  recalcFleetPower,
} from './shipSystem';
import { HULL_CLASSES } from '../data/ships';
import {
  ALL_TRADITION_PERKS,
  ASCENSION_BY_ID,
  getAvailableAscensionSlots,
  getNextTraditionUnityCost,
} from '../data/traditions';
import { recalculateEmpireModifiers } from './techSystem';
import { ResourceKey } from '../types/game';
import { computeEmpireScore, triggerEndgameCrisis } from './crisisSystem';
import { recordRunHistory } from '../data/achievements';
import { EDICT_BY_ID } from '../data/edicts';
import { MEGASTRUCTURES } from '../data/megastructures';
import { PLANET_CLASSES } from '../data/planetClasses';
import {
  DEFENSE_PLATFORM_ALLOY_COST,
  STARBASE_TIERS,
  syncStarbaseStats,
} from './starbaseSystem';
import {
  instantiateOfficer,
  OFFICER_POOL,
  OFFICER_RECRUIT_UNITY_COST,
} from '../data/leaders';
import { getEmpireStats } from './diplomacySystem';
import { DESIGNATION_META } from './colonySystem';
import { RELIC_BY_ID } from '../data/relics';
import { RESOLUTION_BY_ID } from '../data/galacticCommunity';

export interface CommandResult {
  ok: boolean;
  message?: string;
}

export function getOutpostCost(
  state: GameStateData,
  empireId: string,
  targetSystemId: string
): { alloys: number; influence: number; jumps: number } {
  const jumps = Math.max(1, getMinJumpsFromEmpire(state.systems, empireId, targetSystemId));
  const empire = state.empires[empireId];
  const discount = Math.min(0.5, empire?.modifiers.outpostInfluenceDiscount ?? 0);
  return {
    alloys: OUTPOST_ALLOY_COST,
    influence: Math.round(OUTPOST_BASE_INFLUENCE_COST * jumps * (1 - discount)),
    jumps,
  };
}

export function issueMoveOrder(
  state: GameStateData,
  fleetId: string,
  targetSystemId: string
): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet) return { ok: false, message: '未找到舰队' };
  const startId = fleet.inTransit && fleet.transitToId ? fleet.transitToId : fleet.systemId;
  const path = findHyperlanePath(state.systems, startId, targetSystemId);
  if (!path) return { ok: false, message: '目标星系无法通过超空间航道抵达' };

  fleet.autoSurvey = false;
  if (fleet.inTransit && fleet.transitToId) {
    // Keep current transit, then follow path
    fleet.orders = [
      {
        type: 'move',
        targetSystemId,
        path: [fleet.transitToId, ...path],
      },
    ];
  } else if (path.length > 0) {
    fleet.orders = [{ type: 'move', targetSystemId, path }];
  } else {
    fleet.orders = [];
  }
  return { ok: true };
}

export function issueSurveyOrder(
  state: GameStateData,
  fleetId: string,
  targetSystemId: string
): CommandResult {
  const fleet = state.fleets[fleetId];
  const sys = state.systems[targetSystemId];
  if (!fleet || !sys) return { ok: false, message: '无效指令' };
  if (fleet.shipType !== 'science') return { ok: false, message: '只有科研船可以调查星系' };
  if (sys.surveyedByPlayer) return { ok: false, message: '该星系已完成调查' };

  const moveRes = issueMoveOrder(state, fleetId, targetSystemId);
  if (!moveRes.ok) return moveRes;

  fleet.orders.push({
    type: 'survey',
    targetSystemId,
    progress: 0,
  });
  return { ok: true };
}

export function toggleAutoSurvey(state: GameStateData, fleetId: string): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet || fleet.shipType !== 'science') {
    return { ok: false, message: '只有科研船可以开启自动探索' };
  }
  fleet.autoSurvey = !fleet.autoSurvey;
  if (!fleet.autoSurvey) {
    fleet.statusText = '已取消自动探索';
  }
  return { ok: true };
}

export function issueBuildOutpostOrder(
  state: GameStateData,
  fleetId: string,
  targetSystemId: string
): CommandResult {
  const fleet = state.fleets[fleetId];
  const sys = state.systems[targetSystemId];
  const empire = fleet ? state.empires[fleet.ownerId] : undefined;
  if (!fleet || !sys || !empire) return { ok: false, message: '无效指令' };
  if (fleet.shipType !== 'construction') return { ok: false, message: '只有工程船可以建造前哨站' };
  if (sys.ownerId !== null) return { ok: false, message: '该星系已有归属' };
  if (!sys.surveyedByPlayer) return { ok: false, message: '请先派遣科研船完成该星系的调查' };

  const cost = getOutpostCost(state, empire.id, targetSystemId);
  if (empire.resources.alloys < cost.alloys) {
    return { ok: false, message: `合金不足（需要 ${cost.alloys} 合金）` };
  }
  if (empire.resources.influence < cost.influence) {
    return { ok: false, message: `影响力不足（需要 ${cost.influence} 影响力）` };
  }

  const moveRes = issueMoveOrder(state, fleetId, targetSystemId);
  if (!moveRes.ok) return moveRes;

  // Deduct cost upfront (like Stellaris)
  empire.resources.alloys -= cost.alloys;
  empire.resources.influence -= cost.influence;

  fleet.orders.push({
    type: 'build_outpost',
    targetSystemId,
    progress: 0,
  });
  return { ok: true };
}

export function issueBuildStationsOrder(
  state: GameStateData,
  fleetId: string,
  targetSystemId: string,
  stationKind: 'mining' | 'research'
): CommandResult {
  const fleet = state.fleets[fleetId];
  const sys = state.systems[targetSystemId];
  const empire = fleet ? state.empires[fleet.ownerId] : undefined;
  if (!fleet || !sys || !empire) return { ok: false, message: '无效指令' };
  if (fleet.shipType !== 'construction') return { ok: false, message: '只有工程船可以建造轨道站' };
  if (sys.ownerId !== empire.id) return { ok: false, message: '必须先在该星系建成前哨站' };

  const isMining = stationKind === 'mining';
  const eligibleCount = sys.planets.filter((p) => {
    if (!p.deposit || p.stationType !== 'none') return false;
    return isMining ? p.deposit.type !== 'research' : p.deposit.type === 'research';
  }).length;

  if (eligibleCount === 0) {
    return { ok: false, message: isMining ? '该星系没有可建设的开采点' : '该星系没有可建设的科研点' };
  }

  if (empire.resources.minerals < STATION_MINERAL_COST) {
    return { ok: false, message: `矿物不足（每座需要 ${STATION_MINERAL_COST} 矿物）` };
  }

  const moveRes = issueMoveOrder(state, fleetId, targetSystemId);
  if (!moveRes.ok) return moveRes;

  fleet.orders.push({
    type: 'build_stations',
    targetSystemId,
    stationKind,
    progress: 0,
  });
  return { ok: true };
}

export function startColonization(
  state: GameStateData,
  systemId: string,
  planetId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  if (!empire || !sys || !planet) return { ok: false, message: '未找到目标行星' };
  if (sys.ownerId !== empire.id) return { ok: false, message: '必须先在该星系建造恒星前哨站' };
  if (!planet.habitable) return { ok: false, message: '该行星不具备宜居条件' };
  if (planet.colonizedBy) return { ok: false, message: '该行星已殖民' };
  if (planet.colonizingProgress !== null) return { ok: false, message: '正在殖民中' };

  if (empire.resources.alloys < COLONIZE_ALLOY_COST) {
    return { ok: false, message: `合金不足（需要 ${COLONIZE_ALLOY_COST}）` };
  }
  if (empire.resources.food < COLONIZE_FOOD_COST) {
    return { ok: false, message: `食物不足（需要 ${COLONIZE_FOOD_COST}）` };
  }
  if (empire.resources.consumerGoods < COLONIZE_CG_COST) {
    return { ok: false, message: `消费品不足（需要 ${COLONIZE_CG_COST}）` };
  }

  empire.resources.alloys -= COLONIZE_ALLOY_COST;
  empire.resources.food -= COLONIZE_FOOD_COST;
  empire.resources.consumerGoods -= COLONIZE_CG_COST;
  planet.colonizingProgress = 0;
  return { ok: true, message: `殖民船已抵达 ${planet.name}，正在建立前哨基地！` };
}

export function queueDistrict(
  state: GameStateData,
  systemId: string,
  planetId: string,
  districtType: DistrictType
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  if (!empire || !planet || !planet.colony || planet.colonizedBy !== empire.id) {
    return { ok: false, message: '无法在该星球建造区划' };
  }

  if (getUsedDistricts(planet.colony) >= planet.size) {
    return { ok: false, message: `已达到星球区划上限 (${planet.size})` };
  }

  const def = DISTRICTS[districtType];
  if (empire.resources.minerals < def.mineralCost) {
    return { ok: false, message: `矿物不足（需要 ${def.mineralCost} 矿物）` };
  }

  empire.resources.minerals -= def.mineralCost;
  planet.colony.buildQueue.push({
    id: `bq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'district',
    targetId: districtType,
    progress: 0,
    totalDays: def.buildDays,
  });
  return { ok: true, message: `已加入建造队列：${def.name}` };
}

export function queueBuilding(
  state: GameStateData,
  systemId: string,
  planetId: string,
  buildingId: BuildingId
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  if (!empire || !planet || !planet.colony || planet.colonizedBy !== empire.id) {
    return { ok: false, message: '无法在该星球建造建筑' };
  }

  const def = BUILDINGS[buildingId];
  if (def.requiredTech && !empire.completedTechs.includes(def.requiredTech)) {
    const techName = TECHNOLOGIES[def.requiredTech]?.name ?? def.requiredTech;
    return { ok: false, message: `需要先研发科技「${techName}」` };
  }

  const queuedBuildings = planet.colony.buildQueue.filter((q) => q.kind === 'building');
  if (planet.colony.buildings.length + queuedBuildings.length >= planet.colony.maxBuildingSlots) {
    return { ok: false, message: '建筑槽位已满，请先建造「城市区划」解锁更多槽位' };
  }

  if (
    def.uniquePerPlanet &&
    (planet.colony.buildings.includes(buildingId) ||
      queuedBuildings.some((q) => q.targetId === buildingId))
  ) {
    return { ok: false, message: `「${def.name}」每颗星球仅限建造一座` };
  }

  if (empire.resources.minerals < def.mineralCost) {
    return { ok: false, message: `矿物不足（需要 ${def.mineralCost} 矿物）` };
  }

  empire.resources.minerals -= def.mineralCost;
  planet.colony.buildQueue.push({
    id: `bq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'building',
    targetId: buildingId,
    progress: 0,
    totalDays: def.buildDays,
  });
  return { ok: true, message: `已加入建造队列：${def.name}` };
}

export function cancelBuildQueueItem(
  state: GameStateData,
  systemId: string,
  planetId: string,
  itemId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  if (!empire || !planet?.colony) return { ok: false };

  const idx = planet.colony.buildQueue.findIndex((q) => q.id === itemId);
  if (idx === -1) return { ok: false };
  const [removed] = planet.colony.buildQueue.splice(idx, 1);

  const refund =
    removed.kind === 'district'
      ? DISTRICTS[removed.targetId as DistrictType].mineralCost
      : BUILDINGS[removed.targetId as BuildingId].mineralCost;
  empire.resources.minerals += refund;
  return { ok: true, message: `已取消建造并退还 ${refund} 矿物` };
}

export function chooseResearch(
  state: GameStateData,
  branch: TechBranch,
  techId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const slot = empire?.research[branch];
  if (!empire || !slot) return { ok: false, message: '无效科研分支' };
  if (!slot.options.includes(techId)) return { ok: false, message: '该科技不在当前候选列表中' };

  slot.activeTechId = techId;
  recalculateEmpireEconomy(state, empire.id);
  const tech = TECHNOLOGIES[techId];
  return { ok: true, message: `开始研发：${tech?.name ?? techId}` };
}

export function executeMarketTrade(
  state: GameStateData,
  commodity: MarketCommodity,
  side: 'buy' | 'sell',
  amount: number
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };

  const basePrice = state.market.prices[commodity];
  const fee = Math.max(0.05, 0.2 - (empire.marketFeeDiscount ?? 0)); // 20% default, 10% for Megacorp

  if (side === 'buy') {
    const energyCost = Math.ceil(amount * basePrice * (1 + fee));
    if (empire.resources.energy < energyCost) {
      return { ok: false, message: `能量币不足（需要 ${energyCost} 能量币）` };
    }
    empire.resources.energy -= energyCost;
    empire.resources[commodity] += amount;
    // Slight upward price pressure
    const maxP = BASE_MARKET_PRICES[commodity] * 2.5;
    state.market.prices[commodity] = Math.min(
      maxP,
      Number((basePrice * (1 + amount / 3000)).toFixed(2))
    );
    return { ok: true, message: `已购入 ${amount} 单位，花费 ${energyCost} 能量币` };
  } else {
    if (empire.resources[commodity] < amount) {
      return { ok: false, message: `库存不足（当前持有 ${Math.floor(empire.resources[commodity])}）` };
    }
    const energyGain = Math.floor(amount * basePrice * (1 - fee));
    empire.resources[commodity] -= amount;
    empire.resources.energy += energyGain;
    // Slight downward price pressure
    const minP = BASE_MARKET_PRICES[commodity] * 0.4;
    state.market.prices[commodity] = Math.max(
      minP,
      Number((basePrice * (1 - amount / 3000)).toFixed(2))
    );
    return { ok: true, message: `已售出 ${amount} 单位，获得 ${energyGain} 能量币` };
  }
}

export function updateShipDesign(
  state: GameStateData,
  hullClass: ShipHullClass,
  weapons: WeaponType[],
  defenses: DefenseType[]
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };
  const design = empire.shipDesigns[hullClass];
  if (!design) return { ok: false };
  design.weapons = [...weapons];
  design.defenses = [...defenses];
  return { ok: true, message: `已保存「${design.name}」新舰船设计方案` };
}

export function upgradeToStarport(
  state: GameStateData,
  systemId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys) return { ok: false, message: '未找到目标星系' };
  if (sys.ownerId !== empire.id) return { ok: false, message: '只能升级己方控制的恒星基地' };
  if (sys.starbaseLevel >= 4) return { ok: false, message: '该恒星基地已达最高等级「擎天堡要塞」' };

  const nextLevel = (sys.starbaseLevel + 1) as 2 | 3 | 4;
  const tierDef = STARBASE_TIERS[nextLevel];
  if (tierDef.requiredTech && !empire.completedTechs.includes(tierDef.requiredTech)) {
    const techName = TECHNOLOGIES[tierDef.requiredTech]?.name ?? tierDef.requiredTech;
    return { ok: false, message: `升级为「${tierDef.name}」需先研发科技「${techName}」` };
  }
  if (empire.resources.alloys < tierDef.upgradeAlloyCost) {
    return { ok: false, message: `合金不足（需要 ${tierDef.upgradeAlloyCost} 合金）` };
  }

  empire.resources.alloys -= tierDef.upgradeAlloyCost;
  sys.starbaseLevel = nextLevel;
  syncStarbaseStats(sys, true);
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `${sys.name} 恒星基地已升级为「${tierDef.name}」！` };
}

export function buildDefensePlatform(
  state: GameStateData,
  systemId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys || sys.ownerId !== empire.id || sys.starbaseLevel === 0) {
    return { ok: false, message: '只能在己方恒星基地加装防御平台' };
  }
  const tier = STARBASE_TIERS[sys.starbaseLevel];
  const cur = sys.defensePlatforms ?? 0;
  if (cur >= tier.maxPlatforms) {
    return { ok: false, message: `当前级别防御平台已满 (${cur}/${tier.maxPlatforms})，请升级恒星基地` };
  }
  if (empire.resources.alloys < DEFENSE_PLATFORM_ALLOY_COST) {
    return { ok: false, message: `合金不足（需要 ${DEFENSE_PLATFORM_ALLOY_COST} 合金）` };
  }
  empire.resources.alloys -= DEFENSE_PLATFORM_ALLOY_COST;
  sys.defensePlatforms = cur + 1;
  syncStarbaseStats(sys, true);
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `${sys.name} 防御平台 +1（当前 ${sys.defensePlatforms}/${tier.maxPlatforms}）` };
}

export function queueShipBuild(
  state: GameStateData,
  systemId: string,
  shipKind: 'science' | 'construction' | ShipHullClass
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys) return { ok: false, message: '未找到目标星系' };
  if (sys.ownerId !== empire.id || sys.starbaseLevel < 2) {
    return { ok: false, message: '需要己方「星港」才可建造舰船' };
  }
  if (shipKind !== 'science' && shipKind !== 'construction' && !isHullUnlocked(empire, shipKind)) {
    const reqTech = HULL_CLASSES[shipKind].requiredTech;
    const techName = reqTech ? TECHNOLOGIES[reqTech]?.name : '对应科技';
    return { ok: false, message: `需先研发工程学科技「${techName}」方可建造` };
  }

  const { alloyCost, buildDays, label } = getShipBuildCostAndDays(empire, shipKind);
  if (empire.resources.alloys < alloyCost) {
    return { ok: false, message: `合金不足（需要 ${alloyCost} 合金）` };
  }

  empire.resources.alloys -= alloyCost;
  sys.shipyardQueue.push({
    id: `sy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    shipKind,
    progress: 0,
    totalDays: buildDays,
    alloyCost,
  });
  return { ok: true, message: `船坞已开始建造：${label}` };
}

export function cancelShipBuild(
  state: GameStateData,
  systemId: string,
  itemId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys) return { ok: false };
  const idx = sys.shipyardQueue.findIndex((q) => q.id === itemId);
  if (idx === -1) return { ok: false };
  const [removed] = sys.shipyardQueue.splice(idx, 1);
  empire.resources.alloys += removed.alloyCost;
  return { ok: true, message: `已取消造舰并退还 ${removed.alloyCost} 合金` };
}

export function diplomacyImproveRelations(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const player = state.empires[state.playerEmpireId];
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!player || !target || !rel || !rel.discovered) return { ok: false, message: '尚未接触该文明' };
  if (target.personality === 'fanatic_purifiers') {
    return { ok: false, message: `${target.name} 是狂热净化者，拒绝一切外交互动` };
  }
  if (player.resources.influence < 25) {
    return { ok: false, message: '影响力不足（需要 25 影响力）' };
  }
  player.resources.influence -= 25;
  rel.opinion = Math.min(100, rel.opinion + 25);
  return { ok: true, message: `派遣外交使团改善了与「${target.name}」的关系 (+25)` };
}

export function diplomacySendGift(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const player = state.empires[state.playerEmpireId];
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!player || !target || !rel || !rel.discovered) return { ok: false };
  if (target.personality === 'fanatic_purifiers') {
    return { ok: false, message: `${target.name} 拒绝接受异形赠礼` };
  }
  if (player.resources.energy < 200) {
    return { ok: false, message: '能量币不足（需要 200 能量币）' };
  }
  player.resources.energy -= 200;
  target.resources.energy += 200;
  rel.opinion = Math.min(100, rel.opinion + 25);
  return { ok: true, message: `向「${target.name}」赠送 200 能量币，好感度 +25` };
}

export function diplomacyTogglePact(
  state: GameStateData,
  targetEmpireId: string,
  pact: 'nonAggression' | 'researchPact' | 'commercialPact'
): CommandResult {
  const player = state.empires[state.playerEmpireId];
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!player || !target || !rel || !rel.discovered) return { ok: false };
  if (rel.atWar) return { ok: false, message: '交战状态下无法签署条约' };

  const names = {
    nonAggression: '互不侵犯条约',
    researchPact: '科研协议',
    commercialPact: '商业协定',
  };

  if (rel[pact]) {
    rel[pact] = false;
    rel.opinion = Math.max(-100, rel.opinion - 15);
    recalculateEmpireEconomy(state, player.id);
    return { ok: true, message: `已废除与「${target.name}」的${names[pact]}` };
  }

  if (target.personality === 'fanatic_purifiers') {
    return { ok: false, message: `${target.name} 拒绝与外星文明签署任何条约` };
  }
  const minOpinion = pact === 'nonAggression' ? 10 : 20;
  if (rel.opinion < minOpinion) {
    return { ok: false, message: `关系不足（需要好感度 ≥ ${minOpinion}，当前 ${rel.opinion}）` };
  }

  rel[pact] = true;
  rel.opinion = Math.min(100, rel.opinion + 10);
  recalculateEmpireEconomy(state, player.id);
  return { ok: true, message: `已与「${target.name}」正式签署${names[pact]}！` };
}

export function diplomacyDeclareWar(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!target || !rel || !rel.discovered) return { ok: false };
  if (rel.atWar) return { ok: false, message: '已在交战状态中' };

  rel.atWar = true;
  rel.nonAggression = false;
  rel.researchPact = false;
  rel.commercialPact = false;
  rel.opinion = Math.max(-100, rel.opinion - 60);
  rel.warStartedDay = state.date.totalDays;
  rel.playerWarExhaustion = 0;
  rel.aiWarExhaustion = 0;
  recalculateEmpireEconomy(state, state.playerEmpireId);
  sfx.warDeclared();
  return { ok: true, message: `已向「${target.name}」正式宣战！派遣舰队攻占其星系吧。` };
}

export function diplomacyOfferPeace(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!target || !rel || !rel.atWar) return { ok: false };

  const daysAtWar = state.date.totalDays - rel.warStartedDay;
  if (daysAtWar < 60 && rel.aiWarExhaustion < 30) {
    return { ok: false, message: '开战未满 60 天且敌方战意尚浓，暂不接受议和' };
  }

  rel.atWar = false;
  rel.nonAggression = true;
  rel.playerWarExhaustion = 0;
  rel.aiWarExhaustion = 0;
  return { ok: true, message: `与「${target.name}」达成现状议和，双方保留已占领星系！` };
}

export function resolveNarrativeEvent(
  state: GameStateData,
  choiceId: string
): CommandResult {
  const ev = state.activeEvent;
  const empire = state.empires[state.playerEmpireId];
  if (!ev || !empire) return { ok: false };

  const choice = ev.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false };

  if (choice.resourceDelta) {
    for (const [k, v] of Object.entries(choice.resourceDelta)) {
      const key = k as ResourceKey;
      const delta = v ?? 0;
      if (delta < 0 && empire.resources[key] < -delta) {
        return { ok: false, message: `资源不足，无法执行该选项` };
      }
    }
    for (const [k, v] of Object.entries(choice.resourceDelta)) {
      const key = k as ResourceKey;
      empire.resources[key] = Math.max(0, empire.resources[key] + (v ?? 0));
    }
  }

  if (choice.spawnCorvettes && choice.spawnCorvettes > 0) {
    const homeId = empire.homeSystemId;
    let targetFleet = Object.values(state.fleets).find(
      (f) => f.ownerId === empire.id && f.shipType === 'corvette' && f.systemId === homeId && !f.inTransit
    );
    if (!targetFleet) {
      const fId = `flt_event_${Date.now()}`;
      targetFleet = {
        id: fId,
        name: '上古遗迹特遣舰队',
        ownerId: empire.id,
        shipType: 'corvette',
        shipCount: 0,
        power: 0,
        ships: [],
        systemId: homeId,
        localX: -12,
        localZ: -12,
        inTransit: false,
        transitFromId: null,
        transitToId: null,
        transitProgress: 0,
        orders: [],
        autoSurvey: false,
        statusText: '轨道巡逻',
      };
      state.fleets[fId] = targetFleet;
    }
    for (let i = 0; i < choice.spawnCorvettes; i++) {
      targetFleet.ships.push(createShipInstance(empire.shipDesigns.corvette, empire.modifiers));
    }
    recalcFleetPower(targetFleet);
  }

  // Handle Mid-Game Crisis Great Khan submission peace
  if (ev.id === 'ev_great_khan' && choiceId === 'khan_submit') {
    delete state.fleets['flt_khan_horde'];
    state.crisis.khanDefeated = true;
  }

  state.activeEvent = null;
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `已执行决策：${choice.label}` };
}

export function unlockTradition(state: GameStateData, perkId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const perk = ALL_TRADITION_PERKS[perkId];
  if (!empire || !perk) return { ok: false };
  if (empire.unlockedTraditions.includes(perkId)) {
    return { ok: false, message: '该传统已解锁' };
  }

  const sizeReport = computeEmpireSize(state, empire.id);
  const cost = Math.round(
    getNextTraditionUnityCost(empire.unlockedTraditions.length) *
      sizeReport.traditionCostMult
  );
  if (empire.resources.unity < cost) {
    return { ok: false, message: `凝聚力不足（需要 ${cost} 凝聚力）` };
  }

  empire.resources.unity -= cost;
  empire.unlockedTraditions.push(perkId);
  recalculateEmpireModifiers(empire);
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `已解锁传统「${perk.name}」：${perk.summary}` };
}

export function unlockAscension(state: GameStateData, ascId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const asc = ASCENSION_BY_ID[ascId];
  if (!empire || !asc) return { ok: false };
  if (empire.unlockedAscensions.includes(ascId)) {
    return { ok: false, message: '该飞升天赋已激活' };
  }

  const maxSlots = getAvailableAscensionSlots(empire.unlockedTraditions);
  if (empire.unlockedAscensions.length >= maxSlots) {
    return { ok: false, message: '需完整点满一条传统树以解锁飞升槽位' };
  }

  empire.unlockedAscensions.push(ascId);
  recalculateEmpireModifiers(empire);
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `帝国飞升激活：「${asc.name}」！` };
}

export function forceTriggerCrisis(state: GameStateData): CommandResult {
  if (state.crisis.triggered) return { ok: false, message: '银河天灾已经降临' };
  triggerEndgameCrisis(state);
  return { ok: true, message: '异次元天灾「虚空撕裂者」已降临银河！' };
}

export function issueReturnToStarportOrder(
  state: GameStateData,
  fleetId: string
): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet) return { ok: false, message: '未找到舰队' };
  const starports = Object.values(state.systems).filter(
    (s) => s.ownerId === fleet.ownerId && s.starbaseLevel >= 2
  );
  if (starports.length === 0) return { ok: false, message: '尚无可用己方星港' };

  let bestPath: string[] | null = null;
  let bestSysId: string | null = null;
  for (const sp of starports) {
    if (sp.id === fleet.systemId) {
      return { ok: true, message: '舰队已在己方星港，正在自动维修中' };
    }
    const p = findHyperlanePath(state.systems, fleet.systemId, sp.id);
    if (p && (!bestPath || p.length < bestPath.length)) {
      bestPath = p;
      bestSysId = sp.id;
    }
  }
  if (!bestSysId) return { ok: false, message: '无法规划前往星港的航道' };
  return issueMoveOrder(state, fleetId, bestSysId);
}

export function toggleEdict(state: GameStateData, edictId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const ed = EDICT_BY_ID[edictId];
  if (!empire || !ed) return { ok: false };

  if (ed.requiredTech && !empire.completedTechs.includes(ed.requiredTech)) {
    return {
      ok: false,
      message: `需先研发科技「${TECHNOLOGIES[ed.requiredTech]?.name ?? ed.requiredTech}」`,
    };
  }

  if (!empire.activeEdicts) empire.activeEdicts = [];
  const idx = empire.activeEdicts.indexOf(edictId);
  if (idx >= 0) {
    empire.activeEdicts.splice(idx, 1);
    if (ed.deterrenceBonus) {
      empire.deterrenceBonus = Math.max(0, (empire.deterrenceBonus ?? 0) - ed.deterrenceBonus);
    }
    recalculateEmpireEconomy(state, empire.id);
    return { ok: true, message: `已停用法令「${ed.name}」` };
  } else {
    empire.activeEdicts.push(edictId);
    if (ed.deterrenceBonus) {
      empire.deterrenceBonus = (empire.deterrenceBonus ?? 0) + ed.deterrenceBonus;
    }
    recalculateEmpireEconomy(state, empire.id);
    return { ok: true, message: `已颁布帝国法令「${ed.name}」：${ed.summary}` };
  }
}

export function startTerraforming(
  state: GameStateData,
  systemId: string,
  planetId: string,
  targetClass: PlanetClassId
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  if (!empire || !sys || !planet) return { ok: false, message: '未找到行星' };
  if (sys.ownerId !== empire.id) return { ok: false, message: '只能在己方控制星系内进行环境改造' };
  if (planet.terraforming) return { ok: false, message: '该星球已在环境改造中' };
  if (planet.planetClass === targetClass) return { ok: false, message: '该星球已是目标环境类型' };

  const isGaia = targetClass === 'gaia';
  const reqTech = isGaia ? 'soc_climate_restoration' : 'soc_terrestrial_sculpting';
  if (!empire.completedTechs.includes(reqTech)) {
    return {
      ok: false,
      message: `需先研发社会学科技「${TECHNOLOGIES[reqTech]?.name ?? reqTech}」`,
    };
  }

  const energyCost = isGaia ? 900 : 500;
  const days = isGaia ? 75 : 50;
  if (empire.resources.energy < energyCost) {
    return { ok: false, message: `能量币不足（需要 ${energyCost} 能量币）` };
  }

  empire.resources.energy -= energyCost;
  planet.terraforming = {
    targetClass,
    progress: 0,
    totalDays: days,
  };
  return {
    ok: true,
    message: `已启动 ${planet.name} 环境改造工程 → ${PLANET_CLASSES[targetClass].name}！`,
  };
}

export function startMegastructure(
  state: GameStateData,
  systemId: string,
  megaType: MegastructureType
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const mDef = MEGASTRUCTURES[megaType];
  if (!empire || !sys || !mDef) return { ok: false };
  if (sys.ownerId !== empire.id) return { ok: false, message: '只能在己方星系建造银河巨构' };
  if (sys.megastructure) return { ok: false, message: '该星系已存在一座银河巨构' };

  if (!empire.completedTechs.includes(mDef.requiredTech)) {
    return {
      ok: false,
      message: `需先研发工程学稀有科技「${TECHNOLOGIES[mDef.requiredTech]?.name ?? '巨构工程学'}」`,
    };
  }

  // Only 1 of each megastructure type per empire
  const alreadyHas = Object.values(state.systems).some(
    (s) => s.ownerId === empire.id && s.megastructure?.type === megaType
  );
  if (alreadyHas) {
    return { ok: false, message: `帝国已拥有或正在建造「${mDef.name}」` };
  }

  if (empire.resources.alloys < mDef.alloyCost) {
    return { ok: false, message: `合金不足（需要 ${mDef.alloyCost} 合金）` };
  }

  empire.resources.alloys -= mDef.alloyCost;
  sys.megastructure = {
    type: megaType,
    stage: 'building',
    progress: 0,
    totalDays: mDef.buildDays,
  };
  return {
    ok: true,
    message: `已在 ${sys.name} 奠基银河巨构「${mDef.name}」！进入 3D 星系视角可观察巨构结构。`,
  };
}

export function mergeFleetsInSystem(
  state: GameStateData,
  fleetId: string
): CommandResult {
  const primary = state.fleets[fleetId];
  if (!primary || primary.shipType !== 'corvette' || primary.inTransit || primary.inCombat) {
    return { ok: false, message: '当前舰队状态无法合并' };
  }

  const others = Object.values(state.fleets).filter(
    (f) =>
      f.id !== primary.id &&
      f.ownerId === primary.ownerId &&
      f.shipType === 'corvette' &&
      !f.inTransit &&
      !f.inCombat &&
      f.systemId === primary.systemId
  );

  if (others.length === 0) {
    return { ok: false, message: '同星系内没有其他可合并的己方军事舰队' };
  }

  for (const o of others) {
    primary.ships.push(...o.ships);
    delete state.fleets[o.id];
  }
  recalcFleetPower(primary);
  return {
    ok: true,
    message: `已合并 ${others.length + 1} 支舰队 →「${primary.name}」（总战力 ${primary.power}）！`,
  };
}

export function reinforceFleetFromStarport(
  state: GameStateData,
  fleetId: string,
  hullClass: ShipHullClass
): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet) return { ok: false };

  // Find nearest owned Starport (prefer same system if it has a Starport)
  const curSys = state.systems[fleet.systemId];
  if (curSys && curSys.ownerId === fleet.ownerId && curSys.starbaseLevel >= 2) {
    return queueShipBuild(state, curSys.id, hullClass);
  }

  const starports = Object.values(state.systems).filter(
    (s) => s.ownerId === fleet.ownerId && s.starbaseLevel >= 2
  );
  if (starports.length === 0) {
    return { ok: false, message: '尚无可用己方星港进行补员' };
  }

  let bestSys = starports[0];
  let bestLen = 999;
  for (const sp of starports) {
    const p = findHyperlanePath(state.systems, fleet.systemId, sp.id);
    if (p && p.length < bestLen) {
      bestLen = p.length;
      bestSys = sp;
    }
  }
  return queueShipBuild(state, bestSys.id, hullClass);
}

export function toggleAutoBuild(state: GameStateData, fleetId: string): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet || fleet.shipType !== 'construction') {
    return { ok: false, message: '只有工程船可以开启自动建设轨道站' };
  }
  fleet.autoBuild = !fleet.autoBuild;
  return {
    ok: true,
    message: fleet.autoBuild ? '工程船已开启「自动建设银河轨道站」' : '已关闭工程船自动建设',
  };
}

export function setPlanetDesignation(
  state: GameStateData,
  systemId: string,
  planetId: string,
  designation: PlanetDesignation
): CommandResult {
  const planet = state.systems[systemId]?.planets.find((p) => p.id === planetId);
  if (!planet?.colony) return { ok: false };
  planet.colony.designation = designation;
  recalculateEmpireEconomy(state, state.playerEmpireId);
  return {
    ok: true,
    message: `${planet.name} 专精定位已调整为「${DESIGNATION_META[designation].name}」`,
  };
}

export function togglePlanetAutoManage(
  state: GameStateData,
  systemId: string,
  planetId: string
): CommandResult {
  const planet = state.systems[systemId]?.planets.find((p) => p.id === planetId);
  if (!planet?.colony) return { ok: false };
  planet.colony.autoManage = !planet.colony.autoManage;
  return {
    ok: true,
    message: planet.colony.autoManage
      ? `${planet.name} 已开启 AI 总督自动托管建设`
      : `${planet.name} 已关闭自动托管`,
  };
}

export function recruitOfficer(state: GameStateData, templateId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const tpl = OFFICER_POOL.find((t) => t.id === templateId);
  if (!empire || !tpl) return { ok: false };
  if (!empire.officers) empire.officers = [];
  if (empire.officers.some((o) => o.templateId === templateId)) {
    return { ok: false, message: `「${tpl.name}」已在帝国服役` };
  }
  if (empire.resources.unity < OFFICER_RECRUIT_UNITY_COST) {
    return { ok: false, message: `凝聚力不足（需要 ${OFFICER_RECRUIT_UNITY_COST} 凝聚力）` };
  }
  empire.resources.unity -= OFFICER_RECRUIT_UNITY_COST;
  empire.officers.push(instantiateOfficer(tpl));
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: `已招募${tpl.role === 'admiral' ? '海军将领' : '首席科学家'}「${tpl.name}」！` };
}

export function assignAdmiralToFleet(
  state: GameStateData,
  officerId: string,
  fleetId: string | null
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const officer = empire?.officers?.find((o) => o.id === officerId);
  if (!empire || !officer || officer.role !== 'admiral') return { ok: false };

  // Clear previous assignment
  if (officer.assignedFleetId && state.fleets[officer.assignedFleetId]) {
    state.fleets[officer.assignedFleetId].officerId = null;
  }
  if (fleetId && state.fleets[fleetId]) {
    const flt = state.fleets[fleetId];
    // Unassign any previous admiral on this fleet
    if (flt.officerId) {
      const prevOff = empire.officers?.find((o) => o.id === flt.officerId);
      if (prevOff) prevOff.assignedFleetId = null;
    }
    flt.officerId = officer.id;
    officer.assignedFleetId = fleetId;
    return { ok: true, message: `已任命「${officer.name}」指挥「${flt.name}」！` };
  } else {
    officer.assignedFleetId = null;
    return { ok: true, message: `已解除「${officer.name}」的舰队指挥职务` };
  }
}

export function diplomacyDemandVassal(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!target || !rel || !rel.discovered) return { ok: false };
  if (rel.isVassal) return { ok: false, message: `${target.name} 已是我方附庸朝贡国` };

  const pStats = getEmpireStats(state, state.playerEmpireId);
  const aStats = getEmpireStats(state, targetEmpireId);
  const overwhelmed = pStats.fleetPower >= Math.max(250, aStats.fleetPower * 1.4);
  const warBeaten = rel.atWar && rel.aiWarExhaustion >= 40;

  if (!overwhelmed && !warBeaten) {
    return {
      ok: false,
      message: '对方拒绝臣服（需我方舰队战力 ≥ 对方 1.4 倍，或战争中敌方厌战 ≥ 40%）',
    };
  }

  rel.isVassal = true;
  rel.atWar = false;
  rel.nonAggression = true;
  rel.playerWarExhaustion = 0;
  rel.aiWarExhaustion = 0;
  recalculateEmpireEconomy(state, state.playerEmpireId);
  return {
    ok: true,
    message: `「${target.name}」已向帝国俯首称臣，成为附庸朝贡国（每月上缴 25% 能量与矿物）！`,
  };
}

export function diplomacyFormFederation(
  state: GameStateData,
  targetEmpireId: string
): CommandResult {
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!target || !rel || !rel.discovered) return { ok: false };
  if (rel.atWar) return { ok: false, message: '交战状态无法组建联邦' };
  if (rel.inFederation) return { ok: false, message: `${target.name} 已在「星海共同体联邦」中` };
  if (target.personality === 'fanatic_purifiers') {
    return { ok: false, message: `${target.name} 拒绝加入任何跨种族联邦` };
  }
  if (rel.opinion < 45) {
    return { ok: false, message: `好感度不足（组建联邦需好感度 ≥ 45，当前 ${rel.opinion}）` };
  }

  rel.inFederation = true;
  rel.nonAggression = true;
  rel.researchPact = true;
  rel.commercialPact = true;
  // Share full galaxy vision of federation ally!
  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === targetEmpireId) {
      sys.exploredByPlayer = true;
      sys.surveyedByPlayer = true;
    }
  }
  recalculateEmpireEconomy(state, state.playerEmpireId);
  return {
    ok: true,
    message: `已与「${target.name}」组建星际联邦！双方共享星域视野、科研与商业协定。`,
  };
}

export function upgradeFleetAtStarport(
  state: GameStateData,
  fleetId: string
): CommandResult {
  const fleet = state.fleets[fleetId];
  const empire = fleet ? state.empires[fleet.ownerId] : undefined;
  const sys = fleet ? state.systems[fleet.systemId] : undefined;
  if (!fleet || !empire || !sys || fleet.shipType !== 'corvette' || fleet.ships.length === 0) {
    return { ok: false, message: '未找到可改装的军事舰队' };
  }
  if (fleet.inTransit || fleet.inCombat) {
    return { ok: false, message: '航行或交战中的舰队无法改装' };
  }
  if (sys.ownerId !== empire.id || sys.starbaseLevel < 2) {
    return { ok: false, message: '请先将舰队停靠至己方「星港」级以上恒星基地' };
  }

  const alloyCost = Math.max(25, fleet.ships.length * 30);
  if (empire.resources.alloys < alloyCost) {
    return { ok: false, message: `合金不足（全舰队改装需 ${alloyCost} 合金）` };
  }

  empire.resources.alloys -= alloyCost;
  const oldPower = fleet.power;
  fleet.ships = fleet.ships.map((oldShip) => {
    const design = empire.shipDesigns[oldShip.hullClass];
    return design ? createShipInstance(design, empire.modifiers) : oldShip;
  });
  recalcFleetPower(fleet);
  return {
    ok: true,
    message: `「${fleet.name}」已完成最新设计图改装！战力 ${oldPower} → ${fleet.power}`,
  };
}

export function startExcavation(
  state: GameStateData,
  systemId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys || !sys.archSite) return { ok: false, message: '该星系无考古遗址' };
  if (sys.ownerId !== empire.id) return { ok: false, message: '需先建造前哨站控制该星系方可挖掘' };
  if (sys.archSite.stage === 'completed') return { ok: false, message: '该遗址已完成挖掘' };
  if (sys.archSite.stage === 'excavating') return { ok: false, message: '正在挖掘中' };

  sys.archSite.stage = 'excavating';
  sys.archSite.progress = 0;
  return { ok: true, message: `已派遣帝国考古队进驻「${sys.archSite.siteName}」开始发掘！` };
}

export function activateRelic(state: GameStateData, relicId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const relic = RELIC_BY_ID[relicId];
  if (!empire || !relic || !empire.relics?.includes(relicId)) {
    return { ok: false, message: '尚未拥有该帝国圣物' };
  }
  const readyDay = empire.relicCooldowns?.[relicId] ?? 0;
  if (state.date.totalDays < readyDay) {
    return {
      ok: false,
      message: `圣物充能冷却中（还需 ${readyDay - state.date.totalDays} 天）`,
    };
  }
  if (empire.resources.unity < relic.activeUnityCost) {
    return { ok: false, message: `凝聚力不足（需要 ${relic.activeUnityCost} 凝聚力）` };
  }

  empire.resources.unity -= relic.activeUnityCost;
  for (const [k, v] of Object.entries(relic.activeReward)) {
    const key = k as ResourceKey;
    empire.resources[key] += v ?? 0;
  }
  if (!empire.relicCooldowns) empire.relicCooldowns = {};
  empire.relicCooldowns[relicId] = state.date.totalDays + relic.cooldownDays;
  return { ok: true, message: `已激活圣物「${relic.relicName}」：${relic.activeSummary}！` };
}

export function proposeResolution(
  state: GameStateData,
  resolutionId: string
): CommandResult {
  const gc = state.galacticCommunity;
  const resDef = RESOLUTION_BY_ID[resolutionId];
  if (!gc || !gc.founded || !resDef) return { ok: false, message: '银河共同体尚未成立' };
  if (gc.activeProposalId) return { ok: false, message: '议会当前已有正在表决的提案' };
  if (gc.passedResolutions.includes(resolutionId)) return { ok: false, message: '该决议已通过生效' };

  gc.activeProposalId = resolutionId;
  gc.voteDaysLeft = 45;
  gc.playerVote = 'yes';
  return { ok: true, message: `已向银河议会提交提案「${resDef.name}」，45 天后截止表决！` };
}

export function castCommunityVote(
  state: GameStateData,
  vote: 'yes' | 'no' | 'abstain'
): CommandResult {
  const gc = state.galacticCommunity;
  if (!gc || !gc.activeProposalId) return { ok: false };
  gc.playerVote = vote;
  const label = vote === 'yes' ? '赞成' : vote === 'no' ? '反对' : '弃权';
  return { ok: true, message: `我方已投出「${label}」票` };
}

// ---------- v1.5 Commands: Building Upgrades, Policies, Espionage, Gateways ----------

export function getBuildingUpgradeCost(
  buildingId: BuildingId,
  currentLevel: 1 | 2 | 3
): {
  minerals: number;
  strategicKey: StrategicResourceKey;
  strategicName: string;
  strategicAmount: number;
} | null {
  if (currentLevel >= 3) return null;
  let strategicKey: StrategicResourceKey = 'rareCrystals';
  let strategicName = '稀有水晶';
  if (
    buildingId === 'alloy_foundry' ||
    buildingId === 'mineral_purification' ||
    buildingId === 'energy_grid'
  ) {
    strategicKey = 'volatileMotes';
    strategicName = '易爆微粒';
  } else if (
    buildingId === 'research_lab' ||
    buildingId === 'holotheater' ||
    buildingId === 'gene_clinic'
  ) {
    strategicKey = 'exoticGases';
    strategicName = '异星天然气';
  }
  return {
    minerals: currentLevel === 1 ? 240 : 380,
    strategicKey,
    strategicName,
    strategicAmount: currentLevel === 1 ? 12 : 24,
  };
}

export function upgradeColonyBuilding(
  state: GameStateData,
  systemId: string,
  planetId: string,
  slotIdx: number
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  const planet = sys?.planets.find((p) => p.id === planetId);
  const colony = planet?.colony;
  if (!empire || !colony || planet.colonizedBy !== empire.id) {
    return { ok: false, message: '未找到己方殖民地' };
  }
  const bId = colony.buildings[slotIdx];
  if (!bId) return { ok: false, message: '无效建筑槽位' };

  const curLvl = (colony.buildingLevels?.[slotIdx] ?? 1) as 1 | 2 | 3;
  const cost = getBuildingUpgradeCost(bId, curLvl);
  if (!cost) return { ok: false, message: '该建筑已达最高等级 Lv.3' };

  if (empire.resources.minerals < cost.minerals) {
    return { ok: false, message: `矿物不足（需要 ${cost.minerals} 矿物）` };
  }
  const stratStock = empire.strategicResources?.[cost.strategicKey] ?? 0;
  if (stratStock < cost.strategicAmount) {
    return {
      ok: false,
      message: `${cost.strategicName}不足（需要 ${cost.strategicAmount}，当前 ${Math.floor(stratStock)}）`,
    };
  }

  empire.resources.minerals -= cost.minerals;
  if (!empire.strategicResources) {
    empire.strategicResources = {
      volatileMotes: 0,
      exoticGases: 0,
      rareCrystals: 0,
      darkMatter: 0,
    };
  }
  empire.strategicResources[cost.strategicKey] -= cost.strategicAmount;
  if (!colony.buildingLevels) colony.buildingLevels = {};
  const nextLvl = (curLvl + 1) as 2 | 3;
  colony.buildingLevels[slotIdx] = nextLvl;
  recalculateEmpireEconomy(state, empire.id);
  const bName = BUILDINGS[bId]?.name ?? bId;
  return {
    ok: true,
    message: `「${bName}」已升级至 Lv.${nextLvl}（产出大幅提升）！`,
  };
}

export function setEmpirePolicy<K extends keyof EmpirePolicies>(
  state: GameStateData,
  key: K,
  value: EmpirePolicies[K]
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };
  if (!empire.policies) {
    empire.policies = { ...DEFAULT_POLICIES };
  }
  empire.policies[key] = value;
  recalculateEmpireModifiers(empire);
  recalculateEmpireEconomy(state, empire.id);
  return { ok: true, message: '已颁布新的帝国战略政策！' };
}

export function runEspionageOp(
  state: GameStateData,
  targetEmpireId: string,
  op: 'steal_tech' | 'sabotage_starbase' | 'sow_discord'
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const target = state.empires[targetEmpireId];
  const rel = state.relations[targetEmpireId];
  if (!empire || !target || !rel?.discovered) {
    return { ok: false, message: '尚未建立对该文明的情报网络' };
  }
  const readyDay = empire.espionageCooldowns?.[targetEmpireId] ?? 0;
  if (state.date.totalDays < readyDay) {
    return {
      ok: false,
      message: `对该国的情报冷却中（还需 ${readyDay - state.date.totalDays} 天）`,
    };
  }

  const influenceCost = op === 'sabotage_starbase' ? 45 : op === 'steal_tech' ? 35 : 30;
  if (empire.resources.influence < influenceCost) {
    return { ok: false, message: `影响力不足（需要 ${influenceCost} 影响力）` };
  }
  empire.resources.influence -= influenceCost;
  if (!empire.espionageCooldowns) empire.espionageCooldowns = {};
  empire.espionageCooldowns[targetEmpireId] = state.date.totalDays + 180;

  // Small chance of detection reduces opinion
  const detected = Math.random() < 0.45;
  if (detected) {
    rel.opinion = Math.max(-100, rel.opinion - 15);
  }
  const detectNote = detected ? '（行动暴露，好感 -15）' : '（完美潜伏，未被察觉）';

  if (op === 'steal_tech') {
    empire.resources.research += 180;
    return {
      ok: true,
      message: `情报窃密成功：从「${target.name}」窃取 +180 科研数据！${detectNote}`,
    };
  }
  if (op === 'sabotage_starbase') {
    const enemySystems = Object.values(state.systems)
      .filter((s) => s.ownerId === targetEmpireId && s.starbaseLevel >= 1)
      .sort((a, b) => b.starbaseLevel - a.starbaseLevel);
    const hit = enemySystems[0];
    if (hit) {
      if ((hit.defensePlatforms ?? 0) > 0) {
        hit.defensePlatforms = Math.max(0, (hit.defensePlatforms ?? 0) - 1);
      }
      if (hit.starbaseHp && hit.starbaseMaxHp) {
        hit.starbaseHp = Math.max(100, Math.round(hit.starbaseHp * 0.5));
      }
      return {
        ok: true,
        message: `特工破坏成功：重创「${target.name}」位于「${hit.name}」的恒星基地防御！${detectNote}`,
      };
    }
    return {
      ok: true,
      message: `特工潜入「${target.name}」军工设施制造了混乱。${detectNote}`,
    };
  }

  // sow_discord
  target.resources.energy = Math.max(0, target.resources.energy - 180);
  target.resources.minerals = Math.max(0, target.resources.minerals - 180);
  empire.resources.unity += 90;
  return {
    ok: true,
    message: `挑拨离间成功：削弱「${target.name}」国库储备，我方 +90 凝聚力！${detectNote}`,
  };
}

export function buildGateway(state: GameStateData, systemId: string): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const sys = state.systems[systemId];
  if (!empire || !sys || sys.ownerId !== empire.id) {
    return { ok: false, message: '只能在己方控制的星系建造跨星系星门' };
  }
  if (sys.hasGateway) {
    return { ok: false, message: '该星系已激活跨星系星门' };
  }
  const hasTech =
    empire.completedTechs.includes('eng_star_citadel') ||
    empire.completedTechs.includes('eng_mega_engineering');
  if (!hasTech) {
    return {
      ok: false,
      message: '建造星门需先研发科技「擎天堡要塞」或「巨型工程学」',
    };
  }
  if (empire.resources.alloys < 450) {
    return { ok: false, message: '合金不足（建造星门需要 450 合金）' };
  }

  empire.resources.alloys -= 450;
  sys.hasGateway = true;
  return {
    ok: true,
    message: `「${sys.name}」跨星系星门已激活！舰队可在己方星门之间一跳瞬移！`,
  };
}

// ---------- v1.7 Commands: Enclaves, Become the Crisis, Evasive, Rally Point, Resettlement ----------

export function buyCuratorService(
  state: GameStateData,
  service: 'research_boost' | 'leviathan_intel'
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };

  if (service === 'research_boost') {
    if (empire.resources.energy < 350) {
      return { ok: false, message: '能量币不足（雇佣策展人学者需 350 能量币）' };
    }
    empire.resources.energy -= 350;
    empire.curatorResearchUntilDay = Math.max(
      state.date.totalDays,
      empire.curatorResearchUntilDay ?? 0
    ) + 1800;
    return { ok: true, message: '已聘请策展人学者顾问：未来 5 年帝国全学科科研速度 +15%！' };
  }

  if (empire.curatorLeviathanIntel) {
    return { ok: false, message: '已掌握全银河利维坦弱点情报' };
  }
  if (empire.resources.energy < 300) {
    return { ok: false, message: '能量币不足（购买利维坦情报需 300 能量币）' };
  }
  empire.resources.energy -= 300;
  empire.curatorLeviathanIntel = true;
  return { ok: true, message: '已获取策展人机密档案：我方舰队对所有远古利维坦伤害 +30%！' };
}

export function buyTraderStrategic(
  state: GameStateData,
  resourceKey: 'volatileMotes' | 'exoticGases' | 'rareCrystals'
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };
  if (empire.resources.energy < 280) {
    return { ok: false, message: '能量币不足（向商人工会采购需 280 能量币）' };
  }
  empire.resources.energy -= 280;
  if (!empire.strategicResources) {
    empire.strategicResources = {
      volatileMotes: 0,
      exoticGases: 0,
      rareCrystals: 0,
      darkMatter: 0,
    };
  }
  empire.strategicResources[resourceKey] += 15;
  const label =
    resourceKey === 'volatileMotes'
      ? '易爆微粒'
      : resourceKey === 'exoticGases'
      ? '异星天然气'
      : '稀有水晶';
  return { ok: true, message: `已从星际商人工会购入 +15 ${label}！` };
}

export const BECOME_CRISIS_STAGES = [
  {
    stage: 1 as const,
    name: '第一阶段：暗物质收集阵列',
    alloys: 400,
    darkMatter: 15,
    unity: 200,
    summary: '解锁化身天灾路线，全银河外交好感 -40',
  },
  {
    stage: 2 as const,
    name: '第二阶段：二维箔曲率封锁网',
    alloys: 650,
    darkMatter: 25,
    unity: 0,
    summary: '全银河震动，所有文明好感 -60',
  },
  {
    stage: 3 as const,
    name: '第三阶段：归零器奇点引擎',
    alloys: 900,
    darkMatter: 40,
    unity: 0,
    summary: '全银河已接触 AI 立即结盟向我方全面宣战！',
  },
  {
    stage: 4 as const,
    name: '最终阶段：启动宇宙归零 / 降维重塑',
    alloys: 1200,
    darkMatter: 60,
    unity: 0,
    summary: '立即达成第 4 种史诗结局「宇宙归零胜利」！',
  },
];

export function advanceBecomeCrisis(state: GameStateData): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };

  const curStage = empire.becomeCrisisStage ?? 0;
  if (curStage >= 4) return { ok: false, message: '归零工程已完成' };
  if (curStage === 0 && empire.unlockedAscensions.length < 2) {
    return { ok: false, message: '需先解锁至少 2 项飞升天赋方可开启「化身天灾」工程' };
  }

  const nextDef = BECOME_CRISIS_STAGES[curStage];
  if (empire.resources.alloys < nextDef.alloys) {
    return { ok: false, message: `合金不足（需要 ${nextDef.alloys} 合金）` };
  }
  if (empire.resources.unity < nextDef.unity) {
    return { ok: false, message: `凝聚力不足（需要 ${nextDef.unity} 凝聚力）` };
  }
  const dm = empire.strategicResources?.darkMatter ?? 0;
  if (dm < nextDef.darkMatter) {
    return {
      ok: false,
      message: `暗物质不足（需要 ${nextDef.darkMatter} 暗物质，当前 ${Math.floor(dm)}）`,
    };
  }

  empire.resources.alloys -= nextDef.alloys;
  empire.resources.unity -= nextDef.unity;
  if (empire.strategicResources) {
    empire.strategicResources.darkMatter -= nextDef.darkMatter;
  }
  empire.becomeCrisisStage = nextDef.stage;

  // Diplomatic fallout across the galaxy
  for (const [aiId, rel] of Object.entries(state.relations)) {
    const aiEmp = state.empires[aiId];
    if (!aiEmp || aiEmp.isPlayer) continue;
    if (nextDef.stage === 1) rel.opinion = Math.max(-100, rel.opinion - 40);
    if (nextDef.stage === 2) rel.opinion = Math.max(-100, rel.opinion - 60);
    if (nextDef.stage === 3 && rel.discovered && (!aiEmp.isFallenEmpire || aiEmp.awakened)) {
      rel.opinion = -100;
      rel.atWar = true;
      rel.nonAggression = false;
      rel.researchPact = false;
      rel.commercialPact = false;
    }
  }

  if (nextDef.stage === 4) {
    const score = computeEmpireScore(state, empire.id) + 3500;
    const reason =
      '宇宙归零胜利（化身天灾） — 你启动了终极归零器与二向箔降维工程，将整个三维银河重塑为新纪元的黎明！';
    state.victory = {
      achieved: true,
      reason,
      score,
      year: state.date.year,
    };
    recordRunHistory(state, score, reason);
    state.paused = true;
    return { ok: true, message: '终极归零器已点火！银河重塑，达成「宇宙归零胜利」！' };
  }

  return {
    ok: true,
    message: `化身天灾推进至「${nextDef.name}」：${nextDef.summary}`,
  };
}

export function toggleFleetEvasive(state: GameStateData, fleetId: string): CommandResult {
  const fleet = state.fleets[fleetId];
  if (!fleet || fleet.ownerId !== state.playerEmpireId) return { ok: false };
  fleet.evasive = !fleet.evasive;
  return {
    ok: true,
    message: fleet.evasive
      ? `「${fleet.name}」已切换为【规避姿态】：遇到敌对星系将自动中止跃迁`
      : `「${fleet.name}」已切换为【主动姿态】：无视敌情强行推进`,
  };
}

export function setEmpireRallyPoint(
  state: GameStateData,
  systemId: string | null
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  if (!empire) return { ok: false };
  if (systemId === null || empire.rallySystemId === systemId) {
    empire.rallySystemId = null;
    return { ok: true, message: '已取消全帝国舰队集结点' };
  }
  const sys = state.systems[systemId];
  if (!sys || sys.ownerId !== empire.id) {
    return { ok: false, message: '只能将己方控制的星系设为舰队集结点' };
  }
  empire.rallySystemId = systemId;
  return {
    ok: true,
    message: `已将「${sys.name}」设为舰队集结点！新建战舰将自动飞往此处合编。`,
  };
}

export function resettlePop(
  state: GameStateData,
  fromSysId: string,
  fromPlanetId: string,
  toSysId: string,
  toPlanetId: string
): CommandResult {
  const empire = state.empires[state.playerEmpireId];
  const fromPlanet = state.systems[fromSysId]?.planets.find((p) => p.id === fromPlanetId);
  const toPlanet = state.systems[toSysId]?.planets.find((p) => p.id === toPlanetId);
  if (!empire || !fromPlanet?.colony || !toPlanet?.colony) {
    return { ok: false, message: '无效殖民地目标' };
  }
  if (fromPlanet.id === toPlanet.id) {
    return { ok: false, message: '不能迁往同一颗星球' };
  }
  if (fromPlanet.popCount <= 1) {
    return { ok: false, message: '至少需保留 1 单位人口维持殖民地运作' };
  }
  if (empire.resources.energy < 60) {
    return { ok: false, message: '能量币不足（人口迁移需 60 能量币）' };
  }

  empire.resources.energy -= 60;
  fromPlanet.popCount -= 1;
  toPlanet.popCount += 1;
  recalculateEmpireEconomy(state, empire.id);
  return {
    ok: true,
    message: `已将 1 单位人口从「${fromPlanet.name}」迁往「${toPlanet.name}」！`,
  };
}
