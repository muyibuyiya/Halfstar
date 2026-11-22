import { GameStateData } from '../types/game';

export interface EmpireSizeReport {
  total: number;
  threshold: number;
  sprawlOver: number;
  systemsPart: number;
  coloniesPart: number;
  popsPart: number;
  techCostMult: number;
  traditionCostMult: number;
}

/**
 * Stellaris-inspired Empire Size system:
 * Balances "tall" (high-level buildings, fewer systems) vs "wide" (rapid expansion).
 */
export function computeEmpireSize(
  state: GameStateData,
  empireId: string
): EmpireSizeReport {
  const empire = state.empires[empireId];
  let systemsCount = 0;
  let coloniesCount = 0;
  let popsCount = 0;

  for (const sys of Object.values(state.systems)) {
    if (sys.ownerId === empireId) {
      systemsCount++;
      for (const p of sys.planets) {
        if (p.colonizedBy === empireId) {
          coloniesCount++;
          popsCount += p.popCount;
        }
      }
    }
  }

  let reductionMult = 1;
  if (empire) {
    if (empire.unlockedTraditions.includes('exp_logistics')) reductionMult -= 0.12;
    if (empire.unlockedAscensions.includes('asc_galactic_force')) reductionMult -= 0.1;
    if (empire.completedTechs.includes('soc_galactic_admin')) reductionMult -= 0.12;
  }
  reductionMult = Math.max(0.55, reductionMult);

  const systemsPart = Math.round(systemsCount * 4 * reductionMult);
  const coloniesPart = Math.round(coloniesCount * 10 * reductionMult);
  const popsPart = Math.round(popsCount * 1.5 * reductionMult);
  const total = systemsPart + coloniesPart + popsPart;

  const threshold = 100;
  const sprawlOver = Math.max(0, total - threshold);

  // +0.4% tech cost and +0.5% tradition cost per point over threshold (capped for fun late game)
  const techCostMult = Number(Math.min(2.4, 1 + sprawlOver * 0.004).toFixed(3));
  const traditionCostMult = Number(Math.min(2.6, 1 + sprawlOver * 0.005).toFixed(3));

  return {
    total,
    threshold,
    sprawlOver,
    systemsPart,
    coloniesPart,
    popsPart,
    techCostMult,
    traditionCostMult,
  };
}
