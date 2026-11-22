import React, { useState } from 'react';
import { Settings, HelpCircle, X, Volume2, VolumeX, Music } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { sfx } from '../engine/sfx';
import { bgm, BgmMood } from '../engine/bgm';

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
  const [auditStatus, setAuditStatus] = useState<Record<string, 'mp3' | 'synth'>>({});
  const [auditing, setAuditing] = useState(false);

  const runAudioAudit = async () => {
    setAuditing(true);
    const next: Record<string, 'mp3' | 'synth'> = {};
    for (const item of BGM_AUDIT_LIST) {
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

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md hud-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white">游戏设置</h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* SFX Toggle & Volume */}
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 flex items-center gap-2">
                {settings.sfxEnabled ? (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                科幻交互音效（Web Audio）
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
          </div>

          {/* BGM Toggle & Volume */}
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 flex items-center gap-2">
                <Music className={`w-4 h-4 ${settings.bgmEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
                深空合成器背景音乐（BGM）
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
                <span>背景音乐音量（支持外部 audio/bgm/*.mp3 自动接管）</span>
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

            {/* External MP3 Audio Asset Checker & Audition Console */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  音频轨道检测 & 快速试听台
                </span>
                <button
                  onClick={runAudioAudit}
                  disabled={auditing}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-sky-300 cursor-pointer"
                >
                  {auditing ? '检测中...' : '检测外部 MP3'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {BGM_AUDIT_LIST.map((item) => {
                  const st = auditStatus[item.mood];
                  return (
                    <button
                      key={item.mood}
                      onClick={() => {
                        bgm.ensureStarted();
                        bgm.playMood(item.mood);
                      }}
                      title={`点击试听「${item.label}」BGM`}
                      className="p-1.5 rounded bg-slate-950/80 hover:bg-purple-950/60 border border-slate-700/80 text-center cursor-pointer"
                    >
                      <div className="text-[10px] text-slate-200 truncate">{item.label}</div>
                      <div
                        className={`text-[9px] font-mono mt-0.5 ${
                          st === 'mp3'
                            ? 'text-emerald-400'
                            : st === 'synth'
                            ? 'text-amber-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {st === 'mp3' ? '✓ MP3' : st === 'synth' ? '合成器' : '试听'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(
                  [
                    ['点击', () => sfx.click()],
                    ['确认', () => sfx.confirm()],
                    ['建造', () => sfx.buildComplete()],
                    ['科技', () => sfx.techComplete()],
                    ['告警', () => sfx.alert()],
                  ] as const
                ).map(([label, fn]) => (
                  <button
                    key={label}
                    onClick={fn}
                    className="px-2 py-0.5 rounded bg-slate-950 hover:bg-sky-950/60 border border-slate-700 text-[10px] text-slate-300 cursor-pointer"
                  >
                    🔊 {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gameplay Toggles */}
          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-900/75 border border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-100">叙事事件弹窗自动暂停</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                触发异常或银河事件时自动暂停时间流速，方便阅读决策
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPauseOnEvent}
              onChange={(e) => updateSettings({ autoPauseOnEvent: e.target.checked })}
              className="w-4 h-4 accent-sky-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-900/75 border border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-100">每年自动保存进度</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                每年 1 月 1 日自动写入自动存档槽位，主界面点击「继续游戏」可随时接续
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSaveYearly}
              onChange={(e) => updateSettings({ autoSaveYearly: e.target.checked })}
              className="w-4 h-4 accent-sky-400 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export const GuideModal: React.FC = () => {
  const show = useGameStore((s) => s.showGuideModal);
  const setShow = useGameStore((s) => s.setShowGuideModal);

  if (!show) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg hud-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-teal-300" />
            <h2 className="text-sm font-bold text-white">Halfstar 玩法与操作说明</h2>
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
              1. <b>探索</b>：选中科研船右键未知星系（或点击「自动探索」），测绘行星矿藏与宜居星。<br />
              2. <b>扩张</b>：派遣工程船在已调查星系建造前哨站并建设采矿/科研站；在宜居星点击殖民。<br />
              3. <b>经营</b>：在星球面板修建区划与建筑，推进三线科研抽卡与帝国传统飞升。<br />
              4. <b>外交与战争</b>：设计克制敌军的舰船，在星港造舰，与 AI 帝国结盟或宣战吞并！
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="font-bold text-amber-300 mb-1">常用操作与快捷键</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div><kbd className="px-1 bg-slate-800 rounded">左键拖拽 / WASD</kbd> 平移镜头</div>
              <div><kbd className="px-1 bg-slate-800 rounded">右键拖拽</kbd> 调整 3D 俯仰旋转</div>
              <div><kbd className="px-1 bg-slate-800 rounded">滚轮</kbd> 平滑缩放镜头</div>
              <div><kbd className="px-1 bg-slate-800 rounded">E / 双击星系</kbd> 银河/3D星系切换</div>
              <div><kbd className="px-1 bg-slate-800 rounded">Space</kbd> 暂停 / 继续游戏</div>
              <div><kbd className="px-1 bg-slate-800 rounded">1 ~ 4</kbd> 调节 1x~4x 流速</div>
              <div><kbd className="px-1 bg-slate-800 rounded">F1 ~ F6</kbd> 快捷打开 6 大帝国面板</div>
              <div><kbd className="px-1 bg-slate-800 rounded">Esc</kbd> 关闭面板 / 打开暂停菜单</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
