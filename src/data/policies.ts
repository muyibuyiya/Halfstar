import { EmpirePolicies } from '../types/game';

export const DEFAULT_POLICIES: EmpirePolicies = {
  researchFocus: 'balanced',
  tradePolicy: 'wealth',
  fleetDoctrine: 'balanced',
};

export const POLICY_GROUPS = [
  {
    key: 'researchFocus' as const,
    title: '帝国科研重心',
    description: '调节物理、社会与工程三条科研线的资源倾斜比例。',
    options: [
      { id: 'balanced', label: '三线均衡', summary: '物理 / 社会 / 工程均衡推进' },
      { id: 'physics', label: '物理学优先', summary: '物理学 +45% · 社会/工程 -15%' },
      { id: 'society', label: '社会学优先', summary: '社会学 +45% · 物理/工程 -15%' },
      { id: 'engineering', label: '工程学优先', summary: '工程学 +45% · 物理/社会 -15%' },
    ],
  },
  {
    key: 'tradePolicy' as const,
    title: '星际贸易结算政策',
    description: '决定帝国商业航线税收转化为何种核心战略物资。',
    options: [
      { id: 'wealth', label: '财富创造', summary: '月度额外 +14 能量币' },
      { id: 'consumer', label: '民生消费', summary: '月度额外 +12 消费品' },
      { id: 'unity', label: '文化集市', summary: '月度额外 +12 凝聚力' },
    ],
  },
  {
    key: 'fleetDoctrine' as const,
    title: '星际海军作战学说',
    description: '确立帝国主力舰队的战术倾向与全局战斗修正。',
    options: [
      { id: 'balanced', label: '均衡舰队', summary: '各项战舰性能保持均衡' },
      { id: 'firepower', label: '饱和齐射学说', summary: '武器伤害 +16% · 闪避 -4%' },
      { id: 'maneuver', label: '游击机动学说', summary: '超空间航速 +28% · 闪避 +10%' },
      { id: 'defense', label: '钢铁壁垒学说', summary: '护盾 +14% · 船体 +14%' },
    ],
  },
];
