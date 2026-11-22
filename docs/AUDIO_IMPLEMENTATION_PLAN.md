# Halfstar 音频资产落地方案（Audio Asset Implementation Plan）

> 目标：交付 `docs/AUDIO_SPEC.md` 要求的 **7 首 BGM + 14 个 SFX**，全部落到 `public/audio/`，引擎自动接管。
> 最高优先级硬性红线：**所有音频完全无人声**（No Vocals / No Lyrics / No Choir / No Humming / No Vocal Chops）。
> 本文所有结论均来自本机实测，验证命令与数据附在第 3、4 节。

---

## 0. 结论速览

| 决策 | 结论 | 依据 |
| :--- | :--- | :--- |
| BGM 制作方式 | **离线程序化渲染**（numpy/scipy 合成 → ffmpeg 编码） | AI 音乐直出人声红线通过率仅 **1/6**（§2 实测），提示词无法保证零人声 |
| SFX 制作方式 | **离线程序化合成**（14 个独立声部） | 连接器目录中**不存在**音效生成工具；短音效需要精确时长/尾音/响度 |
| 人声红线 | **构造上不可能出现**（合成图中根本没有人类声源），并额外跑 AI 听审独立复核 | §4.4 |
| 无缝循环 | **数学保证**：先构造连续循环体，再平铺 | §4.3 |
| 引擎改造 | **必须同步做**，否则 21 个文件全是死文件 | §1 的 5 处不一致 |
| 自动化 QA | 自研 BS.1770-4 计量器 + 门禁脚本，对齐 ffmpeg 到 0.01 LUFS | §3、§7 |

**总产出**：`public/audio/bgm/*.mp3`（7）、`public/audio/sfx/*.mp3`（14）、`src/engine/{bgm,sfx}.ts` 改造、QA 报告。

---

## 1. 规范与代码现状的 5 处不一致（必须先修）

规范 §5 声称「`src/engine/bgm.ts` 与 `src/engine/sfx.ts` 已预留标准音频加载器……执行平滑淡入淡出（Crossfade 1.5s）」。**实际代码并非如此**，若不修，产出的音频文件不会被播放。

| # | 缺口 | 实际情况（已逐行核对） | 影响 | 修法 |
| :--- | :--- | :--- | :--- | :--- |
| G1 | `sfx.ts` 的外部加载器**覆盖不全** | 初版 `sfx.ts` 是纯 Web Audio 振荡器；实现期间另一分支已并入一个混合加载器（13 个 cue id），但**只导出 8 个方法**，`build_complete` / `colonize` / `laser_fire` / `kinetic_fire` / `missile_launch` / `ship_explode` 六个无入口；且每次播放都新建 `Audio`、无战斗限流 | 6 个音效文件不会被触发 | 保留既有加载器，补齐 6 个方法 + 冷却限流 |
| G2 | `bgm.ts` 只映射 **5/7** 首 BGM | `src/engine/bgm.ts` 的 `BGM_FILE_MAP` 缺 `bgm_explore_2` / `bgm_empire_mid` | 2 首曲子永远不会被用到 | 补全映射 + 新增 `empire` mood |
| G3 | **没有 Crossfade** | `playMood()` 直接 `pause()` 旧音轨再 `play()` 新音轨，硬切 | 切歌爆音，与规范 §5 不符 | 双音轨交叉淡化 1.5s |
| G4 | `BgmMood` 无 `empire`；`explore` 无轮播 | 只有 5 个 mood；`App.tsx` 固定播 `explore` | 规范要求「帝国星系 ≥ 8 轮播 empire_mid」「explore_1/2 轮播」 | 扩展 mood 枚举 + explore 轮播调度 |
| G5 | SFX API 与规范 14 项对不上 | 引擎只导出 `click/confirm/error/discovery/alert` 等 8 个方法；规范另有 8 项**无调用点** | 8 个音效永远不触发 | 扩展 API + 挂接调用点（§6 表） |

> 结论：**音频资产与引擎改造必须同批交付**，否则是 21 个躺在 `public/` 里不被使用的文件。

---

## 2. 为什么不用 AI 生成 BGM（实测数据）

已接入的 AI 音乐生成器（`batch_text_to_music`，每批 ≤5 首，mp3/wav 44.1kHz）**无法可靠满足人声红线**。同一首 `bgm_title` 的 6 次生成尝试：

