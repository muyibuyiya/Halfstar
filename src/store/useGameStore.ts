import { create } from 'zustand';
import {
  ActiveDrawer,
  AppScreen,
  BuildingId,
  DefenseType,
  DistrictType,
  EmpirePolicies,
  GalaxyConfig,
  GameStateData,
  MapMode,
  MarketCommodity,
  MegastructureType,
  PlanetClassId,
  PlanetDesignation,
  SelectionTarget,
  ShipHullClass,
  TechBranch,
  ViewMode,
  WeaponType,
} from '../types/game';
import { generateGalaxy } from '../engine/galaxyGenerator';
import { advanceOneDay } from '../engine/simulation';
import {
  activateRelic,
  advanceBecomeCrisis,
  assignAdmiralToFleet,
  buildDefensePlatform,
  buildGateway,
  buyCuratorService,
  buyTraderStrategic,
  cancelBuildQueueItem,
  cancelShipBuild,
  castCommunityVote,
  chooseResearch,
  CommandResult,
  diplomacyDeclareWar,
  diplomacyDemandVassal,
  diplomacyFormFederation,
  diplomacyImproveRelations,
  diplomacyOfferPeace,
  diplomacySendGift,
  diplomacyTogglePact,
  executeMarketTrade,
  forceTriggerCrisis,
  issueBuildOutpostOrder,
  issueBuildStationsOrder,
  issueMoveOrder,
  issueReturnToStarportOrder,
  issueSurveyOrder,
  mergeFleetsInSystem,
  proposeResolution,
  queueBuilding,
  queueDistrict,
  queueShipBuild,
  recruitOfficer,
  reinforceFleetFromStarport,
  resettlePop,
  resolveNarrativeEvent,
  runEspionageOp,
  setEmpirePolicy,
  setEmpireRallyPoint,
  setPlanetDesignation,
  startColonization,
  startExcavation,
  startMegastructure,
  startTerraforming,
  toggleAutoBuild,
  toggleAutoSurvey,
  toggleEdict,
  toggleFleetEvasive,
  togglePlanetAutoManage,
  unlockAscension,
  unlockTradition,
  updateShipDesign,
  upgradeColonyBuilding,
  upgradeFleetAtStarport,
  upgradeToStarport,
} from '../engine/commands';
import { checkAndUnlockAchievements } from '../data/achievements';
import { bgm } from '../engine/bgm';
import {
  deleteManualSlot,
  GameSettings,
  listManualSaves,
  loadAutoSave,
  loadSettings,
  persistSettings,
  saveAutoSave,
  saveManualSlot,
  SaveSlotRecord,
} from '../engine/saveSystem';
import { setSfxConfig, sfx } from '../engine/sfx';

export interface ContextMenuState {
  screenX: number;
  screenY: number;
  systemId: string;
}

export interface CameraFocusRequest {
  systemId: string;
  nonce: number;
}

export interface ToastMessage {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface GameStore {
  screen: AppScreen;
  setupPresetId: string;
  game: GameStateData;
  tickVersion: number;

  // Global modals & settings
  settings: GameSettings;
  showPauseMenu: boolean;
  showSaveModal: 'none' | 'save' | 'load';
  showCodexModal: boolean;
  showSettingsModal: boolean;
  showGuideModal: boolean;
  showAchievementsModal: 'none' | 'achievements' | 'history';
  saveListVersion: number;

  // UI & Camera state
  viewMode: ViewMode;
  mapMode: MapMode;
  activeSystemId: string;
  selection: SelectionTarget;
  hoveredSystemId: string | null;
  contextMenu: ContextMenuState | null;
  cameraFocus: CameraFocusRequest | null;
  toast: ToastMessage | null;
  showNewGalaxyModal: boolean;
  showHyperlanes: boolean;
  showBorders: boolean;
  activeDrawer: ActiveDrawer;

  // Screen & Modal Actions
  setScreen: (screen: AppScreen) => void;
  openSetupWithEmpire: (presetId: string) => void;
  returnToTitle: () => void;
  setShowPauseMenu: (show: boolean) => void;
  setShowSaveModal: (mode: 'none' | 'save' | 'load') => void;
  setShowCodexModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowGuideModal: (show: boolean) => void;
  setShowAchievementsModal: (tab: 'none' | 'achievements' | 'history') => void;
  setMapMode: (mode: MapMode) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;

