import {
  AlertItem,
  Fleet,
  GameStateData,
  MarketCommodity,
  ResourceKey,
  StrategicResourceKey,
} from '../types/game';
import {
  createEmptyBreakdown,
  createEmptyResourcePool,
  createEmptyStrategicPool,
} from './galaxyGenerator';
import { findHyperlanePath, findNearestUnsurveyedSystem } from './pathfinding';
import { sfx } from './sfx';
import { computeColonyEconomy, createInitialColony, runColonyAutoManage } from './colonySystem';
import { STARBASE_TIERS, syncStarbaseStats } from './starbaseSystem';
import { advanceResearchMonthly, recalculateEmpireModifiers } from './techSystem';
import { BUILDINGS, DISTRICTS } from '../data/districtsAndBuildings';
import { stepShipyardsDaily } from './shipSystem';
import { stepCombatDaily } from './combatSystem';
import { checkFirstContacts, stepDiplomacyMonthly } from './diplomacySystem';
import { stepAIEmpiresMonthly } from './aiSystem';
import { createAnomalyEvent, GALACTIC_TIMELINE_EVENTS } from '../data/events';
import { checkCrisisAndVictoryMonthly, computeEmpireScore } from './crisisSystem';
import { DIFFICULTIES } from '../data/playableEmpires';
import { EDICT_BY_ID } from '../data/edicts';
import { MEGASTRUCTURES } from '../data/megastructures';
import { PLANET_CLASSES } from '../data/planetClasses';
import { RESOLUTION_BY_ID } from '../data/galacticCommunity';
import { RELIC_BY_ID } from '../data/relics';
import { getEmpireStats } from './diplomacySystem';
import { evaluateEmpireFactions } from '../data/factions';

export function computeDiplomaticWeight(state: GameStateData, empireId: string): number {
  const emp = state.empires[empireId];
  if (!emp) return 0;
  const stats = getEmpireStats(state, empireId);
  const base =
    stats.systems * 45 +
    stats.pops * 18 +
    Math.round(stats.fleetPower * 0.45) +
    emp.completedTechs.length * 40;
  return Math.round(base * (1 + (emp.modifiers.diplomaticWeightMult ?? 0)));
}

export const OUTPOST_ALLOY_COST = 100;
export const OUTPOST_BASE_INFLUENCE_COST = 75;
export const STATION_MINERAL_COST = 100;
export const COLONIZE_ALLOY_COST = 150;
export const COLONIZE_FOOD_COST = 150;
export const COLONIZE_CG_COST = 100;

export const BASE_MARKET_PRICES: Record<MarketCommodity, number> = {
  minerals: 1.0,
  food: 1.0,
  consumerGoods: 2.0,
  alloys: 4.0,
};

const RESOURCE_KEYS: ResourceKey[] = [
  'energy',
  'minerals',
  'food',
  'alloys',
  'consumerGoods',
  'research',
  'unity',
  'influence',
];

function pushAlert(state: GameStateData, alert: Omit<AlertItem, 'id' | 'day'>) {
  const id = `alert_${state.date.totalDays}_${Math.random().toString(36).slice(2, 7)}`;
  state.alerts = [
    { ...alert, id, day: state.date.totalDays },
    ...state.alerts,
  ].slice(0, 12);
}

