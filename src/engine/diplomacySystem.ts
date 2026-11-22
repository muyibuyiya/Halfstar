import { GameStateData } from '../types/game';
import { getPresetByPersonality } from '../data/aiEmpires';

export function areEmpiresAtWar(
  state: GameStateData,
  empA: string,
  empB: string
): boolean {
  if (empA === empB) return false;
  if (empA === 'emp_hostile' || empB === 'emp_hostile') return true;
  if (empA === state.playerEmpireId) {
    return Boolean(state.relations[empB]?.atWar);
  }
  if (empB === state.playerEmpireId) {
    return Boolean(state.relations[empA]?.atWar);
  }
  return false;
}

export function getEmpireStats(state: GameStateData, empireId: string) {
  let systems = 0;
  let colonies = 0;
  let pops = 0;
  let fleetPower = 0;

  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === empireId) {
      systems++;
      for (const p of sys.planets) {
        if (p.colonizedBy === empireId) {
          colonies++;
          pops += p.popCount;
        }
      }
    }
  }

  for (const flt of Object.values(state.fleets)) {
    if (flt.ownerId === empireId && flt.shipType === 'corvette') {
      fleetPower += flt.power;
    }
  }

  return { systems, colonies, pops, fleetPower };
}

export function checkFirstContacts(
  state: GameStateData,
  pushAlert: (alert: {
    kind: 'info' | 'success' | 'warning' | 'discovery';
    title: string;
    detail: string;
    systemId?: string;
    openDrawer?: 'diplomacy';
  }) => void
): void {
  for (const sys of Object.values(state.systems)) {
    if (!sys.exploredByPlayer) continue;

    // Check system owner
    if (sys.ownerId && sys.ownerId !== state.playerEmpireId) {
      const rel = state.relations[sys.ownerId];
      const emp = state.empires[sys.ownerId];
      if (rel && !rel.discovered && emp) {
        rel.discovered = true;
        const preset = getPresetByPersonality(emp.personality);
        pushAlert({
          kind: 'discovery',
          title: `第一次接触：${emp.name}`,
          detail: `我们已在 ${sys.name} 发现智慧外星文明「${emp.name}」（${preset?.personalityLabel ?? '未知'}）。点击打开星际外交面板！`,
          systemId: sys.id,
          openDrawer: 'diplomacy',
        });
      }
    }

    // Also check AI fleets in explored systems
    for (const flt of Object.values(state.fleets)) {
      if (flt.systemId === sys.id && flt.ownerId !== state.playerEmpireId && !flt.isHostile) {
        const rel = state.relations[flt.ownerId];
        const emp = state.empires[flt.ownerId];
        if (rel && !rel.discovered && emp) {
          rel.discovered = true;
          const preset = getPresetByPersonality(emp.personality);
          pushAlert({
            kind: 'discovery',
            title: `第一次接触：${emp.name}`,
            detail: `我们在 ${sys.name} 拦截到外星文明「${emp.name}」（${preset?.personalityLabel ?? '未知'}）的星舰信号！`,
            systemId: sys.id,
            openDrawer: 'diplomacy',
          });
        }
      }
    }
  }
}

export function stepDiplomacyMonthly(state: GameStateData): void {
  for (const rel of Object.values(state.relations)) {
    if (!rel.discovered) continue;

    // Gentle opinion drift from active pacts
    let delta = 0;
    if (rel.nonAggression) delta += 0.5;
    if (rel.researchPact) delta += 0.8;
    if (rel.commercialPact) delta += 0.8;
    if (rel.atWar) {
      delta -= 2;
      rel.playerWarExhaustion = Math.min(100, Number((rel.playerWarExhaustion + 1.4).toFixed(1)));
      rel.aiWarExhaustion = Math.min(100, Number((rel.aiWarExhaustion + 1.4).toFixed(1)));
    }
    rel.opinion = Math.max(-100, Math.min(100, Math.round(rel.opinion + delta)));
  }
}