  // Actions
  newGalaxy: (config: GalaxyConfig) => void;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  toggleDrawer: (drawer: Exclude<ActiveDrawer, 'none'>) => void;
  stepDay: () => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: 1 | 2 | 3 | 4) => void;

  enterSystemView: (systemId: string) => void;
  enterGalaxyView: () => void;
  toggleViewMode: () => void;

  setSelection: (target: SelectionTarget) => void;
  setHoveredSystem: (systemId: string | null) => void;
  focusCameraOnSystem: (systemId: string) => void;

  openContextMenu: (menu: ContextMenuState | null) => void;
  dismissAlert: (alertId: string) => void;
  showToast: (text: string, kind?: ToastMessage['kind']) => void;
  setShowNewGalaxyModal: (show: boolean) => void;
  toggleHyperlanes: () => void;
  toggleBorders: () => void;

  // Fleet commands
  commandMove: (fleetId: string, systemId: string) => CommandResult;
  commandSurvey: (fleetId: string, systemId: string) => CommandResult;
  commandToggleAutoSurvey: (fleetId: string) => CommandResult;
  commandBuildOutpost: (fleetId: string, systemId: string) => CommandResult;
  commandBuildStations: (
    fleetId: string,
    systemId: string,
    kind: 'mining' | 'research'
  ) => CommandResult;

  // Phase 2: Colony, Tech & Market commands
  commandColonize: (systemId: string, planetId: string) => CommandResult;
  commandQueueDistrict: (
    systemId: string,
    planetId: string,
    districtType: DistrictType
  ) => CommandResult;
  commandQueueBuilding: (
    systemId: string,
    planetId: string,
    buildingId: BuildingId
  ) => CommandResult;
  commandCancelBuild: (systemId: string, planetId: string, itemId: string) => CommandResult;
  commandChooseResearch: (branch: TechBranch, techId: string) => CommandResult;
  commandMarketTrade: (
    commodity: MarketCommodity,
    side: 'buy' | 'sell',
    amount: number
  ) => CommandResult;

  // Phase 3: Ship Designer, Shipyard & Combat
  commandUpdateShipDesign: (
    hullClass: ShipHullClass,
    weapons: WeaponType[],
    defenses: DefenseType[]
  ) => CommandResult;
  commandUpgradeStarport: (systemId: string) => CommandResult;
  commandQueueShipBuild: (
    systemId: string,
    shipKind: 'science' | 'construction' | ShipHullClass
  ) => CommandResult;
  commandCancelShipBuild: (systemId: string, itemId: string) => CommandResult;
  dismissBattleReport: () => void;

  // Phase 4: Diplomacy & War
  commandDiplomacyImprove: (empireId: string) => CommandResult;
  commandDiplomacyGift: (empireId: string) => CommandResult;
  commandDiplomacyTogglePact: (
    empireId: string,
    pact: 'nonAggression' | 'researchPact' | 'commercialPact'
  ) => CommandResult;
  commandDiplomacyDeclareWar: (empireId: string) => CommandResult;
  commandDiplomacyOfferPeace: (empireId: string) => CommandResult;