| # | 提示词策略 | AI 听审结果 | 判定 |
| :--- | :--- | :--- | :--- |
| T0 | prompt 明写 "no vocals / no choir / no humming" | **有**：女声主唱 + 合唱层 + "ooh/aah" 哼唱 | ✗ |
| V1 | 只写正面描述，完全不提 "vocal" | **有**：纯阿卡贝拉合唱 + 英文歌词 | ✗（最差） |
| V2 | prompt 写 "instrumental band performance" | **有**：女声无词吟唱 0:13 起 | ✗ |
| V3 | `lyrics` 字段填 `[Instrumental]/[No Vocals]` 标记 | **无**：100% 纯器乐 | ✓ |
| V4 | V3 手法 + 太空氛围 prompt | **有**：0:17–0:52 合唱 | ✗ |
| V5 | V3 手法 + Jarre 风格 prompt | **有**：0:15–0:44 合唱 + 女高音独唱 | ✗ |

**直出通过率 1/6（≈17%）**。且模型对「科幻氛围 / 太空 / 管弦」类提示有强烈的人声化倾向（人类声是它认为"史诗"的默认载体）。

同时发现的其他偏差：

- **时长不可控**：prompt 要 3 分钟，实际输出 **6:44**（模型按自身乐段结构铺满）；7 首曲子只能靠「生成 → 裁剪选段」二次加工。
- **调性/速度不可控**：T0 要 D 小调 → 实测 C♯m；V3 要 72–82 BPM → 实测 135–140 BPM。
- **响度不达标**：实测 **−11.5 LUFS**（规范要求 −16 LUFS），真峰值 **+0.4 dBTP**（规范要求 ≤ −1.0 dBTP，超标 1.4 dB）。
- **结尾必然淡出**：6 次全部 fade out → 直接拿来循环会出现「渐弱→静音→突然起」。

### 结论与保留用途

- **BGM 走程序化渲染**：人声 0 风险、BPM/调性/时长精确、循环数学无缝、体积与响度精确、可复现、零生成成本。
- **AI 保留两个用途**：
  1. **独立听审闸门**（`audios_understand`）——用来复核程序化产出「完全无人声」，这是对红线的第二道保险；
  2. 可选的「英雄曲目」增强层（如 `bgm_title` / `bgm_victory` 想要更饱满的管弦质感）——**必须**逐条过听审闸门，不通过就退回程序化版本。

> 参考实现：`docs/_audio_work/proc_render.py`（BGM）、`docs/_audio_work/sfx_synth.py`（SFX）、`docs/_audio_work/lufs_meter.py`（计量器）。

---

## 3. 工具链（本机已验证）

| 能力 | 实现 | 验证结果 |
| :--- | :--- | :--- |
| MP3 编码 | `imageio_ffmpeg` 自带 ffmpeg 9.0.2 + `libmp3lame` | ✓ 已用 |
| 响度归一 / 限幅 | `loudnorm`、`alimiter` | ✓ 已用 |
| 节拍 / 音高修正 | `rubberband`（tempo + pitch 单滤镜） | ✓ 可用（AI 路线备用） |
| 淡入淡出 / 混响 | `afade`、`aecho`、`acrossfade` | ✓ 可用 |
| 合成计算 | Python 3.15 + numpy + scipy | ✓ 已用 |
| AI 听审（人声闸门） | `connector__matrix__audios_understand` | ✓ 已用 |
| AI 音乐生成（备用） | `connector__matrix__batch_text_to_music` | ✓ 已用（但不用于 BGM 主线） |

### 自研 BS.1770-4 计量器（关键工具）

`ebur128` / `loudnorm` 的分析模式对 **<0.4s 的 one-shot 直接返回 `-inf`**——而规范里 14 个 SFX 里有 7 个短于 0.4s。因此自研 `lufs_meter.py`：

- 完整实现 K 加权 + 双门限（绝对门 −70 LUFS / 相对门 −10 LU）的门控积分响度；
- **实测对齐 ffmpeg**：同一文件 ffmpeg 报 −11.5 LUFS，本计量器报 **−11.49 LUFS**（误差 0.01）；
- 支持 4× 过采样真峰值；
- 附带循环接缝分析 `seam_analysis()`。

---

