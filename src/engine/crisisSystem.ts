import { Fleet, GameStateData } from '../types/game';
import { createShipInstance, recalcFleetPower } from './shipSystem';
import { getEmpireStats } from './diplomacySystem';
import { recordRunHistory } from '../data/achievements';

export function computeEmpireScore(state: GameStateData, empireId: string): number {
  const emp = state.empires[empireId];
  if (!emp) return 0;
  const stats = getEmpireStats(state, empireId);
  let score =
    stats.systems * 120 +
    stats.colonies * 350 +
    stats.pops * 25 +
    Math.round(stats.fleetPower * 0.8) +
    emp.completedTechs.length * 180 +
    emp.unlockedTraditions.length * 150 +
    emp.unlockedAscensions.length * 400;
  if (emp.isPlayer && state.crisis.defeated) {
    score += 3000;
  }
  return score;
}

export function triggerEndgameCrisis(state: GameStateData): void {
  if (state.crisis.triggered) return;

  // Pick a rim star system far from player homeworld
  const playerHome = state.systems[state.empires[state.playerEmpireId].homeSystemId];
  let portalSys = state.systems[state.systemOrder[0]];
  let maxDist = -1;
  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === state.playerEmpireId) continue;
    const dx = sys.x - (playerHome?.x ?? 0);
    const dy = sys.y - (playerHome?.y ?? 0);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > maxDist) {
      maxDist = d;
      portalSys = sys;
    }
  }

  state.crisis.triggered = true;
  state.crisis.portalSystemId = portalSys.id;
  state.crisis.startedYear = state.date.year;
  portalSys.exploredByPlayer = true;

  // Spawn 2 Extradimensional Invader fleets
  for (let i = 0; i < 2; i++) {
    const ships = [
      createShipInstance({
        hullClass: 'battleship',
        name: '虚空裂隙母舰',
        weapons: ['plasma', 'plasma', 'missile', 'kinetic'],
        defenses: ['shield', 'shield', 'shield', 'armor'],
      }),
      createShipInstance({
        hullClass: 'cruiser',
        name: '虚空先锋巡洋舰',
        weapons: ['plasma', 'laser', 'missile'],
        defenses: ['shield', 'shield', 'armor'],
      }),
      createShipInstance({
        hullClass: 'cruiser',
        name: '虚空先锋巡洋舰',
        weapons: ['plasma', 'laser', 'missile'],
        defenses: ['shield', 'shield', 'armor'],
      }),
    ];

    const fId = `flt_crisis_${i + 1}`;
    const fleet: Fleet = {
      id: fId,
      name: `虚空撕裂者主力 #${i + 1}`,
      ownerId: 'emp_hostile',
      shipType: 'corvette',
      shipCount: ships.length,
      power: 0,
      ships,
      isHostile: true,
      systemId: portalSys.id,
      localX: 16 + i * 5,
      localZ: -10 + i * 8,
      inTransit: false,
      transitFromId: null,
      transitToId: null,
      transitProgress: 0,
      orders: [],
      autoSurvey: false,
      statusText: '异次元天灾入侵',
    };
    recalcFleetPower(fleet);
    state.fleets[fId] = fleet;
  }

  state.paused = true;
  state.activeEvent = {
    id: 'ev_crisis_arrival',
    title: '银河天灾降临：虚空撕裂者！',
    subtitle: `${portalSys.name} · 最高级别紧急警报`,
    category: 'crisis',
    systemId: portalSys.id,
    description: `全银河的亚空间监测站同时响起刺耳警报！在「${portalSys.name}」星系深处，一道巨大的紫红色维度裂隙撕裂了现实空间，两支装备高能等离子炮与重型护盾的「虚空撕裂者」异次元舰队正在涌入我们的宇宙！全银河的命运系于一战。`,
    choices: [
      {
        id: 'rally',
        label: '全帝国进入战时紧急动员，迎战虚空天灾！',
        effectText: '+300 合金 · +200 能量币 · 目标：全歼虚空撕裂者舰队',
        resourceDelta: { alloys: 300, energy: 200 },
      },
    ],
  };
}

