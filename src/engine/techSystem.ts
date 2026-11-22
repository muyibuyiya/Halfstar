import { Empire, GameStateData, TechBranch, TechTier } from '../types/game';
import { createDefaultModifiers, TECH_LIST, TECHNOLOGIES, TechDef } from '../data/technologies';
import { ALL_TRADITION_PERKS, ASCENSION_BY_ID } from '../data/traditions';
import { EDICT_BY_ID } from '../data/edicts';
import { getOfficerLevelMult } from '../data/leaders';
import { RELIC_BY_ID } from '../data/relics';
import { computeEmpireSize } from './empireSize';
import { sfx } from './sfx';

/**
 * Stellaris-inspired tier gating per branch:
 * T1: 0+, T2: 3+, T3: 6+, T4: 10+, T5 & Repeatables: 14+
 */
export const TIER_UNLOCK_THRESHOLDS: Record<TechTier, number> = {
  1: 0,
  2: 3,
  3: 6,
  4: 10,
  5: 14,
};

export function getBranchCompletedCount(empire: Empire, branch: TechBranch): number {
  let count = 0;
  for (const id of empire.completedTechs) {
    if (TECHNOLOGIES[id]?.branch === branch) count++;
  }
  return count;
}

export function getUnlockedTierForBranch(empire: Empire, branch: TechBranch): TechTier {
  const count = getBranchCompletedCount(empire, branch);
  if (count >= TIER_UNLOCK_THRESHOLDS[5]) return 5;
  if (count >= TIER_UNLOCK_THRESHOLDS[4]) return 4;
  if (count >= TIER_UNLOCK_THRESHOLDS[3]) return 3;
  if (count >= TIER_UNLOCK_THRESHOLDS[2]) return 2;
  return 1;
}

export function getTechEffectiveCost(
  empire: Empire,
  tech: TechDef,
  empireSizeMult = 1
): number {
  const base = tech.isRepeatable
    ? tech.cost + (empire.repeatableLevels?.[tech.id] ?? 0) * 260
    : tech.cost;
  return Math.round(base * empireSizeMult);
}

export function recalculateEmpireModifiers(empire: Empire): void {
  const mods = createDefaultModifiers();
  const applyEffects = (effects: Partial<typeof mods>, times = 1) => {
    for (const [k, v] of Object.entries(effects)) {
      const key = k as keyof typeof mods;
      mods[key] += (v ?? 0) * times;
    }
  };

  if (empire.startingBonusModifiers) {
    applyEffects(empire.startingBonusModifiers);
  }
  for (const techId of empire.completedTechs) {
    const tech = TECHNOLOGIES[techId];
    if (tech && !tech.isRepeatable) applyEffects(tech.effects);
  }
  if (empire.repeatableLevels) {
    for (const [techId, level] of Object.entries(empire.repeatableLevels)) {
      const tech = TECHNOLOGIES[techId];
      if (tech && level > 0) applyEffects(tech.effects, level);
    }
  }
  for (const tradId of empire.unlockedTraditions) {
    const perk = ALL_TRADITION_PERKS[tradId];
    if (perk) applyEffects(perk.effects);
  }
  for (const ascId of empire.unlockedAscensions) {
    const asc = ASCENSION_BY_ID[ascId];
    if (asc) applyEffects(asc.effects);
  }
  for (const edictId of empire.activeEdicts ?? []) {
    const ed = EDICT_BY_ID[edictId];
    if (ed) applyEffects(ed.effects);
  }
  for (const off of empire.officers ?? []) {
    if (off.role === 'scientist') {
      const m = getOfficerLevelMult(off.level);
      mods.researchMult += off.researchBonus * m;
      mods.shipHullBonus += off.hullBonus * m;
    }
  }
  for (const relicId of empire.relics ?? []) {
    const rel = RELIC_BY_ID[relicId];
    if (rel) applyEffects(rel.passiveEffects);
  }

  // Empire Fleet Doctrine policy
  const doctrine = empire.policies?.fleetDoctrine ?? 'balanced';
  if (doctrine === 'firepower') {
    mods.shipWeaponBonus += 0.16;
    mods.shipEvasionBonus -= 0.04;
  } else if (doctrine === 'maneuver') {
    mods.shipSpeedMult += 0.28;
    mods.shipEvasionBonus += 0.1;
  } else if (doctrine === 'defense') {
    mods.shipShieldBonus += 0.14;
    mods.shipHullBonus += 0.14;
  }

  empire.modifiers = mods;
}