  // Phase 5: Narrative Events, Traditions, Crisis, Victory & Save/Load
  commandResolveEvent: (choiceId: string) => CommandResult;
  commandUnlockTradition: (perkId: string) => CommandResult;
  commandUnlockAscension: (ascId: string) => CommandResult;
  commandTriggerCrisis: () => CommandResult;
  dismissVictory: () => void;
  saveToLocalStorage: (customName?: string) => void;
  loadFromLocalStorage: () => void;
  continueAutoSave: () => void;
  loadSaveRecord: (record: SaveSlotRecord) => void;
  deleteSaveRecord: (id: string) => void;
  importSaveJson: (raw: string) => void;
  commandReturnToStarport: (fleetId: string) => CommandResult;
  commandToggleEdict: (edictId: string) => CommandResult;
  commandStartTerraforming: (
    systemId: string,
    planetId: string,
    targetClass: PlanetClassId
  ) => CommandResult;
  commandStartMegastructure: (
    systemId: string,
    megaType: MegastructureType
  ) => CommandResult;
  commandMergeFleets: (fleetId: string) => CommandResult;
  commandReinforceFleet: (fleetId: string, hullClass: ShipHullClass) => CommandResult;
  // v1.3 commands
  commandBuildDefensePlatform: (systemId: string) => CommandResult;
  commandToggleAutoBuild: (fleetId: string) => CommandResult;
  commandSetPlanetDesignation: (
    systemId: string,
    planetId: string,
    designation: PlanetDesignation
  ) => CommandResult;
  commandTogglePlanetAutoManage: (systemId: string, planetId: string) => CommandResult;
  commandRecruitOfficer: (templateId: string) => CommandResult;
  commandAssignAdmiral: (officerId: string, fleetId: string | null) => CommandResult;
  commandDemandVassal: (empireId: string) => CommandResult;
  commandFormFederation: (empireId: string) => CommandResult;
  // v1.4 commands
  commandUpgradeFleet: (fleetId: string) => CommandResult;
  commandStartExcavation: (systemId: string) => CommandResult;
  commandActivateRelic: (relicId: string) => CommandResult;
  commandProposeResolution: (resolutionId: string) => CommandResult;
  commandCastVote: (vote: 'yes' | 'no' | 'abstain') => CommandResult;
  // v1.5 commands
  commandUpgradeBuilding: (
    systemId: string,
    planetId: string,
    slotIdx: number
  ) => CommandResult;
  commandSetPolicy: <K extends keyof EmpirePolicies>(
    key: K,
    value: EmpirePolicies[K]
  ) => CommandResult;
  commandEspionage: (
    targetEmpireId: string,
    op: 'steal_tech' | 'sabotage_starbase' | 'sow_discord'
  ) => CommandResult;
  commandBuildGateway: (systemId: string) => CommandResult;
  // v1.7 commands
  commandBuyCurator: (service: 'research_boost' | 'leviathan_intel') => CommandResult;
  commandBuyTrader: (
    resourceKey: 'volatileMotes' | 'exoticGases' | 'rareCrystals'
  ) => CommandResult;
  commandAdvanceBecomeCrisis: () => CommandResult;
  commandToggleFleetEvasive: (fleetId: string) => CommandResult;
  commandSetRallyPoint: (systemId: string | null) => CommandResult;
  commandResettlePop: (
    fromSysId: string,
    fromPlanetId: string,
    toSysId: string,
    toPlanetId: string
  ) => CommandResult;
}

const DEFAULT_CONFIG: GalaxyConfig = {
  size: 'medium',
  shape: 'spiral',
  seed: 22000101,
  difficulty: 'ensign',
  aiCount: 4,
  hyperlaneDensity: 'normal',
  crisisYear: 2215,
  empirePresetId: 'une',
  leaderId: 'une_linlan',
};

const initialGame = generateGalaxy(DEFAULT_CONFIG);
const initialHomeId = initialGame.empires[initialGame.playerEmpireId].homeSystemId;
const initialSettings = loadSettings();
setSfxConfig(initialSettings.sfxEnabled, initialSettings.sfxVolume);
bgm.setConfig(initialSettings.bgmEnabled, initialSettings.bgmVolume);

