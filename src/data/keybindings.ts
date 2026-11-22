export type KeyActionId =
  | 'togglePause'
  | 'speed1'
  | 'speed2'
  | 'speed3'
  | 'speed4'
  | 'toggleView'
  | 'focusHome'
  | 'searchGalaxy'
  | 'quickHelp'
  | 'camForward'
  | 'camBackward'
  | 'camLeft'
  | 'camRight'
  | 'drawerTech'
  | 'drawerMarket'
  | 'drawerShips'
  | 'drawerDiplomacy'
  | 'drawerTraditions'
  | 'drawerSituation';

export type KeyCategory = 'time_view' | 'camera' | 'panels';

export interface KeyActionMeta {
  id: KeyActionId;
  name: string;
  category: KeyCategory;
  defaultCode: string;
  desc: string;
}

export const KEY_CATEGORIES: Array<{ id: KeyCategory; label: string; icon: string }> = [
  { id: 'time_view', label: '时间与视角控制', icon: '⏱️' },
  { id: 'camera', label: '星图镜头平移', icon: '🎥' },
  { id: 'panels', label: '帝国管理面板', icon: '🏛️' },
];

export const KEY_ACTIONS: KeyActionMeta[] = [
  // 时间与视角
  { id: 'togglePause', name: '暂停 / 继续', category: 'time_view', defaultCode: 'Space', desc: '控制宇宙演化时间的暂停与流逝' },
  { id: 'speed1', name: '1x 流速', category: 'time_view', defaultCode: 'Digit1', desc: '正常时间流速' },
  { id: 'speed2', name: '2x 流速', category: 'time_view', defaultCode: 'Digit2', desc: '快速时间流速' },
  { id: 'speed3', name: '3x 流速', category: 'time_view', defaultCode: 'Digit3', desc: '极速时间流速' },
  { id: 'speed4', name: '4x 流速', category: 'time_view', defaultCode: 'Digit4', desc: '最高时间流速' },
  { id: 'toggleView', name: '切换视角', category: 'time_view', defaultCode: 'KeyE', desc: '在银河星图与当前选中的 3D 星系间切换' },
  { id: 'focusHome', name: '视角回母星', category: 'time_view', defaultCode: 'Home', desc: '镜头秒回帝国初始母星系并进入银河视图' },
  { id: 'searchGalaxy', name: '全局搜索', category: 'time_view', defaultCode: 'KeyF', desc: '快速调出星系与巨构全文检索弹窗' },
  { id: 'quickHelp', name: '快捷键速查', category: 'time_view', defaultCode: 'Slash', desc: '随时在局内弹出快捷键速查表' },

  // 镜头平移
  { id: 'camForward', name: '镜头前移', category: 'camera', defaultCode: 'KeyW', desc: '星图镜头向前平移（方向键 ↑ 始终作为备用）' },
  { id: 'camBackward', name: '镜头后移', category: 'camera', defaultCode: 'KeyS', desc: '星图镜头向后平移（方向键 ↓ 始终作为备用）' },
  { id: 'camLeft', name: '镜头左移', category: 'camera', defaultCode: 'KeyA', desc: '星图镜头向左平移（方向键 ← 始终作为备用）' },
  { id: 'camRight', name: '镜头右移', category: 'camera', defaultCode: 'KeyD', desc: '星图镜头向右平移（方向键 → 始终作为备用）' },

  // 帝国抽屉
  { id: 'drawerTech', name: '科研抽屉', category: 'panels', defaultCode: 'F1', desc: '物理/社会/工程三系科技研发抽卡' },
  { id: 'drawerMarket', name: '银河集市', category: 'panels', defaultCode: 'F2', desc: '基础物资买卖与战略资源贸易' },
  { id: 'drawerShips', name: '舰船设计', category: 'panels', defaultCode: 'F3', desc: '军舰装配、模块替换与舰队升级' },
  { id: 'drawerDiplomacy', name: '星际外交', category: 'panels', defaultCode: 'F4', desc: 'AI 帝国联络、朝贡、宣战与情报间谍' },
  { id: 'drawerTraditions', name: '帝国传统', category: 'panels', defaultCode: 'F5', desc: '传统树飞升天赋树点选' },
  { id: 'drawerSituation', name: '局势日志', category: 'panels', defaultCode: 'F6', desc: '天灾倒计时、里程碑与帝国法令' },
];

export const DEFAULT_KEYBINDINGS: Record<KeyActionId, string> = KEY_ACTIONS.reduce(
  (acc, item) => {
    acc[item.id] = item.defaultCode;
    return acc;
  },
  {} as Record<KeyActionId, string>
);

/**
 * Human-friendly key display name
 */
export function formatKeyCode(code: string): string {
  if (!code) return '未绑定';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  switch (code) {
    case 'Space':
      return '空格 (Space)';
    case 'Slash':
      return '/ (?)';
    case 'Backquote':
      return '` (~)';
    case 'Minus':
      return '-';
    case 'Equal':
      return '=';
    case 'BracketLeft':
      return '[';
    case 'BracketRight':
      return ']';
    case 'Backslash':
      return '\\';
    case 'Semicolon':
      return ';';
    case 'Quote':
      return "'";
    case 'Comma':
      return ',';
    case 'Period':
      return '.';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'Enter':
      return '回车 (Enter)';
    case 'Tab':
      return 'Tab';
    case 'Home':
      return 'Home';
    case 'End':
      return 'End';
    case 'PageUp':
      return 'PgUp';
    case 'PageDown':
      return 'PgDn';
    case 'Insert':
      return 'Ins';
    case 'Delete':
      return 'Del';
    default:
      return code;
  }
}
