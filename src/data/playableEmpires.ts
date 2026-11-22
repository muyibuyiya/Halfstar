import { DifficultyId, EmpireModifiers } from '../types/game';

export interface LeaderDef {
  id: string;
  name: string;
  title: string;
  tag?: string; // e.g. '三体彩蛋'
  quote: string;
  summary: string;
  modifiers: Partial<EmpireModifiers>;
  deterrenceBonus?: number; // lowers AI war declaration likelihood
  startingAlloys?: number;
  startingEnergy?: number;
  startingUnity?: number;
  extraCorvettes?: number;
  extraScienceShip?: boolean;
  initialOpinionBonus?: number;
  unlockStartTechId?: string;
}

export interface PlayableEmpireDef {
  id: string;
  name: string;
  adjective: string;
  speciesName: string;
  homeworldName: string;
  homeSystemName: string;
  color: string;
  secondaryColor: string;
  ethicsLabel: string;
  description: string;
  baseSummary: string;
  baseModifiers: Partial<EmpireModifiers>;
  marketFeeDiscount?: number;
  isMachine?: boolean;
  leaders: LeaderDef[];
}

export interface TraitDef {
  id: string;
  name: string;
  cost: number; // +1 for positive, -1 for negative
  summary: string;
  modifiers: Partial<EmpireModifiers>;
  initialOpinionBonus?: number;
}

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  summary: string;
  aiIncomeMult: number;
  aiAggressionBonus: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  cadet: {
    id: 'cadet',
    name: '新兵（休闲）',
    summary: 'AI 产出 -20%，适合轻松探索与种田发育',
    aiIncomeMult: 0.8,
    aiAggressionBonus: -0.15,
  },
  ensign: {
    id: 'ensign',
    name: '少尉（标准）',
    summary: '玩家与 AI 公平竞争，推荐首次体验',
    aiIncomeMult: 1.0,
    aiAggressionBonus: 0,
  },
  captain: {
    id: 'captain',
    name: '上校（困难）',
    summary: 'AI 产出 +30%，舰队扩张与进攻更具压迫感',
    aiIncomeMult: 1.3,
    aiAggressionBonus: 0.12,
  },
  admiral: {
    id: 'admiral',
    name: '海军上将（极难）',
    summary: 'AI 产出 +65%，高强度星际生存挑战',
    aiIncomeMult: 1.65,
    aiAggressionBonus: 0.25,
  },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);