let toastSeq = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'title',
  setupPresetId: 'une',
  game: initialGame,
  tickVersion: 0,

  settings: initialSettings,
  showPauseMenu: false,
  showSaveModal: 'none',
  showCodexModal: false,
  showSettingsModal: false,
  showGuideModal: false,
  showAchievementsModal: 'none',
  saveListVersion: 0,

  viewMode: 'galaxy',
  mapMode: 'empire',
  activeSystemId: initialHomeId,
  selection: { type: 'fleet', id: 'flt_science_1' },
  hoveredSystemId: null,
  contextMenu: null,
  cameraFocus: { systemId: initialHomeId, nonce: 1 },
  toast: null,
  showNewGalaxyModal: false,
  showHyperlanes: true,
  showBorders: true,
  activeDrawer: 'none',

  setScreen: (screen) => {
    sfx.click();
    set({ screen, showPauseMenu: false, showSaveModal: 'none' });
  },

  openSetupWithEmpire: (presetId) => {
    sfx.click();
    set({ setupPresetId: presetId, screen: 'setup' });
  },

  returnToTitle: () => {
    const { game } = get();
    game.paused = true;
    saveAutoSave(game);
    sfx.click();
    set((s) => ({
      screen: 'title',
      showPauseMenu: false,
      showSaveModal: 'none',
      activeDrawer: 'none',
      saveListVersion: s.saveListVersion + 1,
    }));
  },

  setShowPauseMenu: (show) => {
    const { game } = get();
    if (show) game.paused = true;
    sfx.click();
    set((s) => ({ showPauseMenu: show, tickVersion: s.tickVersion + 1 }));
  },

  setShowSaveModal: (mode) => {
    sfx.click();
    set({ showSaveModal: mode });
  },

  setShowCodexModal: (show) => {
    sfx.click();
    set({ showCodexModal: show });
  },

  setShowSettingsModal: (show) => {
    sfx.click();
    set({ showSettingsModal: show });
  },

  setShowGuideModal: (show) => {
    sfx.click();
    set({ showGuideModal: show });
  },

  setShowAchievementsModal: (tab) => {
    sfx.click();
    set({ showAchievementsModal: tab });
  },

  setMapMode: (mode) => {
    sfx.click();
    set({ mapMode: mode });
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    persistSettings(next);
    setSfxConfig(next.sfxEnabled, next.sfxVolume);
    bgm.setConfig(next.bgmEnabled, next.bgmVolume);
    set({ settings: next });
  },

  newGalaxy: (config) => {
    const fresh = generateGalaxy(config);
    const homeId = fresh.empires[fresh.playerEmpireId].homeSystemId;
    saveAutoSave(fresh);
    sfx.confirm();
    set((s) => ({
      screen: 'playing',
      game: fresh,
      tickVersion: s.tickVersion + 1,
      viewMode: 'galaxy',
      activeSystemId: homeId,
      selection: { type: 'fleet', id: 'flt_science_1' },
      hoveredSystemId: null,
      contextMenu: null,
      cameraFocus: { systemId: homeId, nonce: Date.now() },
      showNewGalaxyModal: false,
      showPauseMenu: false,
      showSaveModal: 'none',
      activeDrawer: 'none',
      saveListVersion: s.saveListVersion + 1,
    }));
  },

  setActiveDrawer: (drawer) => {
    sfx.click();
    set({ activeDrawer: drawer });
  },
  toggleDrawer: (drawer) => {
    sfx.click();
    set((s) => ({ activeDrawer: s.activeDrawer === drawer ? 'none' : drawer }));
  },

  stepDay: () => {
    const { game, settings } = get();
    const prevYear = game.date.year;
    const prevEvent = game.activeEvent;
    advanceOneDay(game);
    if (!settings.autoPauseOnEvent && !prevEvent && game.activeEvent) {
      game.paused = false;
    }
    if (!prevEvent && game.activeEvent) {
      sfx.discovery();
    }
    if (settings.autoSaveYearly && game.date.year > prevYear) {
      saveAutoSave(game);
    }
    if (game.date.day === 1) {
      const newly = checkAndUnlockAchievements(game);
      if (newly.length > 0) {
        sfx.achievement();
        get().showToast(`🏆 达成星海成就：「${newly[0].title}」！`, 'success');
      }
    }
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  togglePause: () => {
    const { game } = get();
    game.paused = !game.paused;
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  setPaused: (paused) => {
    const { game } = get();
    game.paused = paused;
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  setSpeed: (speed) => {
    const { game } = get();
    game.speed = speed;
    if (game.paused) game.paused = false;
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  enterSystemView: (systemId) => {
    const { game } = get();
    if (!game.systems[systemId]) return;
    set({
      viewMode: 'system',
      activeSystemId: systemId,
      contextMenu: null,
    });
  },

  enterGalaxyView: () => {
    set({
      viewMode: 'galaxy',
      contextMenu: null,
    });
  },

  toggleViewMode: () => {
    const { viewMode, activeSystemId, selection, game } = get();
    if (viewMode === 'galaxy') {
      let targetSys = activeSystemId;
      if (selection?.type === 'system') targetSys = selection.id;
      else if (selection?.type === 'planet') targetSys = selection.systemId;
      else if (selection?.type === 'fleet') {
        const flt = game.fleets[selection.id];
        if (flt) targetSys = flt.systemId;
      }
      set({ viewMode: 'system', activeSystemId: targetSys, contextMenu: null });
    } else {
      set({ viewMode: 'galaxy', contextMenu: null });
    }
  },

  setSelection: (target) => set({ selection: target, contextMenu: null }),
  setHoveredSystem: (systemId) => set({ hoveredSystemId: systemId }),

  focusCameraOnSystem: (systemId) => {
    set({
      cameraFocus: { systemId, nonce: Date.now() + Math.random() },
    });
  },

  openContextMenu: (menu) => set({ contextMenu: menu }),

  dismissAlert: (alertId) => {
    const { game } = get();
    game.alerts = game.alerts.filter((a) => a.id !== alertId);
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  showToast: (text, kind = 'info') => {
    const id = ++toastSeq;
    set({ toast: { id, text, kind } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3200);
  },

  setShowNewGalaxyModal: (show) => set({ showNewGalaxyModal: show }),
  toggleHyperlanes: () => set((s) => ({ showHyperlanes: !s.showHyperlanes })),
  toggleBorders: () => set((s) => ({ showBorders: !s.showBorders })),

  commandMove: (fleetId, systemId) => {
    const { game, showToast } = get();
    const res = issueMoveOrder(game, fleetId, systemId);
    if (!res.ok && res.message) showToast(res.message, 'error');
    else showToast(`已下达航行指令 → ${game.systems[systemId]?.name ?? ''}`, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1, contextMenu: null }));
    return res;
  },

  commandSurvey: (fleetId, systemId) => {
    const { game, showToast } = get();
    const res = issueSurveyOrder(game, fleetId, systemId);
    if (!res.ok && res.message) showToast(res.message, 'error');
    else showToast(`已派遣科研船调查 ${game.systems[systemId]?.name ?? ''}`, 'success');
    set((s) => ({ tickVersion: s.tickVersion + 1, contextMenu: null }));
    return res;
  },

  commandToggleAutoSurvey: (fleetId) => {
    const { game, showToast } = get();
    const res = toggleAutoSurvey(game, fleetId);
    if (!res.ok && res.message) showToast(res.message, 'error');
    else {
      const flt = game.fleets[fleetId];
      showToast(flt?.autoSurvey ? '已开启自动探索模式' : '已关闭自动探索模式', 'info');
    }
    set((s) => ({ tickVersion: s.tickVersion + 1, contextMenu: null }));
    return res;
  },

  commandBuildOutpost: (fleetId, systemId) => {
    const { game, showToast } = get();
    const res = issueBuildOutpostOrder(game, fleetId, systemId);
    if (!res.ok && res.message) showToast(res.message, 'error');
    else showToast(`已派遣工程船前往 ${game.systems[systemId]?.name ?? ''} 建造前哨站`, 'success');
    set((s) => ({ tickVersion: s.tickVersion + 1, contextMenu: null }));
    return res;
  },

  commandBuildStations: (fleetId, systemId, kind) => {
    const { game, showToast } = get();
    const res = issueBuildStationsOrder(game, fleetId, systemId, kind);
    if (!res.ok && res.message) showToast(res.message, 'error');
    else {
      const label = kind === 'mining' ? '开采站' : '科研站';
      showToast(`已派遣工程船在 ${game.systems[systemId]?.name ?? ''} 建造轨道${label}`, 'success');
    }
    set((s) => ({ tickVersion: s.tickVersion + 1, contextMenu: null }));
    return res;
  },

  commandColonize: (systemId, planetId) => {
    const { game, showToast } = get();
    const res = startColonization(game, systemId, planetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandQueueDistrict: (systemId, planetId, districtType) => {
    const { game, showToast } = get();
    const res = queueDistrict(game, systemId, planetId, districtType);
    if (res.message) showToast(res.message, res.ok ? 'info' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandQueueBuilding: (systemId, planetId, buildingId) => {
    const { game, showToast } = get();
    const res = queueBuilding(game, systemId, planetId, buildingId);
    if (res.message) showToast(res.message, res.ok ? 'info' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandCancelBuild: (systemId, planetId, itemId) => {
    const { game, showToast } = get();
    const res = cancelBuildQueueItem(game, systemId, planetId, itemId);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandChooseResearch: (branch, techId) => {
    const { game, showToast } = get();
    const res = chooseResearch(game, branch, techId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandMarketTrade: (commodity, side, amount) => {
    const { game, showToast } = get();
    const res = executeMarketTrade(game, commodity, side, amount);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUpdateShipDesign: (hullClass, weapons, defenses) => {
    const { game, showToast } = get();
    const res = updateShipDesign(game, hullClass, weapons, defenses);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUpgradeStarport: (systemId) => {
    const { game, showToast } = get();
    const res = upgradeToStarport(game, systemId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandQueueShipBuild: (systemId, shipKind) => {
    const { game, showToast } = get();
    const res = queueShipBuild(game, systemId, shipKind);
    if (res.message) showToast(res.message, res.ok ? 'info' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandCancelShipBuild: (systemId, itemId) => {
    const { game, showToast } = get();
    const res = cancelShipBuild(game, systemId, itemId);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  dismissBattleReport: () => {
    const { game } = get();
    game.lastBattleReport = null;
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  commandDiplomacyImprove: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacyImproveRelations(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandDiplomacyGift: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacySendGift(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandDiplomacyTogglePact: (empireId, pact) => {
    const { game, showToast } = get();
    const res = diplomacyTogglePact(game, empireId, pact);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandDiplomacyDeclareWar: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacyDeclareWar(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'error' : 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandDiplomacyOfferPeace: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacyOfferPeace(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandResolveEvent: (choiceId) => {
    const { game, showToast } = get();
    const res = resolveNarrativeEvent(game, choiceId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUnlockTradition: (perkId) => {
    const { game, showToast } = get();
    const res = unlockTradition(game, perkId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUnlockAscension: (ascId) => {
    const { game, showToast } = get();
    const res = unlockAscension(game, ascId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandTriggerCrisis: () => {
    const { game, showToast } = get();
    const res = forceTriggerCrisis(game);
    if (res.message) showToast(res.message, res.ok ? 'error' : 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  dismissVictory: () => {
    const { game } = get();
    game.victory = null;
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
  },

  saveToLocalStorage: (customName) => {
    const { game, showToast } = get();
    const rec = saveManualSlot(game, customName);
    saveAutoSave(game);
    if (rec) {
      sfx.confirm();
      showToast(`已保存存档「${rec.name}」！`, 'success');
      set((s) => ({ saveListVersion: s.saveListVersion + 1 }));
    } else {
      sfx.error();
      showToast('保存失败：浏览器存储空间不足', 'error');
    }
  },

  loadFromLocalStorage: () => {
    const manual = listManualSaves();
    const auto = loadAutoSave();
    const target = manual[0] ?? auto;
    if (!target) {
      get().showToast('未找到本地存档', 'error');
      return;
    }
    get().loadSaveRecord(target);
  },

  continueAutoSave: () => {
    const auto = loadAutoSave();
    if (!auto) {
      get().showToast('暂无自动存档，请先开始新游戏', 'error');
      return;
    }
    get().loadSaveRecord(auto);
  },

  loadSaveRecord: (record) => {
    const parsed = JSON.parse(JSON.stringify(record.data)) as GameStateData;
    const homeId = parsed.empires[parsed.playerEmpireId]?.homeSystemId ?? parsed.systemOrder[0];
    sfx.confirm();
    set((s) => ({
      screen: 'playing',
      game: parsed,
      tickVersion: s.tickVersion + 1,
      viewMode: 'galaxy',
      activeSystemId: homeId,
      selection: null,
      activeDrawer: 'none',
      showPauseMenu: false,
      showSaveModal: 'none',
      cameraFocus: { systemId: homeId, nonce: Date.now() },
    }));
    get().showToast(`已读取存档「${record.name}」`, 'success');
  },

  deleteSaveRecord: (id) => {
    deleteManualSlot(id);
    sfx.click();
    set((s) => ({ saveListVersion: s.saveListVersion + 1 }));
    get().showToast('已删除存档', 'info');
  },

  importSaveJson: (raw) => {
    try {
      const parsed = JSON.parse(raw) as GameStateData;
      if (!parsed.systems || !parsed.empires) throw new Error('invalid');
      const homeId = parsed.empires[parsed.playerEmpireId]?.homeSystemId ?? parsed.systemOrder[0];
      sfx.confirm();
      set((s) => ({
        screen: 'playing',
        game: parsed,
        tickVersion: s.tickVersion + 1,
        viewMode: 'galaxy',
        activeSystemId: homeId,
        selection: null,
        activeDrawer: 'none',
        showPauseMenu: false,
        showSaveModal: 'none',
        cameraFocus: { systemId: homeId, nonce: Date.now() },
      }));
      get().showToast(`已导入存档（${parsed.date.year}年）`, 'success');
    } catch {
      sfx.error();
      get().showToast('导入失败：无效的 Halfstar 存档文件', 'error');
    }
  },

  commandReturnToStarport: (fleetId) => {
    const { game, showToast } = get();
    const res = issueReturnToStarportOrder(game, fleetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandToggleEdict: (edictId) => {
    const { game, showToast } = get();
    const res = toggleEdict(game, edictId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandStartTerraforming: (systemId, planetId, targetClass) => {
    const { game, showToast } = get();
    const res = startTerraforming(game, systemId, planetId, targetClass);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandStartMegastructure: (systemId, megaType) => {
    const { game, showToast } = get();
    const res = startMegastructure(game, systemId, megaType);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandMergeFleets: (fleetId) => {
    const { game, showToast } = get();
    const res = mergeFleetsInSystem(game, fleetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandReinforceFleet: (fleetId, hullClass) => {
    const { game, showToast } = get();
    const res = reinforceFleetFromStarport(game, fleetId, hullClass);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandBuildDefensePlatform: (systemId) => {
    const { game, showToast } = get();
    const res = buildDefensePlatform(game, systemId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandToggleAutoBuild: (fleetId) => {
    const { game, showToast } = get();
    const res = toggleAutoBuild(game, fleetId);
    if (res.message) showToast(res.message, res.ok ? 'info' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandSetPlanetDesignation: (systemId, planetId, designation) => {
    const { game, showToast } = get();
    const res = setPlanetDesignation(game, systemId, planetId, designation);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandTogglePlanetAutoManage: (systemId, planetId) => {
    const { game, showToast } = get();
    const res = togglePlanetAutoManage(game, systemId, planetId);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandRecruitOfficer: (templateId) => {
    const { game, showToast } = get();
    const res = recruitOfficer(game, templateId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandAssignAdmiral: (officerId, fleetId) => {
    const { game, showToast } = get();
    const res = assignAdmiralToFleet(game, officerId, fleetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandDemandVassal: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacyDemandVassal(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandFormFederation: (empireId) => {
    const { game, showToast } = get();
    const res = diplomacyFormFederation(game, empireId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUpgradeFleet: (fleetId) => {
    const { game, showToast } = get();
    const res = upgradeFleetAtStarport(game, fleetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandStartExcavation: (systemId) => {
    const { game, showToast } = get();
    const res = startExcavation(game, systemId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandActivateRelic: (relicId) => {
    const { game, showToast } = get();
    const res = activateRelic(game, relicId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandProposeResolution: (resolutionId) => {
    const { game, showToast } = get();
    const res = proposeResolution(game, resolutionId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandCastVote: (vote) => {
    const { game, showToast } = get();
    const res = castCommunityVote(game, vote);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandUpgradeBuilding: (systemId, planetId, slotIdx) => {
    const { game, showToast } = get();
    const res = upgradeColonyBuilding(game, systemId, planetId, slotIdx);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandSetPolicy: (key, value) => {
    const { game, showToast } = get();
    const res = setEmpirePolicy(game, key, value);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandEspionage: (targetEmpireId, op) => {
    const { game, showToast } = get();
    const res = runEspionageOp(game, targetEmpireId, op);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandBuildGateway: (systemId) => {
    const { game, showToast } = get();
    const res = buildGateway(game, systemId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandBuyCurator: (service) => {
    const { game, showToast } = get();
    const res = buyCuratorService(game, service);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandBuyTrader: (resourceKey) => {
    const { game, showToast } = get();
    const res = buyTraderStrategic(game, resourceKey);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandAdvanceBecomeCrisis: () => {
    const { game, showToast } = get();
    const res = advanceBecomeCrisis(game);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandToggleFleetEvasive: (fleetId) => {
    const { game, showToast } = get();
    const res = toggleFleetEvasive(game, fleetId);
    if (res.message) showToast(res.message, 'info');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandSetRallyPoint: (systemId) => {
    const { game, showToast } = get();
    const res = setEmpireRallyPoint(game, systemId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },

  commandResettlePop: (fromSysId, fromPlanetId, toSysId, toPlanetId) => {
    const { game, showToast } = get();
    const res = resettlePop(game, fromSysId, fromPlanetId, toSysId, toPlanetId);
    if (res.message) showToast(res.message, res.ok ? 'success' : 'error');
    set((s) => ({ tickVersion: s.tickVersion + 1 }));
    return res;
  },
}));
