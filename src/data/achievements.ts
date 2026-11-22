import { GameStateData } from '../types/game';

const ACH_STORAGE_KEY = 'halfstar_achievements_v1';
const HISTORY_STORAGE_KEY = 'halfstar_history_v1';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'explore' | 'economy' | 'military' | 'scifi';
  check: (state: GameStateData) => boolean;
}

export interface RunHistoryRecord {
  id: string;
  empireName: string;
  leaderName: string;
  difficulty: string;
  year: number;
  score: number;
  reason: string;
  timestamp: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_first_survey',
    title: '星海初啼',
    description: '完成首个未知星系的全面科学调查。',
    category: 'explore',
    check: (s) =>
      Object.values(s.systems).filter((sys) => sys.surveyedByPlayer).length >= 2,
  },
  {
    id: 'ach_first_outpost',
    title: '开疆拓土',
    description: '在母星星系之外建造首座恒星前哨站。',
    category: 'explore',
    check: (s) =>
      Object.values(s.systems).filter((sys) => sys.ownerId === s.playerEmpireId).length >= 2,
  },
  {
    id: 'ach_first_colony',
    title: '新世界曙光',
    description: '成功建立首颗外星殖民地。',
    category: 'economy',
    check: (s) => {
      let cols = 0;
      for (const sys of Object.values(s.systems)) {
        for (const p of sys.planets) {
          if (p.colonizedBy === s.playerEmpireId) cols++;
        }
      }
      return cols >= 2;
    },
  },
  {
    id: 'ach_first_contact',
    title: '并不孤单',
    description: '与首个智慧外星文明建立「第一次接触」。',
    category: 'explore',
    check: (s) => Object.values(s.relations).some((r) => r.discovered),
  },
  {
    id: 'ach_pirate_slayer',
    title: '肃清航道',
    description: '在星际海战中击败一支敌对舰队。',
    category: 'military',
    check: (s) => Boolean(s.lastBattleReport?.victory),
  },
  {
    id: 'ach_tech_6',
    title: '科学先驱',
    description: '累计研发完成 6 项星际科技。',
    category: 'economy',
    check: (s) => (s.empires[s.playerEmpireId]?.completedTechs.length ?? 0) >= 6,
  },
  {
    id: 'ach_tech_12',
    title: '超级技术文明',
    description: '累计研发完成 12 项星际科技。',
    category: 'economy',
    check: (s) => (s.empires[s.playerEmpireId]?.completedTechs.length ?? 0) >= 12,
  },
  {
    id: 'ach_fleet_1000',
    title: '星海无畏舰队',
    description: '帝国军事舰队总战力突破 1000。',
    category: 'military',
    check: (s) => {
      const tot = Object.values(s.fleets)
        .filter((f) => f.ownerId === s.playerEmpireId && f.shipType === 'corvette')
        .reduce((sum, f) => sum + f.power, 0);
      return tot >= 1000;
    },
  },
  {
    id: 'ach_titan',
    title: '泰坦降临',
    description: '掌握「泰坦级旗舰架构」或拥有一艘泰坦旗舰。',
    category: 'military',
    check: (s) =>
      Boolean(s.empires[s.playerEmpireId]?.completedTechs.includes('eng_titans')),
  },
  {
    id: 'ach_megastructure',
    title: '奇迹建筑师',
    description: '在己方星系竣工任意一座银河巨构工程。',
    category: 'economy',
    check: (s) =>
      Object.values(s.systems).some(
        (sys) =>
          sys.ownerId === s.playerEmpireId && sys.megastructure?.stage === 'completed'
      ),
  },
  {
    id: 'ach_gaia',
    title: '伊甸造物主',
    description: '控制或改造出一颗 100% 宜居的盖亚星球。',
    category: 'economy',
    check: (s) =>
      Object.values(s.systems).some(
        (sys) =>
          sys.ownerId === s.playerEmpireId &&
          sys.planets.some((p) => p.planetClass === 'gaia')
      ),
  },
  {
    id: 'ach_ascension',
    title: '文明飞升',
    description: '点满一条传统树并激活首个帝国飞升天赋。',
    category: 'economy',
    check: (s) =>
      (s.empires[s.playerEmpireId]?.unlockedAscensions.length ?? 0) >= 1,
  },
  {
    id: 'ach_swordholder',
    title: '第一任执剑人',
    description: '以罗辑开局，或研发「引力波宇宙广播」建立黑暗森林威慑。',
    category: 'scifi',
    check: (s) =>
      s.config.leaderId === 'une_luoji' &&
      (s.date.year >= 2202 ||
        Boolean(
          s.empires[s.playerEmpireId]?.completedTechs.includes(
            'phy_gravitational_broadcast'
          )
        )),
  },
  {
    id: 'ach_ahead_four',
    title: '自然选择，前进四！',
    description: '以章北海完成远航事件，或研发「光速曲率引擎」。',
    category: 'scifi',
    check: (s) =>
      s.firedEventIds.includes('ev_zbh_2') ||
      Boolean(s.empires[s.playerEmpireId]?.completedTechs.includes('phy_curvature_drive')),
  },
  {
    id: 'ach_droplet',
    title: '强互作用力水滴',
    description: '触发「水滴探测器」事件或研发「强互作用力材料」。',
    category: 'scifi',
    check: (s) =>
      s.firedEventIds.includes('ev_droplet_probe') ||
      Boolean(
        s.empires[s.playerEmpireId]?.completedTechs.includes(
          'eng_strong_interaction_armor'
        )
      ),
  },
  {
    id: 'ach_empire_10',
    title: '星海疆域',
    description: '将至少 10 个星系纳入帝国版图。',
    category: 'explore',
    check: (s) =>
      Object.values(s.systems).filter((sys) => sys.ownerId === s.playerEmpireId).length >= 10,
  },
  {
    id: 'ach_crisis_slayer',
    title: '天灾终结者',
    description: '正面击溃「虚空撕裂者」异次元入侵舰队。',
    category: 'military',
    check: (s) => s.crisis.defeated,
  },
  {
    id: 'ach_galactic_victor',
    title: '银河霸主',
    description: '达成任意胜利条件赢得整局战役。',
    category: 'military',
    check: (s) => Boolean(s.victory?.achieved),
  },
];

export function loadUnlockedAchievements(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ACH_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function checkAndUnlockAchievements(state: GameStateData): AchievementDef[] {
  const unlocked = loadUnlockedAchievements();
  const newlyUnlocked: AchievementDef[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked[ach.id]) continue;
    if (ach.check(state)) {
      unlocked[ach.id] = Date.now();
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
      // ignore
    }
  }
  return newlyUnlocked;
}

export function loadRunHistory(): RunHistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RunHistoryRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recordRunHistory(state: GameStateData, score: number, reason: string): void {
  try {
    const history = loadRunHistory();
    const emp = state.empires[state.playerEmpireId];
    const id = `run_${state.config.seed}_${state.date.year}`;
    if (history.some((h) => h.id === id)) return;
    const rec: RunHistoryRecord = {
      id,
      empireName: emp?.name ?? '星际帝国',
      leaderName: emp?.leaderName ?? '执政官',
      difficulty: state.config.difficulty ?? 'ensign',
      year: state.date.year,
      score,
      reason,
      timestamp: Date.now(),
    };
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([rec, ...history].slice(0, 20)));
  } catch {
    // ignore
  }
}
