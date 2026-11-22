import { DifficultyId, GameStateData } from '../types/game';

const AUTOSAVE_KEY = 'halfstar_autosave_v1';
const MANUAL_SAVES_KEY = 'halfstar_manual_saves_v1';
const SETTINGS_KEY = 'halfstar_settings_v1';

export interface SaveSlotMeta {
  id: string;
  name: string;
  empireName: string;
  leaderName: string;
  year: number;
  month: number;
  day: number;
  difficulty: DifficultyId;
  savedAt: number;
  isAuto?: boolean;
}

export interface SaveSlotRecord extends SaveSlotMeta {
  data: GameStateData;
}

export interface GameSettings {
  sfxEnabled: boolean;
  sfxVolume: number; // 0..1
  bgmEnabled: boolean;
  bgmVolume: number; // 0..1
  autoPauseOnEvent: boolean;
  autoSaveYearly: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  sfxVolume: 0.35,
  bgmEnabled: true,
  bgmVolume: 0.28,
  autoPauseOnEvent: true,
  autoSaveYearly: true,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

function buildMeta(id: string, name: string, game: GameStateData, isAuto = false): SaveSlotMeta {
  const emp = game.empires[game.playerEmpireId];
  return {
    id,
    name,
    empireName: emp?.name ?? '未知帝国',
    leaderName: emp?.leaderName ?? '执政官',
    year: game.date.year,
    month: game.date.month,
    day: game.date.day,
    difficulty: game.config.difficulty ?? 'ensign',
    savedAt: Date.now(),
    isAuto,
  };
}

export function saveAutoSave(game: GameStateData): boolean {
  try {
    const rec: SaveSlotRecord = {
      ...buildMeta('autosave', '自动存档', game, true),
      data: game,
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

export function migrateGameState(raw: GameStateData): GameStateData {
  if (!raw.crisis) {
    raw.crisis = { triggered: false, defeated: false, portalSystemId: null, startedYear: 0 };
  }
  if (!raw.galacticCommunity) {
    raw.galacticCommunity = {
      founded: false,
      custodianEmpireId: null,
      passedResolutions: [],
      activeProposalId: null,
      voteDaysLeft: 0,
      playerVote: 'abstain',
    };
  }
  if (!raw.history) raw.history = [];
  for (const emp of Object.values(raw.empires ?? {})) {
    if (!emp.strategicResources) {
      emp.strategicResources = { volatileMotes: 0, exoticGases: 0, rareCrystals: 0, darkMatter: 0 };
    }
    if (!emp.monthlyStrategicNet) {
      emp.monthlyStrategicNet = { volatileMotes: 0, exoticGases: 0, rareCrystals: 0, darkMatter: 0 };
    }
    if (!emp.activeEdicts) emp.activeEdicts = [];
    if (!emp.officers) emp.officers = [];
    if (!emp.relics) emp.relics = [];
    if (!emp.relicCooldowns) emp.relicCooldowns = {};
    if (!emp.espionageCooldowns) emp.espionageCooldowns = {};
    if (!emp.policies) {
      emp.policies = { researchFocus: 'balanced', tradePolicy: 'wealth', fleetDoctrine: 'balanced' };
    }
  }
  return raw;
}

export function loadAutoSave(): SaveSlotRecord | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveSlotRecord;
    if (!parsed?.data?.systems) return null;
    parsed.data = migrateGameState(parsed.data);
    return parsed;
  } catch {
    return null;
  }
}

export function listManualSaves(): SaveSlotRecord[] {
  try {
    const raw = localStorage.getItem(MANUAL_SAVES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SaveSlotRecord[];
    return Array.isArray(arr)
      ? arr
          .map((s) => ({ ...s, data: s.data ? migrateGameState(s.data) : s.data }))
          .sort((a, b) => b.savedAt - a.savedAt)
      : [];
  } catch {
    return [];
  }
}

export function saveManualSlot(game: GameStateData, customName?: string): SaveSlotRecord | null {
  try {
    const existing = listManualSaves();
    const emp = game.empires[game.playerEmpireId];
    const id = `save_${Date.now()}`;
    const label =
      customName?.trim() ||
      `${emp?.name ?? '帝国'} · ${game.date.year}.${String(game.date.month).padStart(2, '0')}`;
    const rec: SaveSlotRecord = {
      ...buildMeta(id, label, game, false),
      data: game,
    };
    const next = [rec, ...existing].slice(0, 8);
    localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(next));
    return rec;
  } catch {
    return null;
  }
}

export function deleteManualSlot(id: string): void {
  try {
    const existing = listManualSaves().filter((s) => s.id !== id);
    localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function formatSavedTime(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