export const PLAYABLE_EMPIRES: PlayableEmpireDef[] = [
  {
    id: 'une',
    name: '地球联合国',
    adjective: '人类',
    speciesName: '人类（类人生物）',
    homeworldName: '地球',
    homeSystemName: '太阳系',
    color: '#38bdf8',
    secondaryColor: '#0284c7',
    ethicsLabel: '亲外 · 平等 · 探索',
    description: '团结在蓝色母星旗帜下的人类文明，怀揣对星海的好奇与理想迈入超空间纪元。',
    baseSummary: '前哨站影响力 -10% · 宜居度 +5%',
    baseModifiers: { outpostInfluenceDiscount: 0.1, habitabilityBonus: 5 },
    leaders: [
      {
        id: 'une_linlan',
        name: '林澜',
        title: '最高执政官',
        quote: '群星并非冰冷的深渊，而是人类文明共同的彼岸。',
        summary: '科研速度 +10% · 前哨站影响力 -10% · 初始外交 +10',
        modifiers: { researchMult: 0.1, outpostInfluenceDiscount: 0.1 },
        initialOpinionBonus: 10,
      },
      {
        id: 'une_luoji',
        name: '罗辑',
        title: '第一任执剑人',
        tag: '三体彩蛋',
        quote: '我面壁，是为了让人类看到明天的太阳。我对整个银河系说话。',
        summary: '黑暗森林威慑（AI 极难主动宣战）· 科研 +15% · 凝聚力 +15% · 武器 +10%',
        modifiers: { researchMult: 0.15, unityMult: 0.15, shipWeaponBonus: 0.1 },
        deterrenceBonus: 0.75,
        startingUnity: 100,
      },
      {
        id: 'une_zhangbeihai',
        name: '章北海',
        title: '自然选择号舰长',
        tag: '三体彩蛋',
        quote: '没关系的，都一样。自然选择号，前进四！',
        summary: '人口增长 +18% · 开局额外 +1 艘科研船 · +120 合金',
        modifiers: { popGrowthMult: 0.18, stationOutputMult: 0.1 },
        extraScienceShip: true,
        startingAlloys: 120,
      },
    ],
  },
  {
    id: 'com',
    name: '人类星际联邦',
    adjective: '联邦',
    speciesName: '人类（开拓先驱）',
    homeworldName: '统一星',
    homeSystemName: '天仓五',
    color: '#ef4444',
    secondaryColor: '#b91c1c',
    ethicsLabel: '军国 · 威权',
    description: '由失落殖民方舟建立的尚武人类国度，坚信唯有无敌舰队才能捍卫文明的存续。',
    baseSummary: '舰队船体 +10% · 合金产出 +10%',
    baseModifiers: { shipHullBonus: 0.1, alloysMult: 0.1 },
    leaders: [
      {
        id: 'com_chenli',
        name: '陈砺',
        title: '联邦大元帅',
        quote: '疆域不是谈出来的，是用主力舰队的齐射划出来的。',
        summary: '武器伤害 +15% · 开局额外 +2 艘护卫舰',
        modifiers: { shipWeaponBonus: 0.15 },
        extraCorvettes: 2,
      },
      {
        id: 'com_wade',
        name: '托马斯·维德',
        title: '星环集团掌舵人',
        tag: '三体彩蛋',
        quote: '失去人性，失去很多；失去兽性，失去一切。只管前进！',
        summary: '合金 +20% · 科研 +15% · 武器 +12% · 初始外交 -20',
        modifiers: { alloysMult: 0.2, researchMult: 0.15, shipWeaponBonus: 0.12 },
        initialOpinionBonus: -20,
      },
    ],
  },
  {
    id: 'valran',
    name: '瓦尔兰博学议会',
    adjective: '瓦尔兰',
    speciesName: '瓦尔兰族（灵能）',
    homeworldName: '真理圣殿',
    homeSystemName: '织女星',
    color: '#a855f7',
    secondaryColor: '#7e22ce',
    ethicsLabel: '极端唯物 · 亲外',
    description: '将宇宙奥秘视为最高信仰的学者文明，以惊人的科技迭代速度俯瞰群星。',
    baseSummary: '科研速度 +15% · 轨道站产出 +10%',
    baseModifiers: { researchMult: 0.15, stationOutputMult: 0.1 },
    leaders: [
      {
        id: 'val_soren',
        name: '索伦',
        title: '大导师',
        quote: '每一次观测，都在改写我们对宇宙法则的认知边界。',
        summary: '科研速度 +12% · 开局直接掌握「量子场理论」',
        modifiers: { researchMult: 0.12 },
        unlockStartTechId: 'phy_quantum_theory',
      },
      {
        id: 'val_elene',
        name: '艾琳',
        title: '星海先知',
        quote: '真理不仅存于实验室，更藏在深空的古老遗迹之中。',
        summary: '凝聚力 +20% · 轨道站产出 +20% · 开局 +100 凝聚力',
        modifiers: { unityMult: 0.2, stationOutputMult: 0.2 },
        startingUnity: 100,
      },
    ],
  },
  {
    id: 'sunflare',
    name: '太阳耀斑星际商盟',
    adjective: '耀斑',
    speciesName: '奥瑞安族（商贾）',
    homeworldName: '黄金港',
    homeSystemName: '大角星',
    color: '#f59e0b',
    secondaryColor: '#b45309',
    ethicsLabel: '唯物 · 商业 · 和平',
    description: '由跨星系财团联合执政的超级商业帝国，擅长以庞大能量币与市场杠杆左右银河。',
    baseSummary: '能量币 +15% · 银河市场手续费减半（10%）',
    baseModifiers: { energyMult: 0.15 },
    marketFeeDiscount: 0.1,
    leaders: [
      {
        id: 'sun_vera',
        name: '维拉',
        title: '首席执行官',
        quote: '能量币流向哪里，银河的未来就属于哪里。',
        summary: '能量币 +15% · 消费品 +15% · 开局 +300 能量币',
        modifiers: { energyMult: 0.15, consumerGoodsMult: 0.15 },
        startingEnergy: 300,
      },
      {
        id: 'sun_kane',
        name: '凯恩',
        title: '星际银行行长',
        quote: '没有什么是精明投资解决不了的，包括一支无敌舰队。',
        summary: '矿物 +15% · 合金 +12% · 初始外交 +15',
        modifiers: { mineralsMult: 0.15, alloysMult: 0.12 },
        initialOpinionBonus: 15,
      },
    ],
  },
  {
    id: 'asgard',
    name: '阿斯加德共荣体',
    adjective: '阿斯加德',
    speciesName: '诺德星裔',
    homeworldName: '英灵殿',
    homeSystemName: '天狼星',
    color: '#10b981',
    secondaryColor: '#047857',
    ethicsLabel: '亲外 · 和平 · 唯心',
    description: '崇尚自然和谐与星际共荣的古老文明，擅长迅速繁荣每一颗新殖民星球。',
    baseSummary: '宜居度 +10% · 人口增长 +12%',
    baseModifiers: { habitabilityBonus: 10, popGrowthMult: 0.12 },
    leaders: [
      {
        id: 'asg_freya',
        name: '芙蕾雅',
        title: '星海议长',
        quote: '生命在群星间播撒希望，而和平是文明最坚固的盾牌。',
        summary: '人口增长 +15% · 食物 +20% · 初始外交 +20',
        modifiers: { popGrowthMult: 0.15, foodMult: 0.2 },
        initialOpinionBonus: 20,
      },
      {
        id: 'asg_thorin',
        name: '托林',
        title: '边疆守护者',
        quote: '我们热爱和平，但绝不畏惧捍卫家园的雷霆之战。',
        summary: '舰队船体 +18% · 凝聚力 +15% · 开局 +1 艘护卫舰',
        modifiers: { shipHullBonus: 0.18, unityMult: 0.15 },
        extraCorvettes: 1,
      },
    ],
  },
  {
    id: 'nexus',
    name: '星核智械矩阵',
    adjective: '星核',
    speciesName: '机械智能（格式塔）',
    homeworldName: '零号主机',
    homeSystemName: '半人马座α',
    color: '#06b6d4',
    secondaryColor: '#0e7490',
    ethicsLabel: '格式塔 · 机械智能',
    description: '由高度互联的量子主脑统治的机械文明，追求极致工业效率与零误差扩张。',
    baseSummary: '全星球宜居度 +20% · 矿物 +15% · 合金 +10%',
    baseModifiers: { habitabilityBonus: 20, mineralsMult: 0.15, alloysMult: 0.1 },
    isMachine: true,
    leaders: [
      {
        id: 'nex_prime',
        name: 'Prime-0',
        title: '核心运算节点',
        quote: '计算完毕：有机文明的混乱终将被完美的星际秩序所优化。',
        summary: '能量币 +15% · 科研 +15% · 轨道站产出 +15%',
        modifiers: { energyMult: 0.15, researchMult: 0.15, stationOutputMult: 0.15 },
      },
      {
        id: 'nex_omega',
        name: 'Omega-9',
        title: '铁幕肃正协议',
        quote: '检测到银河威胁变量。正在启动全自动战舰流水线。',
        summary: '合金 +20% · 武器 +15% · 船体 +15% · 初始外交 -25',
        modifiers: { alloysMult: 0.2, shipWeaponBonus: 0.15, shipHullBonus: 0.15 },
        initialOpinionBonus: -25,
      },
    ],
  },
];

