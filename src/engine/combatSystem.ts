import {
  ActiveBattle,
  CombatShotVfx,
  Fleet,
  GameStateData,
  ShipInstance,
} from '../types/game';
import { getWeaponDef } from '../data/ships';
import { recalcFleetPower } from './shipSystem';
import { areEmpiresAtWar } from './diplomacySystem';
import { getStarbaseDps, syncStarbaseStats } from './starbaseSystem';
import { getOfficerLevelMult } from '../data/leaders';
import { LEVIATHAN_BY_ID } from '../data/leviathans';
import { ResourceKey, StrategicResourceKey } from '../types/game';
import { sfx } from './sfx';

function applyWeaponHit(
  target: ShipInstance,
  baseDamage: number,
  wepId: string,
  weaponBonus: number
): boolean {
  const wep = getWeaponDef(wepId);
  // Evasion check
  if (Math.random() < target.evasion * 0.65) {
    return false;
  }

  // The shot was actually fired -> play the matching weapon cue.
  // Rate limiting lives in the SFX engine (combat resolves many weapons per tick).
  if (wep.family === 'laser') sfx.laserFire();
  else if (wep.family === 'kinetic') sfx.kineticFire();
  else if (wep.family === 'missile') sfx.missileLaunch();

  let remaining = baseDamage * (1 + weaponBonus);

  // 1. Shield layer (unless weapon ignores shields like missiles)
  if (!wep.ignoreShield && target.shield > 0 && remaining > 0) {
    const effDmg = remaining * wep.vsShield;
    if (effDmg >= target.shield) {
      remaining -= target.shield / wep.vsShield;
      target.shield = 0;
    } else {
      target.shield -= effDmg;
      remaining = 0;
    }
  }

  // 2. Armor layer
  if (target.armor > 0 && remaining > 0) {
    const effDmg = remaining * wep.vsArmor;
    if (effDmg >= target.armor) {
      remaining -= target.armor / wep.vsArmor;
      target.armor = 0;
    } else {
      target.armor -= effDmg;
      remaining = 0;
    }
  }

  // 3. Hull layer
  if (remaining > 0) {
    target.hull = Math.max(0, target.hull - remaining * wep.vsHull);
  }

  const destroyed = target.hull <= 0;
  if (destroyed) sfx.shipExplode();
  return destroyed;
}