export function triggerGreatKhan(state: GameStateData): void {
  if (state.crisis.khanTriggered) return;

  const playerHome = state.systems[state.empires[state.playerEmpireId].homeSystemId];
  let spawnSys = state.systems[state.systemOrder[0]];
  let bestDist = -1;
  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === state.playerEmpireId) continue;
    const dx = sys.x - (playerHome?.x ?? 0);
    const dy = sys.y - (playerHome?.y ?? 0);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > bestDist) {
      bestDist = d;
      spawnSys = sys;
    }
  }

  state.crisis.khanTriggered = true;
  spawnSys.exploredByPlayer = true;

  const ships = [
    createShipInstance({
      hullClass: 'cruiser',
      name: '可汗皇家旗舰「苍狼」',
      weapons: ['plasma', 'kinetic', 'missile'],
      defenses: ['shield', 'armor', 'armor'],
    }),
    createShipInstance({
      hullClass: 'destroyer',
      name: '劫掠者重驱逐舰',
      weapons: ['kinetic', 'laser'],
      defenses: ['shield', 'armor'],
    }),
    createShipInstance({
      hullClass: 'destroyer',
      name: '劫掠者重驱逐舰',
      weapons: ['kinetic', 'laser'],
      defenses: ['shield', 'armor'],
    }),
    createShipInstance({
      hullClass: 'corvette',
      name: '掠夺轻护卫舰',
      weapons: ['kinetic'],
      defenses: ['armor'],
    }),
    createShipInstance({
      hullClass: 'corvette',
      name: '掠夺轻护卫舰',
      weapons: ['laser'],
      defenses: ['shield'],
    }),
  ];

  const khanFleet: Fleet = {
    id: 'flt_khan_horde',
    name: '星际大可汗「黄金劫掠舰队」',
    ownerId: 'emp_hostile',
    shipType: 'corvette',
    shipCount: ships.length,
    power: 0,
    ships,
    isHostile: true,
    systemId: spawnSys.id,
    localX: 14,
    localZ: -12,
    inTransit: false,
    transitFromId: null,
    transitToId: null,
    transitProgress: 0,
    orders: [],
    autoSurvey: false,
    statusText: '大可汗星际征伐',
  };
  recalcFleetPower(khanFleet);
  state.fleets[khanFleet.id] = khanFleet;

  state.paused = true;
  state.activeEvent = {
    id: 'ev_great_khan',
    title: '中期危机：星际大可汗崛起！',
    subtitle: `${spawnSys.name} · 劫掠者部落大统一`,
    category: 'crisis',
    systemId: spawnSys.id,
    description: `银河边缘原本松散的星际海盗与劫掠者部落在一位自称「星际大可汗」的军事天才麾下完成了大统一！其麾下战力高达 ${khanFleet.power} 的黄金劫掠舰队已集结于「${spawnSys.name}」星系，并向全银河发出最后通牒：要么俯首称臣纳贡，要么在战火中灰飞烟灭！`,
    choices: [
      {
        id: 'khan_resist',
        label: '帝国绝不屈服！全军战备，迎击大可汗舰队！',
        effectText: '+200 合金 · +120 凝聚力 · 击溃「黄金劫掠舰队」可获丰厚战利品',
        resourceDelta: { alloys: 200, unity: 120 },
      },
      {
        id: 'khan_submit',
        label: '暂避锋芒，向大可汗进贡换取星域和平',
        effectText: '-250 能量币 · -200 矿物 · 大可汗舰队撤离我方星区',
        resourceDelta: { energy: -250, minerals: -200 },
      },
    ],
  };
}

export function checkCrisisAndVictoryMonthly(state: GameStateData): void {
  const player = state.empires[state.playerEmpireId];
  if (!player) return;

  // 0. Mid-Game Crisis: The Great Khan around Year 2208
  if (!state.crisis.khanTriggered && state.date.year >= 2208 && !state.activeEvent) {
    triggerGreatKhan(state);
  }
  if (state.crisis.khanTriggered && !state.crisis.khanDefeated) {
    const khanAlive = Boolean(state.fleets['flt_khan_horde']);
    if (!khanAlive) {
      state.crisis.khanDefeated = true;
      player.resources.alloys += 300;
      player.resources.unity += 200;
      state.alerts = [
        {
          id: `alert_khan_win_${state.date.totalDays}`,
          day: state.date.totalDays,
          kind: 'success' as const,
          title: '中期危机终结：星际大可汗陨落！',
          detail: '我方主力舰队成功击溃黄金劫掠舰队，缴获战利品 +300 合金、+200 凝聚力！',
        },
        ...state.alerts,
      ].slice(0, 12);
    }
  }

  // 1. Trigger Endgame Crisis automatically at configured year (default 2215; 0 = disabled)
  const crisisYear = state.config.crisisYear ?? 2215;
  if (crisisYear > 0 && !state.crisis.triggered && state.date.year >= crisisYear) {
    triggerEndgameCrisis(state);
  }

  // 2. Check if Crisis has been defeated
  if (state.crisis.triggered && !state.crisis.defeated) {
    const crisisAlive = Object.values(state.fleets).some((f) => f.id.startsWith('flt_crisis_'));
    if (!crisisAlive) {
      state.crisis.defeated = true;
      const score = computeEmpireScore(state, player.id);
      const reason = '天灾终结胜利 — 成功击溃「虚空撕裂者」异次元入侵，拯救了整个银河系！';
      state.victory = {
        achieved: true,
        reason,
        score,
        year: state.date.year,
      };
      recordRunHistory(state, score, reason);
      state.paused = true;
      return;
    }
  }

  if (state.victory?.achieved) return;

  // 3. Domination Victory (>= 50% of galaxy systems)
  const totalSys = state.systemOrder.length;
  const ownedSys = Object.values(state.systems).filter((s) => s.ownerId === player.id).length;
  if (totalSys > 0 && ownedSys / totalSys >= 0.5) {
    const score = computeEmpireScore(state, player.id);
    const reason = `银河霸权胜利 — 帝国已掌控全银河 ${ownedSys}/${totalSys} 个星系！`;
    state.victory = {
      achieved: true,
      reason,
      score,
      year: state.date.year,
    };
    recordRunHistory(state, score, reason);
    state.paused = true;
    return;
  }

  // 4. Science Victory (>= 12 completed technologies)
  if (player.completedTechs.length >= 12) {
    const score = computeEmpireScore(state, player.id);
    const reason = `科技飞升胜利 — 帝国已掌握 ${player.completedTechs.length} 项尖端星际科技，迈入超级文明行列！`;
    state.victory = {
      achieved: true,
      reason,
      score,
      year: state.date.year,
    };
    recordRunHistory(state, score, reason);
    state.paused = true;
  }
}