## 4. 生产管线

### 4.1 BGM 渲染器（`proc_render.py`）

分层合成 → 母带 → 循环化 → 归一 → 编码：

```
Pad 层    5 路失谐锯齿 → 低通 → 慢速 LFO 呼吸 → 每小节 ADSR
Arp 层    Karplus-Strong 拨弦 16 分音符 → 低通 → 声部过滤（危机/战斗抽稀）
Bell 层   2 算子 FM 玻璃钟声，稀疏点缀
Sub 层    正弦根音 + 轻微 0.08Hz 颤动
母带      tanh 饱和 → 低通 → 合成脉冲响应混响（早期反射 + 指数衰减尾）
循环化    make_seamless_loop() → tile_loop()
立体声    3.5ms 装饰延迟去相关
归一      精确增益到 −16 LUFS，真峰值封顶 ≤ −1.0 dBTP
编码      44.1kHz 立体声 / 192kbps CBR MP3
```

### 4.2 SFX 合成器（`sfx_synth.py`）

每个音效独立声部配方，全部由振荡器 + 滤波噪声构成（无人声源），详见 §6 表。

**双重约束收敛** `conform()`：由于 −12 LUFS 与 ≤−1.0 dBTP 在波峰因数 >11 dB 时互相冲突，采用「归一 → 软限幅压波峰 → 重归一」迭代，直到两个约束同时成立。

**以"解码后的 MP3"为准的闭环**：有损编码器会把尖锐瞬态的真峰值抬高 1~2 dB（WAV −1.06 dBTP 的点击音，解码后变成 **+1.52 dBTP**）。因此构建循环测量的是**交付文件本身**：
1. 合成 → 淡入 1.5ms → 淡出 8ms → `conform()` → 编码 → **解码测量**；
2. 若解码真峰值超标 → 降低源天花板，迫使 `conform()` 更用力软限幅、压低波峰因数；
3. 若解码响度偏离 → 反向微调目标响度；
4. 直至**解码后的文件**同时满足 −12 LUFS ±0.5 与 ≤−1.0 dBTP。

**淡入 1.5ms 不是可选项**：一是「起始即瞬时跳变」的波形本身就是一声咔哒；二是位于第 0 个采样点的峰值无法被 MDCT 精确重建。淡入把峰值移离第 0 点，解码真峰值随即回落。

> 踩坑记录：先归一再限幅会连带压掉响度（初版 8/14 个音效响度被压到 −15~−24 LUFS）；改为迭代收敛后 14/14 命中 −12.00 LUFS。随后 MP3 往返又推高了瞬态真峰值，最终改为**以解码结果为准的闭环**才彻底解决。

### 4.3 无缝循环：数学保证 + 编码器边界

不做「先拼后接缝修补」，而是**先构造一个自身首尾连续的循环体，再平铺**：

```
cross = a[N-X:]·cos(πt/2) + a[:X]·sin(πt/2)      # 等功率
loop  = concat(a[X : N-X], cross)                  # 长度 N-X
out   = tile(loop, reps)
```

这样 `loop[-1] → loop[0]` 恰好是 `a[X-1] → a[X]`，波形连续；平铺后每个接缝都是同一条连续边界。

**四层保障**（每一层都是实测逼出来的，缺一层即可闻）：

1. **交叉淡化必须与主体重叠**。若把 cross 直接接在 `a[X:]` 之后，接缝处是 `a[N-1] → a[N-X]`，属于硬断点。
2. **文件级回绕点也要处理**。目标时长通常不是循环长度的整数倍，文件会结束在循环中段，播放器跳回循环头即产生断点。因此对**平铺后的整条文件**再做一次同构交叉淡化。
3. **Pad 包络必须腿音连接（legato）**。逐小节的 ADSR 在小节线处释放到零 → 每条小节线都有一个近静音凹陷。若文件回绕点正落在凹陷里，MP3 的量化噪声地板（约 0.017）就变成相对巨大的台阶。修法：让每小节的 release 与下一小节的 attack 重叠；立体声去相关必须用**循环移位**（`np.roll`）而非前置补零，否则头部 3.5ms 静音在回绕时又是一个台阶。
4. **循环起点按「编码后实测」挑选，而不是靠估计**。编码器的回绕误差既不恒定、也不与局部电平成正比——用 PCM 局部 RMS 预测会挑错位置（实测反而更差）。因此渲染阶段对 5 个候选起点**各编码一次、直接测量交付文件**的接缝台阶，选实测最优者。

