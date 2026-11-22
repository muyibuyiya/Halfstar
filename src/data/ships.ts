import { ShipHullClass, WeaponType, DefenseType } from '../types/game';

export type WeaponFamily = 'laser' | 'kinetic' | 'missile' | 'special';
export type DefenseFamily = 'shield' | 'armor' | 'hull';

export interface WeaponDef {
  id: string;
  name: string;
  family: WeaponFamily;
  tier: 1 | 2 | 3 | 4 | 5;
  damage: number;
  vsShield: number;
  vsArmor: number;
  vsHull: number;
  ignoreShield: boolean;
  beamColor: string;
  alloyCost: number;
  requiredTech?: string;
  isRare?: boolean;
  description: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  // === Laser Line (T1 -> T5) ===
  laser_1: {
    id: 'laser_1',
    name: '红光激光炮',
    family: 'laser',
    tier: 1,
    damage: 13,
    vsShield: 0.75,
    vsArmor: 1.5,
    vsHull: 1.0,
    ignoreShield: false,
    beamColor: '#ef4444',
    alloyCost: 10,
    description: '基础定向能量武器，对装甲 +50%，对护盾 -25%。',
  },
  laser_2: {
    id: 'laser_2',
    name: '蓝光激光炮',
    family: 'laser',
    tier: 2,
    damage: 18,
    vsShield: 0.75,
    vsArmor: 1.5,
    vsHull: 1.0,
    ignoreShield: false,
    beamColor: '#38bdf8',
    alloyCost: 14,
    requiredTech: 'phy_blue_lasers',
    description: '短波长高聚焦激光束，熔穿装甲效率显著提升。',
  },
  laser_3: {
    id: 'laser_3',
    name: '紫外激光炮',
    family: 'laser',
    tier: 3,
    damage: 24,
    vsShield: 0.75,
    vsArmor: 1.55,
    vsHull: 1.05,
    ignoreShield: false,
    beamColor: '#818cf8',
    alloyCost: 19,
    requiredTech: 'phy_uv_lasers',
    description: '高能紫外脉冲阵列，瞬间汽化敌舰复合装甲。',
  },
  laser_4: {
    id: 'laser_4',
    name: 'X射线激光炮',
    family: 'laser',
    tier: 4,
    damage: 32,
    vsShield: 0.8,
    vsArmor: 1.6,
    vsHull: 1.1,
    ignoreShield: false,
    beamColor: '#c084fc',
    alloyCost: 26,
    requiredTech: 'phy_xray_lasers',
    description: '极高穿透力 X 射线束，对重甲主力舰造成毁灭打击。',
  },
  laser_5: {
    id: 'laser_5',
    name: '伽马激光炮',
    family: 'laser',
    tier: 5,
    damage: 42,
    vsShield: 0.85,
    vsArmor: 1.65,
    vsHull: 1.15,
    ignoreShield: false,
    beamColor: '#e879f9',
    alloyCost: 34,
    requiredTech: 'phy_gamma_lasers',
    description: '能量武器巅峰之作，高能伽马射线可轻易切开巨舰龙骨。',
  },

