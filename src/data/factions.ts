import { GameStateData } from '../types/game';
import { getEmpireStats } from '../engine/diplomacySystem';

export interface FactionIssue {
  label: string;
  satisfied: boolean;
  weight: number;
}

export interface FactionStatus {
  id: string;
  name: string;
  ideology: string;
  color: string;
  approval: number; // 0-100
  unityIncome: number;
  influenceIncome: number;
  issues: FactionIssue[];
}

export function evaluateEmpireFactions(
  state: GameStateData,
  empireId: string
): FactionStatus[] {
  const empire = state.empires[empireId];
  if (!empire) return [];

  const stats = getEmpireStats(state, empireId);
  const rels = Object.values(state.relations);
  const atWarAny = rels.some((r) => r.atWar);
  const hasResearchPact = rels.some((r) => r.researchPact);
  const hasCommercialPact = rels.some((r) => r.commercialPact);
  const hasGateway = Object.values(state.systems).some(
    (s) => s.ownerId === empireId && s.hasGateway
  );
  const hasMega = Object.values(state.systems).some(
    (s) => s.ownerId === empireId && s.megastructure
  );
  const policy = empire.policies;

  const definitions: Array<{
    id: string;
    name: string;
    ideology: string;
    color: string;
    issues: FactionIssue[];
  }> = [
    {
      id: 'fac_technocrats',
      name: '真理探索学会',
      ideology: '唯物科研派',
      color: '#38bdf8',
      issues: [
        {
          label: '掌握至少 5 项星际科技',
          satisfied: empire.completedTechs.length >= 5,
          weight: 22,
        },
        {
          label: '签署至少 1 份星际科研协议或建造巨构',
          satisfied: hasResearchPact || hasMega,
          weight: 18,
        },
        {
          label: '未忽视前沿科研（科研月产出 ≥ 25）',
          satisfied: empire.monthlyIncome.research >= 25,
          weight: 20,
        },
      ],
    },
    {
      id: 'fac_expansionists',
      name: '星海开拓者联盟',
      ideology: '疆域扩张派',
      color: '#34d399',
      issues: [
        {
          label: '帝国控制星系 ≥ 5 个',
          satisfied: stats.systems >= 5,
          weight: 22,
        },
        {
          label: '拥有至少 2 颗活跃殖民地星球',
          satisfied: stats.colonies >= 2,
          weight: 20,
        },
        {
          label: '建设跨星系星门或拥有 ≥ 8 个星系',
          satisfied: hasGateway || stats.systems >= 8,
          weight: 18,
        },
      ],
    },
    {
      id: 'fac_prosperity',
      name: '银河商贸和平理事会',
      ideology: '和平繁荣派',
      color: '#fbbf24',
      issues: [
        {
          label: '当前未处于星际战争状态',
          satisfied: !atWarAny,
          weight: 24,
        },
        {
          label: '签署商业协定或能量币净产出 ≥ +15',
          satisfied: hasCommercialPact || empire.monthlyNet.energy >= 15,
          weight: 18,
        },
        {
          label: '贸易政策倾向民生消费或文化集市',
          satisfied:
            policy?.tradePolicy === 'consumer' || policy?.tradePolicy === 'unity',
          weight: 18,
        },
      ],
    },
    {
      id: 'fac_wallfacers',
      name: '面壁国防强硬派',
      ideology: '军事威慑派',
      color: '#fb7185',
      issues: [
        {
          label: '帝国舰队总战力 ≥ 220',
          satisfied: stats.fleetPower >= 220,
          weight: 24,
        },
        {
          label: '海军学说采用饱和齐射或钢铁壁垒',
          satisfied:
            policy?.fleetDoctrine === 'firepower' ||
            policy?.fleetDoctrine === 'defense',
          weight: 18,
        },
        {
          label: '拥有至少 1 座星港或要塞级恒星基地',
          satisfied: Object.values(state.systems).some(
            (s) => s.ownerId === empireId && s.starbaseLevel >= 2
          ),
          weight: 18,
        },
      ],
    },
  ];

  return definitions.map((def) => {
    let approval = 35;
    for (const iss of def.issues) {
      if (iss.satisfied) approval += iss.weight;
    }
    approval = Math.min(100, Math.max(15, approval));

    const unityIncome = approval >= 60 ? Math.round((approval - 45) * 0.14) : 0;
    const influenceIncome =
      approval >= 75 ? 0.4 : approval >= 60 ? 0.2 : 0;

    return {
      ...def,
      approval,
      unityIncome,
      influenceIncome,
    };
  });
}
