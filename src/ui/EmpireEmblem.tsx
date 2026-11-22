import React from 'react';
import { Empire } from '../types/game';

interface EmpireEmblemProps {
  empireId: string;
  color: string;
  className?: string;
}

export function getEmblemKeyForEmpire(
  empire: Empire,
  playerPresetId?: string
): string {
  if (empire.isPlayer && playerPresetId) return playerPresetId;
  if (empire.isFallenEmpire) return 'fallen';
  if (empire.personality === 'hegemonic_imperialists') return 'hegemon';
  if (empire.personality === 'erudite_explorers') return 'erudite';
  if (empire.personality === 'federation_builders') return 'federation';
  if (empire.personality === 'megacorp_traders') return 'sunflare';
  if (empire.personality === 'fanatic_purifiers') return 'purifier';
  return 'une';
}

/**
 * Bespoke geometric sci-fi heraldic SVG emblems for each Halfstar civilization.
 */
export const EmpireEmblem: React.FC<EmpireEmblemProps> = ({
  empireId,
  color,
  className = 'w-44 h-44',
}) => {
  switch (empireId) {
    /* 1. 地球联合国：蓝色地球经纬仪 + 双侧星际橄榄枝环 + 领航北极星 */
    case 'une':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Outer dashed orbital ring */}
          <circle cx="80" cy="80" r="66" stroke={color} strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 4" />
          {/* Twin stylized olive laurel arcs */}
          <path
            d="M36 116 C22 92 24 58 44 36"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <path
            d="M124 116 C138 92 136 58 116 36"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          {/* Laurel leaf chevrons left */}
          <path d="M27 88 L19 82 M29 74 L20 68 M34 60 L26 53 M41 48 L35 40 M32 102 L23 98" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
          {/* Laurel leaf chevrons right */}
          <path d="M133 88 L141 82 M131 74 L140 68 M126 60 L134 53 M119 48 L125 40 M128 102 L137 98" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
          {/* Central Earth Globe */}
          <circle cx="80" cy="80" r="34" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2.2" />
          {/* Latitude & Longitude Grid */}
          <ellipse cx="80" cy="80" rx="16" ry="34" stroke={color} strokeWidth="1.3" strokeOpacity="0.65" />
          <line x1="80" y1="46" x2="80" y2="114" stroke={color} strokeWidth="1.2" strokeOpacity="0.55" />
          <line x1="46" y1="80" x2="114" y2="80" stroke={color} strokeWidth="1.3" strokeOpacity="0.65" />
          <path d="M51 64 Q80 71 109 64" stroke={color} strokeWidth="1.2" strokeOpacity="0.55" />
          <path d="M51 96 Q80 89 109 96" stroke={color} strokeWidth="1.2" strokeOpacity="0.55" />
          {/* Crown North Star */}
          <path
            d="M80 18 L83 28 L93 31 L83 34 L80 44 L77 34 L67 31 L77 28 Z"
            fill={color}
          />
          {/* Bottom unity ribbon */}
          <path d="M56 125 L80 134 L104 125" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    /* 2. 人类星际联邦：铁血军国星盾 + 锐利双翼 + 贯穿利剑与红星 */
    case 'com':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Outer angular military frame */}
          <polygon
            points="80,14 136,42 136,112 80,146 24,112 24,42"
            stroke={color}
            strokeOpacity="0.22"
            strokeWidth="1.2"
          />
          {/* Swept Fighter Wings */}
          <path
            d="M46 66 L14 48 L22 68 L18 82 L48 86 Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M114 66 L146 48 L138 68 L142 82 L112 86 Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Central Heraldic War Shield */}
          <path
            d="M48 44 L80 34 L112 44 L108 94 L80 124 L52 94 Z"
            fill={color}
            fillOpacity="0.16"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Vertical Sword Blade */}
          <path
            d="M80 22 L85 38 L83 116 L80 136 L77 116 L75 38 Z"
            fill={color}
            fillOpacity="0.85"
          />
          {/* Sword Crossguard */}
          <path d="M62 56 L98 56" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
          {/* Center Commander Star */}
          <polygon
            points="80,62 84,74 96,74 86,81 90,93 80,86 70,93 74,81 64,74 76,74"
            fill="#ffffff"
            fillOpacity="0.9"
            stroke={color}
            strokeWidth="1.2"
          />
        </svg>
      );

    /* 3. 瓦尔兰博学议会：三维量子原子轨道 + 灵能全视菱瞳 */
    case 'valran':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Outer arcane circle */}
          <circle cx="80" cy="80" r="62" stroke={color} strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="2 5" />
          {/* Three intersecting quantum orbital ellipses */}
          <ellipse cx="80" cy="80" rx="56" ry="22" stroke={color} strokeWidth="1.8" strokeOpacity="0.78" />
          <ellipse
            cx="80"
            cy="80"
            rx="56"
            ry="22"
            stroke={color}
            strokeWidth="1.8"
            strokeOpacity="0.78"
            transform="rotate(60 80 80)"
          />
          <ellipse
            cx="80"
            cy="80"
            rx="56"
            ry="22"
            stroke={color}
            strokeWidth="1.8"
            strokeOpacity="0.78"
            transform="rotate(120 80 80)"
          />
          {/* Psionic Eye / Prism Diamond */}
          <path
            d="M42 80 Q80 48 118 80 Q80 112 42 80 Z"
            fill={color}
            fillOpacity="0.18"
            stroke={color}
            strokeWidth="2.2"
          />
          {/* Inner Iris & Pupil */}
          <circle cx="80" cy="80" r="14" fill={color} fillOpacity="0.32" stroke={color} strokeWidth="2" />
          <polygon points="80,69 87,80 80,91 73,80" fill="#ffffff" fillOpacity="0.92" />
          {/* Orbital Electron Nodes */}
          <circle cx="136" cy="80" r="3.5" fill={color} />
          <circle cx="52" cy="31" r="3.5" fill={color} />
          <circle cx="52" cy="129" r="3.5" fill={color} />
        </svg>
      );

    /* 4. 太阳耀斑星际商盟：黄金日冕八芒星 + 星际贸易星盘双环 */
    case 'sunflare':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Outer Golden Coin / Astrolabe Ring */}
          <circle cx="80" cy="80" r="62" stroke={color} strokeWidth="2" strokeOpacity="0.45" />
          <circle cx="80" cy="80" r="52" stroke={color} strokeWidth="1.4" strokeDasharray="8 4" strokeOpacity="0.7" />
          {/* 8-Pointed Solar Flare Starburst */}
          <polygon
            points="80,18 90,56 124,36 104,70 142,80 104,90 124,124 90,104 80,142 70,104 36,124 56,90 18,80 56,70 36,36 70,56"
            fill={color}
            fillOpacity="0.24"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Inner Trade Diamond Vault */}
          <polygon
            points="80,54 106,80 80,106 54,80"
            fill={color}
            fillOpacity="0.35"
            stroke={color}
            strokeWidth="2.2"
          />
          <circle cx="80" cy="80" r="10" fill="#fffbeb" stroke={color} strokeWidth="2.5" />
          {/* Cardinal Trade Beacons */}
          <circle cx="80" cy="18" r="3.2" fill={color} />
          <circle cx="142" cy="80" r="3.2" fill={color} />
          <circle cx="80" cy="142" r="3.2" fill={color} />
          <circle cx="18" cy="80" r="3.2" fill={color} />
        </svg>
      );

    /* 5. 阿斯加德共荣体：世界树枝干 + 北境八角圣环 + 生命星叶 */
    case 'asgard':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Octagonal Sacred Nordic Ring */}
          <polygon
            points="80,16 125,35 144,80 125,125 80,144 35,125 16,80 35,35"
            fill={color}
            fillOpacity="0.08"
            stroke={color}
            strokeWidth="2"
            strokeOpacity="0.65"
          />
          <circle cx="80" cy="80" r="48" stroke={color} strokeWidth="1.4" strokeOpacity="0.45" />
          {/* Yggdrasil World Tree Trunk & Roots */}
          <path
            d="M80 126 L80 42 M80 112 L58 126 M80 112 L102 126"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Symmetrical Canopy Branches */}
          <path
            d="M80 84 C64 78 52 68 46 54 M80 84 C96 78 108 68 114 54 M80 64 C66 56 58 46 58 34 M80 64 C94 56 102 46 102 34 M80 96 C62 94 46 86 38 76 M80 96 C98 94 114 86 122 76"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Radiant Star-Leaves */}
          <circle cx="80" cy="36" r="5" fill={color} />
          <circle cx="58" cy="34" r="3.5" fill={color} />
          <circle cx="102" cy="34" r="3.5" fill={color} />
          <circle cx="46" cy="54" r="3.8" fill={color} />
          <circle cx="114" cy="54" r="3.8" fill={color} />
          <circle cx="38" cy="76" r="3.2" fill={color} />
          <circle cx="122" cy="76" r="3.2" fill={color} />
        </svg>
      );

    /* 6. 星核智械矩阵：六边形量子蜂巢 + 机械神经网络节点 */
    case 'nexus':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          {/* Outer Circuit Bus Lines */}
          <path
            d="M80 16 L80 34 M80 126 L80 144 M24 48 L40 57 M120 103 L136 112 M136 48 L120 57 M40 103 L24 112"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Outer Hexagon Matrix */}
          <polygon
            points="80,32 122,56 122,104 80,128 38,104 38,56"
            fill={color}
            fillOpacity="0.14"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Internal Neural Connections */}
          <path
            d="M80 32 L80 128 M38 56 L122 104 M122 56 L38 104"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />
          {/* Inner Processor Core Hexagon */}
          <polygon
            points="80,56 101,68 101,92 80,104 59,92 59,68"
            fill={color}
            fillOpacity="0.32"
            stroke={color}
            strokeWidth="2"
          />
          {/* Central Quantum Eye */}
          <rect
            x="72"
            y="72"
            width="16"
            height="16"
            rx="2"
            transform="rotate(45 80 80)"
            fill="#ffffff"
            fillOpacity="0.92"
            stroke={color}
            strokeWidth="2"
          />
          {/* Terminal Circuit Nodes */}
          <circle cx="80" cy="16" r="3.8" fill={color} />
          <circle cx="80" cy="144" r="3.8" fill={color} />
          <circle cx="24" cy="48" r="3.8" fill={color} />
          <circle cx="136" cy="48" r="3.8" fill={color} />
          <circle cx="24" cy="112" r="3.8" fill={color} />
          <circle cx="136" cy="112" r="3.8" fill={color} />
        </svg>
      );

    /* 7. 远古失落帝国：圣光古王冠与永恒星环 */
    case 'fallen':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <circle cx="80" cy="80" r="64" stroke={color} strokeWidth="1.6" strokeOpacity="0.4" strokeDasharray="6 3" />
          <circle cx="80" cy="80" r="52" stroke={color} strokeWidth="2" strokeOpacity="0.7" />
          <path
            d="M36 104 L46 54 L66 76 L80 40 L94 76 L114 54 L124 104 Z"
            fill={color}
            fillOpacity="0.28"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <rect x="40" y="106" width="80" height="10" rx="3" fill={color} fillOpacity="0.85" />
          <circle cx="80" cy="34" r="5" fill="#fffbeb" stroke={color} strokeWidth="2" />
          <circle cx="46" cy="48" r="3.5" fill={color} />
          <circle cx="114" cy="48" r="3.5" fill={color} />
        </svg>
      );

    /* 8. AI 霸权/扩张：交叉星刃 */
    case 'hegemon':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <polygon points="80,18 136,50 136,110 80,142 24,110 24,50" stroke={color} strokeOpacity="0.35" strokeWidth="1.8" />
          <path d="M40 120 L120 40 M120 120 L40 40" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <polygon points="80,52 108,80 80,108 52,80" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.2" />
          <circle cx="80" cy="80" r="8" fill="#ffffff" fillOpacity="0.9" />
        </svg>
      );

    /* 9. AI 学者探索：双环星轨 */
    case 'erudite':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <circle cx="80" cy="80" r="56" stroke={color} strokeOpacity="0.35" strokeWidth="1.6" />
          <ellipse cx="80" cy="80" rx="52" ry="20" stroke={color} strokeWidth="2" transform="rotate(35 80 80)" />
          <ellipse cx="80" cy="80" rx="52" ry="20" stroke={color} strokeWidth="2" transform="rotate(-35 80 80)" />
          <circle cx="80" cy="80" r="14" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="2" />
          <circle cx="80" cy="80" r="5" fill="#ffffff" />
        </svg>
      );

    /* 10. AI 和平商盟：双环天平星盘 */
    case 'federation':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <circle cx="80" cy="80" r="58" stroke={color} strokeWidth="2" strokeOpacity="0.55" />
          <circle cx="62" cy="80" r="28" stroke={color} strokeWidth="2.2" fill={color} fillOpacity="0.14" />
          <circle cx="98" cy="80" r="28" stroke={color} strokeWidth="2.2" fill={color} fillOpacity="0.14" />
          <polygon points="80,64 90,80 80,96 70,80" fill="#ffffff" fillOpacity="0.9" />
        </svg>
      );

    /* 11. AI 铁血净化：锐利破星三角印 */
    case 'purifier':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <polygon points="80,18 140,126 20,126" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />
          <polygon points="80,138 124,52 36,52" stroke={color} strokeOpacity="0.65" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="80" cy="86" r="12" fill={color} />
        </svg>
      );

    /* Fallback generic star crest */
    default:
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none">
          <circle cx="80" cy="80" r="56" stroke={color} strokeOpacity="0.3" strokeDasharray="4 4" />
          <circle cx="80" cy="80" r="36" stroke={color} strokeOpacity="0.6" strokeWidth="2" />
          <circle cx="80" cy="80" r="14" fill={color} fillOpacity="0.3" />
          <circle cx="80" cy="80" r="7" fill={color} />
        </svg>
      );
  }
};