  // === Kinetic Line (T1 -> T5) ===
  kinetic_1: {
    id: 'kinetic_1',
    name: '质量驱动炮',
    family: 'kinetic',
    tier: 1,
    damage: 13,
    vsShield: 1.5,
    vsArmor: 0.75,
    vsHull: 1.0,
    ignoreShield: false,
    beamColor: '#fde047',
    alloyCost: 10,
    description: '电磁加速实弹炮，对护盾 +50%，对装甲 -25%。',
  },
  kinetic_2: {
    id: 'kinetic_2',
    name: '磁轨动能炮',
    family: 'kinetic',
    tier: 2,
    damage: 18,
    vsShield: 1.5,
    vsArmor: 0.75,
    vsHull: 1.0,
    ignoreShield: false,
    beamColor: '#facc15',
    alloyCost: 14,
    requiredTech: 'eng_railguns',
    description: '二代电磁轨道炮，高速弹丸能迅速过载敌舰能量护盾。',
  },
  kinetic_3: {
    id: 'kinetic_3',
    name: '高级磁轨炮',
    family: 'kinetic',
    tier: 3,
    damage: 24,
    vsShield: 1.55,
    vsArmor: 0.8,
    vsHull: 1.05,
    ignoreShield: false,
    beamColor: '#fbbf24',
    alloyCost: 19,
    requiredTech: 'eng_adv_railguns',
    description: '超导导轨大幅提升炮口初速，撕碎强力护盾。',
  },
  kinetic_4: {
    id: 'kinetic_4',
    name: '高斯加农炮',
    family: 'kinetic',
    tier: 4,
    damage: 32,
    vsShield: 1.6,
    vsArmor: 0.8,
    vsHull: 1.1,
    ignoreShield: false,
    beamColor: '#f59e0b',
    alloyCost: 26,
    requiredTech: 'eng_gauss_cannons',
    description: '多级线圈电磁重炮，具备压倒性的破盾齐射能力。',
  },
  kinetic_5: {
    id: 'kinetic_5',
    name: '动能巨炮',
    family: 'kinetic',
    tier: 5,
    damage: 43,
    vsShield: 1.7,
    vsArmor: 0.85,
    vsHull: 1.2,
    ignoreShield: false,
    beamColor: '#fb923c',
    alloyCost: 35,
    requiredTech: 'eng_kinetic_artillery',
    description: '近光速重型实弹巨炮，虚空天灾重盾的终极克星。',
  },

  // === Missile / Torpedo Line (T1 -> T5) ===
  missile_1: {
    id: 'missile_1',
    name: '核裂变导弹',
    family: 'missile',
    tier: 1,
    damage: 12,
    vsShield: 1.0,
    vsArmor: 1.1,
    vsHull: 1.2,
    ignoreShield: true,
    beamColor: '#f97316',
    alloyCost: 12,
    description: '完全无视护盾，直接轰击敌舰装甲与船体。',
  },
  missile_2: {
    id: 'missile_2',
    name: '核聚变导弹',
    family: 'missile',
    tier: 2,
    damage: 17,
    vsShield: 1.0,
    vsArmor: 1.15,
    vsHull: 1.25,
    ignoreShield: true,
    beamColor: '#fb7185',
    alloyCost: 16,
    requiredTech: 'eng_fusion_missiles',
    description: '聚变弹头大幅提升穿盾后的装甲与船体杀伤力。',
  },
  missile_3: {
    id: 'missile_3',
    name: '反物质导弹',
    family: 'missile',
    tier: 3,
    damage: 23,
    vsShield: 1.0,
    vsArmor: 1.2,
    vsHull: 1.3,
    ignoreShield: true,
    beamColor: '#f43f5e',
    alloyCost: 22,
    requiredTech: 'eng_antimatter_missiles',
    description: '正反物质湮灭弹头，无视一切能量偏导护盾。',
  },
  missile_4: {
    id: 'missile_4',
    name: '量子鱼雷',
    family: 'missile',
    tier: 4,
    damage: 31,
    vsShield: 1.0,
    vsArmor: 1.25,
    vsHull: 1.35,
    ignoreShield: true,
    beamColor: '#ec4899',
    alloyCost: 28,
    requiredTech: 'eng_quantum_missiles',
    description: '搭载微型量子弹头的重型鱼雷，对大型舰船极具威胁。',
  },
  missile_5: {
    id: 'missile_5',
    name: '掠夺者鱼雷',
    family: 'missile',
    tier: 5,
    damage: 41,
    vsShield: 1.0,
    vsArmor: 1.35,
    vsHull: 1.45,
    ignoreShield: true,
    beamColor: '#e11d48',
    alloyCost: 36,
    requiredTech: 'eng_marauder_missiles',
    description: '终极穿盾重型鱼雷，可一轮齐射重创敌方战列舰。',
  },

