import { AIPersonality } from '../types/game';

export interface AIEmpirePreset {
  id: string;
  name: string;
  adjective: string;
  color: string;
  secondaryColor: string;
  personality: AIPersonality;
  personalityLabel: string;
  ethicsLabel: string;
  baseOpinion: number;
  aggression: number; // 0..1
  greeting: string;
}

export const AI_EMPIRE_PRESETS: AIEmpirePreset[] = [
  {
    id: 'emp_ai_1',
    name: '阿斯加德星际联邦',
    adjective: '阿斯加德',
    color: '#10b981',
    secondaryColor: '#047857',
    personality: 'federation_builders',
    personalityLabel: '和平联邦主义者',
    ethicsLabel: '亲外 · 和平 · 平等',
    baseOpinion: 35,
    aggression: 0.12,
    greeting: '向你们致敬，来自群星的邻居！阿斯加德联邦渴望与贵国携手共建繁荣星海。',
  },
  {
    id: 'emp_ai_2',
    name: '克里昂铁血霸权',
    adjective: '克里昂',
    color: '#f43f5e',
    secondaryColor: '#be123c',
    personality: 'hegemonic_imperialists',
    personalityLabel: '霸权帝国主义者',
    ethicsLabel: '军国 · 威权',
    baseOpinion: -25,
    aggression: 0.72,
    greeting: '弱者只配臣服于钢铁舰队的阴影之下。记住你们在银河中的位置。',
  },
  {
    id: 'emp_ai_3',
    name: '瓦尔兰博学议会',
    adjective: '瓦尔兰',
    color: '#a855f7',
    secondaryColor: '#7e22ce',
    personality: 'erudite_explorers',
    personalityLabel: '博学探索者',
    ethicsLabel: '唯物 · 亲外',
    baseOpinion: 20,
    aggression: 0.2,
    greeting: '一个崭新的智慧文明！我们的学者对贵国的科技演进路线充满浓厚兴趣。',
  },
  {
    id: 'emp_ai_4',
    name: '太阳耀斑星际商盟',
    adjective: '耀斑',
    color: '#f59e0b',
    secondaryColor: '#b45309',
    personality: 'megacorp_traders',
    personalityLabel: '星际巨企',
    ethicsLabel: '唯物 · 商业 · 和平',
    baseOpinion: 15,
    aggression: 0.25,
    greeting: '合作共赢是银河系最永恒的真理。只要能量币充足，一切皆可商议！',
  },
  {
    id: 'emp_ai_5',
    name: '虚空净世教团',
    adjective: '净世',
    color: '#ec4899',
    secondaryColor: '#9d174d',
    personality: 'fanatic_purifiers',
    personalityLabel: '狂热净化者',
    ethicsLabel: '极端排外 · 军国',
    baseOpinion: -85,
    aggression: 0.92,
    greeting: '异形污秽不应玷污神圣的群星！我们的净化舰队终将抹除你们的痕迹。',
  },
];

export function getPresetByPersonality(personality?: AIPersonality): AIEmpirePreset | undefined {
  return AI_EMPIRE_PRESETS.find((p) => p.personality === personality);
}
