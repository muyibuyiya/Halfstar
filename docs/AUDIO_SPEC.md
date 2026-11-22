# Halfstar（半星）音乐与音效制作规范文档（Audio Asset Specification）

> 本文档面向专职音乐/音效制作 Agent 或音频设计师。所有产出文件按本规范命名并放入项目 `public/audio/` 目录后，Halfstar 音频引擎将**自动识别并无缝接管**（替换内置的程序化合成器回退音效）。
>
> **【最高优先级硬性红线】所有 BGM 必须严格为纯器乐（Strictly Instrumental / Zero Vocals）！严禁出现任何人声、歌词、吟唱、女声/男声合唱（Choir）、哼唱或人声采样（Vocal Chops / Ad-libs）。**

---

## 1. 目录结构与文件放置路径

```text
public/
└── audio/
    ├── bgm/
    │   ├── bgm_title.mp3           # 主界面主题曲
    │   ├── bgm_explore_1.mp3       # 星海探索 · 宁静深空 1
    │   ├── bgm_explore_2.mp3       # 星海探索 · 远航星云 2
    │   ├── bgm_empire_mid.mp3      # 帝国发展 · 宏大繁荣
    │   ├── bgm_combat.mp3          # 星际海战 · 紧张交锋
    │   ├── bgm_crisis.mp3          # 后期天灾 · 虚空降临
    │   └── bgm_victory.mp3         # 银河胜利 · 史诗凯旋
    └── sfx/
        ├── sfx_ui_click.mp3        # 常规按钮点击
        ├── sfx_ui_confirm.mp3      # 确认/保存/下达指令
        ├── sfx_ui_error.mp3        # 资源不足/操作拒绝
        ├── sfx_tech_complete.mp3   # 科技研发完成
        ├── sfx_event_popup.mp3     # 叙事事件/异常弹窗
        ├── sfx_build_complete.mp3  # 建筑/区划/前哨站竣工
        ├── sfx_colonize.mp3        # 新殖民地建立
        ├── sfx_laser_fire.mp3      # 激光/等离子开火
        ├── sfx_kinetic_fire.mp3    # 磁轨动能炮开火
        ├── sfx_missile_launch.mp3  # 太空鱼雷发射
        ├── sfx_ship_explode.mp3    # 战舰击毁爆炸
        ├── sfx_war_declared.mp3    # 宣战号角/警报
        ├── sfx_alert_warning.mp3   # 常规警告提醒
        └── sfx_achievement.mp3     # 解锁成就提示
```

---

## 2. 技术规格与编码标准

| 参数 | BGM（背景音乐） | SFX（交互与战斗音效） |
| :--- | :--- | :--- |
| **推荐格式** | `.mp3`（192~256 kbps CBR/VBR）或 `.ogg`（Vorbis Q6） | `.mp3`（128~192 kbps）或 `.ogg` / `.wav` |
| **采样率** | `44.1 kHz` 或 `48 kHz` | `44.1 kHz` |
| **声道** | 立体声（Stereo） | 单声道（Mono）或立体声（Stereo） |
| **响度目标** | **-16 LUFS**（峰值 ≤ -1.0 dBTP，避免压过 UI 音效） | **-12 LUFS**（峰值 ≤ -1.0 dBTP） |
| **循环要求** | **必须支持无缝循环（Seamless Loop）**，首尾零爆音、无静音留白 | 非循环单次触发（One-shot），尾音干净衰减 |
| **单文件体积** | 建议 `2 MB ~ 5 MB`（适配 Web 端流式加载） | 建议 `15 KB ~ 120 KB` |

---

## 3. BGM 曲目设计需求（参考《群星》Andreas Waldetoft 宇宙合成器 + 交响混合风格）

整体美学关键词：**深邃、浩瀚、敬畏、模拟合成器（Analog Synth Pads & Arpeggios）+ 轻弦乐/铜管点缀、克制而不吵闹**。
- **人声红线（强制遵守）**：**100% 纯器乐，严格无人声**（No Vocals / No Lyrics / No Choir / No Vocal Samples）。即使是史诗高潮段落（如 `bgm_title`、`bgm_crisis`、`bgm_victory`），也仅使用合成器、弦乐、铜管与打击乐器烘托氛围，**绝对不要加入合唱或任何形式的人声**。