export function recalculateEmpireEconomy(state: GameStateData, empireId: string): void {
  const empire = state.empires[empireId];
  if (!empire) return;

  recalculateEmpireModifiers(empire);

  // Apply completed megastructure global modifiers + Galactic Community passed resolutions
  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === empireId && sys.megastructure?.stage === 'completed') {
      const mDef = MEGASTRUCTURES[sys.megastructure.type];
      if (mDef) {
        for (const [k, v] of Object.entries(mDef.effects)) {
          const key = k as keyof typeof empire.modifiers;
          empire.modifiers[key] += v ?? 0;
        }
      }
    }
  }
  const gc = state.galacticCommunity;
  if (gc?.founded && !empire.isFallenEmpire) {
    for (const resId of gc.passedResolutions) {
      const rDef = RESOLUTION_BY_ID[resId];
      if (!rDef) continue;
      if (rDef.custodianOnly && gc.custodianEmpireId !== empireId) continue;
      for (const [k, v] of Object.entries(rDef.effects)) {
        const key = k as keyof typeof empire.modifiers;
        empire.modifiers[key] += v ?? 0;
      }
    }
  }

  const income = createEmptyResourcePool();
  const upkeep = createEmptyResourcePool();
  const incomeDetails = createEmptyBreakdown();
  const upkeepDetails = createEmptyBreakdown();
  const strategicNet = createEmptyStrategicPool();

  const addInc = (key: ResourceKey, amount: number, label: string) => {
    if (amount === 0) return;
    income[key] += amount;
    incomeDetails[key].push({ label, amount });
  };
  const addUp = (key: ResourceKey, amount: number, label: string) => {
    if (amount === 0) return;
    upkeep[key] += amount;
    upkeepDetails[key].push({ label, amount });
  };

  // Base empire income
  addInc('influence', 3.5, '帝国基础权威');
  addInc('unity', 4, '首都行政中心');

  // Trade policy bonus
  const tradePolicy = empire.policies?.tradePolicy ?? 'wealth';
  if (tradePolicy === 'wealth') {
    addInc('energy', 14, '贸易政策：财富创造');
  } else if (tradePolicy === 'consumer') {
    addInc('consumerGoods', 12, '贸易政策：民生消费');
  } else if (tradePolicy === 'unity') {
    addInc('unity', 12, '贸易政策：文化集市');
  }

  // Internal Factions support (player empire)
  if (empire.isPlayer) {
    const factions = evaluateEmpireFactions(state, empireId);
    const facUnity = factions.reduce((s, f) => s + f.unityIncome, 0);
    const facInf = Number(factions.reduce((s, f) => s + f.influenceIncome, 0).toFixed(1));
    if (facUnity > 0) addInc('unity', facUnity, '国内派系政治支持');
    if (facInf > 0) addInc('influence', facInf, '国内派系权威拥护');
  }

  // Diplomatic pact & Vassal tribute bonuses for player
  if (empire.isPlayer) {
    let commPacts = 0;
    let resPacts = 0;
    let tributeEnergy = 0;
    let tributeMinerals = 0;
    for (const [aiId, rel] of Object.entries(state.relations)) {
      if (rel.commercialPact) commPacts++;
      if (rel.researchPact) resPacts++;
      if (rel.isVassal) {
        const vassal = state.empires[aiId];
        if (vassal) {
          tributeEnergy += Math.max(8, Math.round(vassal.monthlyIncome.energy * 0.25));
          tributeMinerals += Math.max(8, Math.round(vassal.monthlyIncome.minerals * 0.25));
        }
      }
    }
    if (commPacts > 0) addInc('energy', commPacts * 15, `星际商业协定 (x${commPacts})`);
    if (resPacts > 0) addInc('research', resPacts * 8, `星际科研协议 (x${resPacts})`);
    if (tributeEnergy > 0) addInc('energy', tributeEnergy, '附庸国能源朝贡 (25%)');
    if (tributeMinerals > 0) addInc('minerals', tributeMinerals, '附庸国矿物朝贡 (25%)');
  }

  // Active Empire Edicts monthly upkeep
  for (const edictId of empire.activeEdicts ?? []) {
    const ed = EDICT_BY_ID[edictId];
    if (ed) {
      addUp(ed.upkeepResource, ed.monthlyUpkeep, `法令：${ed.name}`);
    }
  }

  // Planets & orbital stations
  let miningStationEnergy = 0;
  let miningStationMinerals = 0;
  let miningStationAlloys = 0;
  let researchStationPoints = 0;
  let stationCount = 0;
  let starbaseUpkeep = 0;

  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId !== empireId) continue;

    if (sys.starbaseLevel >= 1) {
      const sbLvl = sys.starbaseLevel as 1 | 2 | 3 | 4;
      starbaseUpkeep += STARBASE_TIERS[sbLvl].upkeepEnergy + (sys.defensePlatforms ?? 0);
    }

    if (sys.strategicDeposit) {
      strategicNet[sys.strategicDeposit.type] += sys.strategicDeposit.amount;
    }

    if (sys.megastructure?.stage === 'completed') {
      const mDef = MEGASTRUCTURES[sys.megastructure.type];
      if (mDef) {
        for (const [k, v] of Object.entries(mDef.monthlyIncome)) {
          addInc(k as ResourceKey, v ?? 0, `巨构：${mDef.name} (${sys.name})`);
        }
      }
    }

    for (const planet of sys.planets) {
      if (planet.colonizedBy === empireId && planet.colony) {
        const colRes = computeColonyEconomy(planet, empire);
        for (const k of RESOURCE_KEYS) {
          if (colRes.income[k] > 0) addInc(k, colRes.income[k], `殖民地：${planet.name}`);
          if (colRes.upkeep[k] > 0) addUp(k, colRes.upkeep[k], `殖民地：${planet.name}`);
        }
        planet.colony.buildings.forEach((bId, idx) => {
          if (bId === 'strategic_refinery') {
            const lvl = planet.colony?.buildingLevels?.[idx] ?? 1;
            strategicNet.volatileMotes += lvl;
            strategicNet.exoticGases += lvl;
            strategicNet.rareCrystals += lvl;
          }
        });
      }

      if (planet.stationType !== 'none' && planet.deposit) {
        stationCount++;
        const stMult = 1 + empire.modifiers.stationOutputMult;
        const amt = Number((planet.deposit.amount * stMult).toFixed(1));
        if (planet.deposit.type === 'energy') miningStationEnergy += amt;
        if (planet.deposit.type === 'minerals') miningStationMinerals += amt;
        if (planet.deposit.type === 'alloys') miningStationAlloys += amt;
        if (planet.deposit.type === 'research') researchStationPoints += amt;
      }
    }
  }

  addInc('energy', miningStationEnergy, '轨道开采站');
  addInc('minerals', miningStationMinerals, '轨道采矿站');
  addInc('alloys', miningStationAlloys, '轨道熔炼站');
  addInc('research', researchStationPoints, '轨道科研站');
  addUp('energy', stationCount, '轨道站维护');
  addUp('energy', starbaseUpkeep, '恒星基地维护');

  // Fleet upkeep
  let fleetEnergyUpkeep = 0;
  let fleetAlloyUpkeep = 0;
  for (const fleet of Object.values(state.fleets)) {
    if (fleet.ownerId !== empireId) continue;
    fleetEnergyUpkeep += fleet.shipCount * (fleet.shipType === 'corvette' ? 1 : 1);
    if (fleet.shipType === 'corvette') {
      fleetAlloyUpkeep += fleet.shipCount * 0.5;
    }
  }
  addUp('energy', fleetEnergyUpkeep, '舰船能源维护');
  addUp('alloys', fleetAlloyUpkeep, '舰船合金维护');

  const aiIncomeMult = !empire.isPlayer
    ? DIFFICULTIES[state.config.difficulty ?? 'ensign'].aiIncomeMult
    : 1;
  const net = createEmptyResourcePool();
  for (const k of RESOURCE_KEYS) {
    const scaledIncome = income[k] * aiIncomeMult;
    income[k] = Number(scaledIncome.toFixed(1));
    net[k] = Number((scaledIncome - upkeep[k]).toFixed(1));
  }

  empire.monthlyIncome = income;
  empire.monthlyUpkeep = upkeep;
  empire.monthlyNet = net;
  empire.incomeDetails = incomeDetails;
  empire.upkeepDetails = upkeepDetails;
  if (!empire.strategicResources) empire.strategicResources = createEmptyStrategicPool();
  empire.monthlyStrategicNet = strategicNet;
}