export const CUSTOM_TRAITS: TraitDef[] = [
  // Positive traits (cost 1 point)
  {
    id: 'tr_intelligent',
    name: '智慧种族',
    cost: 1,
    summary: '科研速度 +15%',
    modifiers: { researchMult: 0.15 },
  },
  {
    id: 'tr_industrious',
    name: '勤劳采掘',
    cost: 1,
    summary: '矿物产出 +15%',
    modifiers: { mineralsMult: 0.15 },
  },
  {
    id: 'tr_ingenious',
    name: '能源大师',
    cost: 1,
    summary: '能量币产出 +15%',
    modifiers: { energyMult: 0.15 },
  },
  {
    id: 'tr_metallurgist',
    name: '军工狂热',
    cost: 1,
    summary: '合金产出 +15%',
    modifiers: { alloysMult: 0.15 },
  },
  {
    id: 'tr_rapid_breeders',
    name: '快速繁衍',
    cost: 1,
    summary: '人口增长 +18%',
    modifiers: { popGrowthMult: 0.18 },
  },
  {
    id: 'tr_adaptive',
    name: '极强适应',
    cost: 1,
    summary: '宜居度 +10%',
    modifiers: { habitabilityBonus: 10 },
  },
  {
    id: 'tr_naval_elite',
    name: '星舰精英',
    cost: 1,
    summary: '舰队武器 +12% · 船体 +12%',
    modifiers: { shipWeaponBonus: 0.12, shipHullBonus: 0.12 },
  },
  {
    id: 'tr_charismatic',
    name: '魅力领袖',
    cost: 1,
    summary: '凝聚力 +18% · 初始外交 +15',
    modifiers: { unityMult: 0.18 },
    initialOpinionBonus: 15,
  },
  // Negative traits (refund +1 point, max 1)
  {
    id: 'tr_wasteful',
    name: '高消耗社会',
    cost: -1,
    summary: '消费品产出 -15%（返还 +1 点数）',
    modifiers: { consumerGoodsMult: -0.15 },
  },
  {
    id: 'tr_repugnant',
    name: '孤立主义',
    cost: -1,
    summary: '初始外交关系 -20（返还 +1 点数）',
    modifiers: {},
    initialOpinionBonus: -20,
  },
  {
    id: 'tr_nonadaptive',
    name: '脆弱体质',
    cost: -1,
    summary: '全星球宜居度 -8%（返还 +1 点数）',
    modifiers: { habitabilityBonus: -8 },
  },
];

export const EMPIRE_COLOR_PALETTE = [
  '#38bdf8',
  '#ef4444',
  '#10b981',
  '#a855f7',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

export function getPlayableEmpireById(id: string): PlayableEmpireDef {
  return PLAYABLE_EMPIRES.find((e) => e.id === id) ?? PLAYABLE_EMPIRES[0];
}
