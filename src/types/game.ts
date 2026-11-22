export type ResourceKey =
  | 'energy'
  | 'minerals'
  | 'food'
  | 'alloys'
  | 'consumerGoods'
  | 'research'
  | 'unity'
  | 'influence';

export type ResourcePool = Record<ResourceKey, number>;

export type StarClassId =
  | 'class_b'
  | 'class_a'
  | 'class_f'
  | 'class_g'
  | 'class_k'
  | 'class_m'
  | 'neutron_star'
  | 'pulsar'
  | 'black_hole';

export type PlanetClassId =
  | 'continental'
  | 'ocean'
  | 'tropical'
  | 'arid'
  | 'desert'
  | 'arctic'
  | 'tundra'
  | 'gaia'
  | 'gas_giant'
  | 'barren'
  | 'molten'
  | 'frozen'
  | 'toxic'
  | 'asteroid';

export type DepositType = 'energy' | 'minerals' | 'research' | 'alloys';

export type StrategicResourceKey =
  | 'volatileMotes'
  | 'exoticGases'
  | 'rareCrystals'
  | 'darkMatter';

export type StrategicResourcePool = Record<StrategicResourceKey, number>;

export type MegastructureType =
  | 'dyson_sphere'
  | 'matter_decompressor'
  | 'science_nexus'
  | 'mega_shipyard'
  | 'sentry_array';

export interface MegastructureState {
  type: MegastructureType;
  stage: 'building' | 'completed';
  progress: number;
  totalDays: number;
}

export interface TerraformingState {
  targetClass: PlanetClassId;
  progress: number;
  totalDays: number;
}

export interface Deposit {
  type: DepositType;
  amount: number;
}

export type DistrictType = 'city' | 'generator' | 'mining' | 'farming';

export type BuildingId =
  | 'alloy_foundry'
  | 'civilian_industries'
  | 'research_lab'
  | 'holotheater'
  | 'monument'
  | 'stronghold'
  | 'gene_clinic'
  | 'energy_grid'
  | 'mineral_purification'
  | 'strategic_refinery';

export interface BuildQueueItem {
  id: string;
  kind: 'district' | 'building';
  targetId: DistrictType | BuildingId;
  progress: number;
  totalDays: number;
}

export type PlanetDesignation =
  | 'balanced'
  | 'generator'
  | 'mining'
  | 'farming'
  | 'forge'
  | 'research'
  | 'fortress';

export interface ColonyData {
  districts: Record<DistrictType, number>;
  buildings: BuildingId[];
  buildingLevels?: Record<number, 1 | 2 | 3>;
  buildQueue: BuildQueueItem[];
  popGrowthProgress: number; // 0..100
  designation?: PlanetDesignation;
  autoManage?: boolean;
  // Computed monthly/on-update stats
  habitability: number; // 0..100
  housing: number;
  amenities: number;
  stability: number; // 0..100
  maxBuildingSlots: number;
  monthlyNet: ResourcePool;
}

export interface Planet {
  id: string;
  systemId: string;
  name: string;
  planetClass: PlanetClassId;
  orbitIndex: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  visualRadius: number;
  size: number; // Max districts capacity (10-25)
  habitable: boolean;
  surveyed: boolean;
  deposit: Deposit | null;
  stationType: 'none' | 'mining' | 'research';
  colonizedBy: string | null;
  colonizingProgress: number | null;
  terraforming?: TerraformingState | null;
  popCount: number;
  colony: ColonyData | null;
  hasRings: boolean;
  ringColor?: string;
  textureSeed: number;
}

export interface ArchaeologicalSite {
  relicId: string;
  siteName: string;
  stage: 'undiscovered' | 'excavating' | 'completed';
  progress: number; // 0..100
}

export interface GalacticCommunityState {
  founded: boolean;
  custodianEmpireId: string | null;
  passedResolutions: string[];
  activeProposalId: string | null;
  voteDaysLeft: number;
  playerVote: 'yes' | 'no' | 'abstain';
}

export interface HistoryPoint {
  year: number;
  playerScore: number;
  playerPower: number;
  playerResearch: number;
  topAiScore: number;
}

export interface StarSystem {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  starClass: StarClassId;
  planets: Planet[];
  hyperlanes: string[];
  ownerId: string | null;
  starbaseLevel: 0 | 1 | 2 | 3 | 4;
  defensePlatforms?: number;
  starbaseHp?: number;
  starbaseMaxHp?: number;
  siegeProgress?: number; // 0..100 when bombarding an enemy colonized system
  shipyardQueue: ShipyardQueueItem[];
  surveyedByPlayer: boolean;
  exploredByPlayer: boolean;
  isHomeworld: boolean;
  hasNebula: boolean;
  strategicDeposit?: { type: StrategicResourceKey; amount: number } | null;
  megastructure?: MegastructureState | null;
  archSite?: ArchaeologicalSite | null;
  hasGateway?: boolean;
  enclave?: { type: 'curator' | 'trader'; name: string } | null;
  anomalyDiscovered: boolean;
  anomalyName?: string;
}

export type ShipType = 'science' | 'construction' | 'corvette';

