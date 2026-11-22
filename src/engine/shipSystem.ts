import {
  Empire,
  EmpireModifiers,
  Fleet,
  GameStateData,
  ShipDesign,
  ShipHullClass,
  ShipInstance,
} from '../types/game';
import {
  getDefenseDef,
  getWeaponDef,
  HULL_CLASSES,
  HULL_ORDER,
} from '../data/ships';
import { findHyperlanePath } from './pathfinding';

export const CIVILIAN_SHIP_ALLOY_COST = 100;
export const CIVILIAN_SHIP_BUILD_DAYS = 22;
export const STARPORT_UPGRADE_ALLOY_COST = 200;

export function createDefaultShipDesigns(): Record<ShipHullClass, ShipDesign> {
  return {
    corvette: {
      hullClass: 'corvette',
      name: '曙光级护卫舰',
      weapons: [...HULL_CLASSES.corvette.defaultWeapons],
      defenses: [...HULL_CLASSES.corvette.defaultDefenses],
    },
    destroyer: {
      hullClass: 'destroyer',
      name: '先驱级驱逐舰',
      weapons: [...HULL_CLASSES.destroyer.defaultWeapons],
      defenses: [...HULL_CLASSES.destroyer.defaultDefenses],
    },
    cruiser: {
      hullClass: 'cruiser',
      name: '星河级巡洋舰',
      weapons: [...HULL_CLASSES.cruiser.defaultWeapons],
      defenses: [...HULL_CLASSES.cruiser.defaultDefenses],
    },
    battleship: {
      hullClass: 'battleship',
      name: '无畏级战列舰',
      weapons: [...HULL_CLASSES.battleship.defaultWeapons],
      defenses: [...HULL_CLASSES.battleship.defaultDefenses],
    },
    titan: {
      hullClass: 'titan',
      name: '启示录级泰坦',
      weapons: [...HULL_CLASSES.titan.defaultWeapons],
      defenses: [...HULL_CLASSES.titan.defaultDefenses],
    },
  };
}

export function isHullUnlocked(empire: Empire, hullClass: ShipHullClass): boolean {
  const req = HULL_CLASSES[hullClass].requiredTech;
  if (!req) return true;
  return empire.completedTechs.includes(req);
}

export interface ComputedShipStats {
  maxHull: number;
  maxShield: number;
  maxArmor: number;
  evasion: number;
  dps: number;
  power: number;
  alloyCost: number;
  buildDays: number;
}

export function computeShipDesignStats(
  design: ShipDesign,
  mods?: EmpireModifiers
): ComputedShipStats {
  const hullDef = HULL_CLASSES[design.hullClass];
  let maxHull = hullDef.baseHull;
  let maxShield = hullDef.baseShield;
  let maxArmor = hullDef.baseArmor;
  let alloyCost = hullDef.baseAlloyCost;
  let dps = 0;

  for (const d of design.defenses) {
    const def = getDefenseDef(d);
    maxHull += def.hullBonus;
    maxShield += def.shieldBonus;
    maxArmor += def.armorBonus;
    alloyCost += def.alloyCost;
  }

  for (const w of design.weapons) {
    const wep = getWeaponDef(w);
    dps += wep.damage;
    alloyCost += wep.alloyCost;
  }

  const hullMult = 1 + (mods?.shipHullBonus ?? 0);
  const shieldMult = 1 + (mods?.shipShieldBonus ?? 0);
  const armorMult = 1 + (mods?.shipArmorBonus ?? 0);
  const wepMult = 1 + (mods?.shipWeaponBonus ?? 0);
  const buildSpeedMult = 1 + (mods?.shipBuildSpeedMult ?? 0);

  maxHull = Math.round(maxHull * hullMult);
  maxShield = Math.round(maxShield * shieldMult);
  maxArmor = Math.round(maxArmor * armorMult);
  dps = Number((dps * wepMult).toFixed(1));
  const evasion = Math.min(0.85, hullDef.evasion + (mods?.shipEvasionBonus ?? 0));
  const buildDays = Math.max(5, Math.round(hullDef.buildDays / buildSpeedMult));

  // Stellaris-style combat power estimate
  const ehp = maxHull + maxShield * 0.9 + maxArmor * 0.95;
  const power = Math.round(Math.sqrt(ehp * Math.max(8, dps)) * 0.65);

  return {
    maxHull,
    maxShield,
    maxArmor,
    evasion,
    dps,
    power,
    alloyCost,
    buildDays,
  };
}

