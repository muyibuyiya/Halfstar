import { NarrativeEvent } from '../types/game';

export function createAnomalyEvent(
  systemId: string,
  systemName: string,
  anomalyName: string
): NarrativeEvent {
  return {
    id: `ev_anom_${systemId}`,
    title: `异常调查报告：${anomalyName}`,
    subtitle: `${systemName} · 科研船专项发现`,
    category: 'anomaly',
    systemId,
    description: `我们的科研船在 ${systemName} 的深空轨道发现了罕见的「${anomalyName}」。初步频谱分析显示，其中封存着来自上古星际文明的残余能量矩阵与未知合金构件。科学家团队正在等待您的处置指令：`,
    choices: [
      {
        id: 'research',
        label: '建立临时观测站，全面解析数据',
        effectText: '+140 科研储备点 · +35 凝聚力',
        resourceDelta: { research: 140, unity: 35 },
      },
      {
        id: 'salvage',
        label: '派遣工程拆解队回收稀有合金与能源',
        effectText: '+160 合金 · +200 能量币',
        resourceDelta: { alloys: 160, energy: 200 },
      },
      {
        id: 'preserve',
        label: '宣布其为星际文化遗产，向全帝国广播',
        effectText: '+120 凝聚力 · +50 影响力',
        resourceDelta: { unity: 120, influence: 50 },
      },
    ],
  };
}

export interface TimelineEventEntry {
  id: string;
  minYear: number;
  leaderFilter?: string; // matches config.leaderId
  event: NarrativeEvent;
}