export type ShipHullClass = 'corvette' | 'destroyer' | 'cruiser' | 'battleship' | 'titan';
export type WeaponType = string;
export type DefenseType = string;

export interface ShipDesign {
  hullClass: ShipHullClass;
  name: string;
  weapons: WeaponType[];
  defenses: DefenseType[];
}

export interface ShipInstance {
  id: string;
  hullClass: ShipHullClass;
  designName: string;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  armor: number;
  maxArmor: number;
  evasion: number;
  weapons: WeaponType[];
  power: number;
}

export interface ShipyardQueueItem {
  id: string;
  shipKind: 'science' | 'construction' | ShipHullClass;
  progress: number;
  totalDays: number;
  alloyCost: number;
}

export interface CombatShotVfx {
  id: string;
  fromFleetId: string;
  toFleetId: string;
  color: string;
  weaponType: WeaponType;
  createdDay: number;
}

export interface ActiveBattle {
  id: string;
  systemId: string;
  attackerFleetIds: string[];
  defenderFleetIds: string[];
  startedDay: number;
  attackerLosses: number;
  defenderLosses: number;
  recentShots: CombatShotVfx[];
}

export interface BattleReport {
  id: string;
  systemId: string;
  systemName: string;
  victory: boolean;
  playerLosses: number;
  enemyLosses: number;
  salvageAlloys: number;
  salvageResearch: number;
  day: number;
}

export type FleetOrder =
  | {
      type: 'move';
      targetSystemId: string;
      path: string[];
    }
  | {
      type: 'survey';
      targetSystemId: string;
      targetPlanetId?: string;
      progress: number;
    }
  | {
      type: 'build_outpost';
      targetSystemId: string;
      progress: number;
      /** Cost actually charged when the order was issued (used for refunds). */
      paidAlloys?: number;
      paidInfluence?: number;
    }
  | {
      type: 'build_stations';
      targetSystemId: string;
      stationKind: 'mining' | 'research';
      targetPlanetId?: string;
      progress: number;
    };

export interface Fleet {
  id: string;
  name: string;
  ownerId: string;
  shipType: ShipType;
  shipCount: number;
  power: number;
  ships: ShipInstance[];
  isHostile?: boolean;
  leviathanId?: string;
  inCombat?: boolean;
  systemId: string;
  localX: number;
  localZ: number;
  inTransit: boolean;
  transitFromId: string | null;
  transitToId: string | null;
  transitProgress: number;
  orders: FleetOrder[];
  autoSurvey: boolean;
  autoBuild?: boolean;
  evasive?: boolean;
  officerId?: string | null;
  statusText: string;
}

export interface ResourceBreakdownItem {
  label: string;
  amount: number;
}

export type TechBranch = 'physics' | 'society' | 'engineering';

export type TechCategory =
  | 'computing'
  | 'field_manipulation'
  | 'particles'
  | 'biology'
  | 'military_theory'
  | 'new_worlds'
  | 'statecraft'
  | 'psionics'
  | 'industry'
  | 'materials'
  | 'propulsion'
  | 'voidcraft';

export type TechTier = 1 | 2 | 3 | 4 | 5;

export interface EmpireModifiers {
  energyMult: number;
  mineralsMult: number;
  foodMult: number;
  alloysMult: number;
  consumerGoodsMult: number;
  researchMult: number;
  unityMult: number;
  popGrowthMult: number;
  habitabilityBonus: number;
  outpostInfluenceDiscount: number;
  stationOutputMult: number;
  shipHullBonus: number;
  shipWeaponBonus: number;
  shipShieldBonus: number;
  shipArmorBonus: number;
  shipSpeedMult: number;
  shipEvasionBonus: number;
  shipBuildSpeedMult: number;
  fleetCapBonus: number;
  diplomaticWeightMult: number;
}

export interface BranchResearchState {
  activeTechId: string | null;
  progress: number;
  options: string[];
}

export type MarketCommodity = 'minerals' | 'food' | 'alloys' | 'consumerGoods';

export interface MarketState {
  prices: Record<MarketCommodity, number>;
}

export type AIPersonality =
  | 'federation_builders'
  | 'hegemonic_imperialists'
  | 'erudite_explorers'
  | 'megacorp_traders'
  | 'fanatic_purifiers';

export interface DiplomaticRelation {
  empireId: string;
  discovered: boolean;
  opinion: number; // -100..100
  nonAggression: boolean;
  researchPact: boolean;
  commercialPact: boolean;
  isVassal?: boolean;
  inFederation?: boolean;
  atWar: boolean;
  warStartedDay: number;
  playerWarExhaustion: number; // 0..100
  aiWarExhaustion: number; // 0..100
}

export type OfficerRole = 'admiral' | 'scientist';

export interface EmpireOfficer {
  id: string;
  templateId: string;
  name: string;
  role: OfficerRole;
  traitName: string;
  traitSummary: string;
  level: number; // 1..5
  xp: number; // 0..100 per level
  assignedFleetId: string | null;
  weaponBonus: number;
  hullBonus: number;
  evasionBonus: number;
  researchBonus: number;
  isEasterEgg?: boolean;
}