| 文件名 | 时长建议 | 速度 (BPM) | 调性/氛围 | 配器与情绪描述 | 游戏内触发场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bgm_title.mp3` | 2:30~3:30 | 72~82 | D 小调 / 庄严憧憬 | 温暖深沉的模拟合成器铺底（Pad），缓慢上行的星光琶音，中段加入悠扬大提琴与低沉铜管，唤起迈向星海的史诗感 | 主界面（Title Screen）与建国配置页 |
| `bgm_explore_1.mp3` | 3:00~4:00 | 68~76 | C 小调 / 空灵静谧 | 极简深空环境 Pad、空灵电钢琴/玻璃钟声（Bell）、轻柔脉冲低音，适合长时间思考与探索 | 局内和平探索期（轮播曲 1） |
| `bgm_explore_2.mp3` | 3:00~4:00 | 76~85 | A 小调 / 未知神秘 | 带有复古科幻感的合成器琶音（Arp）与漂浮声景，适合科研船揭开战争迷雾的神秘感 | 局内和平探索期（轮播曲 2） |
| `bgm_empire_mid.mp3` | 3:00~4:00 | 84~92 | F 大调 / 宏大自信 | 弦乐铺底结合律动感强的科幻合成器，展现庞大星际帝国繁荣运转、巨构拔地而起的气势 | 帝国星系 ≥ 8 或进入中后期时轮播 |
| `bgm_combat.mp3` | 2:00~2:45 | 115~128 | E 小调 / 紧张激昂 | 紧迫的合成器低音脉冲（Pulse Bass）、定音鼓/工业打击乐、高张力铜管切分，但保留清晰度不轰头 | 星系爆发海战或处于全面战争期间 |
| `bgm_crisis.mp3` | 2:30~3:30 | 100~112 | C# 小调 / 压迫诡异 | 不协和深空低频震动、扭曲金属质感合成器、紧张弦乐震音，营造异次元天灾「虚空撕裂者」降临的末日压迫感 | 后期天灾降临且尚未被消灭期间 |
| `bgm_victory.mp3` | 1:30~2:15 | 88~96 | D 大调 / 辉煌凯旋 | 明亮开阔的管弦乐与璀璨合成器合奏，象征人类/星际文明登顶银河之巅 | 弹出胜利结算界面时 |

---

## 4. SFX 音效清单与听感规范

所有 UI 与提示音应具有**统一的高科技冷色调玻璃/全息投影质感**（清脆、克制、不刺耳）：

| 文件名 | 建议时长 | 听感描述与设计要点 |
| :--- | :--- | :--- |
| `sfx_ui_click.mp3` | 0.05~0.10s | 轻巧柔和的科幻触控微声（低频木质+高频全息点击） |
| `sfx_ui_confirm.mp3` | 0.15~0.25s | 上扬的双音阶全息确认音，给予清晰的正向操作反馈 |
| `sfx_ui_error.mp3` | 0.15~0.25s | 低沉克制的双脉冲蜂鸣，提示资源不足或操作受限 |
| `sfx_tech_complete.mp3` | 0.8~1.3s | 晶莹剔透的合成器和弦上行（类群星科技完成时的清澈共鸣音） |
| `sfx_event_popup.mp3` | 0.5~0.9s | 神秘深空通讯接入提示音（雷达脉冲+轻微波纹混响） |
| `sfx_build_complete.mp3` | 0.4~0.7s | 沉稳机械锁定+能量充能完毕的金属科幻质感音 |
| `sfx_colonize.mp3` | 1.0~1.5s | 充满希望的短促温暖和弦+着陆推进器轻啸 |
| `sfx_laser_fire.mp3` | 0.2~0.35s | 高能聚焦激光束发射声（带短促高频尾韵） |
| `sfx_kinetic_fire.mp3` | 0.15~0.3s | 电磁磁轨炮闷响与高速实弹破空声 |
| `sfx_missile_launch.mp3` | 0.3~0.5s | 太空鱼雷弹射出舱与点火尾迹声 |
| `sfx_ship_explode.mp3` | 0.6~1.0s | 深空沉闷震爆（低频冲击+能量过载电弧碎裂声） |
| `sfx_war_declared.mp3` | 1.2~1.8s | 震撼低沉的战争号角/红警警报共鸣（极具危机感） |
| `sfx_alert_warning.mp3` | 0.3~0.5s | 舰桥急促双短鸣，提示舰队遇袭或星系失守 |
| `sfx_achievement.mp3` | 0.9~1.4s | 璀璨星光和弦，庆贺里程碑成就解锁 |

---

## 5. 接入方式说明（供后续自动集成）

Halfstar 引擎（`src/engine/bgm.ts` 与 `src/engine/sfx.ts`）已预留标准音频加载器：
1. 只需将制作好的音频文件按上述文件名放入 `public/audio/bgm/` 和 `public/audio/sfx/`；
2. 音频引擎在播放时会优先尝试加载对应 `.mp3` 文件并执行平滑淡入淡出（Crossfade 1.5s）；
3. 若某文件尚未就位，则自动无感回退至内置 Web Audio 合成器，保证游戏随时可正常运行。

### 5.1 当前实现状态（2026-11-22）

本规范描述的全部 21 个文件已产出并通过自动化门禁，引擎侧已改造到位：

- **BGM**：`bgm.ts` 映射全部 7 首；`empire` 情绪在玩家星系数 ≥ 8 时启用；`explore` 会在 `bgm_explore_1` / `bgm_explore_2` 之间自动轮播；换曲走 1.5s 双轨交叉淡化。
- **SFX**：`sfx.ts` 按 cue id 加载 `public/audio/sfx/sfx_<cue_id>.mp3`，缺失时回落到合成器；战斗类音效带 180–260ms 冷却限流。
- **人声红线**：所有资产由程序化合成产出，合成图中不存在任何人类声源；另经独立 AI 听审复核，21/21 判定为纯器乐。
- **自动化门禁**：`docs/_audio_work/build_audit.py` 校验时长 / 响度 / 真峰值 / 码率 / 体积 / 循环接缝；`docs/_audio_work/vocal_review.py` 执行人声复核。

制作方法、实测数据与踩坑记录见 [`AUDIO_IMPLEMENTATION_PLAN.md`](./AUDIO_IMPLEMENTATION_PLAN.md)。

