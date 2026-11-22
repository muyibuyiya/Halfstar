import { EmpireOfficer, OfficerRole } from '../types/game';

export const OFFICER_RECRUIT_UNITY_COST = 120;

export interface OfficerTemplate {
  id: string;
  name: string;
  role: OfficerRole;
  traitName: string;
  traitSummary: string;
  weaponBonus: number;
  hullBonus: number;
  evasionBonus: number;
  researchBonus: number;
  isEasterEgg?: boolean;
}

export const OFFICER_POOL: OfficerTemplate[] = [
  // Admirals (海军将领)
  {
    id: 'off_changweisi',
    name: '常伟思',
    role: 'admiral',
    traitName: '坚定不移的统帅',
    traitSummary: '舰队武器 +14% · 船体 +12%',
    weaponBonus: 0.14,
    hullBonus: 0.12,
    evasionBonus: 0.04,
    researchBonus: 0,
    isEasterEgg: true,
  },
  {
    id: 'off_dongfang',
    name: '东方延绪',
    role: 'admiral',
    traitName: '自然选择号舰长',
    traitSummary: '舰队闪避 +12% · 武器 +10%',
    weaponBonus: 0.1,
    hullBonus: 0.05,
    evasionBonus: 0.12,
    researchBonus: 0,
    isEasterEgg: true,
  },
  {
    id: 'off_chuyan',
    name: '褚岩',
    role: 'admiral',
    traitName: '蓝色空间号远征魂',
    traitSummary: '舰队船体 +18% · 武器 +8%',
    weaponBonus: 0.08,
    hullBonus: 0.18,
    evasionBonus: 0.06,
    researchBonus: 0,
    isEasterEgg: true,
  },
  {
    id: 'off_shiqiang',
    name: '史强',
    role: 'admiral',
    traitName: '「虫子从未被战胜」',
    traitSummary: '舰队武器 +16% · 船体 +10%',
    weaponBonus: 0.16,
    hullBonus: 0.1,
    evasionBonus: 0.05,
    researchBonus: 0,
    isEasterEgg: true,
  },
  {
    id: 'off_vance',
    name: '艾琳娜·万斯',
    role: 'admiral',
    traitName: '炮火齐射大师',
    traitSummary: '舰队武器 +12% · 闪避 +6%',
    weaponBonus: 0.12,
    hullBonus: 0.05,
    evasionBonus: 0.06,
    researchBonus: 0,
  },
  {
    id: 'off_kurosawa',
    name: '黑泽烈',
    role: 'admiral',
    traitName: '钢铁防线壁垒',
    traitSummary: '舰队船体 +15% · 武器 +8%',
    weaponBonus: 0.08,
    hullBonus: 0.15,
    evasionBonus: 0.03,
    researchBonus: 0,
  },

  // Scientists (首席科学家)
  {
    id: 'off_dingyi',
    name: '丁仪',
    role: 'scientist',
    traitName: '微观物理鬼才',
    traitSummary: '全帝国科研速度 +14%（随等级成长）',
    weaponBonus: 0,
    hullBonus: 0,
    evasionBonus: 0,
    researchBonus: 0.14,
    isEasterEgg: true,
  },
  {
    id: 'off_wangmiao',
    name: '汪淼',
    role: 'scientist',
    traitName: '「飞刃」纳米材料先驱',
    traitSummary: '科研速度 +10% · 全舰船体 +8%',
    weaponBonus: 0,
    hullBonus: 0.08,
    evasionBonus: 0,
    researchBonus: 0.1,
    isEasterEgg: true,
  },
  {
    id: 'off_yewenjie',
    name: '叶文洁',
    role: 'scientist',
    traitName: '红岸深空射电先驱',
    traitSummary: '科研速度 +15%',
    weaponBonus: 0,
    hullBonus: 0,
    evasionBonus: 0,
    researchBonus: 0.15,
    isEasterEgg: true,
  },
  {
    id: 'off_lyra',
    name: '莱拉·星语',
    role: 'scientist',
    traitName: '亚空间理论学者',
    traitSummary: '科研速度 +12%',
    weaponBonus: 0,
    hullBonus: 0,
    evasionBonus: 0,
    researchBonus: 0.12,
  },
];

export function instantiateOfficer(tpl: OfficerTemplate): EmpireOfficer {
  return {
    id: `${tpl.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    templateId: tpl.id,
    name: tpl.name,
    role: tpl.role,
    traitName: tpl.traitName,
    traitSummary: tpl.traitSummary,
    level: 1,
    xp: 0,
    assignedFleetId: null,
    weaponBonus: tpl.weaponBonus,
    hullBonus: tpl.hullBonus,
    evasionBonus: tpl.evasionBonus,
    researchBonus: tpl.researchBonus,
    isEasterEgg: tpl.isEasterEgg,
  };
}

export function getOfficerLevelMult(level: number): number {
  return 1 + (Math.max(1, level) - 1) * 0.25; // Lv.1=1.0x, Lv.5=2.0x
}
