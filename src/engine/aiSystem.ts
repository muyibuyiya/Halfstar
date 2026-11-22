import { Fleet, GameStateData } from '../types/game';
import { getPresetByPersonality } from '../data/aiEmpires';
import { createInitialColony } from './colonySystem';
import { createShipInstance, recalcFleetPower } from './shipSystem';
import { findHyperlanePath } from './pathfinding';
import { getEmpireStats } from './diplomacySystem';
import { DIFFICULTIES } from '../data/playableEmpires';

export function stepAIEmpiresMonthly(
  state: GameStateData,
  pushAlert: (alert: {
    kind: 'info' | 'success' | 'warning' | 'discovery';
    title: string;
    detail: string;
    systemId?: string;
    openDrawer?: 'diplomacy';
  }) => void
): boolean {
  let economyDirty = false;
  const playerStats = getEmpireStats(state, state.playerEmpireId);
  const playerEmpire = state.empires[state.playerEmpireId];
  const diff = DIFFICULTIES[state.config.difficulty ?? 'ensign'];
  const deterrence = playerEmpire?.deterrenceBonus ?? 0;

  for (const empire of Object.values(state.empires)) {
    if (empire.isPlayer) continue;
    // Dormant Fallen Empires stay aloof unless awakened or actively at war
    const rel = state.relations[empire.id];
    if (empire.isFallenEmpire && !empire.awakened && !rel?.atWar) {
      // Mid-game Awakening check around Year 2212
      if (state.date.year >= 2212 && Math.random() < 0.08) {
        empire.awakened = true;
        if (rel) rel.discovered = true;
        pushAlert({
          kind: 'warning',
          title: `远古觉醒：${empire.name} 苏醒！`,
          detail: `沉睡万年的失落帝国「${empire.name}」重启了远古泰坦舰队，正式重返银河争霸舞台！`,
          systemId: empire.homeSystemId,
          openDrawer: 'diplomacy',
        });
      }
      continue;
    }

    const ownedSystems = Object.values(state.systems).filter((s) => s.ownerId === empire.id);
    if (ownedSystems.length === 0) continue; // Empire eliminated

    const preset = getPresetByPersonality(empire.personality);

    // 1. Expand to an adjacent unowned system (if enough Alloys & Influence)
    if (empire.resources.alloys >= 120 && empire.resources.influence >= 75 && ownedSystems.length < 10) {
      const candidateNeighbors: string[] = [];
      for (const sys of ownedSystems) {
        for (const nId of sys.hyperlanes) {
          const nSys = state.systems[nId];
          if (nSys && nSys.ownerId === null) {
            // Avoid claiming a system guarded by hostiles
            const hasHostile = Object.values(state.fleets).some(
              (f) => f.isHostile && f.systemId === nId
            );
            if (!hasHostile) candidateNeighbors.push(nId);
          }
        }
      }

      if (candidateNeighbors.length > 0 && Math.random() < 0.45) {
        const pickId = candidateNeighbors[Math.floor(Math.random() * candidateNeighbors.length)];
        const target = state.systems[pickId];
        empire.resources.alloys -= 100;
        empire.resources.influence -= 75;
        target.ownerId = empire.id;
        target.starbaseLevel = 1;
        // Build orbital stations automatically on rich deposits
        for (const p of target.planets) {
          if (p.deposit && p.stationType === 'none' && empire.resources.minerals >= 100) {
            empire.resources.minerals -= 100;
            p.stationType = p.deposit.type === 'research' ? 'research' : 'mining';
          }
        }
        economyDirty = true;
      }
    }

    // 2. Colonize habitable planets inside AI territory
    if (empire.resources.alloys >= 160 && empire.resources.food >= 120) {
      for (const sys of ownedSystems) {
        const hab = sys.planets.find(
          (p) => p.habitable && !p.colonizedBy && p.colonizingProgress === null
        );
        if (hab) {
          empire.resources.alloys -= 150;
          empire.resources.food -= 120;
          hab.colonizedBy = empire.id;
          hab.popCount = 3;
          hab.colony = createInitialColony(false);
          economyDirty = true;
          break;
        }
      }
    }

    // 3. Build / reinforce AI military fleet at homeworld
    let aiFleet = Object.values(state.fleets).find(
      (f) => f.ownerId === empire.id && f.shipType === 'corvette'
    );
    const maxDesiredShips = Math.min(10, 3 + ownedSystems.length);
    if (empire.resources.alloys >= 120 && (!aiFleet || aiFleet.ships.length < maxDesiredShips)) {
      const hull = empire.resources.alloys >= 260 && Math.random() < 0.35 ? 'destroyer' : 'corvette';
      const cost = hull === 'destroyer' ? 165 : 85;
      if (empire.resources.alloys >= cost) {
        empire.resources.alloys -= cost;
        const newShip = createShipInstance(empire.shipDesigns[hull], empire.modifiers);
        if (!aiFleet) {
          const spawnSysId = state.systems[empire.homeSystemId]?.ownerId === empire.id
            ? empire.homeSystemId
            : ownedSystems[0].id;
          const fId = `flt_${empire.id}_main`;
          aiFleet = {
            id: fId,
            name: `${empire.adjective}主力舰队`,
            ownerId: empire.id,
            shipType: 'corvette',
            shipCount: 1,
            power: 0,
            ships: [newShip],
            systemId: spawnSysId,
            localX: 12,
            localZ: -10,
            inTransit: false,
            transitFromId: null,
            transitToId: null,
            transitProgress: 0,
            orders: [],
            autoSurvey: false,
            statusText: '边境巡逻',
          };
          state.fleets[fId] = aiFleet;
        } else if (!aiFleet.inCombat) {
          aiFleet.ships.push(newShip);
        }
        recalcFleetPower(aiFleet);
        economyDirty = true;
      }
    }

    // 4. Aggressive AI war declaration check (after Year 2203, scaled by Difficulty & Dark Forest Deterrence)
    const effectiveAggression = (preset?.aggression ?? 0.2) + diff.aiAggressionBonus;
    const warChance = 0.08 * Math.max(0.05, 1 - deterrence);
    if (
      rel &&
      rel.discovered &&
      !rel.atWar &&
      !rel.nonAggression &&
      state.date.year >= 2203 &&
      effectiveAggression >= 0.6 &&
      rel.opinion <= -45 &&
      aiFleet &&
      aiFleet.power > playerStats.fleetPower * (1.15 + deterrence * 0.6) &&
      Math.random() < warChance
    ) {
      rel.atWar = true;
      rel.warStartedDay = state.date.totalDays;
      rel.playerWarExhaustion = 0;
      rel.aiWarExhaustion = 0;
      rel.researchPact = false;
      rel.commercialPact = false;
      pushAlert({
        kind: 'warning',
        title: `敌国宣战：${empire.name}！`,
        detail: `${empire.name} 撕毁和平向我方宣战！请立即调集主力舰队防守边疆星系。`,
        systemId: empire.homeSystemId,
        openDrawer: 'diplomacy',
      });
    }

    // 5. Wartime fleet movement: send AI fleet toward nearest player system
    if (rel?.atWar && aiFleet && !aiFleet.inCombat && !aiFleet.inTransit && aiFleet.orders.length === 0) {
      const playerSystems = Object.values(state.systems).filter(
        (s) => s.ownerId === state.playerEmpireId
      );
      let bestPath: string[] | null = null;
      let bestTargetId: string | null = null;
      for (const ps of playerSystems) {
        const path = findHyperlanePath(state.systems, aiFleet.systemId, ps.id);
        if (path && path.length > 0 && (!bestPath || path.length < bestPath.length)) {
          bestPath = path;
          bestTargetId = ps.id;
        }
      }
      if (bestPath && bestTargetId) {
        aiFleet.orders = [{ type: 'move', targetSystemId: bestTargetId, path: bestPath }];
      }
    }

    // 6. Living Galaxy: AI-vs-AI dynamic border skirmishes (after Year 2204)
    if (
      !empire.isFallenEmpire &&
      state.date.year >= 2204 &&
      effectiveAggression >= 0.4 &&
      Math.random() < 0.05
    ) {
      const borderEnemySystems: { sysId: string; ownerId: string }[] = [];
      for (const sys of ownedSystems) {
        for (const nId of sys.hyperlanes) {
          const nSys = state.systems[nId];
          if (
            nSys &&
            nSys.ownerId &&
            nSys.ownerId !== empire.id &&
            nSys.ownerId !== state.playerEmpireId &&
            !state.empires[nSys.ownerId]?.isFallenEmpire &&
            nSys.id !== state.empires[nSys.ownerId]?.homeSystemId
          ) {
            borderEnemySystems.push({ sysId: nSys.id, ownerId: nSys.ownerId });
          }
        }
      }
      if (borderEnemySystems.length > 0) {
        const pick = borderEnemySystems[Math.floor(Math.random() * borderEnemySystems.length)];
        const defender = state.empires[pick.ownerId];
        const targetSys = state.systems[pick.sysId];
        const atkStats = getEmpireStats(state, empire.id);
        const defStats = getEmpireStats(state, pick.ownerId);
        if (defender && targetSys && atkStats.fleetPower >= defStats.fleetPower * 0.9) {
          targetSys.ownerId = empire.id;
          targetSys.starbaseLevel = Math.max(1, targetSys.starbaseLevel) as 1 | 2 | 3 | 4;
          for (const p of targetSys.planets) {
            if (p.colonizedBy === defender.id) {
              p.colonizedBy = empire.id;
            }
          }
          economyDirty = true;
          pushAlert({
            kind: 'info',
            title: `银河动态播报：${empire.name} 攻占「${targetSys.name}」`,
            detail: `${empire.name} 在边境星战中击败了 ${defender.name}，夺取了「${targetSys.name}」星系的控制权，银河版图发生变动！`,
            systemId: targetSys.id,
            openDrawer: 'diplomacy',
          });
        }
      }
    }
  }

  return economyDirty;
}