function revealSystemAndNeighbors(state: GameStateData, systemId: string) {
  const sys = state.systems[systemId];
  if (!sys) return;
  sys.exploredByPlayer = true;
  for (const nId of sys.hyperlanes) {
    if (state.systems[nId]) {
      state.systems[nId].exploredByPlayer = true;
    }
  }
}

function moveFleetLocallyTowards(fleet: Fleet, targetX: number, targetZ: number, step = 2.8) {
  const dx = targetX - fleet.localX;
  const dz = targetZ - fleet.localZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist <= step) {
    fleet.localX = targetX;
    fleet.localZ = targetZ;
  } else {
    fleet.localX += (dx / dist) * step;
    fleet.localZ += (dz / dist) * step;
  }
}

function stepFleet(state: GameStateData, fleet: Fleet): void {
  const empire = state.empires[fleet.ownerId];

  // 1. Handle hyperlane transit (scaled by empire shipSpeedMult!)
  if (fleet.inTransit && fleet.transitToId) {
    const baseSpeed = fleet.shipType === 'corvette' ? 0.1 : 0.085;
    const speedMult = 1 + (empire?.modifiers.shipSpeedMult ?? 0);
    fleet.transitProgress += baseSpeed * speedMult;
    const destSys = state.systems[fleet.transitToId];
    fleet.statusText = `超空间航行 → ${destSys?.name ?? ''}`;

    if (fleet.transitProgress >= 1) {
      fleet.inTransit = false;
      fleet.systemId = fleet.transitToId;
      fleet.transitFromId = null;
      fleet.transitToId = null;
      fleet.transitProgress = 0;
      fleet.localX = (Math.random() - 0.5) * 26;
      fleet.localZ = (Math.random() - 0.5) * 26;

      if (fleet.ownerId === state.playerEmpireId) {
        revealSystemAndNeighbors(state, fleet.systemId);
      }

      // Pop arrived node from active move order
      const top = fleet.orders[0];
      if (top && top.type === 'move') {
        if (top.path[0] === fleet.systemId) {
          top.path.shift();
        }
        if (top.path.length === 0) {
          fleet.orders.shift();
        }
      }
    }
    return;
  }

  // 2. Process top order
  const order = fleet.orders[0];
  if (!order) {
    // Auto-survey logic for science ships
    if (fleet.shipType === 'science' && fleet.autoSurvey && fleet.ownerId === state.playerEmpireId) {
      const currentSys = state.systems[fleet.systemId];
      if (currentSys && !currentSys.surveyedByPlayer) {
        fleet.orders.push({
          type: 'survey',
          targetSystemId: currentSys.id,
          progress: 0,
        });
        return;
      }

      // Avoid targeting systems already queued by other science ships
      const claimed = new Set<string>();
      for (const other of Object.values(state.fleets)) {
        if (other.id === fleet.id) continue;
        for (const o of other.orders) {
          if (o.type === 'survey') claimed.add(o.targetSystemId);
        }
      }

      const next = findNearestUnsurveyedSystem(state.systems, fleet.systemId, claimed);
      if (next) {
        fleet.orders.push({
          type: 'move',
          targetSystemId: next.systemId,
          path: next.path,
        });
        fleet.orders.push({
          type: 'survey',
          targetSystemId: next.systemId,
          progress: 0,
        });
        return;
      } else {
        fleet.autoSurvey = false;
        fleet.statusText = '待命（星系已全部调查）';
        pushAlert(state, {
          kind: 'success',
          title: '银河探索完成',
          detail: `${fleet.name} 已完成所有可达星系的调查任务。`,
          fleetId: fleet.id,
          systemId: fleet.systemId,
        });
        return;
      }
    }

    // Auto-build orbital stations for Construction Ships!
    if (
      fleet.shipType === 'construction' &&
      fleet.autoBuild &&
      fleet.ownerId === state.playerEmpireId &&
      empire &&
      empire.resources.minerals >= STATION_MINERAL_COST
    ) {
      const ownedWithUnbuilt = Object.values(state.systems).filter(
        (s) =>
          s.ownerId === fleet.ownerId &&
          s.planets.some((p) => p.deposit && p.stationType === 'none')
      );
      let bestSysId: string | null = null;
      let bestPath: string[] | null = null;
      for (const cand of ownedWithUnbuilt) {
        if (cand.id === fleet.systemId) {
          bestSysId = cand.id;
          bestPath = [];
          break;
        }
        const p = findHyperlanePath(state.systems, fleet.systemId, cand.id);
        if (p && (!bestPath || p.length < bestPath.length)) {
          bestPath = p;
          bestSysId = cand.id;
        }
      }
      if (bestSysId && bestPath) {
        const targetSys = state.systems[bestSysId];
        const hasMining = targetSys.planets.some(
          (p) => p.deposit && p.deposit.type !== 'research' && p.stationType === 'none'
        );
        if (bestPath.length > 0) {
          fleet.orders.push({ type: 'move', targetSystemId: bestSysId, path: bestPath });
        }
        fleet.orders.push({
          type: 'build_stations',
          targetSystemId: bestSysId,
          stationKind: hasMining ? 'mining' : 'research',
          progress: 0,
        });
        return;
      } else {
        fleet.statusText = '自动建设待命（已全部开发）';
        return;
      }
    }

    fleet.statusText = fleet.shipType === 'corvette' ? '轨道巡逻' : '待命';
    return;
  }

  if (order.type === 'move') {
    if (order.path.length === 0) {
      fleet.orders.shift();
      return;
    }
    const nextHop = order.path[0];
    // Evasive Stance check: abort jump if hostile fleet is in nextHop!
    if (fleet.evasive && fleet.ownerId === state.playerEmpireId) {
      const hasDanger = Object.values(state.fleets).some(
        (other) =>
          other.systemId === nextHop &&
          !other.inTransit &&
          (other.isHostile ||
            (other.ownerId !== state.playerEmpireId &&
              state.relations[other.ownerId]?.atWar))
      );
      if (hasDanger) {
        fleet.orders = [];
        fleet.autoSurvey = false;
        fleet.statusText = '规避敌情待命';
        pushAlert(state, {
          kind: 'warning',
          title: `规避警报：${fleet.name} 避开敌对星系`,
          detail: `侦测到「${state.systems[nextHop]?.name ?? nextHop}」存在敌对舰队或利维坦，已自动中止跃迁！`,
          systemId: fleet.systemId,
          fleetId: fleet.id,
        });
        return;
      }
    }
    fleet.inTransit = true;
    fleet.transitFromId = fleet.systemId;
    fleet.transitToId = nextHop;
    fleet.transitProgress = 0;
    const destSys = state.systems[nextHop];
    fleet.statusText = `进入超空间 → ${destSys?.name ?? ''}`;
    return;
  }

  if (order.type === 'survey') {
    const sys = state.systems[order.targetSystemId];
    if (!sys || fleet.systemId !== sys.id) {
      fleet.orders.shift();
      return;
    }

    const nextPlanet = sys.planets.find((p) => !p.surveyed);
    if (!nextPlanet) {
      sys.surveyedByPlayer = true;
      fleet.orders.shift();
      fleet.statusText = '调查完成';

      // Check anomaly discovery -> trigger Stellaris-style branching Narrative Event!
      if (sys.anomalyName && !sys.anomalyDiscovered) {
        sys.anomalyDiscovered = true;
        if (!state.activeEvent) {
          state.activeEvent = createAnomalyEvent(sys.id, sys.name, sys.anomalyName);
          state.paused = true;
        } else if (empire) {
          empire.resources.research += 80;
        }
        pushAlert(state, {
          kind: 'discovery',
          title: `发现异常现象：${sys.anomalyName}`,
          detail: `${fleet.name} 在 ${sys.name} 发现特殊信号，请决策调查方案！`,
          systemId: sys.id,
          fleetId: fleet.id,
        });
      } else {
        const habitableCount = sys.planets.filter((p) => p.habitable).length;
        pushAlert(state, {
          kind: habitableCount > 0 ? 'discovery' : 'info',
          title: `星系调查完毕：${sys.name}`,
          detail:
            habitableCount > 0
              ? `在 ${sys.name} 发现 ${habitableCount} 颗宜居星球！可派遣工程船建造前哨站。`
              : `${sys.name} 的全部行星与轨道资源已测绘完成。`,
          systemId: sys.id,
          fleetId: fleet.id,
        });
      }
      return;
    }

    order.targetPlanetId = nextPlanet.id;
    const px = Math.cos(nextPlanet.orbitAngle) * nextPlanet.orbitRadius;
    const pz = Math.sin(nextPlanet.orbitAngle) * nextPlanet.orbitRadius;
    moveFleetLocallyTowards(fleet, px, pz, 3.2);

    order.progress += 14; // ~7-8 days per planet
    fleet.statusText = `正在调查 ${nextPlanet.name} (${Math.min(100, Math.round(order.progress))}%)`;

    if (order.progress >= 100) {
      nextPlanet.surveyed = true;
      order.progress = 0;
    }
    return;
  }

  if (order.type === 'build_outpost') {
    const sys = state.systems[order.targetSystemId];
    if (!sys) {
      fleet.orders.shift();
      return;
    }
    if (sys.ownerId !== null) {
      // Another empire claimed the system while we were en route. Drop the order
      // and refund the upfront cost instead of silently swallowing it.
      fleet.orders.shift();
      if (empire) {
        empire.resources.alloys += order.paidAlloys ?? OUTPOST_ALLOY_COST;
        empire.resources.influence += order.paidInfluence ?? 0;
        recalculateEmpireEconomy(state, empire.id);
      }
      fleet.statusText = '前哨站订单取消（星系已有归属），资源已退还';
      if (fleet.ownerId === state.playerEmpireId) {
        pushAlert(state, {
          kind: 'warning',
          title: `前哨站建造取消：${sys.name}`,
          detail: '该星系在此期间已被其他势力占据，已退还此前预付的合金与影响力。',
          systemId: sys.id,
          fleetId: fleet.id,
        });
      }
      return;
    }
    if (fleet.systemId !== sys.id) return; // still travelling, keep the order
    moveFleetLocallyTowards(fleet, 6, 4, 2.5);
    order.progress += 5.5; // ~18 days
    fleet.statusText = `建造前哨站 (${Math.min(100, Math.round(order.progress))}%)`;

    if (order.progress >= 100) {
      sys.ownerId = fleet.ownerId;
      sys.starbaseLevel = 1;
      revealSystemAndNeighbors(state, sys.id);
      recalculateEmpireEconomy(state, fleet.ownerId);
      fleet.orders.shift();
      fleet.statusText = '前哨站已竣工';

      pushAlert(state, {
        kind: 'success',
        title: `星系已纳入版图：${sys.name}`,
        detail: `${fleet.name} 在 ${sys.name} 建成恒星前哨站，现在可以建造采矿站与科研站。`,
        systemId: sys.id,
        fleetId: fleet.id,
      });
    }
    return;
  }

  if (order.type === 'build_stations') {
    const sys = state.systems[order.targetSystemId];
    if (!sys || fleet.systemId !== sys.id || sys.ownerId !== fleet.ownerId) {
      fleet.orders.shift();
      return;
    }

    const isMining = order.stationKind === 'mining';
    const eligiblePlanet = sys.planets.find((p) => {
      if (!p.deposit || p.stationType !== 'none') return false;
      return isMining
        ? p.deposit.type === 'energy' || p.deposit.type === 'minerals' || p.deposit.type === 'alloys'
        : p.deposit.type === 'research';
    });

    if (!eligiblePlanet) {
      fleet.orders.shift();
      fleet.statusText = '轨道站建设完成';
      return;
    }

    // Pay mineral cost when starting a new station
    if (order.progress === 0) {
      if (!empire || empire.resources.minerals < STATION_MINERAL_COST) {
        fleet.orders.shift();
        fleet.statusText = '矿物不足，建造中止';
        pushAlert(state, {
          kind: 'warning',
          title: '矿物储备不足',
          detail: `建造轨道站需要 ${STATION_MINERAL_COST} 矿物，${fleet.name} 已暂停作业。`,
          systemId: sys.id,
          fleetId: fleet.id,
        });
        return;
      }
      empire.resources.minerals -= STATION_MINERAL_COST;
    }

    order.targetPlanetId = eligiblePlanet.id;
    const px = Math.cos(eligiblePlanet.orbitAngle) * eligiblePlanet.orbitRadius;
    const pz = Math.sin(eligiblePlanet.orbitAngle) * eligiblePlanet.orbitRadius;
    moveFleetLocallyTowards(fleet, px, pz, 3.0);

    order.progress += 11; // ~9 days per station
    const label = isMining ? '开采站' : '科研站';
    fleet.statusText = `建造${label}：${eligiblePlanet.name} (${Math.min(100, Math.round(order.progress))}%)`;

    if (order.progress >= 100) {
      eligiblePlanet.stationType = isMining ? 'mining' : 'research';
      order.progress = 0;
      recalculateEmpireEconomy(state, fleet.ownerId);

      // Check if more eligible planets remain
      const more = sys.planets.some((p) => {
        if (!p.deposit || p.stationType !== 'none') return false;
        return isMining
          ? p.deposit.type !== 'research'
          : p.deposit.type === 'research';
      });
      if (!more) {
        fleet.orders.shift();
        fleet.statusText = '建造完成';
        pushAlert(state, {
          kind: 'success',
          title: `${sys.name} 轨道${label}竣工`,
          detail: `${fleet.name} 已完成 ${sys.name} 的全部${label}建设，月度产出已提升。`,
          systemId: sys.id,
          fleetId: fleet.id,
        });
      }
    }
  }
}

