import {
  Deposit,
  Empire,
  Fleet,
  GalaxyConfig,
  GameStateData,
  Planet,
  PlanetClassId,
  ResourceBreakdownItem,
  ResourceKey,
  ResourcePool,
  StarSystem,
} from '../types/game';
import { STAR_CLASS_LIST, STAR_CLASSES } from '../data/starClasses';
import { HABITABLE_CLASSES, PLANET_CLASSES } from '../data/planetClasses';
import { ANOMALY_NAMES, ROMAN_NUMERALS, STAR_SYSTEM_NAMES } from '../data/names';
import { PRNG } from './prng';
import { recalculateEmpireEconomy } from './simulation';
import { createInitialColony } from './colonySystem';
import { initializeEmpireResearch, recalculateEmpireModifiers } from './techSystem';
import { createDefaultModifiers } from '../data/technologies';
import {
  createDefaultShipDesigns,
  createShipInstance,
  recalcFleetPower,
} from './shipSystem';
import { AI_EMPIRE_PRESETS } from '../data/aiEmpires';
import {
  DiplomaticRelation,
  EmpireModifiers,
  StrategicResourceKey,
  StrategicResourcePool,
} from '../types/game';
import {
  CUSTOM_TRAITS,
  getPlayableEmpireById,
} from '../data/playableEmpires';
import { RELICS } from '../data/relics';
import { LEVIATHANS } from '../data/leviathans';
import { syncStarbaseStats } from './starbaseSystem';

export function createEmptyStrategicPool(): StrategicResourcePool {
  return {
    volatileMotes: 0,
    exoticGases: 0,
    rareCrystals: 0,
    darkMatter: 0,
  };
}

const SYSTEM_COUNTS: Record<GalaxyConfig['size'], number> = {
  small: 32,
  medium: 52,
  large: 76,
};

export function createEmptyResourcePool(): ResourcePool {
  return {
    energy: 0,
    minerals: 0,
    food: 0,
    alloys: 0,
    consumerGoods: 0,
    research: 0,
    unity: 0,
    influence: 0,
  };
}

export function createEmptyBreakdown(): Record<ResourceKey, ResourceBreakdownItem[]> {
  return {
    energy: [],
    minerals: [],
    food: [],
    alloys: [],
    consumerGoods: [],
    research: [],
    unity: [],
    influence: [],
  };
}

function dist2D(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const ccw = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) =>
    (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
  return (
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
  );
}

function generateStarPositions(
  count: number,
  shape: GalaxyConfig['shape'],
  rng: PRNG
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const galaxyRadius = count <= 35 ? 150 : count <= 55 ? 190 : 230;
  const minDist = count <= 35 ? 30 : count <= 55 ? 28 : 26;
  const coreExclusion = 24;

  let attempts = 0;
  while (points.length < count && attempts < count * 80) {
    attempts++;
    let x = 0;
    let y = 0;

    if (shape === 'spiral') {
      const arms = 3;
      const arm = points.length % arms;
      const t = Math.pow(rng.next(), 0.72);
      const r = coreExclusion + t * (galaxyRadius - coreExclusion);
      const armAngle = (arm / arms) * Math.PI * 2;
      const twist = (r / galaxyRadius) * 3.1;
      const spread = rng.range(-0.42, 0.42) * (0.65 + 0.5 * (1 - t));
      const angle = armAngle + twist + spread;
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
    } else if (shape === 'ring') {
      const angle = rng.range(0, Math.PI * 2);
      const r = rng.range(galaxyRadius * 0.48, galaxyRadius * 0.96);
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
    } else {
      // elliptical
      const angle = rng.range(0, Math.PI * 2);
      const r = coreExclusion + Math.sqrt(rng.next()) * (galaxyRadius - coreExclusion);
      x = Math.cos(angle) * r * 1.12;
      y = Math.sin(angle) * r * 0.84;
    }

    const z = rng.range(-7.5, 7.5);
    let tooClose = false;
    for (const p of points) {
      if (dist2D(x, y, p.x, p.y) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      points.push({ x, y, z });
    }
  }

  return points;
}

function generateHyperlanes(
  systems: StarSystem[],
  rng: PRNG,
  density: GalaxyConfig['hyperlaneDensity'] = 'normal'
): void {
  const n = systems.length;
  if (n <= 1) return;

  const edges: Array<[number, number]> = [];
  const hasEdge = (a: number, b: number) =>
    edges.some(([u, v]) => (u === a && v === b) || (u === b && v === a));

  const addEdge = (a: number, b: number) => {
    if (a === b || hasEdge(a, b)) return;
    edges.push([a, b]);
    systems[a].hyperlanes.push(systems[b].id);
    systems[b].hyperlanes.push(systems[a].id);
  };

  // 1. Prim's Minimum Spanning Tree to guarantee 100% connectivity
  const inTree = new Set<number>([0]);
  while (inTree.size < n) {
    let bestA = -1;
    let bestB = -1;
    let bestD = Infinity;
    for (const a of inTree) {
      for (let b = 0; b < n; b++) {
        if (inTree.has(b)) continue;
        const d = dist2D(systems[a].x, systems[a].y, systems[b].x, systems[b].y);
        if (d < bestD) {
          bestD = d;
          bestA = a;
          bestB = b;
        }
      }
    }
    if (bestA !== -1 && bestB !== -1) {
      inTree.add(bestB);
      addEdge(bestA, bestB);
    } else {
      break;
    }
  }

  // 2. Add extra nearby non-crossing edges for tactical loops & choke points
  const candidatePairs: Array<{ a: number; b: number; d: number }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hasEdge(i, j)) continue;
      const d = dist2D(systems[i].x, systems[i].y, systems[j].x, systems[j].y);
      if (d < 78) {
        candidatePairs.push({ a: i, b: j, d });
      }
    }
  }
  candidatePairs.sort((p1, p2) => p1.d - p2.d);

  const extraChance = density === 'sparse' ? 0.2 : density === 'dense' ? 0.78 : 0.48;
  const maxDegree = density === 'sparse' ? 3 : density === 'dense' ? 5 : 4;

  for (const { a, b } of candidatePairs) {
    if (systems[a].hyperlanes.length >= maxDegree || systems[b].hyperlanes.length >= maxDegree) continue;
    if (!rng.chance(extraChance)) continue;

    // Check intersection with existing edges
    let crosses = false;
    for (const [u, v] of edges) {
      if (u === a || u === b || v === a || v === b) continue;
      if (
        segmentsIntersect(
          systems[a].x,
          systems[a].y,
          systems[b].x,
          systems[b].y,
          systems[u].x,
          systems[u].y,
          systems[v].x,
          systems[v].y
        )
      ) {
        crosses = true;
        break;
      }
    }
    if (!crosses) {
      addEdge(a, b);
    }
  }
}