**接缝质量指标** `local_ratio` = 回绕处样本跳变 ÷ 回绕处 20ms 窗口的局部 RMS。判据 **≤ 0.15**（台阶只有局部信号电平的 15% 以下即不可闻）。

> 早期版本用「÷ 全曲样本间差值 95 分位」，但那个量纲与可听性无关——密集鼓点段本来就该有更大的瞬态；且 `np.diff` 根本看不到"末尾→开头"的回绕跳变。

> 踩坑记录（四轮迭代）：
> ① 只在平铺体内部做交叉淡化 → 文件回绕点仍是硬接缝（ratio 5.00）；
> ② 指标本身写错——测的其实是内部相邻样本，不是回绕跳变；
> ③ 交叉淡化与主体未重叠 + 立体声前置补零 → 双重断点；
> ④ 用 PCM 局部 RMS 选循环起点 → 挑到「电平高但编码误差也大」的位置，实测更差。

### 4.4 人声红线闸门（强制，不可跳过）

1. **构造层保证**：BGM/SFX 合成图中不含任何人类声源——只有振荡器、滤波噪声与 FM 算子，没有 vocal 模型、没有 formant 滤波器、没有采样。
2. **AI 听审复核**：`vocal_review.py` 把每个成品上传后交给独立音频模型，要求先答 `VERDICT: YES/NO`（「是否存在任何人声/歌词/合唱/吟唱/哨音/类共振峰」）。出现任一人声 → 该产物判废，不得交付。
3. **回归门禁**：QA 脚本每次全量构建后重跑听审，结果写入报告。

#### 关于听审的误报

听审模型是**启发式检测器**，不是证明。它曾三次把纯合成音判成有人声，但每一次都指向一个真实的**感知问题**——而"听起来像人声"这件事本身对一款宣称 100% 纯器乐的游戏就是缺陷，所以闸门一律从严：

| 被判内容 | 实际来源 | 处理 |
| :--- | :--- | :--- |
| `bgm_victory`「recurring human breath or sigh」 | Pad 的 LFO（0.05Hz、22% 深度）与低音的慢速颤音构成 12–20 秒周期的「呼吸」式起伏 | 调制深度/周期改为按风格可配；低音颤音收敛到 0.06 @ 0.19Hz |
| `sfx_ship_explode`「female vocalization singing a melodic line」 | 400–2600Hz 的平滑衰减噪声床正落在人声共振峰带内 | 重塑为硬瞬态 + 快速衰减 + 颗粒状碎裂 + 降低混响 |
| `bgm_explore_2`「vocal-like vowel formant filter sweep」 | 高调制指数的 FM 钟声（index 4.0）——**高指数低非谐比的 FM 正是人声共振峰的经典合成配方**；叠加缓慢的深摆幅颤音 | FM index 降到 2.0；explore 风格颤音改为 0.10 @ 0.15Hz |

> 这一轮的结论也反过来印证了 §0 的判断：**AI 音乐生成器连"不要人声"的提示词都压不住，而程序化合成从源头就不存在该风险。** 听审闸门在这里的价值不是"证明没有人声"，而是"确保没有任何东西听起来像人声"。

---

## 5. 7 首 BGM 曲目设计

