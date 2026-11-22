import React, { useState, useEffect } from 'react';
import {
  Settings,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Music,
  Keyboard,
  Monitor,
  Info,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { sfx } from '../engine/sfx';
import { bgm, BgmMood, USE_EXTERNAL_BGM } from '../engine/bgm';
import {
  KEY_ACTIONS,
  KEY_CATEGORIES,
  KeyActionId,
  formatKeyCode,
  DEFAULT_KEYBINDINGS,
} from '../data/keybindings';

type SettingsTab = 'controls' | 'audio' | 'display' | 'about';

const BGM_AUDIT_LIST: Array<{ mood: BgmMood; label: string; file: string }> = [
  { mood: 'title', label: '主界面', file: './audio/bgm/bgm_title.mp3' },
  { mood: 'explore', label: '深空探索', file: './audio/bgm/bgm_explore_1.mp3' },
  { mood: 'empire', label: '帝国繁荣', file: './audio/bgm/bgm_empire_mid.mp3' },
  { mood: 'combat', label: '舰队交战', file: './audio/bgm/bgm_combat.mp3' },
  { mood: 'crisis', label: '银河天灾', file: './audio/bgm/bgm_crisis.mp3' },
  { mood: 'victory', label: '凯旋终章', file: './audio/bgm/bgm_victory.mp3' },
];

export const SettingsModal: React.FC = () => {
  const show = useGameStore((s) => s.showSettingsModal);
  const setShow = useGameStore((s) => s.setShowSettingsModal);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const updateKeybinding = useGameStore((s) => s.updateKeybinding);
  const resetKeybindings = useGameStore((s) => s.resetKeybindings);

  const [activeTab, setActiveTab] = useState<SettingsTab>('controls');
  const [recordingId, setRecordingId] = useState<KeyActionId | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const [auditStatus, setAuditStatus] = useState<Record<string, 'mp3' | 'synth'>>({});
  const [auditing, setAuditing] = useState(false);

  // Key recording listener
  useEffect(() => {
    if (!recordingId) {
      document.body.removeAttribute('data-recording-key');
      return;
    }
    document.body.setAttribute('data-recording-key', 'true');

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setRecordingId(null);
        sfx.click();
        return;
      }

      // Ignore modifier-only presses
      if (
        [
          'AltLeft',
          'AltRight',
          'ControlLeft',
          'ControlRight',
          'ShiftLeft',
          'ShiftRight',
          'MetaLeft',
          'MetaRight',
          'F12',
          'F5',
        ].includes(e.code)
      ) {
        return;
      }

      const { swappedWith } = updateKeybinding(recordingId, e.code);
      sfx.confirm();
      if (swappedWith) {
        const otherMeta = KEY_ACTIONS.find((a) => a.id === swappedWith);
        setConflictNotice(
          `按键「${formatKeyCode(e.code)}」已被「${otherMeta?.name || swappedWith}」占用，已自动互换！`
        );
      } else {
        setConflictNotice(null);
      }
      setRecordingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.removeAttribute('data-recording-key');
    };
  }, [recordingId, updateKeybinding]);

  const runAudioAudit = async () => {
    setAuditing(true);
    const next: Record<string, 'mp3' | 'synth'> = {};
    for (const item of BGM_AUDIT_LIST) {
      if (!USE_EXTERNAL_BGM) {
        next[item.mood] = 'synth';
        continue;
      }
      try {
        const res = await fetch(item.file, { method: 'HEAD' });
        const ct = res.headers.get('content-type') ?? '';
        next[item.mood] = res.ok && !ct.includes('text/html') ? 'mp3' : 'synth';
      } catch {
        next[item.mood] = 'synth';
      }
    }
    setAuditStatus(next);
    setAuditing(false);
  };

  if (!show) return null;

  const currentBindings = settings.keybindings || DEFAULT_KEYBINDINGS;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl hud-panel rounded-xl overflow-hidden shadow-2xl border border-sky-400/40 flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              游戏设置 · 半影群星 Halfstar
            </h2>
          </div>
          <button
            onClick={() => {
              setRecordingId(null);
              setShow(false);
            }}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Halfciv-inspired Tab Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-800 bg-slate-950/60 shrink-0 overflow-x-auto text-xs">
          {[
            { id: 'controls', label: '操作与按键', icon: Keyboard },
            { id: 'audio', label: '音频设置', icon: Music },
            { id: 'display', label: '显示偏好', icon: Monitor },
            { id: 'about', label: '关于与出品', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setRecordingId(null);
                  setActiveTab(tab.id as SettingsTab);
                  sfx.click();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-600/90 text-white shadow-md border border-sky-400/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: CONTROLS & KEYBINDINGS */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Gameplay Automation Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-sky-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoPauseOnEvent}
                    onChange={(e) => updateSettings({ autoPauseOnEvent: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-sky-400 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-100">叙事事件自动暂停</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      触发空间异常、外交通牒或银河事件时自动挂起流速，便于思考决断
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-sky-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoSaveYearly}
                    onChange={(e) => updateSettings({ autoSaveYearly: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-sky-400 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-100">每年自动归档进度</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      每年 1 月 1 日自动写入专属槽位，主界面「继续游戏」秒级接续
                    </div>
                  </div>
                </label>
              </div>

              {/* Conflict / Recording Alert */}
              {conflictNotice && (
                <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 flex items-center justify-between gap-2 text-amber-200 text-[11px] animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{conflictNotice}</span>
                  </div>
                  <button
                    onClick={() => setConflictNotice(null)}
                    className="text-amber-400 hover:text-white cursor-pointer px-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Keybinding Header & Reset */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-sky-400" />
                    <span>按键自定义绑定</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    点击对应操作的按键框即可录入新键位；冲突按键将自动与原功能对调
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetKeybindings();
                    sfx.confirm();
                    setConflictNotice('已恢复为默认预设键位！');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white text-[11px] cursor-pointer transition-colors"
                  title="重置所有快捷键为默认设置"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复默认</span>
                </button>
              </div>

              {/* Recording Status Bar */}
              {recordingId && (
                <div className="p-3 rounded-lg bg-sky-950/90 border-2 border-sky-400 text-sky-200 text-xs flex items-center justify-between shadow-lg shadow-sky-500/20 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>
                      正在录入「
                      <b>{KEY_ACTIONS.find((a) => a.id === recordingId)?.name}</b>
                      」的新键位… 请直接按下物理键盘按键
                    </span>
                  </div>
                  <button
                    onClick={() => setRecordingId(null)}
                    className="px-2 py-0.5 rounded bg-sky-800 text-white text-[10px] hover:bg-sky-700 cursor-pointer"
                  >
                    按 Esc 取消
                  </button>
                </div>
              )}

              {/* Keybinding Categorized Sections */}
              <div className="space-y-4">
                {KEY_CATEGORIES.map((cat) => {
                  const items = KEY_ACTIONS.filter((a) => a.category === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="rounded-lg bg-slate-900/60 border border-slate-800/90 overflow-hidden"
                    >
                      <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 font-semibold text-slate-300 flex items-center gap-2 text-[11px]">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {items.map((item) => {
                          const currentCode = currentBindings[item.id] || item.defaultCode;
                          const isRecording = recordingId === item.id;
                          const isCustom = currentCode !== item.defaultCode;

                          return (
                            <div
                              key={item.id}
                              className="px-3.5 py-2 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-slate-200 flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {isCustom && (
                                    <span className="px-1 py-0.2 rounded bg-sky-500/10 border border-sky-400/40 text-sky-300 text-[9px]">
                                      已自定义
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {item.desc}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    sfx.click();
                                    setRecordingId(item.id);
                                  }}
                                  className={`min-w-[90px] px-2.5 py-1 rounded text-center font-mono text-[11px] font-semibold border transition-all cursor-pointer ${
                                    isRecording
                                      ? 'bg-sky-500 text-slate-950 border-white shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-pulse'
                                      : 'bg-slate-950/90 hover:bg-slate-800 text-sky-300 border-slate-700 hover:border-sky-400'
                                  }`}
                                  title="点击录入新按键"
                                >
                                  {isRecording ? '录入中...' : formatKeyCode(currentCode)}
                                </button>

                                {isCustom && (
                                  <button
                                    onClick={() => {
                                      updateKeybinding(item.id, item.defaultCode);
                                      sfx.click();
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                    title={`恢复默认按键 (${formatKeyCode(item.defaultCode)})`}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO SETTINGS */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* SFX Toggle & Volume */}
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 flex items-center gap-2">
                    {settings.sfxEnabled ? (
                      <Volume2 className="w-4 h-4 text-sky-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    科幻交互与战斗音效（Web Audio 振荡器）
                  </span>
                  <button
                    onClick={() => {
                      const next = !settings.sfxEnabled;
                      updateSettings({ sfxEnabled: next });
                      if (next) sfx.confirm();
                    }}
                    className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      settings.sfxEnabled
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.sfxEnabled ? '已开启' : '已静音'}
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>音效音量</span>
                    <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.sfxVolume * 100)}
                    onChange={(e) => {
                      updateSettings({ sfxVolume: Number(e.target.value) / 100 });
                    }}
                    onMouseUp={() => sfx.click()}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1.5">快速音效试听：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['触控点击', () => sfx.click()],
                        ['指令确认', () => sfx.confirm()],
                        ['工程竣工', () => sfx.buildComplete()],
                        ['科技突破', () => sfx.techComplete()],
                        ['危机告警', () => sfx.alert()],
                      ] as const
                    ).map(([label, fn]) => (
                      <button
                        key={label}
                        onClick={fn}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-sky-950/60 border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer transition-colors"
                      >
                        🔊 {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BGM Toggle & Volume */}
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 flex items-center gap-2">
                    <Music
                      className={`w-4 h-4 ${
                        settings.bgmEnabled ? 'text-purple-400' : 'text-slate-500'
                      }`}
                    />
                    深空合成器背景音乐（Cosmic Synth BGM）
                  </span>
                  <button
                    onClick={() => {
                      const next = !settings.bgmEnabled;
                      updateSettings({ bgmEnabled: next });
                      if (next) bgm.ensureStarted();
                    }}
                    className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      settings.bgmEnabled
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.bgmEnabled ? '已开启' : '已关闭'}
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>背景音乐音量（内置 Web Audio 模拟合成器宇宙 Pad）</span>
                    <span className="font-mono">{Math.round(settings.bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.bgmVolume * 100)}
                    onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) / 100 })}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                {/* BGM Mood Console */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      深空多情绪氛围试听台（随局势无缝动态流转）
                    </span>
                    <button
                      onClick={runAudioAudit}
                      disabled={auditing}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-sky-300 cursor-pointer"
                    >
                      {auditing ? '检测中...' : '检测音频管线'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BGM_AUDIT_LIST.map((item) => {
                      const st = auditStatus[item.mood];
                      return (
                        <button
                          key={item.mood}
                          onClick={() => {
                            bgm.ensureStarted();
                            bgm.playMood(item.mood);
                          }}
                          title={`点击试听「${item.label}」和弦层`}
                          className="p-2 rounded bg-slate-950/80 hover:bg-purple-950/60 border border-slate-700/80 text-center cursor-pointer transition-colors"
                        >
                          <div className="text-[11px] text-slate-200 truncate">{item.label}</div>
                          <div
                            className={`text-[9px] font-mono mt-0.5 ${
                              st === 'mp3'
                                ? 'text-emerald-400'
                                : st === 'synth'
                                ? 'text-amber-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {st === 'mp3' ? '✓ MP3' : st === 'synth' ? '合成器' : '点击试听'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY PREFERENCES */}
          {activeTab === 'display' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span>3D 视口与渲染引擎</span>
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed space-y-1">
                  <div>
                    • <b>渲染核心</b>：Three.js WebGL 全局 3D 渲染，支持平滑 60 FPS 连续天体运转。
                  </div>
                  <div>
                    • <b>体积星云</b>：螺旋银河 5 簇星际尘埃与 2600 颗程序星体动态辉光粒子系统。
                  </div>
                  <div>
                    • <b>双模式无缝切换</b>：支持宏观银河星图与微观 3D 星系视图（按键 E 或双击恒星）。
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-100">星图视角操作指引</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-sky-300 font-mono">鼠标滚轮</span>：镜头平滑缩放
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-sky-300 font-mono">鼠标左键拖拽</span>：平移星图视口
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-sky-300 font-mono">鼠标右键拖拽</span>：3D 俯仰与旋转视角
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-sky-300 font-mono">按键 F</span>：星图全局搜索与筛选
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT & SUNSET STUDIO BRANDING */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {/* Sunset Studio Feature Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-950 border border-sky-400/40 shadow-xl space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white tracking-widest">
                        Sunset Studio
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300 text-[10px] font-semibold">
                        出品
                      </span>
                    </div>
                    <div className="text-xs text-sky-200/80 mt-1">
                      专注硬核大战略与文明演化的独立游戏研发团队
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  《半影群星 Halfstar》是 Sunset Studio 继历史 4X 大战略作品《半壁江山 Halfciv》之后的
                  Half 系列太空题材力作。深度对标《群星 Stellaris》的浩瀚星海与《三体》的硬科幻哲学，致力于在纯
                  Web 端呈现即开即玩、零门槛加载、兼备宏大叙事与微操维度的 3D 实时可暂停星际大战略。
                </p>

                {/* Direct Bilibili Jump Button */}
                <div className="pt-2">
                  <a
                    href="https://space.bilibili.com/351545906?spm_id_from=333.1007.0.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-600/90 to-rose-600/90 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition-all border border-pink-400/40 cursor-pointer group"
                  >
                    <span>前往 B 站主页支持我们（暮意若慕意）</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Version & Specs */}
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>当前版本</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    半影群星 Halfstar v1.8
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>系列定位</span>
                  <span className="text-slate-300">Half Series · 姊妹篇《半壁江山 Halfciv》</span>
                </div>
                <div className="flex justify-between">
                  <span>渲染管线</span>
                  <span className="text-slate-300">Three.js WebGL 3D + Tailwind CSS v4</span>
                </div>
                <div className="flex justify-between">
                  <span>音频引擎</span>
                  <span className="text-slate-300">Web Audio API 宇宙和弦合成系统</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-slate-400">
            Sunset Studio 出品 ·{' '}
            <a
              href="https://space.bilibili.com/351545906?spm_id_from=333.1007.0.0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>暮意若慕意 B 站主页</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <button
            onClick={() => {
              setRecordingId(null);
              setShow(false);
            }}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export const GuideModal: React.FC = () => {
  const show = useGameStore((s) => s.showGuideModal);
  const setShow = useGameStore((s) => s.setShowGuideModal);
  const keybindings = useGameStore((s) => s.settings.keybindings) || DEFAULT_KEYBINDINGS;

  if (!show) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg hud-panel rounded-xl overflow-hidden shadow-2xl border border-teal-500/30">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-teal-500/25 bg-teal-950/40">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-teal-300" />
            <h2 className="text-sm font-bold text-white">半影群星 Halfstar 玩法与操作说明</h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs text-slate-300 leading-relaxed max-h-[75vh] overflow-y-auto">
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="font-bold text-sky-300 mb-1">核心 4X 节奏</div>
            <p>
              1. <b>探索</b>：选中科研船右键未知星系（或点击「自动探索」），测绘行星矿藏与宜居星。
              <br />
              2. <b>扩张</b>
              ：派遣工程船在已调查星系建造前哨站并建设采矿/科研站；在宜居星点击殖民。
              <br />
              3. <b>经营</b>：在星球面板修建区划与建筑，推进三线科研抽卡与帝国传统飞升。
              <br />
              4. <b>外交与战争</b>：设计克制敌军的舰船，在星港造舰，与 AI 帝国结盟或宣战吞并！
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="font-bold text-amber-300 mb-1">常用操作与快捷键（已联动当前绑定）</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <kbd className="px-1 bg-slate-800 rounded">
                  左键拖拽 / {formatKeyCode(keybindings.camForward)}
                  {formatKeyCode(keybindings.camLeft)}
                  {formatKeyCode(keybindings.camBackward)}
                  {formatKeyCode(keybindings.camRight)}
                </kbd>{' '}
                平移镜头
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">右键拖拽</kbd> 调整 3D 俯仰旋转
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">滚轮</kbd> 平滑缩放镜头
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">
                  {formatKeyCode(keybindings.toggleView)} / 双击星系
                </kbd>{' '}
                银河/3D星系切换
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">
                  {formatKeyCode(keybindings.togglePause)}
                </kbd>{' '}
                暂停 / 继续游戏
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">
                  {formatKeyCode(keybindings.speed1)} ~ {formatKeyCode(keybindings.speed4)}
                </kbd>{' '}
                调节 1x~4x 流速
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">
                  {formatKeyCode(keybindings.drawerTech)} ~ {formatKeyCode(keybindings.drawerSituation)}
                </kbd>{' '}
                快捷打开 6 大帝国面板
              </div>
              <div>
                <kbd className="px-1 bg-slate-800 rounded">Esc</kbd> 关闭面板 / 打开暂停菜单
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              提示：可随时在「游戏设置 → 操作与按键」中自定义以上全部按键。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