  // === Special / Plasma / X-Slot Weapons ===
  plasma_1: {
    id: 'plasma_1',
    name: '等离子抛射器',
    family: 'special',
    tier: 2,
    damage: 19,
    vsShield: 0.5,
    vsArmor: 1.8,
    vsHull: 1.3,
    ignoreShield: false,
    beamColor: '#22d3ee',
    alloyCost: 17,
    requiredTech: 'phy_plasma_1',
    description: '超高温磁约束等离子团，对装甲 +80%、船体 +30%，但对护盾极弱。',
  },
  plasma_2: {
    id: 'plasma_2',
    name: '高能等离子炮',
    family: 'special',
    tier: 4,
    damage: 34,
    vsShield: 0.5,
    vsArmor: 1.9,
    vsHull: 1.35,
    ignoreShield: false,
    beamColor: '#06b6d4',
    alloyCost: 29,
    requiredTech: 'phy_plasma_2',
    description: '高阶等离子重炮，熔解一切重型装甲与船体结构。',
  },
  tachyon_lance: {
    id: 'tachyon_lance',
    name: '快子光矛',
    family: 'special',
    tier: 5,
    damage: 54,
    vsShield: 0.75,
    vsArmor: 1.85,
    vsHull: 1.4,
    ignoreShield: false,
    beamColor: '#38bdf8',
    alloyCost: 46,
    requiredTech: 'phy_tachyon_lance',
    isRare: true,
    description: '超光速粒子主炮，远距离一击洞穿敌方主力舰核心。',
  },
  arc_emitter: {
    id: 'arc_emitter',
    name: '聚焦电弧发射器',
    family: 'special',
    tier: 5,
    damage: 46,
    vsShield: 1.0,
    vsArmor: 1.0,
    vsHull: 1.5,
    ignoreShield: true,
    beamColor: '#a855f7',
    alloyCost: 48,
    requiredTech: 'phy_arc_emitter',
    isRare: true,
    description: '高能电弧直接穿透护盾并重创船体，对高防目标有奇效。',
  },
};

export interface DefenseDef {
  id: string;
  name: string;
  family: DefenseFamily;
  tier: 1 | 2 | 3 | 4 | 5;
  shieldBonus: number;
  armorBonus: number;
  hullBonus: number;
  alloyCost: number;
  requiredTech?: string;
  isRare?: boolean;
  description: string;
}