export function createShipInstance(
  design: ShipDesign,
  mods?: EmpireModifiers
): ShipInstance {
  const stats = computeShipDesignStats(design, mods);
  return {
    id: `shp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    hullClass: design.hullClass,
    designName: design.name,
    hull: stats.maxHull,
    maxHull: stats.maxHull,
    shield: stats.maxShield,
    maxShield: stats.maxShield,
    armor: stats.maxArmor,
    maxArmor: stats.maxArmor,
    evasion: stats.evasion,
    weapons: [...design.weapons],
    power: stats.power,
  };
}

export function recalcFleetPower(fleet: Fleet): void {
  if (fleet.shipType !== 'corvette') {
    fleet.power = 0;
    fleet.shipCount = 1;
    return;
  }
  fleet.shipCount = fleet.ships.length;
  fleet.power = fleet.ships.reduce((sum, s) => sum + s.power, 0);
}

export function getShipBuildCostAndDays(
  empire: Empire,
  shipKind: 'science' | 'construction' | ShipHullClass
): { alloyCost: number; buildDays: number; label: string } {
  if (shipKind === 'science') {
    return {
      alloyCost: CIVILIAN_SHIP_ALLOY_COST,
      buildDays: CIVILIAN_SHIP_BUILD_DAYS,
      label: '科研探索舰',
    };
  }
  if (shipKind === 'construction') {
    return {
      alloyCost: CIVILIAN_SHIP_ALLOY_COST,
      buildDays: CIVILIAN_SHIP_BUILD_DAYS,
      label: '深空工程船',
    };
  }
  const design = empire.shipDesigns[shipKind];
  const stats = computeShipDesignStats(design, empire.modifiers);
  return {
    alloyCost: stats.alloyCost,
    buildDays: stats.buildDays,
    label: design.name,
  };
}

export function stepShipyardsDaily(
  state: GameStateData,
  pushAlert: (alert: {
    kind: 'info' | 'success' | 'warning' | 'discovery';
    title: string;
    detail: string;
    systemId?: string;
    fleetId?: string;
  }) => void
): boolean {
  let changed = false;

  for (const sys of Object.values(state.systems)) {
    if (!sys.ownerId || sys.starbaseLevel < 2 || sys.shipyardQueue.length === 0) continue;
    const empire = state.empires[sys.ownerId];
    if (!empire) continue;

    const item = sys.shipyardQueue[0];
    item.progress += 1;
    if (item.progress < item.totalDays) continue;

    sys.shipyardQueue.shift();
    changed = true;

    if (item.shipKind === 'science' || item.shipKind === 'construction') {
      const existingCount = Object.values(state.fleets).filter(
        (f) => f.ownerId === empire.id && f.shipType === item.shipKind
      ).length;
      const id = `flt_${item.shipKind}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const name =
        item.shipKind === 'science'
          ? `UNS 探索号-${existingCount + 1}`
          : `UNS 拓荒者号-${existingCount + 1}`;

      state.fleets[id] = {
        id,
        name,
        ownerId: empire.id,
        shipType: item.shipKind,
        shipCount: 1,
        power: 0,
        ships: [],
        systemId: sys.id,
        localX: (Math.random() - 0.5) * 20,
        localZ: (Math.random() - 0.5) * 20,
        inTransit: false,
        transitFromId: null,
        transitToId: null,
        transitProgress: 0,
        orders: [],
        autoSurvey: false,
        evasive: true,
        statusText: '待命',
      };

      if (empire.isPlayer) {
        pushAlert({
          kind: 'success',
          title: `新舰下水：${name}`,
          detail: `${sys.name} 船坞已建造完成「${name}」，随时可以指派任务。`,
          systemId: sys.id,
          fleetId: id,
        });
      }
    } else {
      const design = empire.shipDesigns[item.shipKind];
      const ship = createShipInstance(design, empire.modifiers);

      // Join an existing military fleet of this empire in the same system, or create a new one
      let targetFleet = Object.values(state.fleets).find(
        (f) =>
          f.ownerId === empire.id &&
          f.shipType === 'corvette' &&
          !f.inTransit &&
          f.systemId === sys.id
      );

      if (!targetFleet) {
        const milCount = Object.values(state.fleets).filter(
          (f) => f.ownerId === empire.id && f.shipType === 'corvette'
        ).length;
        const id = `flt_mil_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        targetFleet = {
          id,
          name: `第${milCount + 1}星际舰队`,
          ownerId: empire.id,
          shipType: 'corvette',
          shipCount: 0,
          power: 0,
          ships: [],
          systemId: sys.id,
          localX: 12,
          localZ: -12,
          inTransit: false,
          transitFromId: null,
          transitToId: null,
          transitProgress: 0,
          orders: [],
          autoSurvey: false,
          statusText: '轨道巡逻',
        };
        state.fleets[id] = targetFleet;
      }

      targetFleet.ships.push(ship);
      recalcFleetPower(targetFleet);

      // Auto-dispatch newly built military ships to Empire Rally Point if set!
      if (
        empire.isPlayer &&
        empire.rallySystemId &&
        empire.rallySystemId !== sys.id &&
        targetFleet.orders.length === 0
      ) {
        const rallyPath = findHyperlanePath(state.systems, sys.id, empire.rallySystemId);
        if (rallyPath && rallyPath.length > 0) {
          targetFleet.orders = [
            { type: 'move', targetSystemId: empire.rallySystemId, path: rallyPath },
          ];
        }
      }

      if (empire.isPlayer) {
        pushAlert({
          kind: 'success',
          title: `战舰服役：${design.name}`,
          detail: `${design.name} 已在 ${sys.name} 船坞建成并编入「${targetFleet.name}」（当前战力 ${targetFleet.power}）。`,
          systemId: sys.id,
          fleetId: targetFleet.id,
        });
      }
    }
  }

  return changed;
}

export function getFleetCompositionSummary(fleet: Fleet): string {
  if (fleet.shipType !== 'corvette') return '';
  const counts: Partial<Record<ShipHullClass, number>> = {};
  for (const s of fleet.ships) {
    counts[s.hullClass] = (counts[s.hullClass] ?? 0) + 1;
  }
  return HULL_ORDER.filter((h) => (counts[h] ?? 0) > 0)
    .map((h) => `${HULL_CLASSES[h].name}x${counts[h]}`)
    .join(' · ');
}