function generatePlanetsForSystem(
  sys: StarSystem,
  rng: PRNG,
  forceHabitable: boolean
): Planet[] {
  const starDef = STAR_CLASSES[sys.starClass];
  const count = rng.int(3, 6);
  const planets: Planet[] = [];
  let hasHabitable = false;

  for (let i = 0; i < count; i++) {
    const orbitRadius = 11 + i * 7.8 + rng.range(-1.1, 1.4);
    const orbitAngle = rng.range(0, Math.PI * 2);
    const orbitSpeed = (0.045 / Math.sqrt(orbitRadius)) * rng.range(0.85, 1.15);

    let planetClass: PlanetClassId;
    const isGoldilocks = i >= 1 && i <= 3;

    if (forceHabitable && i === 2) {
      planetClass = rng.pick(HABITABLE_CLASSES);
      hasHabitable = true;
    } else if (
      !hasHabitable &&
      isGoldilocks &&
      rng.chance(0.16 * starDef.habitableBonus)
    ) {
      planetClass = rng.chance(0.08) ? 'gaia' : rng.pick(HABITABLE_CLASSES);
      hasHabitable = true;
    } else if (i === 0) {
      planetClass = rng.chance(0.55) ? 'molten' : 'barren';
    } else if (i >= count - 2) {
      planetClass = rng.pick(['gas_giant', 'frozen', 'barren', 'asteroid']);
    } else {
      planetClass = rng.pick(['barren', 'toxic', 'gas_giant', 'asteroid', 'frozen']);
    }

    const def = PLANET_CLASSES[planetClass];
    const visualRadius = rng.range(def.minRadius, def.maxRadius);
    const size = def.habitable ? rng.int(12, 23) : rng.int(6, 14);

    // Generate orbital deposit (for non-habitable or even habitable planets)
    let deposit: Deposit | null = null;
    if (!def.habitable && rng.chance(0.58)) {
      if (starDef.researchBias || planetClass === 'toxic' || planetClass === 'gas_giant') {
        deposit = rng.chance(0.55)
          ? { type: 'research', amount: rng.int(2, 4) }
          : { type: 'energy', amount: rng.int(2, 4) };
      } else if (planetClass === 'molten') {
        deposit = rng.chance(0.6)
          ? { type: 'energy', amount: rng.int(2, 4) }
          : { type: 'alloys', amount: rng.int(1, 2) };
      } else {
        deposit = rng.chance(0.65)
          ? { type: 'minerals', amount: rng.int(2, 4) }
          : { type: 'energy', amount: rng.int(2, 3) };
      }
    }

    planets.push({
      id: `${sys.id}_p${i + 1}`,
      systemId: sys.id,
      name: `${sys.name} ${ROMAN_NUMERALS[i] ?? i + 1}`,
      planetClass,
      orbitIndex: i,
      orbitRadius,
      orbitAngle,
      orbitSpeed,
      visualRadius,
      size,
      habitable: def.habitable,
      surveyed: false,
      deposit,
      stationType: 'none',
      colonizedBy: null,
      colonizingProgress: null,
      popCount: 0,
      colony: null,
      hasRings: planetClass === 'gas_giant' && rng.chance(0.55),
      ringColor: planetClass === 'gas_giant' ? '#d6b28a' : undefined,
      textureSeed: rng.int(1, 999999),
    });
  }

  return planets;
}