export function stepCombatDaily(
  state: GameStateData,
  pushAlert: (alert: {
    kind: 'info' | 'success' | 'warning' | 'discovery';
    title: string;
    detail: string;
    systemId?: string;
    fleetId?: string;
  }) => void
): boolean {
  let economyDirty = false;

  // Reset inCombat flags before scanning
  for (const f of Object.values(state.fleets)) {
    f.inCombat = false;
  }

  // Group non-transit military fleets by system
  const fleetsBySystem = new Map<string, Fleet[]>();
  for (const f of Object.values(state.fleets)) {
    if (f.inTransit || f.shipType !== 'corvette' || f.ships.length === 0) continue;
    const arr = fleetsBySystem.get(f.systemId) ?? [];
    arr.push(f);
    fleetsBySystem.set(f.systemId, arr);
  }

  // Detect & process battles per system
  for (const [sysId, sysFleets] of fleetsBySystem.entries()) {
    const playerFleets = sysFleets.filter((f) => !f.isHostile && f.ownerId === state.playerEmpireId);
    const hostileFleets = sysFleets.filter(
      (f) => f.isHostile || areEmpiresAtWar(state, state.playerEmpireId, f.ownerId)
    );

    // Starbase combat & Colony siege check when uncontested by enemy fleets
    const sys = state.systems[sysId];
    if (sys && playerFleets.length > 0 && hostileFleets.length === 0) {
      if (sys.ownerId && sys.ownerId !== state.playerEmpireId && areEmpiresAtWar(state, state.playerEmpireId, sys.ownerId)) {
        syncStarbaseStats(sys);
        // 1. Must first destroy the enemy Starbase!
        if (sys.starbaseLevel > 0 && (sys.starbaseHp ?? 0) > 0) {
          const totalPlayerDps = playerFleets.reduce(
            (sum, f) =>
              sum + f.ships.reduce((s2, sh) => s2 + sh.weapons.reduce((w2, w) => w2 + getWeaponDef(w).damage, 0), 0),
            0
          );
          sys.starbaseHp = Math.max(0, (sys.starbaseHp ?? 0) - Math.max(25, totalPlayerDps));

          // Starbase fires back at attacking player fleet!
          const sbDps = getStarbaseDps(sys);
          const victimFleet = playerFleets[0];
          if (victimFleet && victimFleet.ships.length > 0 && sbDps > 0) {
            victimFleet.inCombat = true;
            victimFleet.statusText = `强攻敌方星堡 (${Math.round(sys.starbaseHp)} HP)`;
            const targetShip = victimFleet.ships[Math.floor(Math.random() * victimFleet.ships.length)];
            const destroyed = applyWeaponHit(targetShip, sbDps * 0.45, 'laser_3', 0);
            if (destroyed) {
              victimFleet.ships = victimFleet.ships.filter((s) => s.hull > 0);
              recalcFleetPower(victimFleet);
              if (victimFleet.ships.length === 0) delete state.fleets[victimFleet.id];
            }
          }
          continue;
        }

        // 2. If enemy has a colony here, require short orbital bombardment siege!
        const hasEnemyColony = sys.planets.some((p) => p.colonizedBy === sys.ownerId);
        if (hasEnemyColony) {
          sys.siegeProgress = (sys.siegeProgress ?? 0) + 9; // ~11 days siege
          playerFleets[0].statusText = `轨道轰炸与登陆 (${Math.min(100, Math.round(sys.siegeProgress))}%)`;
          if (sys.siegeProgress < 100) continue;
        }

        const oldOwner = state.empires[sys.ownerId];
        const rel = state.relations[sys.ownerId];
        sys.ownerId = state.playerEmpireId;
        sys.siegeProgress = 0;
        syncStarbaseStats(sys, true);
        sys.surveyedByPlayer = true;
        sys.exploredByPlayer = true;
        for (const p of sys.planets) {
          p.surveyed = true;
          if (p.colonizedBy === oldOwner?.id) {
            p.colonizedBy = state.playerEmpireId;
          }
        }
        if (rel) {
          rel.aiWarExhaustion = Math.min(100, rel.aiWarExhaustion + 18);
        }
        pushAlert({
          kind: 'success',
          title: `占领敌方星系：${sys.name}`,
          detail: `我方舰队攻陷了 ${oldOwner?.name ?? '敌方'} 的「${sys.name}」，星系与恒星基地已归入帝国版图！`,
          systemId: sys.id,
        });
        economyDirty = true;
      }
    } else if (sys && hostileFleets.length > 0 && playerFleets.length === 0) {
      const aiAttacker = hostileFleets.find((f) => !f.isHostile && areEmpiresAtWar(state, state.playerEmpireId, f.ownerId));
      if (aiAttacker && sys.ownerId === state.playerEmpireId) {
        syncStarbaseStats(sys);
        // Player's Starbase defends the choke point!
        if (sys.starbaseLevel > 0 && (sys.starbaseHp ?? 0) > 0) {
          const enemyDps = hostileFleets.reduce(
            (sum, f) =>
              sum + f.ships.reduce((s2, sh) => s2 + sh.weapons.reduce((w2, w) => w2 + getWeaponDef(w).damage, 0), 0),
            0
          );
          sys.starbaseHp = Math.max(0, (sys.starbaseHp ?? 0) - Math.max(20, enemyDps));

          const sbDps = getStarbaseDps(sys);
          if (aiAttacker.ships.length > 0 && sbDps > 0) {
            aiAttacker.inCombat = true;
            aiAttacker.statusText = `攻打恒星基地 (${Math.round(sys.starbaseHp)} HP)`;
            const targetShip = aiAttacker.ships[Math.floor(Math.random() * aiAttacker.ships.length)];
            const destroyed = applyWeaponHit(targetShip, sbDps * 0.5, 'laser_3', 0);
            if (destroyed) {
              aiAttacker.ships = aiAttacker.ships.filter((s) => s.hull > 0);
              recalcFleetPower(aiAttacker);
              if (aiAttacker.ships.length === 0) {
                delete state.fleets[aiAttacker.id];
                pushAlert({
                  kind: 'success',
                  title: `星堡击退来犯敌军：${sys.name}`,
                  detail: `${sys.name} 的恒星要塞成功全歼了来犯敌舰，守住了帝国边疆！`,
                  systemId: sys.id,
                });
              }
            }
          }
          continue;
        }

        // Colony bombardment delay for player defense
        const hasPlayerColony = sys.planets.some((p) => p.colonizedBy === state.playerEmpireId);
        if (hasPlayerColony) {
          sys.siegeProgress = (sys.siegeProgress ?? 0) + 7; // ~14 days to rally relief fleet
          aiAttacker.statusText = `正在轰炸殖民地 (${Math.min(100, Math.round(sys.siegeProgress))}%)`;
          if (sys.siegeProgress < 100) continue;
        }

        const aiEmp = state.empires[aiAttacker.ownerId];
        const rel = state.relations[aiAttacker.ownerId];
        sys.ownerId = aiAttacker.ownerId;
        sys.siegeProgress = 0;
        syncStarbaseStats(sys, true);
        for (const p of sys.planets) {
          if (p.colonizedBy === state.playerEmpireId) {
            p.colonizedBy = aiAttacker.ownerId;
          }
        }
        if (rel) {
          rel.playerWarExhaustion = Math.min(100, rel.playerWarExhaustion + 20);
        }
        pushAlert({
          kind: 'warning',
          title: `星系失守：${sys.name}`,
          detail: `${aiEmp?.name ?? '敌军'} 舰队攻陷了我方星系「${sys.name}」！请立即反攻夺回。`,
          systemId: sys.id,
        });
        economyDirty = true;
      }
    }

    if (playerFleets.length === 0 || hostileFleets.length === 0) {
      if (state.battles[sysId]) {
        delete state.battles[sysId];
      }
      continue;
    }

    // Active combat!
    let battle: ActiveBattle = state.battles[sysId];
    if (!battle) {
      battle = {
        id: `bat_${sysId}_${state.date.totalDays}`,
        systemId: sysId,
        attackerFleetIds: playerFleets.map((f) => f.id),
        defenderFleetIds: hostileFleets.map((f) => f.id),
        startedDay: state.date.totalDays,
        attackerLosses: 0,
        defenderLosses: 0,
        recentShots: [],
      };
      state.battles[sysId] = battle;

      const sysName = state.systems[sysId]?.name ?? sysId;
      pushAlert({
        kind: 'warning',
        title: `星系爆发海战：${sysName}`,
        detail: `我方舰队在 ${sysName} 与敌对武装交火！双击进入 3D 星系视角观战。`,
        systemId: sysId,
        fleetId: playerFleets[0].id,
      });
    } else {
      battle.attackerFleetIds = playerFleets.map((f) => f.id);
      battle.defenderFleetIds = hostileFleets.map((f) => f.id);
    }

    // Position fleets facing each other inside the system
    playerFleets.forEach((f, idx) => {
      f.inCombat = true;
      f.orders = [];
      f.statusText = '激战中';
      f.localX = -15 - idx * 4;
      f.localZ = (idx - 0.5) * 6;
    });
    hostileFleets.forEach((f, idx) => {
      f.inCombat = true;
      f.statusText = '交战中';
      f.localX = 15 + idx * 4;
      f.localZ = (idx - 0.5) * 6;
    });

    const shots: CombatShotVfx[] = [];
    const playerEmpire = state.empires[state.playerEmpireId];
    let admiralWepBonus = 0;
    for (const pf of playerFleets) {
      if (pf.officerId) {
        const off = playerEmpire?.officers?.find((o) => o.id === pf.officerId);
        if (off) {
          admiralWepBonus = Math.max(admiralWepBonus, off.weaponBonus * getOfficerLevelMult(off.level));
          // Admiral gains combat XP!
          off.xp += 12;
          if (off.xp >= 100 && off.level < 5) {
            off.xp -= 100;
            off.level += 1;
          }
        }
      }
    }
    const playerWepBonus = (playerEmpire?.modifiers.shipWeaponBonus ?? 0) + admiralWepBonus;

    const fireSide = (attackers: Fleet[], defenders: Fleet[], wepBonus: number): number => {
      let kills = 0;
      const aliveDefenders: Array<{ fleet: Fleet; ship: ShipInstance }> = [];
      for (const df of defenders) {
        for (const s of df.ships) {
          if (s.hull > 0) aliveDefenders.push({ fleet: df, ship: s });
        }
      }
      if (aliveDefenders.length === 0) return 0;

      for (const af of attackers) {
        for (const ship of af.ships) {
          if (ship.hull <= 0) continue;
          for (const wepId of ship.weapons) {
            const validTargets = aliveDefenders.filter((t) => t.ship.hull > 0);
            if (validTargets.length === 0) break;
            const picked = validTargets[Math.floor(Math.random() * validTargets.length)];
            const wepDef = getWeaponDef(wepId);

            if (shots.length < 18) {
              shots.push({
                id: `shot_${state.date.totalDays}_${Math.random().toString(36).slice(2, 6)}`,
                fromFleetId: af.id,
                toFleetId: picked.fleet.id,
                color: wepDef.beamColor,
                weaponType: wepId,
                createdDay: state.date.totalDays,
              });
            }

            const destroyed = applyWeaponHit(picked.ship, wepDef.damage, wepId, wepBonus);
            if (destroyed) kills++;
          }
        }
      }
      return kills;
    };

    const hasLeviathanTarget = hostileFleets.some((f) => Boolean(f.leviathanId));
    const levBonus =
      hasLeviathanTarget && playerEmpire?.curatorLeviathanIntel ? 0.3 : 0;
    const enemyKilled = fireSide(playerFleets, hostileFleets, playerWepBonus + levBonus);
    const playerKilled = fireSide(hostileFleets, playerFleets, 0);

    battle.defenderLosses += enemyKilled;
    battle.attackerLosses += playerKilled;
    battle.recentShots = shots;

    // Prune destroyed ships & empty fleets
    for (const f of [...playerFleets, ...hostileFleets]) {
      f.ships = f.ships.filter((s) => s.hull > 0);
      recalcFleetPower(f);
      if (f.ships.length === 0) {
        if (f.leviathanId && playerEmpire) {
          const lev = LEVIATHAN_BY_ID[f.leviathanId];
          if (lev) {
            for (const [k, v] of Object.entries(lev.rewardResources)) {
              playerEmpire.resources[k as ResourceKey] += v ?? 0;
            }
            if (!playerEmpire.strategicResources) {
              playerEmpire.strategicResources = {
                volatileMotes: 0,
                exoticGases: 0,
                rareCrystals: 0,
                darkMatter: 0,
              };
            }
            for (const [k, v] of Object.entries(lev.rewardStrategic)) {
              playerEmpire.strategicResources[k as StrategicResourceKey] += v ?? 0;
            }
            pushAlert({
              kind: 'success',
              title: `史诗讨伐：击溃利维坦「${lev.name}」！`,
              detail: `我方舰队成功狩猎远古巨兽「${lev.name}」，获得丰厚战利品：${lev.rewardSummary}！`,
              systemId: sysId,
            });
          }
        }
        delete state.fleets[f.id];
        economyDirty = true;
      }
    }

    const playerRemaining = playerFleets.some((f) => state.fleets[f.id]);
    const hostileRemaining = hostileFleets.some((f) => state.fleets[f.id]);

    if (!playerRemaining || !hostileRemaining) {
      const victory = playerRemaining && !hostileRemaining;
      const sysName = state.systems[sysId]?.name ?? sysId;
      const salvageAlloys = victory ? Math.max(45, battle.defenderLosses * 35) : 0;
      const salvageResearch = victory ? Math.max(30, battle.defenderLosses * 25) : 0;

      if (victory && playerEmpire) {
        playerEmpire.resources.alloys += salvageAlloys;
        playerEmpire.resources.research += salvageResearch;
      }

      state.lastBattleReport = {
        id: `rep_${state.date.totalDays}_${sysId}`,
        systemId: sysId,
        systemName: sysName,
        victory,
        playerLosses: battle.attackerLosses,
        enemyLosses: battle.defenderLosses,
        salvageAlloys,
        salvageResearch,
        day: state.date.totalDays,
      };

      pushAlert({
        kind: victory ? 'success' : 'warning',
        title: victory ? `海战大捷：${sysName}` : `舰队失利：${sysName}`,
        detail: victory
          ? `击毁敌舰 ${battle.defenderLosses} 艘，我方损失 ${battle.attackerLosses} 艘，回收 +${salvageAlloys} 合金、+${salvageResearch} 科研！`
          : `我方在 ${sysName} 损失 ${battle.attackerLosses} 艘战舰，请重整舰队再战。`,
        systemId: sysId,
      });

      delete state.battles[sysId];
      economyDirty = true;
    }
  }

  // Out-of-combat shield regen & starport hull/armor repair
  for (const f of Object.values(state.fleets)) {
    if (f.shipType !== 'corvette' || f.inCombat) continue;
    const sys = state.systems[f.systemId];
    const atFriendlyStarport = !f.inTransit && sys && sys.ownerId === f.ownerId && sys.starbaseLevel >= 2;
    for (const s of f.ships) {
      if (s.shield < s.maxShield) {
        s.shield = Math.min(s.maxShield, s.shield + s.maxShield * 0.08);
      }
      if (atFriendlyStarport) {
        if (s.armor < s.maxArmor) s.armor = Math.min(s.maxArmor, s.armor + s.maxArmor * 0.1);
        if (s.hull < s.maxHull) s.hull = Math.min(s.maxHull, s.hull + s.maxHull * 0.1);
      }
    }
  }

  return economyDirty;
}
