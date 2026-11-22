import { ResourcePool, ShipDesign, StrategicResourcePool } from '../types/game';

export interface LeviathanDef {
  id: string;
  name: string;
  title: string;
  description: string;
  fleetName: string;
  ships: ShipDesign[];
  rewardResources: Partial<ResourcePool>;
  rewardStrategic: Partial<StrategicResourcePool>;
  rewardSummary: string;
}

export const LEVIATHANS: LeviathanDef[] = [
  {
    id: 'lev_ether_drake',
    name: '以太星龙',
    title: '远古恒星巨兽',
    description:
      '诞生于宇宙黎明时期的巨型硅基能量生物，盘踞在富含稀有矿脉的古老星系中，能吐出足以熔穿战列舰装甲的等离子吐息。',
    fleetName: '🐉 远古巨兽：以太星龙',
    ships: [
      {
        hullClass: 'titan',
        name: '以太星龙本体',
        weapons: ['plasma', 'plasma', 'laser', 'laser', 'missile'],
        defenses: ['armor', 'armor', 'armor', 'shield', 'shield'],
      },
    ],
    rewardResources: { alloys: 420, unity: 260, minerals: 350 },
    rewardStrategic: { darkMatter: 20, volatileMotes: 15 },
    rewardSummary: '+420 合金 · +350 矿物 · +260 凝聚力 · +20 暗物质',
  },
  {
    id: 'lev_dimensional_horror',
    name: '维度恐惧',
    title: '高维裂隙畸变体',
    description:
      '半身嵌在黑洞视界中的不可名状高维生物，其引力触须不断撕扯现实宇宙的时空结构，击溃它可获取海量高维物理数据。',
    fleetName: '👁 远古巨兽：维度恐惧',
    ships: [
      {
        hullClass: 'titan',
        name: '维度恐惧核心',
        weapons: ['plasma', 'plasma', 'plasma', 'kinetic', 'missile'],
        defenses: ['shield', 'shield', 'shield', 'shield', 'armor'],
      },
    ],
    rewardResources: { research: 400, unity: 240, energy: 300 },
    rewardStrategic: { darkMatter: 30, exoticGases: 15 },
    rewardSummary: '+400 科研 · +300 能量币 · +240 凝聚力 · +30 暗物质',
  },
  {
    id: 'lev_droplet',
    name: '强互作用力水滴探测器',
    title: '未知高等文明先锋（三体彩蛋）',
    description:
      '一滴表面绝对光滑、全反射星光的银色水滴形探测器，由强互作用力材料锁死原子构成。它在静默巡航中散发着令人窒息的威慑力。',
    fleetName: '💧 神秘造物：强互作用力水滴',
    ships: [
      {
        hullClass: 'battleship',
        name: '强互作用力水滴 #1',
        weapons: ['plasma', 'plasma', 'kinetic', 'kinetic'],
        defenses: ['armor', 'armor', 'shield', 'shield'],
      },
      {
        hullClass: 'cruiser',
        name: '伴飞引力波中继体',
        weapons: ['laser', 'plasma', 'missile'],
        defenses: ['shield', 'shield', 'armor'],
      },
    ],
    rewardResources: { research: 480, unity: 320, alloys: 250 },
    rewardStrategic: { darkMatter: 25, rareCrystals: 15 },
    rewardSummary: '+480 科研 · +320 凝聚力 · +250 合金 · +25 暗物质',
  },
];

export const LEVIATHAN_BY_ID: Record<string, LeviathanDef> = Object.fromEntries(
  LEVIATHANS.map((l) => [l.id, l])
);
