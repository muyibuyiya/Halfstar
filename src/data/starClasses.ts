import { StarClassId } from '../types/game';

export interface StarClassDef {
  id: StarClassId;
  name: string;
  color: string;
  glowColor: string;
  radius: number;
  weight: number;
  habitableBonus: number;
  researchBias: boolean;
}

export const STAR_CLASSES: Record<StarClassId, StarClassDef> = {
  class_b: {
    id: 'class_b',
    name: 'B型蓝白星',
    color: '#93c5fd',
    glowColor: '#3b82f6',
    radius: 4.8,
    weight: 8,
    habitableBonus: 0.7,
    researchBias: true,
  },
  class_a: {
    id: 'class_a',
    name: 'A型蓝白星',
    color: '#dbeafe',
    glowColor: '#60a5fa',
    radius: 4.3,
    weight: 12,
    habitableBonus: 0.9,
    researchBias: false,
  },
  class_f: {
    id: 'class_f',
    name: 'F型黄白星',
    color: '#fef9c3',
    glowColor: '#fde047',
    radius: 3.9,
    weight: 16,
    habitableBonus: 1.15,
    researchBias: false,
  },
  class_g: {
    id: 'class_g',
    name: 'G型黄矮星',
    color: '#fde047',
    glowColor: '#f59e0b',
    radius: 3.6,
    weight: 22,
    habitableBonus: 1.35,
    researchBias: false,
  },
  class_k: {
    id: 'class_k',
    name: 'K型橙矮星',
    color: '#fdba74',
    glowColor: '#ea580c',
    radius: 3.3,
    weight: 20,
    habitableBonus: 1.15,
    researchBias: false,
  },
  class_m: {
    id: 'class_m',
    name: 'M型红矮星',
    color: '#fca5a5',
    glowColor: '#dc2626',
    radius: 2.9,
    weight: 16,
    habitableBonus: 0.8,
    researchBias: false,
  },
  neutron_star: {
    id: 'neutron_star',
    name: '中子星',
    color: '#e0f2fe',
    glowColor: '#38bdf8',
    radius: 2.2,
    weight: 2.5,
    habitableBonus: 0.1,
    researchBias: true,
  },
  pulsar: {
    id: 'pulsar',
    name: '脉冲星',
    color: '#c4b5fd',
    glowColor: '#8b5cf6',
    radius: 2.4,
    weight: 2,
    habitableBonus: 0.1,
    researchBias: true,
  },
  black_hole: {
    id: 'black_hole',
    name: '黑洞',
    color: '#09090b',
    glowColor: '#a855f7',
    radius: 3.4,
    weight: 1.5,
    habitableBonus: 0,
    researchBias: true,
  },
};

export const STAR_CLASS_LIST = Object.values(STAR_CLASSES);