export function generateGalaxy(config: GalaxyConfig): GameStateData {
  const rng = new PRNG(config.seed);
  const count = SYSTEM_COUNTS[config.size];
  const positions = generateStarPositions(count, config.shape, rng);

  const availableNames = rng.shuffle(STAR_SYSTEM_NAMES.slice(1));
  const systemList: StarSystem[] = positions.map((pos, idx) => {
    const starDef = rng.weightedPick(STAR_CLASS_LIST);
    const id = `sys_${idx}`;
    const name = availableNames[idx] ?? `星域-${idx + 1}`;
    const hasAnomaly = idx > 0 && rng.chance(0.18);
    const hasNebula = rng.chance(0.16);

    let strategicDeposit: { type: StrategicResourceKey; amount: number } | null = null;
    if (starDef.id === 'black_hole' || starDef.id === 'neutron_star') {
      strategicDeposit = { type: 'darkMatter', amount: rng.int(1, 2) };
    } else if (starDef.id === 'pulsar') {
      strategicDeposit = { type: 'rareCrystals', amount: rng.int(1, 2) };
    } else if (hasNebula) {
      strategicDeposit = {
        type: rng.chance(0.5) ? 'exoticGases' : 'volatileMotes',
        amount: rng.int(1, 2),
      };
    } else if (rng.chance(0.14)) {
      strategicDeposit = {
        type: rng.pick(['volatileMotes', 'exoticGases', 'rareCrystals']),
        amount: 1,
      };
    }

    return {
      id,
      name,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      starClass: starDef.id,
      planets: [],
      hyperlanes: [],
      ownerId: null,
      starbaseLevel: 0,
      shipyardQueue: [],
      surveyedByPlayer: false,
      exploredByPlayer: false,
      isHomeworld: false,
      hasNebula,
      strategicDeposit,
      megastructure: null,
      anomalyDiscovered: false,
      anomalyName: hasAnomaly ? rng.pick(ANOMALY_NAMES) : undefined,
    };
  });

  generateHyperlanes(systemList, rng, config.hyperlaneDensity ?? 'normal');

  // Resolve chosen Playable Empire, Leader, and Custom Traits
  const presetEmp = getPlayableEmpireById(config.empirePresetId ?? 'une');
  const chosenLeader =
    presetEmp.leaders.find((l) => l.id === config.leaderId) ?? presetEmp.leaders[0];
  const finalEmpireName = config.customEmpireName?.trim() || presetEmp.name;
  const finalLeaderName = config.customLeaderName?.trim() || chosenLeader.name;
  const finalColor = config.customColor || presetEmp.color;
  const finalHomeworldName = config.customHomeworldName?.trim() || presetEmp.homeworldName;

  const combinedStartingMods: Partial<EmpireModifiers> = {};
  const mergeMods = (m?: Partial<EmpireModifiers>) => {
    if (!m) return;
    for (const [k, v] of Object.entries(m)) {
      const key = k as keyof EmpireModifiers;
      combinedStartingMods[key] = (combinedStartingMods[key] ?? 0) + (v ?? 0);
    }
  };
  mergeMods(presetEmp.baseModifiers);
  mergeMods(chosenLeader.modifiers);

  let initialOpinionDelta = chosenLeader.initialOpinionBonus ?? 0;
  for (const tid of config.selectedTraitIds ?? []) {
    const tr = CUSTOM_TRAITS.find((t) => t.id === tid);
    if (tr) {
      mergeMods(tr.modifiers);
      initialOpinionDelta += tr.initialOpinionBonus ?? 0;
    }
  }

  // Pick a nice outer-mid rim system as player homeworld
  let homeIndex = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < systemList.length; i++) {
    const r = dist2D(systemList[i].x, systemList[i].y, 0, 0);
    const deg = systemList[i].hyperlanes.length;
    // Prefer 2-3 hyperlanes and mid-outer radius
    const score = (deg >= 2 && deg <= 3 ? 50 : 0) - Math.abs(r - 115);
    if (score > bestScore) {
      bestScore = score;
      homeIndex = i;
    }
  }

  const homeSys = systemList[homeIndex];
  homeSys.name = presetEmp.homeSystemName;
  homeSys.starClass = 'class_g';
  homeSys.isHomeworld = true;
  homeSys.ownerId = 'emp_player';
  homeSys.starbaseLevel = 2; // Home Starport
  homeSys.surveyedByPlayer = true;
  homeSys.exploredByPlayer = true;
  homeSys.anomalyName = undefined;

  // Generate planets for all systems
  const systemsById: Record<string, StarSystem> = {};
  for (const sys of systemList) {
    systemsById[sys.id] = sys;
  }

  // Guarantee at least 1 habitable world on an adjacent system for fun early exploration
  const guaranteedNeighbors = new Set(homeSys.hyperlanes.slice(0, 2));

  for (const sys of systemList) {
    if (sys.id === homeSys.id) {
      // Custom Sol-like home system
      sys.planets = [
        {
          id: `${sys.id}_p1`,
          systemId: sys.id,
          name: '水星',
          planetClass: 'molten',
          orbitIndex: 0,
          orbitRadius: 11,
          orbitAngle: 0.6,
          orbitSpeed: 0.015,
          visualRadius: 0.85,
          size: 8,
          habitable: false,
          surveyed: true,
          deposit: { type: 'energy', amount: 3 },
          stationType: 'mining',
          colonizedBy: null,
          colonizingProgress: null,
          popCount: 0,
          colony: null,
          hasRings: false,
          textureSeed: 101,
        },
        {
          id: `${sys.id}_p2`,
          systemId: sys.id,
          name: finalHomeworldName,
          planetClass: 'continental',
          orbitIndex: 1,
          orbitRadius: 18.5,
          orbitAngle: 2.3,
          orbitSpeed: 0.011,
          visualRadius: 1.55,
          size: 20,
          habitable: true,
          surveyed: true,
          deposit: null,
          stationType: 'none',
          colonizedBy: 'emp_player',
          colonizingProgress: null,
          popCount: 16,
          colony: createInitialColony(true),
          hasRings: false,
          textureSeed: 202,
        },
        {
          id: `${sys.id}_p3`,
          systemId: sys.id,
          name: '火星',
          planetClass: 'barren',
          orbitIndex: 2,
          orbitRadius: 26,
          orbitAngle: 4.1,
          orbitSpeed: 0.009,
          visualRadius: 1.1,
          size: 13,
          habitable: false,
          surveyed: true,
          deposit: { type: 'minerals', amount: 3 },
          stationType: 'mining',
          colonizedBy: null,
          colonizingProgress: null,
          popCount: 0,
          colony: null,
          hasRings: false,
          textureSeed: 303,
        },
        {
          id: `${sys.id}_p4`,
          systemId: sys.id,
          name: '木星',
          planetClass: 'gas_giant',
          orbitIndex: 3,
          orbitRadius: 35,
          orbitAngle: 5.2,
          orbitSpeed: 0.006,
          visualRadius: 2.6,
          size: 16,
          habitable: false,
          surveyed: true,
          deposit: { type: 'research', amount: 3 },
          stationType: 'research',
          colonizedBy: null,
          colonizingProgress: null,
          popCount: 0,
          colony: null,
          hasRings: true,
          ringColor: '#d4b483',
          textureSeed: 404,
        },
        {
          id: `${sys.id}_p5`,
          systemId: sys.id,
          name: '土星',
          planetClass: 'gas_giant',
          orbitIndex: 4,
          orbitRadius: 44,
          orbitAngle: 1.1,
          orbitSpeed: 0.0045,
          visualRadius: 2.25,
          size: 14,
          habitable: false,
          surveyed: true,
          deposit: { type: 'energy', amount: 2 },
          stationType: 'none',
          colonizedBy: null,
          colonizingProgress: null,
          popCount: 0,
          colony: null,
          hasRings: true,
          ringColor: '#e2c99b',
          textureSeed: 505,
        },
      ];
    } else {
      sys.planets = generatePlanetsForSystem(sys, rng, guaranteedNeighbors.has(sys.id));
    }
  }

  // Reveal systems adjacent to homeworld as explored (visible, not yet surveyed)
  for (const neighborId of homeSys.hyperlanes) {
    if (systemsById[neighborId]) {
      systemsById[neighborId].exploredByPlayer = true;
    }
  }

  // Create player empire
  const playerEmpire: Empire = {
    id: 'emp_player',
    name: finalEmpireName,
    adjective: presetEmp.adjective,
    color: finalColor,
    secondaryColor: presetEmp.secondaryColor,
    isPlayer: true,
    leaderName: finalLeaderName,
    leaderTitle: chosenLeader.title,
    speciesName: presetEmp.speciesName,
    ethicsLabel: presetEmp.ethicsLabel,
    homeSystemId: homeSys.id,
    startingBonusModifiers: combinedStartingMods,
    deterrenceBonus: chosenLeader.deterrenceBonus ?? 0,
    marketFeeDiscount: presetEmp.marketFeeDiscount ?? 0,
    isMachineEmpire: presetEmp.isMachine ?? false,
    resources: {
      energy: 250 + (chosenLeader.startingEnergy ?? 0),
      minerals: 320,
      food: 180,
      alloys: 220 + (chosenLeader.startingAlloys ?? 0),
      consumerGoods: 160,
      research: 0,
      unity: 120 + (chosenLeader.startingUnity ?? 0),
      influence: 160,
    },
    monthlyIncome: createEmptyResourcePool(),
    monthlyUpkeep: createEmptyResourcePool(),
    monthlyNet: createEmptyResourcePool(),
    incomeDetails: createEmptyBreakdown(),
    upkeepDetails: createEmptyBreakdown(),
    completedTechs: chosenLeader.unlockStartTechId ? [chosenLeader.unlockStartTechId] : [],
    unlockedTraditions: [],
    unlockedAscensions: [],
    activeEdicts: [],
    strategicResources: createEmptyStrategicPool(),
    monthlyStrategicNet: createEmptyStrategicPool(),
    research: {
      physics: { activeTechId: null, progress: 0, options: [] },
      society: { activeTechId: null, progress: 0, options: [] },
      engineering: { activeTechId: null, progress: 0, options: [] },
    },
    modifiers: createDefaultModifiers(),
    shipDesigns: createDefaultShipDesigns(),
  };

  recalculateEmpireModifiers(playerEmpire);
  initializeEmpireResearch(playerEmpire);

  // Create starting fleets in Home System
  const starterCorvetteCount = 3 + (chosenLeader.extraCorvettes ?? 0);
  const starterCorvettes = Array.from({ length: starterCorvetteCount }, () =>
    createShipInstance(playerEmpire.shipDesigns.corvette, playerEmpire.modifiers)
  );

  const fleets: Record<string, Fleet> = {
    flt_science_1: {
      id: 'flt_science_1',
      name: 'UNS 探索号',
      ownerId: 'emp_player',
      shipType: 'science',
      shipCount: 1,
      power: 0,
      ships: [],
      systemId: homeSys.id,
      localX: 15,
      localZ: 10,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '待命',
    },
    flt_constructor_1: {
      id: 'flt_constructor_1',
      name: 'UNS 拓荒者号',
      ownerId: 'emp_player',
      shipType: 'construction',
      shipCount: 1,
      power: 0,
      ships: [],
      systemId: homeSys.id,
      localX: -14,
      localZ: 12,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '待命',
    },
    flt_military_1: {
      id: 'flt_military_1',
      name: '第一星际舰队',
      ownerId: 'emp_player',
      shipType: 'corvette',
      shipCount: starterCorvettes.length,
      power: 0,
      ships: starterCorvettes,
      systemId: homeSys.id,
      localX: 10,
      localZ: -16,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '轨道巡逻',
    },
  };
  recalcFleetPower(fleets.flt_military_1);

  if (chosenLeader.extraScienceShip) {
    fleets.flt_science_2 = {
      id: 'flt_science_2',
      name: 'UNS 自然选择号',
      ownerId: 'emp_player',
      shipType: 'science',
      shipCount: 1,
      power: 0,
      ships: [],
      systemId: homeSys.id,
      localX: -12,
      localZ: -14,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '待命',
    };
  }

  // Spawn AI Empires well-spaced around the galaxy
  const empires: Record<string, Empire> = {
    emp_player: playerEmpire,
  };
  const relations: Record<string, DiplomaticRelation> = {};
  const defaultAiCount = config.size === 'small' ? 3 : config.size === 'medium' ? 4 : 5;
  const aiCount = config.aiCount ?? defaultAiCount;
  const chosenHomeIds = new Set<string>([homeSys.id, ...homeSys.hyperlanes]);
  const nonDuplicatePresets = AI_EMPIRE_PRESETS.filter(
    (p) => p.name !== finalEmpireName && p.adjective !== presetEmp.adjective
  );
  const shuffledPresets = rng.shuffle(nonDuplicatePresets).slice(0, aiCount);

  for (const preset of shuffledPresets) {
    // Pick the system farthest from all already-placed empire homeworlds
    let bestSys: StarSystem | null = null;
    let bestMinDist = -1;
    for (const candidate of systemList) {
      if (chosenHomeIds.has(candidate.id) || candidate.ownerId !== null) continue;
      let minD = Infinity;
      for (const emp of Object.values(empires)) {
        const hs = systemsById[emp.homeSystemId];
        if (!hs) continue;
        const d = dist2D(candidate.x, candidate.y, hs.x, hs.y);
        if (d < minD) minD = d;
      }
      if (minD > bestMinDist) {
        bestMinDist = minD;
        bestSys = candidate;
      }
    }

    if (!bestSys) continue;
    chosenHomeIds.add(bestSys.id);
    for (const n of bestSys.hyperlanes) chosenHomeIds.add(n);

    bestSys.ownerId = preset.id;
    bestSys.starbaseLevel = 2;
    bestSys.isHomeworld = true;

    // Ensure a habitable homeworld planet in AI capital
    let aiHomePlanet = bestSys.planets.find((p) => p.habitable);
    if (!aiHomePlanet && bestSys.planets.length > 0) {
      aiHomePlanet = bestSys.planets[Math.min(1, bestSys.planets.length - 1)];
      aiHomePlanet.habitable = true;
      aiHomePlanet.planetClass = 'continental';
      aiHomePlanet.size = 18;
    }
    if (aiHomePlanet) {
      aiHomePlanet.colonizedBy = preset.id;
      aiHomePlanet.popCount = 14;
      aiHomePlanet.colony = createInitialColony(true);
    }

    const aiEmpire: Empire = {
      id: preset.id,
      name: preset.name,
      adjective: preset.adjective,
      color: preset.color,
      secondaryColor: preset.secondaryColor,
      isPlayer: false,
      personality: preset.personality,
      ethicsLabel: preset.ethicsLabel,
      greeting: preset.greeting,
      homeSystemId: bestSys.id,
      resources: {
        energy: 250,
        minerals: 300,
        food: 180,
        alloys: 200,
        consumerGoods: 150,
        research: 0,
        unity: 100,
        influence: 140,
      },
      monthlyIncome: createEmptyResourcePool(),
      monthlyUpkeep: createEmptyResourcePool(),
      monthlyNet: createEmptyResourcePool(),
      incomeDetails: createEmptyBreakdown(),
      upkeepDetails: createEmptyBreakdown(),
      completedTechs: [],
      unlockedTraditions: [],
      unlockedAscensions: [],
      research: {
        physics: { activeTechId: null, progress: 0, options: [] },
        society: { activeTechId: null, progress: 0, options: [] },
        engineering: { activeTechId: null, progress: 0, options: [] },
      },
      modifiers: createDefaultModifiers(),
      shipDesigns: createDefaultShipDesigns(),
    };
    initializeEmpireResearch(aiEmpire);
    empires[preset.id] = aiEmpire;

    relations[preset.id] = {
      empireId: preset.id,
      discovered: false,
      opinion: Math.max(-100, Math.min(100, preset.baseOpinion + initialOpinionDelta)),
      nonAggression: false,
      researchPact: false,
      commercialPact: false,
      atWar: false,
      warStartedDay: 0,
      playerWarExhaustion: 0,
      aiWarExhaustion: 0,
    };

    // Starting AI Fleet
    const aiShips = [
      createShipInstance(aiEmpire.shipDesigns.corvette),
      createShipInstance(aiEmpire.shipDesigns.corvette),
      createShipInstance(aiEmpire.shipDesigns.corvette),
    ];
    const aiFleetId = `flt_${preset.id}_main`;
    const aiFleet: Fleet = {
      id: aiFleetId,
      name: `${preset.adjective}主力舰队`,
      ownerId: preset.id,
      shipType: 'corvette',
      shipCount: aiShips.length,
      power: 0,
      ships: aiShips,
      systemId: bestSys.id,
      localX: 12,
      localZ: -12,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '边境巡逻',
    };
    recalcFleetPower(aiFleet);
    fleets[aiFleetId] = aiFleet;
  }

  // Spawn 1 Ancient Fallen Empire ("阿卡迪亚古代守望者") if aiCount >= 2
  if (aiCount >= 2) {
    let feSys: StarSystem | null = null;
    let bestD = -1;
    for (const cand of systemList) {
      if (chosenHomeIds.has(cand.id) || cand.ownerId !== null) continue;
      let minD = Infinity;
      for (const emp of Object.values(empires)) {
        const hs = systemsById[emp.homeSystemId];
        if (!hs) continue;
        minD = Math.min(minD, dist2D(cand.x, cand.y, hs.x, hs.y));
      }
      if (minD > bestD) {
        bestD = minD;
        feSys = cand;
      }
    }
    if (feSys) {
      chosenHomeIds.add(feSys.id);
      feSys.ownerId = 'emp_fallen';
      feSys.starbaseLevel = 4;
      feSys.defensePlatforms = 4;
      feSys.strategicDeposit = { type: 'darkMatter', amount: 3 };
      syncStarbaseStats(feSys, true);
      const fePlanet = feSys.planets[0];
      if (fePlanet) {
        fePlanet.planetClass = 'gaia';
        fePlanet.habitable = true;
        fePlanet.size = 24;
        fePlanet.colonizedBy = 'emp_fallen';
        fePlanet.popCount = 26;
        fePlanet.colony = createInitialColony(true);
      }

      const feEmpire: Empire = {
        id: 'emp_fallen',
        name: '阿卡迪亚古代守望者',
        adjective: '守望者',
        color: '#e2e8f0',
        secondaryColor: '#94a3b8',
        isPlayer: false,
        isFallenEmpire: true,
        awakened: false,
        personality: 'erudite_explorers',
        ethicsLabel: '失落帝国 · 远古知识看护者',
        greeting: '年轻的星海旅人，你们的科技在我们眼中不过是孩童的积木。保持敬畏，切勿越界。',
        homeSystemId: feSys.id,
        resources: {
          energy: 2000,
          minerals: 2000,
          food: 1000,
          alloys: 2000,
          consumerGoods: 1000,
          research: 0,
          unity: 1000,
          influence: 500,
        },
        monthlyIncome: createEmptyResourcePool(),
        monthlyUpkeep: createEmptyResourcePool(),
        monthlyNet: createEmptyResourcePool(),
        incomeDetails: createEmptyBreakdown(),
        upkeepDetails: createEmptyBreakdown(),
        completedTechs: ['eng_titans', 'phy_tachyon_lance', 'phy_dark_matter_shields'],
        unlockedTraditions: [],
        unlockedAscensions: [],
        research: {
          physics: { activeTechId: null, progress: 0, options: [] },
          society: { activeTechId: null, progress: 0, options: [] },
          engineering: { activeTechId: null, progress: 0, options: [] },
        },
        modifiers: createDefaultModifiers(),
        shipDesigns: createDefaultShipDesigns(),
      };
      empires.emp_fallen = feEmpire;
      relations.emp_fallen = {
        empireId: 'emp_fallen',
        discovered: false,
        opinion: 0,
        nonAggression: false,
        researchPact: false,
        commercialPact: false,
        atWar: false,
        warStartedDay: 0,
        playerWarExhaustion: 0,
        aiWarExhaustion: 0,
      };

      const feShips = [
        createShipInstance({
          hullClass: 'titan',
          name: '守望者远古泰坦',
          weapons: ['tachyon_lance', 'tachyon_lance', 'kinetic_5', 'kinetic_5', 'missile_5', 'arc_emitter'],
          defenses: ['shield_dark_matter', 'shield_dark_matter', 'shield_dark_matter', 'armor_5', 'armor_5', 'hull_3'],
        }),
        createShipInstance({
          hullClass: 'battleship',
          name: '守望者圣殿战列舰',
          weapons: ['tachyon_lance', 'kinetic_5', 'laser_5', 'missile_5'],
          defenses: ['shield_dark_matter', 'shield_dark_matter', 'armor_5', 'armor_5'],
        }),
      ];
      const feFleet: Fleet = {
        id: 'flt_fallen_guard',
        name: '远古守护者无畏舰队',
        ownerId: 'emp_fallen',
        shipType: 'corvette',
        shipCount: feShips.length,
        power: 0,
        ships: feShips,
        systemId: feSys.id,
        localX: -14,
        localZ: -14,
        inTransit: false,
        transitFromId: null,
        transitToId: null,
        transitProgress: 0,
        orders: [],
        autoSurvey: false,
        statusText: '沉睡守望',
      };
      recalcFleetPower(feFleet);
      fleets[feFleet.id] = feFleet;
    }
  }

  // Spawn 5 Ancient Archaeological Sites across unowned systems
  const siteCandidates = rng.shuffle(
    systemList.filter((s) => s.ownerId === null && s.id !== homeSys.id)
  );
  RELICS.forEach((relic, idx) => {
    const target = siteCandidates[idx];
    if (target) {
      target.archSite = {
        relicId: relic.id,
        siteName: relic.siteName,
        stage: 'undiscovered',
        progress: 0,
      };
    }
  });

  // Spawn hostile Space Pirates / Ancient Drones in non-adjacent unowned systems
  const excludedForHostiles = new Set<string>(chosenHomeIds);
  const hostileCandidates = rng.shuffle(
    systemList.filter((s) => !excludedForHostiles.has(s.id) && s.ownerId === null)
  );
  const hostileCount = Math.min(hostileCandidates.length, config.size === 'small' ? 4 : 6);
  const pirateNames = [
    '血帆星际海盗',
    '远古采矿无人机',
    '虚空掠夺者分队',
    '遗迹守卫舰群',
    '暗星劫掠团',
    '自律巡逻矩阵',
  ];

  for (let i = 0; i < hostileCount; i++) {
    const hSys = hostileCandidates[i];
    const isStrong = i >= Math.ceil(hostileCount / 2);
    const hostileShips = [];
    const corvCount = isStrong ? rng.int(3, 5) : rng.int(2, 3);
    for (let c = 0; c < corvCount; c++) {
      hostileShips.push(
        createShipInstance({
          hullClass: 'corvette',
          name: '海盗突击艇',
          weapons: [rng.chance(0.5) ? 'kinetic' : 'laser'],
          defenses: [rng.chance(0.5) ? 'armor' : 'shield'],
        })
      );
    }
    if (isStrong) {
      hostileShips.push(
        createShipInstance({
          hullClass: 'destroyer',
          name: '掠夺者炮舰',
          weapons: ['kinetic', 'missile'],
          defenses: ['armor', 'shield'],
        })
      );
    }

    const hId = `flt_hostile_${i + 1}`;
    const hFleet: Fleet = {
      id: hId,
      name: pirateNames[i % pirateNames.length],
      ownerId: 'emp_hostile',
      shipType: 'corvette',
      shipCount: hostileShips.length,
      power: 0,
      ships: hostileShips,
      isHostile: true,
      systemId: hSys.id,
      localX: 14,
      localZ: 8,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '盘踞星系',
    };
    recalcFleetPower(hFleet);
    fleets[hId] = hFleet;
  }

  // Spawn 2 Ancient Space Leviathans in unclaimed distant systems with rich deposits
  const leviathanCandidates = systemList
    .filter(
      (s) =>
        s.ownerId === null &&
        !Object.values(fleets).some((f) => f.systemId === s.id)
    )
    .sort((a, b) => {
      const da = Math.hypot(a.x - homeSys.x, a.y - homeSys.y);
      const db = Math.hypot(b.x - homeSys.x, b.y - homeSys.y);
      return db - da;
    });
  const shuffledLevs = [...LEVIATHANS].sort(() => rng.next() - 0.5).slice(0, 2);
  for (let i = 0; i < Math.min(shuffledLevs.length, leviathanCandidates.length); i++) {
    const lev = shuffledLevs[i];
    const targetSys = leviathanCandidates[i];
    // Guarantee a rich dark matter strategic deposit in the Leviathan's lair
    targetSys.strategicDeposit = { type: 'darkMatter', amount: 3 };
    const ships = lev.ships.map((design) => createShipInstance(design));
    const fId = `flt_leviathan_${i + 1}`;
    const levFleet: Fleet = {
      id: fId,
      name: lev.fleetName,
      ownerId: 'emp_hostile',
      shipType: 'corvette',
      shipCount: ships.length,
      power: 0,
      ships,
      isHostile: true,
      leviathanId: lev.id,
      systemId: targetSys.id,
      localX: 16,
      localZ: -12,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: `远古利维坦：${lev.title}`,
    };
    recalcFleetPower(levFleet);
    fleets[fId] = levFleet;
  }

  // Spawn 2 Neutral Space Enclaves (Curator Order & Merchant Guild) in safe unclaimed systems
  const enclaveCandidates = systemList.filter(
    (s) =>
      s.ownerId === null &&
      !s.archSite &&
      !Object.values(fleets).some((f) => f.systemId === s.id)
  );
  if (enclaveCandidates.length >= 2) {
    const midA = enclaveCandidates[Math.floor(enclaveCandidates.length * 0.35)];
    const midB = enclaveCandidates[Math.floor(enclaveCandidates.length * 0.7)];
    midA.enclave = { type: 'curator', name: '策展人学者飞地「真理之眼」' };
    midB.enclave = { type: 'trader', name: '星际商人工会「黄金环站」' };
  }

  // Default evasive stance for player civilian ships
  if (fleets.flt_science_1) fleets.flt_science_1.evasive = true;
  if (fleets.flt_constructor_1) fleets.flt_constructor_1.evasive = true;

  const state: GameStateData = {
    config,
    date: {
      year: 2200,
      month: 1,
      day: 1,
      totalDays: 0,
    },
    paused: true,
    speed: 2,
    systems: systemsById,
    systemOrder: systemList.map((s) => s.id),
    empires,
    playerEmpireId: 'emp_player',
    fleets,
    battles: {},
    lastBattleReport: null,
    relations,
    market: {
      prices: {
        minerals: 1.0,
        food: 1.0,
        consumerGoods: 2.0,
        alloys: 4.0,
      },
    },
    activeEvent: null,
    firedEventIds: [],
    crisis: {
      triggered: false,
      defeated: false,
      portalSystemId: null,
      startedYear: 0,
    },
    victory: null,
    galacticCommunity: {
      founded: false,
      custodianEmpireId: null,
      passedResolutions: [],
      activeProposalId: null,
      voteDaysLeft: 0,
      playerVote: 'abstain',
    },
    history: [
      {
        year: 2200,
        playerScore: 480,
        playerPower: fleets.flt_military_1.power,
        playerResearch: 24,
        topAiScore: 450,
      },
    ],
    alerts: [
      {
        id: 'alert_tech_start',
        kind: 'discovery',
        title: '三线科技研发待指派',
        detail: '物理、社会与工程三条科研线均已就绪，点击打开科技树选择首批研究项目！',
        openDrawer: 'tech',
        day: 0,
      },
      {
        id: 'alert_welcome',
        kind: 'info',
        title: '星海纪元开启（2200.01.01）',
        detail: '选中科研船「UNS 探索号」探索周围星系，发现宜居星球后建造前哨站即可殖民！',
        systemId: homeSys.id,
        fleetId: 'flt_science_1',
        day: 0,
      },
    ],
  };

  for (const empId of Object.keys(state.empires)) {
    recalculateEmpireEconomy(state, empId);
  }
  return state;
}