export interface EmpirePolicies {
  researchFocus: 'balanced' | 'physics' | 'society' | 'engineering';
  tradePolicy: 'wealth' | 'consumer' | 'unity';
  fleetDoctrine: 'balanced' | 'firepower' | 'maneuver' | 'defense';
}

export interface Empire {
  id: string;
  name: string;
  adjective: string;
  color: string;
  secondaryColor: string;
  isPlayer: boolean;
  isFallenEmpire?: boolean;
  awakened?: boolean;
  leaderName?: string;
  leaderTitle?: string;
  speciesName?: string;
  personality?: AIPersonality;
  ethicsLabel?: string;
  greeting?: string;
  homeSystemId: string;
  startingBonusModifiers?: Partial<EmpireModifiers>;
  deterrenceBonus?: number;
  marketFeeDiscount?: number;
  isMachineEmpire?: boolean;
  resources: ResourcePool;
  monthlyIncome: ResourcePool;
  monthlyUpkeep: ResourcePool;
  monthlyNet: ResourcePool;
  incomeDetails: Record<ResourceKey, ResourceBreakdownItem[]>;
  upkeepDetails: Record<ResourceKey, ResourceBreakdownItem[]>;
  completedTechs: string[];
  repeatableLevels?: Record<string, number>;
  unlockedTraditions: string[];
  unlockedAscensions: string[];
  activeEdicts?: string[];
  policies?: EmpirePolicies;
  espionageCooldowns?: Record<string, number>;
  curatorResearchUntilDay?: number;
  curatorLeviathanIntel?: boolean;
  becomeCrisisStage?: 0 | 1 | 2 | 3 | 4;
  rallySystemId?: string | null;
  officers?: EmpireOfficer[];
  relics?: string[];
  relicCooldowns?: Record<string, number>; // totalDays when ready again
  strategicResources?: StrategicResourcePool;
  monthlyStrategicNet?: StrategicResourcePool;
  research: Record<TechBranch, BranchResearchState>;
  modifiers: EmpireModifiers;
  shipDesigns: Record<ShipHullClass, ShipDesign>;
}

export interface NarrativeEventChoice {
  id: string;
  label: string;
  effectText: string;
  resourceDelta?: Partial<ResourcePool>;
  spawnCorvettes?: number;
}

export interface NarrativeEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'anomaly' | 'galactic' | 'crisis';
  description: string;
  systemId?: string;
  choices: NarrativeEventChoice[];
}

export interface CrisisState {
  triggered: boolean;
  defeated: boolean;
  portalSystemId: string | null;
  startedYear: number;
  khanTriggered?: boolean;
  khanDefeated?: boolean;
}

export interface VictoryState {
  achieved: boolean;
  reason: string;
  score: number;
  year: number;
}

export interface AlertItem {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'discovery';
  title: string;
  detail: string;
  systemId?: string;
  fleetId?: string;
  planetId?: string;
  openDrawer?: ActiveDrawer;
  day: number;
}

export type GalaxyShape = 'spiral' | 'elliptical' | 'ring';
export type GalaxySize = 'small' | 'medium' | 'large';
export type DifficultyId = 'cadet' | 'ensign' | 'captain' | 'admiral';
export type HyperlaneDensity = 'sparse' | 'normal' | 'dense';
export type AppScreen = 'title' | 'setup' | 'playing';

export interface GalaxyConfig {
  size: GalaxySize;
  shape: GalaxyShape;
  seed: number;
  difficulty?: DifficultyId;
  aiCount?: number;
  hyperlaneDensity?: HyperlaneDensity;
  crisisYear?: number; // 0 = disabled
  empirePresetId?: string;
  leaderId?: string;
  customEmpireName?: string;
  customLeaderName?: string;
  customColor?: string;
  customHomeworldName?: string;
  selectedTraitIds?: string[];
}

export type ViewMode = 'galaxy' | 'system';
export type MapMode = 'empire' | 'diplomacy' | 'habitability';

export type ActiveDrawer =
  | 'none'
  | 'tech'
  | 'market'
  | 'ship_designer'
  | 'diplomacy'
  | 'traditions'
  | 'situation';

export type SelectionTarget =
  | { type: 'system'; id: string }
  | { type: 'planet'; id: string; systemId: string }
  | { type: 'fleet'; id: string }
  | null;

export interface GameDate {
  year: number;
  month: number;
  day: number;
  totalDays: number;
}

export interface GameStateData {
  config: GalaxyConfig;
  date: GameDate;
  paused: boolean;
  speed: 1 | 2 | 3 | 4;
  systems: Record<string, StarSystem>;
  systemOrder: string[];
  empires: Record<string, Empire>;
  playerEmpireId: string;
  fleets: Record<string, Fleet>;
  battles: Record<string, ActiveBattle>;
  lastBattleReport: BattleReport | null;
  relations: Record<string, DiplomaticRelation>;
  market: MarketState;
  activeEvent: NarrativeEvent | null;
  firedEventIds: string[];
  crisis: CrisisState;
  victory: VictoryState | null;
  galacticCommunity?: GalacticCommunityState;
  history?: HistoryPoint[];
  alerts: AlertItem[];
}