export function advanceOneDay(state: GameStateData): void {
  state.date.totalDays += 1;
  state.date.day += 1;

  // Drop the onboarding research prompt once all three lines are assigned.
  // (Also heals saves created before the alert was dismissible.)
  const playerEmpire = state.empires[state.playerEmpireId];
  if (
    playerEmpire &&
    state.alerts.some((a) => a.id === 'alert_tech_start') &&
    playerEmpire.research.physics.activeTechId &&
    playerEmpire.research.society.activeTechId &&
    playerEmpire.research.engineering.activeTechId
  ) {
    state.alerts = state.alerts.filter((a) => a.id !== 'alert_tech_start');
  }

  let isNewMonth = false;
  if (state.date.day > 30) {
    state.date.day = 1;
    state.date.month += 1;
    isNewMonth = true;
    if (state.date.month > 12) {
      state.date.month = 1;
      state.date.year += 1;
    }
  }

  // Orbit planets gently + advance colonization, terraforming, megastructures & planet build queues
  let economyDirty = false;
  for (const sys of Object.values(state.systems)) {
    // Out-of-combat starbase passive repair
    if (sys.ownerId && sys.starbaseLevel > 0 && !state.battles[sys.id]) {
      syncStarbaseStats(sys);
      if ((sys.starbaseHp ?? 0) < (sys.starbaseMaxHp ?? 0)) {
        sys.starbaseHp = Math.min(sys.starbaseMaxHp!, (sys.starbaseHp ?? 0) + 18);
      }
      if ((sys.siegeProgress ?? 0) > 0) {
        sys.siegeProgress = Math.max(0, (sys.siegeProgress ?? 0) - 5);
      }
    }

    // Advance archaeological site excavation (~55 days total)
    if (sys.archSite && sys.archSite.stage === 'excavating' && sys.ownerId === state.playerEmpireId) {
      sys.archSite.progress += 1.85;
      if (sys.archSite.progress >= 100) {
        sys.archSite.progress = 100;
        sys.archSite.stage = 'completed';
        const player = state.empires[state.playerEmpireId];
        const relic = RELIC_BY_ID[sys.archSite.relicId];
        if (player && relic) {
          if (!player.relics) player.relics = [];
          if (!player.relics.includes(relic.id)) {
            player.relics.push(relic.id);
          }
          economyDirty = true;
          pushAlert(state, {
            kind: 'discovery',
            title: `考古发掘完成：获得圣物「${relic.relicName}」！`,
            detail: `${sys.name} 遗址出土无价帝国圣物（${relic.passiveSummary}），请在「传统 → 圣物库」中查看并激活！`,
            systemId: sys.id,
          });
        }
      }
    }

    // Advance megastructure construction
    if (sys.megastructure && sys.megastructure.stage === 'building') {
      sys.megastructure.progress += 1;
      if (sys.megastructure.progress >= sys.megastructure.totalDays) {
        sys.megastructure.stage = 'completed';
        const mDef = MEGASTRUCTURES[sys.megastructure.type];
        economyDirty = true;

        if (mDef.revealsGalaxy && sys.ownerId === state.playerEmpireId) {
          for (const s of Object.values(state.systems)) {
            s.exploredByPlayer = true;
            s.surveyedByPlayer = true;
            for (const p of s.planets) p.surveyed = true;
          }
        }

        if (sys.ownerId === state.playerEmpireId) {
          pushAlert(state, {
            kind: 'discovery',
            title: `银河巨构竣工：${mDef.name}！`,
            detail: `${sys.name} 的「${mDef.name}」已全面投入运转（${mDef.summary}）！`,
            systemId: sys.id,
          });
        }
      }
    }

    for (const planet of sys.planets) {
      planet.orbitAngle = (planet.orbitAngle + planet.orbitSpeed) % (Math.PI * 2);

      // Planet terraforming timer
      if (planet.terraforming) {
        planet.terraforming.progress += 1;
        if (planet.terraforming.progress >= planet.terraforming.totalDays) {
          const newClass = planet.terraforming.targetClass;
          planet.planetClass = newClass;
          planet.habitable = true;
          planet.terraforming = null;
          economyDirty = true;

          if (sys.ownerId === state.playerEmpireId) {
            pushAlert(state, {
              kind: 'success',
              title: `环境改造完成：${planet.name}`,
              detail: `${planet.name} 已成功重塑为「${PLANET_CLASSES[newClass].name}」（100% 宜居度）！`,
              systemId: sys.id,
              planetId: planet.id,
            });
          }
        }
      }

      // Colonization timer (~90 days)
      if (planet.colonizingProgress !== null && sys.ownerId) {
        planet.colonizingProgress += 1.15;
        if (planet.colonizingProgress >= 100) {
          planet.colonizingProgress = null;
          planet.colonizedBy = sys.ownerId;
          planet.popCount = 2;
          planet.colony = createInitialColony(false);
          economyDirty = true;

          if (sys.ownerId === state.playerEmpireId) {
            sfx.colonize();
            pushAlert(state, {
              kind: 'success',
              title: `殖民地建立：${planet.name}`,
              detail: `${planet.name} 已正式成为帝国新殖民地！点击进入星球面板规划区划与建筑。`,
              systemId: sys.id,
              planetId: planet.id,
            });
          }
        }
      }

      // Colony construction queue
      if (planet.colonizedBy && planet.colony && planet.colony.buildQueue.length > 0) {
        const item = planet.colony.buildQueue[0];
        item.progress += 1;
        if (item.progress >= item.totalDays) {
          planet.colony.buildQueue.shift();
          let builtName = '';
          if (item.kind === 'district') {
            const dKey = item.targetId as keyof typeof DISTRICTS;
            planet.colony.districts[dKey] += 1;
            builtName = DISTRICTS[dKey].name;
          } else {
            const bKey = item.targetId as keyof typeof BUILDINGS;
            planet.colony.buildings.push(bKey);
            builtName = BUILDINGS[bKey].name;
          }
          economyDirty = true;

          if (planet.colonizedBy === state.playerEmpireId) {
            sfx.buildComplete();
            pushAlert(state, {
              kind: 'info',
              title: `建设竣工：${planet.name}`,
              detail: `${planet.name} 已建成「${builtName}」。`,
              systemId: sys.id,
              planetId: planet.id,
            });
          }
        }
      }
    }
  }

  // Step all fleets
  for (const fleet of Object.values(state.fleets)) {
    if (fleet.isHostile || fleet.inCombat) continue;
    stepFleet(state, fleet);
  }

  // Step Galactic Community auto-founding & active vote countdown
  const gc = state.galacticCommunity;
  if (gc) {
    if (!gc.founded) {
      const discoveredNonFallen = Object.values(state.relations).filter(
        (r) => r.discovered && !state.empires[r.empireId]?.isFallenEmpire
      ).length;
      if (discoveredNonFallen >= 2) {
        gc.founded = true;
        pushAlert(state, {
          kind: 'discovery',
          title: '银河共同体议会正式成立！',
          detail: '随着多个星际文明建立接触，全银河议会已召开！打开「外交 → 银河议会」提出并表决星际决议。',
          openDrawer: 'diplomacy',
        });
      }
    } else if (gc.activeProposalId && gc.voteDaysLeft > 0) {
      gc.voteDaysLeft -= 1;
      if (gc.voteDaysLeft <= 0) {
        const resDef = RESOLUTION_BY_ID[gc.activeProposalId];
        let yesWeight = 0;
        let noWeight = 0;
        const pWeight = computeDiplomaticWeight(state, state.playerEmpireId);
        if (gc.playerVote === 'yes') yesWeight += pWeight;
        else if (gc.playerVote === 'no') noWeight += pWeight;

        for (const emp of Object.values(state.empires)) {
          if (emp.isPlayer || emp.isFallenEmpire) continue;
          const rel = state.relations[emp.id];
          if (!rel?.discovered) continue;
          const w = computeDiplomaticWeight(state, emp.id);
          const supports = resDef?.custodianOnly
            ? rel.opinion >= 15 && !rel.atWar
            : rel.opinion >= -35 && !rel.atWar;
          if (supports) yesWeight += w;
          else noWeight += w;
        }

        if (yesWeight >= noWeight && resDef) {
          if (!gc.passedResolutions.includes(resDef.id)) {
            gc.passedResolutions.push(resDef.id);
          }
          if (resDef.custodianOnly) {
            gc.custodianEmpireId = state.playerEmpireId;
          }
          economyDirty = true;
          pushAlert(state, {
            kind: 'success',
            title: `银河决议通过：${resDef.name}`,
            detail: `议会以 ${yesWeight} : ${noWeight} 外交权重通过该决议（${resDef.summary}）！`,
            openDrawer: 'diplomacy',
          });
        } else if (resDef) {
          pushAlert(state, {
            kind: 'warning',
            title: `银河决议遭否决：${resDef.name}`,
            detail: `议会表决未通过（赞成 ${yesWeight} vs 反对 ${noWeight}）。`,
            openDrawer: 'diplomacy',
          });
        }
        gc.activeProposalId = null;
        gc.playerVote = 'abstain';
      }
    }
  }

  // Step starport shipyards, first contacts & real-time system combat
  checkFirstContacts(state, (a) => pushAlert(state, a));
  if (stepShipyardsDaily(state, (a) => pushAlert(state, a))) {
    economyDirty = true;
  }
  if (stepCombatDaily(state, (a) => pushAlert(state, a))) {
    economyDirty = true;
  }

  if (economyDirty) {
    for (const empire of Object.values(state.empires)) {
      recalculateEmpireEconomy(state, empire.id);
    }
  }

  // Monthly economy, pop growth, research, diplomacy, AI & market tick
  if (isNewMonth) {
    stepDiplomacyMonthly(state);
    if (stepAIEmpiresMonthly(state, (a) => pushAlert(state, a))) {
      economyDirty = true;
    }

    // Market prices gently drift back toward base prices
    for (const commodity of Object.keys(BASE_MARKET_PRICES) as MarketCommodity[]) {
      const base = BASE_MARKET_PRICES[commodity];
      const cur = state.market.prices[commodity];
      state.market.prices[commodity] = Number((cur + (base - cur) * 0.12).toFixed(2));
    }

    for (const empire of Object.values(state.empires)) {
      // Advance colony pop growth
      for (const sys of Object.values(state.systems)) {
        if (sys.ownerId !== empire.id) continue;
        for (const planet of sys.planets) {
          if (planet.colonizedBy === empire.id && planet.colony) {
            const { popGrowthRate } = computeColonyEconomy(planet, empire);
            planet.colony.popGrowthProgress += popGrowthRate;
            if (planet.colony.popGrowthProgress >= 100) {
              planet.colony.popGrowthProgress -= 100;
              planet.popCount += 1;
            }
            // Run AI Colony Governor if autoManage is enabled
            if (empire.isPlayer && planet.colony.autoManage) {
              runColonyAutoManage(planet, empire);
            }
          }
        }
      }

      // Scientists gain monthly XP (level up to Lv.5)
      for (const off of empire.officers ?? []) {
        if (off.role === 'scientist' && off.level < 5) {
          off.xp += 10;
          if (off.xp >= 100) {
            off.xp -= 100;
            off.level += 1;
          }
        }
      }

      recalculateEmpireEconomy(state, empire.id);
      for (const key of RESOURCE_KEYS) {
        if (key === 'research') continue; // research is consumed by 3 tech branches below
        empire.resources[key] = Math.max(
          0,
          Number((empire.resources[key] + empire.monthlyNet[key]).toFixed(1))
        );
      }
      if (empire.strategicResources && empire.monthlyStrategicNet) {
        for (const sk of Object.keys(empire.monthlyStrategicNet) as StrategicResourceKey[]) {
          empire.strategicResources[sk] += empire.monthlyStrategicNet[sk];
        }
      }

      const techCompleted = advanceResearchMonthly(state, empire, (a) => pushAlert(state, a));
      if (techCompleted) {
        recalculateEmpireEconomy(state, empire.id);
      }
    }

    // Trigger galactic timeline & leader-exclusive narrative events
    if (!state.activeEvent) {
      const curLeaderId = state.config.leaderId ?? 'une_linlan';
      for (const entry of GALACTIC_TIMELINE_EVENTS) {
        if (entry.leaderFilter && entry.leaderFilter !== curLeaderId) continue;
        const chance = entry.leaderFilter ? 0.65 : 0.35;
        if (
          state.date.year >= entry.minYear &&
          !state.firedEventIds.includes(entry.id) &&
          Math.random() < chance
        ) {
          state.firedEventIds.push(entry.id);
          state.activeEvent = entry.event;
          state.paused = true;
          break;
        }
      }
    }

    // Record yearly Empire Power History on Jan 1
    if (state.date.month === 1) {
      if (!state.history) state.history = [];
      const pScore = computeEmpireScore(state, state.playerEmpireId);
      const pStats = getEmpireStats(state, state.playerEmpireId);
      const pEmp = state.empires[state.playerEmpireId];
      let topAiScore = 0;
      for (const e of Object.values(state.empires)) {
        if (!e.isPlayer && !e.isFallenEmpire) {
          topAiScore = Math.max(topAiScore, computeEmpireScore(state, e.id));
        }
      }
      state.history.push({
        year: state.date.year,
        playerScore: pScore,
        playerPower: pStats.fleetPower,
        playerResearch: Math.round(pEmp?.monthlyIncome.research ?? 0),
        topAiScore,
      });
      if (state.history.length > 40) state.history.shift();
    }

    // Check Endgame Crisis & Victory conditions
    checkCrisisAndVictoryMonthly(state);
  }
}