export function drawTechOptions(empire: Empire, branch: TechBranch, count = 4): string[] {
  const completed = new Set(empire.completedTechs);
  const maxTier = getUnlockedTierForBranch(empire, branch);

  const eligible = TECH_LIST.filter((t) => {
    if (t.branch !== branch) return false;
    if (t.tier > maxTier) return false;
    if (!t.isRepeatable && completed.has(t.id)) return false;
    if (t.prerequisites && !t.prerequisites.every((req) => completed.has(req))) {
      return false;
    }
    return true;
  });

  if (eligible.length <= count) {
    return eligible.map((t) => t.id);
  }

  // Weighted random draw without replacement
  const pool = [...eligible];
  const chosen: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    let pickIdx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        pickIdx = j;
        break;
      }
    }
    chosen.push(pool[pickIdx].id);
    pool.splice(pickIdx, 1);
  }
  return chosen;
}

export function initializeEmpireResearch(empire: Empire): void {
  const branches: TechBranch[] = ['physics', 'society', 'engineering'];
  for (const b of branches) {
    empire.research[b] = {
      activeTechId: null,
      progress: 0,
      options: drawTechOptions(empire, b, 4),
    };
  }
}

export function advanceResearchMonthly(
  state: GameStateData,
  empire: Empire,
  pushAlert: (alert: {
    kind: 'info' | 'success' | 'warning' | 'discovery';
    title: string;
    detail: string;
    openDrawer?: 'tech';
  }) => void
): boolean {
  const baseResearch = Math.max(9, empire.monthlyIncome.research);
  const curatorBonus =
    empire.curatorResearchUntilDay && state.date.totalDays < empire.curatorResearchUntilDay
      ? 0.15
      : 0;
  const perBranchBase =
    (baseResearch / 3) * (1 + empire.modifiers.researchMult + curatorBonus);

  let storedBonus = 0;
  if (empire.resources.research > 0) {
    const drain = Math.min(empire.resources.research, 45);
    empire.resources.research -= drain;
    storedBonus = drain / 3;
  }

  const branches: TechBranch[] = ['physics', 'society', 'engineering'];
  let anyCompleted = false;

  for (const branch of branches) {
    const slot = empire.research[branch];
    if (!slot.activeTechId) continue;

    const tech = TECHNOLOGIES[slot.activeTechId];
    if (!tech) {
      slot.activeTechId = null;
      continue;
    }

    const sizeMult = computeEmpireSize(state, empire.id).techCostMult;
    const reqCost = getTechEffectiveCost(empire, tech, sizeMult);
    const focus = empire.policies?.researchFocus ?? 'balanced';
    const focusMult =
      focus === 'balanced' ? 1 : focus === branch ? 1.45 : 0.85;
    slot.progress += perBranchBase * focusMult + storedBonus;

    if (slot.progress >= reqCost) {
      if (tech.isRepeatable) {
        if (!empire.repeatableLevels) empire.repeatableLevels = {};
        empire.repeatableLevels[tech.id] = (empire.repeatableLevels[tech.id] ?? 0) + 1;
        if (!empire.completedTechs.includes(tech.id)) {
          empire.completedTechs.push(tech.id);
        }
      } else {
        empire.completedTechs.push(tech.id);
      }

      recalculateEmpireModifiers(empire);
      slot.activeTechId = null;
      slot.progress = 0;
      slot.options = drawTechOptions(empire, branch, 4);
      anyCompleted = true;

      if (empire.isPlayer) {
        sfx.techComplete();
        const branchName =
          branch === 'physics' ? '物理学' : branch === 'society' ? '社会学' : '工程学';
        const lvlTag = tech.isRepeatable
          ? ` Lv.${empire.repeatableLevels?.[tech.id] ?? 1}`
          : '';
        pushAlert({
          kind: 'discovery',
          title: `科技研发完成：${tech.name}${lvlTag}`,
          detail: `[${branchName} · T${tech.tier}] ${tech.summary}。点击选择下一项研究。`,
          openDrawer: 'tech',
        });
      }
    }
  }

  return anyCompleted;
}