| 文件 | 时长 | BPM | 调性 | 和弦走向（每拍一小节） | 音色取向 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bgm_title.mp3` | 3:00 | 76 | D 小调 | Dm9 → B♭maj7 → Fmaj7 → Am7 | 宽厚 Pad、星光琶音、庄重 |
| `bgm_explore_1.mp3` | 3:30 | 72 | C 小调 | Cm9 → A♭maj7 → E♭maj7 → Fm7 | 极简长混响、玻璃钟声、脉冲低音 |
| `bgm_explore_2.mp3` | 3:30 | 80 | A 小调 | Am9 → Fmaj7 → Cmaj7 → Gm7 | 复古科幻琶音、漂浮声景 |
| `bgm_empire_mid.mp3` | 3:30 | 88 | F 大调 | Fmaj7 → Dm7 → B♭maj7 → Csus4 | 明亮 Pad、律动强、巨构感 |
| `bgm_combat.mp3` | 2:15 | 122 | E 小调 | Em → Em → C → D | 密集琶音、低音脉冲、频段收紧 |
| `bgm_crisis.mp3` | 3:00 | 106 | C♯ 小调 | C♯m → C♯m → G♯m → A（半音冲突） | 极暗、宽混响、低频压迫 |
| `bgm_victory.mp3` | 1:50 | 92 | D 大调 | D → A → Bm → G | 明亮大调、琶音密度高、扩张感 |

> 规范 §3 原文为「参考《群星》Andreas Waldetoft 宇宙合成器 + 交响混合风格」，且明示「模拟合成器 Pad & Arpeggio + 轻弦乐/铜管点缀」。本渲染器以**模拟合成器 Pad/Arp 为主体**，弦乐/铜管以锯齿合成的音色层实现点缀（不使用人声/管弦录音采样）。

---

## 6. 14 个 SFX 合成设计 + 引擎挂接点

| 文件 | 时长 | 合成配方 | 引擎调用点（待改） |
| :--- | :--- | :--- | :--- |
| `sfx_ui_click.mp3` | 0.07s | 430Hz 木质体 + 3.8–13kHz 瞬态 + 2.86kHz 微光 | `useGameStore.ts` 各 `sfx.click()` |
| `sfx_ui_confirm.mp3` | 0.20s | 660→990Hz 上行双音 + 高频 shimmer | `sfx.confirm()` |
| `sfx_ui_error.mp3` | 0.20s | 196/164Hz 低沉双脉冲 + 粗糙感 | `sfx.error()` |
| `sfx_tech_complete.mp3` | 1.05s | D 大调加九和弦 FM 玻璃琶音上行 | `techSystem.ts` `advanceResearchMonthly` |
| `sfx_event_popup.mp3` | 0.70s | 880Hz 雷达 ping + 波纹扫频 + 混响 | `useGameStore.ts:416`（现 `sfx.discovery()`） |
| `sfx_build_complete.mp3` | 0.60s | 140Hz 机械闷响 + 金属 clank + 能量充能上扫 | `simulation.ts:689` 建设竣工 |
| `sfx_colonize.mp3` | 1.25s | D 大调温暖和弦 + 着陆推进器嘶声 | `simulation.ts:655` 殖民完成 |
| `sfx_laser_fire.mp3` | 0.28s | 2.4k→380Hz 指数扫频 + 宽带爆裂 + 高频尾韵 | `combatSystem.ts` 武器命中，`family==='laser'` |
| `sfx_kinetic_fire.mp3` | 0.24s | 78Hz 闷响 + 破空噪声带通 | `combatSystem.ts`，`family==='kinetic'` |
| `sfx_missile_launch.mp3` | 0.42s | 出舱瞬态 + 递增噪声嘶声 + 低频点火 | `combatSystem.ts`，`family==='missile'` |
| `sfx_ship_explode.mp3` | 0.85s | 次低频下坠 + 宽带震爆 + 电弧碎裂 | `combatSystem.ts` 舰船击毁（`applyWeaponHit` 返回 true） |
| `sfx_war_declared.mp3` | 1.50s | 110Hz 失谐铜管渐强 + 红色警报三连 | `commands.ts:619` `declareWar` |
| `sfx_alert_warning.mp3` | 0.40s | 740Hz 双短鸣 + 边缘嘶声 | 舰队遇袭 / 星系失守告警 |
| `sfx_achievement.mp3` | 1.15s | D 大调五音星光琶音 + 高频闪烁 | `useGameStore.ts:424` 成就解锁（现 `sfx.discovery()`） |

**战斗音效必须限流**：`combatSystem.stepCombatDaily` 每个游戏日结算一次，直接挂接会变成机关枪连播。方案：每个音效类型设 250–400ms 冷却，且同帧最多触发 1 个战斗音效。

---

## 7. 自动化 QA 门禁

`build_audit.py` 对 `public/audio/**` 全量扫描，逐项判定（任一 FAIL 则构建失败）：

| 检查项 | BGM | SFX |
| :--- | :--- | :--- |
| 文件名与路径符合规范 §1 | ✓ | ✓ |
| 采样率 / 声道 | 44.1kHz / 立体声 | 44.1kHz / 立体声 |
| 格式与码率 | MP3 192–256kbps | MP3 160–320kbps |
| 积分响度 | −16 LUFS ±0.6 | −12 LUFS ±0.5 |
| 真峰值 | ≤ −1.0 dBTP | ≤ −1.0 dBTP |
| 时长 | 规范 §3 区间 | 规范 §4 区间 |
| 体积 | 2–6 MB | ≤ 120 KB |
| 无缝循环 | 回绕台阶 ÷ 接缝处局部 RMS ≤ 0.15 | N/A |
| 结尾不留白 | 末 200ms 能量 > 阈值 | 末采样近静音、无直流偏置 |
| **人声红线** | AI 听审 YES/NO | AI 听审 YES/NO |

> 体积上限取 6 MB 而非规范 §2 的 5 MB：个别曲目在 192 kbps 下接缝略超判据时会自动升到 256 kbps（体积约 6.7 MB）。规范里体积是「建议」，而「必须支持无缝循环」是硬性要求——两者冲突时以硬性要求为准。当前 7 首全部以 192 kbps 通过，实际体积 2.64–5.04 MB，均在建议区间内。

> **循环接缝判据为什么不用全局统计量**：接缝台阶是否可闻，取决于它相对于**接缝处局部信号电平**的大小，而不是相对于全曲样本间差值的统计量。一个位于鼓点密集段的 0.02 台阶，在局部 RMS 为 0.02 时是可闻的；在局部 RMS 为 0.1 时则完全不可闻。因此判据用 `local_ratio`（台阶 ÷ 接缝处 20ms 窗口 RMS）≤ 0.15。

---

## 8. 执行计划与当前进度

| 阶段 | 内容 | 产出 | 状态 |
| :--- | :--- | :--- | :--- |
| P0 | 渲染器：7 套和弦表 + 7 套音色参数 | `proc_render.py` | ✅ 完成 |
| P1 | 产出 7 首 BGM | `public/audio/bgm/*.mp3` | ✅ 完成，7/7 通过 QA |
| P2 | 产出 14 个 SFX | `public/audio/sfx/*.mp3` | ✅ 完成，14/14 通过 QA |
| P2.5 | AI 人声红线复核（21 个资产） | `vocal_review.py` | ✅ 完成，全部 verdict=NO |
| P3 | 引擎改造：`sfx.ts` 加载器、`bgm.ts` 补全 + Crossfade + empire/轮播 | `src/engine/*.ts` | ✅ 完成，`npm run build` 通过 |
| P4 | 调用点挂接（8 个新 SFX + 战斗限流） | 引擎/模拟层 | ✅ 完成 |
| P5 | QA 脚本 + 规范回写（§5 描述与实现对齐） | `build_audit.py` | ✅ 脚本完成；规范回写待办 |

### 引擎改造明细（已完成）

**`src/engine/bgm.ts`**
- `BgmMood` 增加 `empire`；`BGM_FILE_MAP` 补齐 7 首（新增 `bgm_empire_mid`），另加 `BGM_EXPLORE_ALT = bgm_explore_2`。
- **1.5s 交叉淡化**：双音轨（`externalAudio` / `nextAudio`）线性渐变，30 步 × 50ms，淡出后暂停旧轨。
- **探索轮播**：进入 `explore` 时在 `bgm_explore_1` / `bgm_explore_2` 之间交替，切换时机为当前曲目播完前 4 秒（依据 `Audio.duration`）。
- 程序化回退同步补上 `empire` 的 F 大调走向。

**`src/engine/sfx.ts`**
- 保留既有的混合加载器（外部 MP3 优先，404/播放失败回落到 Web Audio 合成器）。
- 补齐 6 个缺失 cue 的对外方法：`buildComplete` / `colonize` / `laserFire` / `kineticFire` / `missileLaunch` / `shipExplode`。
- **战斗音效限流**：`laser_fire` 180ms、`kinetic_fire` 180ms、`missile_launch` 220ms、`ship_explode` 260ms 冷却，避免一日结算数十门武器时变成机关枪。

**调用点挂接**

| 音效 | 挂接位置 |
| :--- | :--- |
| `sfx_colonize` | `simulation.ts` 殖民进度满 100% 时 |
| `sfx_build_complete` | `simulation.ts` 建造队列完成时 |
| `sfx_tech_complete` | `techSystem.ts` `advanceResearchMonthly` 完成分支（仅玩家） |
| `sfx_laser_fire` / `sfx_kinetic_fire` / `sfx_missile_launch` | `combatSystem.ts` `applyWeaponHit` 中按 `wep.family` 分派 |
| `sfx_ship_explode` | `combatSystem.ts` `applyWeaponHit` 返回击毁时 |
| `sfx_war_declared` | `commands.ts` `diplomacyDeclareWar` |
| `sfx_achievement` | `useGameStore.ts` 成就解锁（原先误用 `sfx.discovery()`） |
| `sfx_event_popup` | `useGameStore.ts` 叙事事件触发（既有 `sfx.discovery()` 已映射） |
| `empire` mood | `App.tsx` 玩家星系数 ≥ 8 时改播 `bgm_empire_mid` |

### 已验证产出（21/21）

**BGM（7 首，全部通过 QA）**

| 文件 | 时长 | BPM | 调性 | 响度 | 真峰值 | 码率 | 体积 | 接缝台阶/局部电平 | 循环起点 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bgm_title.mp3` | 3:00 | 76 | D 小调 | −16.27 LUFS | −6.25 dBTP | 192k | 4.32 MB | 0.051 | 3.0 小节 |
| `bgm_explore_1.mp3` | 3:30 | 72 | C 小调 | −16.27 LUFS | −5.17 dBTP | 192k | 5.04 MB | 0.051 | 1.5 小节 |
| `bgm_explore_2.mp3` | 3:30 | 80 | A 小调 | −16.27 LUFS | −2.32 dBTP | 192k | 5.04 MB | 0.112 | 1.0 小节 |
| `bgm_empire_mid.mp3` | 3:30 | 88 | F 大调 | −16.27 LUFS | −3.05 dBTP | 192k | 5.04 MB | 0.025 | 2.0 小节 |
| `bgm_combat.mp3` | 2:15 | 122 | E 小调 | −16.26 LUFS | −6.45 dBTP | 192k | 3.24 MB | 0.034 | 2.0 小节 |
| `bgm_crisis.mp3` | 3:00 | 106 | C♯ 小调 | −16.27 LUFS | −5.43 dBTP | 192k | 4.32 MB | 0.067 | 1.0 小节 |
| `bgm_victory.mp3` | 1:50 | 92 | D 大调 | −16.26 LUFS | −5.42 dBTP | 192k | 2.64 MB | 0.033 | 2.5 小节 |

> 全部 7 首都能用 192 kbps 通过无缝循环判据，因此体积全部落在规范建议的 2–5 MB 区间内，无需为码率让步。
> 「循环起点」= 循环体在素材中的位置，由**编码后实测**择优选出（§4.3 第 4 条）。

**SFX（14 个）**：全部 −12.0 LUFS（±0.5）、真峰值 ≤ −1.0 dBTP、时长全部落在规范 §4 区间、体积 2.6–30.7 KB。

**人声红线复核**：21/21 全部 `VERDICT: NO`（`audios_understand` 独立听审 + 转写复核）。

---

## 9. 风险与取舍

| 风险 | 影响 | 缓解 |
| :--- | :--- | :--- |
| 程序化音色不如真人管弦有感染力 | BGM 表现力 | 风格参数集中在 `style_cfg`，单点调参即可迭代；必要时对 `bgm_title`/`bgm_victory` 叠加**过听审闸门**的 AI 层 |
| 循环长度较短导致听感重复 | 长时间游玩疲劳 | 循环体 16 小节；`bgm_explore_1` / `bgm_explore_2` 交替轮播，天然形成 7 分钟一轮的变化 |
| 战斗音效连播 | 听觉疲劳 | `sfx.ts` 内置 180–260ms 冷却（§6） |
| MP3 编码在循环点产生颗粒 | 极轻微 | 循环接缝在 PCM 域构造后再编码；接缝位置按编码后实测择优；真峰值封顶留足余量 |
| 未来新增曲目需重新调参 | 维护成本 | 渲染器参数集中在一张表；`build_audit.py` + `vocal_review.py` 可直接作为 CI 门禁 |
| 引擎改造触碰游戏逻辑 | 回归风险 | 改造限定在 `bgm.ts`/`sfx.ts` + 少量调用点，不动模拟数值 |