export const DEFENSES: Record<string, DefenseDef> = {
  // === Shield Line ===
  shield_1: {
    id: 'shield_1',
    name: '偏导护盾',
    family: 'shield',
    tier: 1,
    shieldBonus: 110,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 10,
    description: '基础能量护盾，脱战自动恢复，易受动能武器克制。',
  },
  shield_2: {
    id: 'shield_2',
    name: '改进偏导盾',
    family: 'shield',
    tier: 2,
    shieldBonus: 165,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 14,
    requiredTech: 'phy_shields_2',
    description: '稳定力场投射器，大幅扩充护盾容量。',
  },
  shield_3: {
    id: 'shield_3',
    name: '高能护盾',
    family: 'shield',
    tier: 3,
    shieldBonus: 235,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 19,
    requiredTech: 'phy_shields_3',
    description: '军用级多层能量护盾矩阵。',
  },
  shield_4: {
    id: 'shield_4',
    name: '高级护盾',
    family: 'shield',
    tier: 4,
    shieldBonus: 320,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 26,
    requiredTech: 'phy_shields_4',
    description: '高密度相干力场，抵御猛烈激光与等离子齐射。',
  },
  shield_5: {
    id: 'shield_5',
    name: '超能护盾',
    family: 'shield',
    tier: 5,
    shieldBonus: 430,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 34,
    requiredTech: 'phy_shields_5',
    description: '常规物理学极限的超强能量护盾。',
  },
  shield_dark_matter: {
    id: 'shield_dark_matter',
    name: '暗物质偏导盾',
    family: 'shield',
    tier: 5,
    shieldBonus: 540,
    armorBonus: 0,
    hullBonus: 40,
    alloyCost: 44,
    requiredTech: 'phy_dark_matter_shields',
    isRare: true,
    description: '利用暗物质扭曲空间拦截来袭火力，拥有惊人的护盾容量。',
  },
  shield_psionic: {
    id: 'shield_psionic',
    name: '灵能护盾',
    family: 'shield',
    tier: 5,
    shieldBonus: 580,
    armorBonus: 0,
    hullBonus: 0,
    alloyCost: 42,
    requiredTech: 'soc_psionic_shields',
    isRare: true,
    description: '由高维虚境灵能编织的不可思议屏障，全银河最强的护盾。',
  },

  // === Armor Line ===
  armor_1: {
    id: 'armor_1',
    name: '纳米陶瓷装甲',
    family: 'armor',
    tier: 1,
    shieldBonus: 0,
    armorBonus: 115,
    hullBonus: 0,
    alloyCost: 10,
    description: '基础复合装甲，有效抵御实弹武器，怕激光熔穿。',
  },
  armor_2: {
    id: 'armor_2',
    name: '塑钢装甲',
    family: 'armor',
    tier: 2,
    shieldBonus: 0,
    armorBonus: 170,
    hullBonus: 0,
    alloyCost: 15,
    requiredTech: 'eng_armor_2',
    description: '高韧性塑钢合金装甲板，提升战舰抗打击能力。',
  },
  armor_3: {
    id: 'armor_3',
    name: '耐钢装甲',
    family: 'armor',
    tier: 3,
    shieldBonus: 0,
    armorBonus: 245,
    hullBonus: 0,
    alloyCost: 20,
    requiredTech: 'eng_armor_3',
    description: '重型军用耐钢结构，极难被常规动能武器击穿。',
  },
  armor_4: {
    id: 'armor_4',
    name: '中子态装甲',
    family: 'armor',
    tier: 4,
    shieldBonus: 0,
    armorBonus: 340,
    hullBonus: 0,
    alloyCost: 28,
    requiredTech: 'eng_armor_4',
    description: '致密简并态物质铸就的超重型舰体装甲。',
  },
  armor_5: {
    id: 'armor_5',
    name: '龙鳞复合装甲',
    family: 'armor',
    tier: 5,
    shieldBonus: 0,
    armorBonus: 455,
    hullBonus: 0,
    alloyCost: 36,
    requiredTech: 'eng_armor_5',
    description: '多层分子锁链超材料，具备惊人的抗热熔与抗冲击性能。',
  },
  armor_strong_interaction: {
    id: 'armor_strong_interaction',
    name: '强互作用力装甲',
    family: 'armor',
    tier: 5,
    shieldBonus: 0,
    armorBonus: 580,
    hullBonus: 120,
    alloyCost: 48,
    requiredTech: 'eng_strong_interaction_armor',
    isRare: true,
    description: '【三体硬科幻】强核力锁死原子核的绝对光滑「水滴」镜面装甲，近乎坚不可摧！',
  },

  // === Hull Line ===
  hull_1: {
    id: 'hull_1',
    name: '强化钛金龙骨',
    family: 'hull',
    tier: 1,
    shieldBonus: 0,
    armorBonus: 20,
    hullBonus: 100,
    alloyCost: 10,
    description: '直接强化船体生命值，有效对抗穿盾/穿甲武器。',
  },
  hull_2: {
    id: 'hull_2',
    name: '晶体镀层船体',
    family: 'hull',
    tier: 3,
    shieldBonus: 0,
    armorBonus: 45,
    hullBonus: 220,
    alloyCost: 20,
    requiredTech: 'eng_crystal_hull',
    description: '高强度异星晶体结构层，显著延长船体战场寿命。',
  },
  hull_3: {
    id: 'hull_3',
    name: '活体金属船体',
    family: 'hull',
    tier: 5,
    shieldBonus: 0,
    armorBonus: 80,
    hullBonus: 390,
    alloyCost: 34,
    requiredTech: 'eng_living_metal_hull',
    isRare: true,
    description: '具备纳米自愈特性的活性金属龙骨，赋予主力舰极强生存力。',
  },
};

// Backwards-compatible legacy ID fallback for existing saves
const LEGACY_WEAPON_MAP: Record<string, string> = {
  laser: 'laser_1',
  kinetic: 'kinetic_1',
  missile: 'missile_1',
  plasma: 'plasma_1',
};

const LEGACY_DEFENSE_MAP: Record<string, string> = {
  shield: 'shield_1',
  armor: 'armor_1',
  hull: 'hull_1',
};

export function getWeaponDef(id: WeaponType): WeaponDef {
  return WEAPONS[id] ?? WEAPONS[LEGACY_WEAPON_MAP[id] ?? 'laser_1'] ?? WEAPONS.laser_1;
}

export function getDefenseDef(id: DefenseType): DefenseDef {
  return DEFENSES[id] ?? DEFENSES[LEGACY_DEFENSE_MAP[id] ?? 'shield_1'] ?? DEFENSES.shield_1;
}