export const GALACTIC_TIMELINE_EVENTS: TimelineEventEntry[] = [
  // ================= THREE-BODY EXCLUSIVE CHAINS (三体领袖专属剧情链) =================
  {
    id: 'ev_luoji_1',
    minYear: 2201,
    leaderFilter: 'une_luoji',
    event: {
      id: 'ev_luoji_1',
      title: '【三体·面壁计划】雪地工程与恒星信标',
      subtitle: '面壁者特别听证会 · 执剑人罗辑专属',
      category: 'galactic',
      description:
        '面对浩瀚而沉默的银河系，罗辑向太阳系防务理事会提交了「雪地工程」提案：在海王星轨道外围铺设数千枚氢弹与高反射率星尘云，将整颗太阳改造为一台能够向全宇宙闪烁摩斯密码的引力/电磁放大器。',
      choices: [
        {
          id: 'snow_project',
          label: '批准雪地工程，秘密构筑太阳系恒星发射阵列',
          effectText: '+150 科研点 · +80 凝聚力 · +35 影响力',
          resourceDelta: { research: 150, unity: 80, influence: 35 },
        },
        {
          id: 'fleet_focus',
          label: '同步扩充恒星防御舰队，以实力支撑威慑',
          effectText: '+160 合金 · +120 能量币 · 在首都获得 1 艘护卫舰',
          resourceDelta: { alloys: 160, energy: 120 },
          spawnCorvettes: 1,
        },
      ],
    },
  },
  {
    id: 'ev_luoji_2',
    minYear: 2203,
    leaderFilter: 'une_luoji',
    event: {
      id: 'ev_luoji_2',
      title: '【三体·咒语实验】187J3X1 恒星的毁灭回响',
      subtitle: '深空天文台绝密报告 · 执剑人罗辑专属',
      category: 'galactic',
      description:
        '深空射电望远镜刚刚确认了一个令人战栗的事实：数年前我们通过太阳放大器发射出坐标的那颗 50 光年外的恒星「187J3X1」，被一枚近光速飞行的「光粒」正面击穿毁灭！宇宙就是一座黑暗森林，每个文明都是带枪的猎人！',
      choices: [
        {
          id: 'dark_forest_proof',
          label: '宇宙社会学公理得以证实！全力研发引力波广播',
          effectText: '+260 科研点 · +120 凝聚力 · +50 影响力',
          resourceDelta: { research: 260, unity: 120, influence: 50 },
        },
        {
          id: 'bunker_project',
          label: '同时启动掩体工程，加固各殖民地与工业产能',
          effectText: '+240 矿物 · +180 合金 · +150 能量币',
          resourceDelta: { minerals: 240, alloys: 180, energy: 150 },
        },
      ],
    },
  },
  {
    id: 'ev_luoji_3',
    minYear: 2206,
    leaderFilter: 'une_luoji',
    event: {
      id: 'ev_luoji_3',
      title: '【三体·威慑纪元】引力波摇篮系统竣工',
      subtitle: '执剑人交接大典 · 执剑人罗辑专属',
      category: 'galactic',
      description:
        '三座巨型万有引力波天线在地球深空轨道落成，并与罗辑手腕上的生命体征摇篮开关相连。外星文明不得不向人类低头并共享其技术结晶，银河迎来了威慑纪元的黄金发展期！',
      choices: [
        {
          id: 'deterrence_era',
          label: '「我对三体世界说话」——全面吸收跨文明科技与军工产能',
          effectText: '+300 科研点 · +220 合金 · +150 凝聚力 · 获得 2 艘护卫舰',
          resourceDelta: { research: 300, alloys: 220, unity: 150 },
          spawnCorvettes: 2,
        },
      ],
    },
  },
  {
    id: 'ev_zbh_1',
    minYear: 2201,
    leaderFilter: 'une_zhangbeihai',
    event: {
      id: 'ev_zbh_1',
      title: '【三体·增援未来】无工质辐射驱动飞船立项',
      subtitle: '太空军特派政委 · 章北海专属',
      category: 'galactic',
      description:
        '在帝国航宇工业关于「化学工质飞船」与「无工质聚变辐射驱动飞船」的路线之争中，章北海以坚定的远见力排众议，将全部研发资源导向能够真正跨恒星远航的聚变与曲率引擎技术。',
      choices: [
        {
          id: 'fusion_drive',
          label: '全力攻关无工质聚变推进与深空休眠仓',
          effectText: '+180 科研点 · +150 合金',
          resourceDelta: { research: 180, alloys: 150 },
        },
        {
          id: 'shipyard_exp',
          label: '扩建木星轨道船坞，加速主力战舰下水',
          effectText: '+200 合金 · +150 矿物 · 获得 1 艘护卫舰',
          resourceDelta: { alloys: 200, minerals: 150 },
          spawnCorvettes: 1,
        },
      ],
    },
  },
  {
    id: 'ev_zbh_2',
    minYear: 2204,
    leaderFilter: 'une_zhangbeihai',
    event: {
      id: 'ev_zbh_2',
      title: '【三体·星舰人类】自然选择号，前进四！',
      subtitle: '深空巡航最高指令 · 章北海专属',
      category: 'galactic',
      description:
        '章北海登上旗舰「自然选择号」，将推进器功率推至最高档「前进四」，率领远征分舰队向深空未知星系进发！这一壮举彻底点燃了人类迈向银河深处的星舰文明之火。',
      choices: [
        {
          id: 'ahead_four',
          label: '「没关系的，都一样」——星舰远征队传回海量星图与舰艇',
          effectText: '获得 2 艘精锐护卫舰 · +200 科研点 · +120 凝聚力',
          resourceDelta: { research: 200, unity: 120 },
          spawnCorvettes: 2,
        },
      ],
    },
  },
  {
    id: 'ev_wade_1',
    minYear: 2201,
    leaderFilter: 'com_wade',
    event: {
      id: 'ev_wade_1',
      title: '【三体·阶梯计划】星环集团全面接管军工实验室',
      subtitle: '托马斯·维德特别授权令',
      category: 'galactic',
      description:
        '托马斯·维德用冰冷而高效的铁腕手段重组了联邦科学院与星环重工：「把你们的道德顾虑留在地面上，我只要光速飞船和反物质武器！前进！不择手段地前进！」',
      choices: [
        {
          id: 'antimatter_push',
          label: '全速推进反物质冶炼与曲率驱动研发',
          effectText: '+220 合金 · +180 科研点',
          resourceDelta: { alloys: 220, research: 180 },
        },
        {
          id: 'halo_city',
          label: '征用民间资金扩建星环城超级船坞',
          effectText: '+300 能量币 · +180 合金 · 获得 1 艘护卫舰',
          resourceDelta: { energy: 300, alloys: 180 },
          spawnCorvettes: 1,
        },
      ],
    },
  },
  {
    id: 'ev_wade_2',
    minYear: 2205,
    leaderFilter: 'com_wade',
    event: {
      id: 'ev_wade_2',
      title: '【三体·曲率航迹】星环城第一艘曲率原型舰试航',
      subtitle: '星环城最高机密 · 托马斯·维德专属',
      category: 'galactic',
      description:
        '在木星背后的秘密试验场，星环集团成功点燃了第一台空间曲率驱动引擎！紫色慢雾尾迹在深空中划出绚烂弧线，人类星际联邦正式掌握跨越星海的终极利刃。',
      choices: [
        {
          id: 'mass_produce',
          label: '立即将曲率技术投入主力舰队量产',
          effectText: '获得 3 艘护卫舰 · +240 科研点 · +200 合金',
          resourceDelta: { research: 240, alloys: 200 },
          spawnCorvettes: 3,
        },
      ],
    },
  },

  // ================= UNIVERSAL GALACTIC EVENTS (通用群星经典叙事事件) =================
  {
    id: 'ev_ancient_shipyard',
    minYear: 2202,
    event: {
      id: 'ev_ancient_shipyard',
      title: '漂流的上古自动船坞',
      subtitle: '深空巡逻紧急通讯',
      category: 'galactic',
      description:
        '一支深空侦察小队在边疆小行星带中发现了一座休眠数万年的自动化微型船坞。船坞内部仍封存着两艘完好的古代护卫舰以及大批未使用的冶炼原料。',
      choices: [
        {
          id: 'claim_ships',
          label: '重启星舰反应堆，编入我方主力舰队',
          effectText: '在首都获得 2 艘护卫舰',
          spawnCorvettes: 2,
        },
        {
          id: 'dismantle',
          label: '拆解船坞获取合金与工程蓝图',
          effectText: '+220 合金 · +120 科研点',
          resourceDelta: { alloys: 220, research: 120 },
        },
      ],
    },
  },
  {
    id: 'ev_droplet_probe',
    minYear: 2203,
    event: {
      id: 'ev_droplet_probe',
      title: '绝对光滑的银色「水滴」探测器',
      subtitle: '边境雷达高能警报',
      category: 'galactic',
      description:
        '一枚长仅三米五、呈完美水滴形状的银色探测器静静悬浮在边疆星系轨道上。即使在放大一千万倍的电子显微镜下，它的表面依然绝对光滑如镜——这是由强互作用力锁死的原子晶格！幸运的是，这枚无主探测器似乎已耗尽能源。',
      choices: [
        {
          id: 'study_droplet',
          label: '拖回首都科学院，逆向解析强互作用力材料！',
          effectText: '+240 科研点 · +80 凝聚力',
          resourceDelta: { research: 240, unity: 80 },
        },
        {
          id: 'forge_droplet',
          label: '将其高密度简并态外壳熔铸为旗舰装甲核心',
          effectText: '+240 合金 · +120 能量币',
          resourceDelta: { alloys: 240, energy: 120 },
        },
      ],
    },
  },
  {
    id: 'ev_nomad_traders',
    minYear: 2204,
    event: {
      id: 'ev_nomad_traders',
      title: '星海游牧商团造访',
      subtitle: '未知友好频道接入',
      category: 'galactic',
      description:
        '一支穿梭于悬臂之间的游牧商团舰队驶入我方星域。他们带着满载奇珍异宝的货船，愿意用一批高纯度合金或珍稀科研资料与我们进行一次友好交易。',
      choices: [
        {
          id: 'buy_alloys',
          label: '用 200 能量币采购战略合金',
          effectText: '-200 能量币 · +200 合金',
          resourceDelta: { energy: -200, alloys: 200 },
        },
        {
          id: 'buy_research',
          label: '招待商团学者，交换星海学术档案',
          effectText: '-150 能量币 · +180 科研点 · +50 凝聚力',
          resourceDelta: { energy: -150, research: 180, unity: 50 },
        },
        {
          id: 'welcome_free',
          label: '免税开放港口补给，广结善缘',
          effectText: '+100 凝聚力 · +40 影响力',
          resourceDelta: { unity: 100, influence: 40 },
        },
      ],
    },
  },
  {
    id: 'ev_subspace_storm',
    minYear: 2205,
    event: {
      id: 'ev_subspace_storm',
      title: '亚空间高能粒子风暴',
      subtitle: '全银河天体物理通报',
      category: 'galactic',
      description:
        '一股席卷数条旋臂的亚空间电磁风暴掠过帝国疆域。狂暴的粒子流虽对部分轨道电网造成波动，却也暴露出罕见的高维物理参数与富集能量团。',
      choices: [
        {
          id: 'harvest_storm',
          label: '开启轨道电容阵列，全力捕获风暴电能',
          effectText: '+350 能量币 · +100 矿物',
          resourceDelta: { energy: 350, minerals: 100 },
        },
        {
          id: 'observe_storm',
          label: '派遣科研船深入风暴眼采集亚空间数据',
          effectText: '+220 科研点 · +80 凝聚力',
          resourceDelta: { research: 220, unity: 80 },
        },
      ],
    },
  },
  {
    id: 'ev_precursor_vault',
    minYear: 2207,
    event: {
      id: 'ev_precursor_vault',
      title: '先驱者星图密库破译',
      subtitle: '帝国科学院重大突破',
      category: 'galactic',
      description:
        '经过数年破译，帝国密码学部门终于解开了散布在各大星系中的先驱者信号规律，定位到一座满载资源与凝聚力象征的古老密库！',
      choices: [
        {
          id: 'open_vault',
          label: '全面启封先驱者战略储备',
          effectText: '+320 能量币 · +320 矿物 · +200 合金',
          resourceDelta: { energy: 320, minerals: 320, alloys: 200 },
        },
        {
          id: 'study_vault',
          label: '将密库改建为帝国星海博物馆',
          effectText: '+250 科研点 · +200 凝聚力 · +65 影响力',
          resourceDelta: { research: 250, unity: 200, influence: 65 },
        },
      ],
    },
  },
  {
    id: 'ev_ringworld_ruin',
    minYear: 2209,
    event: {
      id: 'ev_ringworld_ruin',
      title: '失落的巨型环世界残骸',
      subtitle: '远征勘探队震撼发现',
      category: 'galactic',
      description:
        '在银河边缘的一颗黄矮星轨道上，勘探队发现了上古神级文明遗留的「环形世界」断裂拱段。尽管生态圈早已坍塌，其超巨型合金骨架依然令人叹为观止。',
      choices: [
        {
          id: 'salvage_ring',
          label: '组织工程船队开采环世界超合金龙骨',
          effectText: '+360 合金 · +260 矿物',
          resourceDelta: { alloys: 360, minerals: 260 },
        },
        {
          id: 'research_ring',
          label: '测绘巨构应力结构，加速我方巨构工程学突破',
          effectText: '+340 科研点 · +140 凝聚力',
          resourceDelta: { research: 340, unity: 140 },
        },
      ],
    },
  },
  {
    id: 'ev_galactic_expo',
    minYear: 2211,
    event: {
      id: 'ev_galactic_expo',
      title: '首届星海文明博览会',
      subtitle: '首都行政中心庆典',
      category: 'galactic',
      description:
        '随着帝国疆域与科技实力蒸蒸日上，首都星举办了盛大的星海文明博览会，展示最新的星舰模型、外星生态标本与量子艺术奇观，全帝国士气高涨！',
      choices: [
        {
          id: 'unity_focus',
          label: '弘扬星海共同体精神，激发全民凝聚力',
          effectText: '+260 凝聚力 · +80 影响力 · +200 消费品',
          resourceDelta: { unity: 260, influence: 80, consumerGoods: 200 },
        },
        {
          id: 'trade_focus',
          label: '借博览会吸引全银河商业投资与军工订单',
          effectText: '+450 能量币 · +220 合金',
          resourceDelta: { energy: 450, alloys: 220 },
        },
      ],
    },
  },
];