export interface HullClassDef {
  id: ShipHullClass;
  name: string;
  baseHull: number;
  baseShield: number;
  baseArmor: number;
  evasion: number;
  weaponSlots: number;
  defenseSlots: number;
  baseAlloyCost: number;
  buildDays: number;
  commandSize: number;
  visualScale: number;
  requiredTech?: string;
  defaultWeapons: WeaponType[];
  defaultDefenses: DefenseType[];
  description: string;
}

export const HULL_CLASSES: Record<ShipHullClass, HullClassDef> = {
  corvette: {
    id: 'corvette',
    name: '护卫舰',
    baseHull: 180,
    baseShield: 60,
    baseArmor: 60,
    evasion: 0.45,
    weaponSlots: 1,
    defenseSlots: 1,
    baseAlloyCost: 65,
    buildDays: 18,
    commandSize: 1,
    visualScale: 0.85,
    defaultWeapons: ['laser_1'],
    defaultDefenses: ['shield_1'],
    description: '高机动轻型主力，闪避率极高，适合前锋突击与群狼战术。',
  },
  destroyer: {
    id: 'destroyer',
    name: '驱逐舰',
    baseHull: 390,
    baseShield: 120,
    baseArmor: 120,
    evasion: 0.28,
    weaponSlots: 2,
    defenseSlots: 2,
    baseAlloyCost: 135,
    buildDays: 30,
    commandSize: 2,
    visualScale: 1.15,
    requiredTech: 'eng_destroyers',
    defaultWeapons: ['kinetic_1', 'laser_1'],
    defaultDefenses: ['shield_1', 'armor_1'],
    description: '均衡的中型炮舰，由工程学 T1「驱逐舰船体」解锁。',
  },
  cruiser: {
    id: 'cruiser',
    name: '巡洋舰',
    baseHull: 860,
    baseShield: 250,
    baseArmor: 250,
    evasion: 0.14,
    weaponSlots: 3,
    defenseSlots: 3,
    baseAlloyCost: 270,
    buildDays: 48,
    commandSize: 4,
    visualScale: 1.55,
    requiredTech: 'eng_cruisers',
    defaultWeapons: ['kinetic_1', 'laser_1', 'missile_1'],
    defaultDefenses: ['shield_1', 'armor_1', 'hull_1'],
    description: '多用途重型战舰，由工程学 T2「巡洋舰船体」解锁。',
  },
  battleship: {
    id: 'battleship',
    name: '战列舰',
    baseHull: 1850,
    baseShield: 500,
    baseArmor: 500,
    evasion: 0.05,
    weaponSlots: 4,
    defenseSlots: 4,
    baseAlloyCost: 540,
    buildDays: 72,
    commandSize: 8,
    visualScale: 2.05,
    requiredTech: 'eng_battleships',
    defaultWeapons: ['kinetic_1', 'laser_1', 'missile_1', 'laser_1'],
    defaultDefenses: ['shield_1', 'shield_1', 'armor_1', 'armor_1'],
    description: '移动的星际堡垒，由工程学 T3「战列舰船体」解锁。',
  },
  titan: {
    id: 'titan',
    name: '泰坦级旗舰',
    baseHull: 4800,
    baseShield: 1400,
    baseArmor: 1400,
    evasion: 0.02,
    weaponSlots: 6,
    defenseSlots: 6,
    baseAlloyCost: 1350,
    buildDays: 120,
    commandSize: 16,
    visualScale: 2.7,
    requiredTech: 'eng_titans',
    defaultWeapons: ['laser_1', 'kinetic_1', 'missile_1', 'laser_1', 'kinetic_1', 'missile_1'],
    defaultDefenses: ['shield_1', 'shield_1', 'shield_1', 'armor_1', 'armor_1', 'hull_1'],
    description: '终极帝国旗舰，拥有 6 武器槽与 6 防御槽，由工程学 T5 稀有科技「泰坦级主力舰」解锁！',
  },
};

export const HULL_ORDER: ShipHullClass[] = [
  'corvette',
  'destroyer',
  'cruiser',
  'battleship',
  'titan',
];

export const WEAPON_LIST = Object.values(WEAPONS);
export const DEFENSE_LIST = Object.values(DEFENSES);
