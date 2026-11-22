import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  FolderOpen,
  BookOpen,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Award,
  Trophy,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PLAYABLE_EMPIRES, DIFFICULTIES } from '../data/playableEmpires';
import { formatSavedTime, listManualSaves, loadAutoSave } from '../engine/saveSystem';
import { getGlowTexture } from '../renderer/proceduralTextures';
import { ACHIEVEMENTS, loadRunHistory, loadUnlockedAchievements } from '../data/achievements';
import { EmpireEmblem } from './EmpireEmblem';

const TitleGalaxyBackdrop: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040712');

    const camera = new THREE.PerspectiveCamera(
      48,
      host.clientWidth / host.clientHeight,
      0.5,
      1200
    );
    camera.position.set(0, 145, 220);
    camera.lookAt(0, -10, 0);

    const galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);

    // Spiral stars
    const count = 2600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const t = Math.pow(Math.random(), 0.75);
      const r = 10 + t * 185;
      const angle = (arm / 3) * Math.PI * 2 + (r / 185) * 3.8 + (Math.random() - 0.5) * 0.7;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14 * (1 - t * 0.6);
      pos[i * 3 + 2] = Math.sin(angle) * r;

      const c = new THREE.Color(
        t < 0.25 ? '#fde68a' : Math.random() < 0.65 ? '#38bdf8' : '#a855f7'
      );
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.6,
      map: getGlowTexture('#ffffff'),
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    galaxyGroup.add(new THREE.Points(geo, mat));

    // Core glow
    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture('#38bdf8', '#040712'),
        color: '#93c5fd',
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    core.scale.set(140, 140, 1);
    galaxyGroup.add(core);

    const onResize = () => {
      if (!host) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      galaxyGroup.rotation.y = t * 0.045;
      galaxyGroup.rotation.z = Math.sin(t * 0.12) * 0.04;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="fixed inset-0 z-0 pointer-events-none opacity-85" />;
};

export const TitleScreen: React.FC = () => {
  useGameStore((s) => s.saveListVersion);
  const setScreen = useGameStore((s) => s.setScreen);
  const openSetupWithEmpire = useGameStore((s) => s.openSetupWithEmpire);
  const continueAutoSave = useGameStore((s) => s.continueAutoSave);
  const setShowSaveModal = useGameStore((s) => s.setShowSaveModal);
  const setShowCodexModal = useGameStore((s) => s.setShowCodexModal);
  const setShowSettingsModal = useGameStore((s) => s.setShowSettingsModal);
  const setShowGuideModal = useGameStore((s) => s.setShowGuideModal);
  const setShowAchievementsModal = useGameStore((s) => s.setShowAchievementsModal);

  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const [leaderIdx, setLeaderIdx] = useState(0);

  const autoSave = loadAutoSave();
  const manualSaves = listManualSaves();
  const unlockedAchCount = Object.keys(loadUnlockedAchievements()).length;
  const historyCount = loadRunHistory().length;

  const curEmpire = PLAYABLE_EMPIRES[showcaseIdx];
  const curLeader = curEmpire.leaders[leaderIdx % curEmpire.leaders.length];

  // Auto-cycle showcase every 9s
  useEffect(() => {
    const timer = window.setInterval(() => {
      setShowcaseIdx((i) => (i + 1) % PLAYABLE_EMPIRES.length);
      setLeaderIdx(0);
    }, 9000);
    return () => window.clearInterval(timer);
  }, []);

  const cycleEmpire = (dir: -1 | 1) => {
    setShowcaseIdx((i) => (i + dir + PLAYABLE_EMPIRES.length) % PLAYABLE_EMPIRES.length);
    setLeaderIdx(0);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040712] text-slate-100 flex items-center justify-center">
      <TitleGalaxyBackdrop />

      {/* Subtle radial vignette */}
      <div
        className="fixed inset-0 z-1 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(4,7,18,0.12) 0%, rgba(4,7,18,0.82) 100%)',
        }}
      />

      {/* Main Half-series 2-Column Editorial Container */}
      <div className="relative z-10 w-full max-w-5xl px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: Branding + Action Menu (Halfciv layout in Stellaris sci-fi skin) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold tracking-widest text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                半星纪元
              </h1>
              <span className="px-2 py-0.5 rounded border border-amber-400/50 bg-amber-500/10 text-amber-300 text-[11px] font-semibold tracking-wider">
                星海大战略
              </span>
            </div>
            <div className="text-xs tracking-[0.28em] text-sky-400/90 font-semibold mt-1.5 uppercase">
              HALFSTAR · 实时可暂停太空 4X
            </div>
            <p className="text-xs text-slate-400 mt-2 pl-2.5 border-l-2 border-sky-500/50">
              从太阳系的第一道曲率尾迹，走向群星深处的银河霸权
            </p>
          </div>

          {/* Primary CTA: New Game */}
          <button
            onClick={() => setScreen('setup')}
            className="w-full text-left px-4 py-3.5 rounded-lg bg-gradient-to-r from-sky-600/90 to-blue-700/90 hover:from-sky-500 hover:to-blue-600 border border-sky-300/60 shadow-[0_0_24px_rgba(56,189,248,0.28)] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 fill-white" />
                开始新游戏
              </span>
              <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-[11px] text-sky-100/80 mt-0.5">
              选择帝国、领袖、特质配点、难度与银河形态
            </div>
          </button>

          {/* 2-Col Row: Continue & Load Save */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={continueAutoSave}
              disabled={!autoSave}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                继续游戏
                {autoSave && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                {autoSave
                  ? `${autoSave.empireName} · ${autoSave.year}年`
                  : '暂无自动存档'}
              </div>
            </button>

            <button
              onClick={() => setShowSaveModal('load')}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                读取存档
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                已有 {manualSaves.length} 个手动存档
              </div>
            </button>
          </div>

          {/* 2-Col Row: Achievements & Run History (Halfciv Parity!) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowAchievementsModal('achievements')}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                成就
                {unlockedAchCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                已达成 {unlockedAchCount} / {ACHIEVEMENTS.length}
              </div>
            </button>

            <button
              onClick={() => setShowAchievementsModal('history')}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                战绩
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                {historyCount > 0 ? `已记录 ${historyCount} 场战役` : '回顾最近的每一局'}
              </div>
            </button>
          </div>

          {/* Codex */}
          <button
            onClick={() => setShowCodexModal(true)}
            className="w-full text-left px-4 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
          >
            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              星海百科（Codex）
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              查阅武器护盾克制、科技树、行星建筑与天灾档案
            </div>
          </button>

          {/* 2-Col Row: Settings & Guide */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-300" />
                游戏设置
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                科幻音效 · 自动暂停 · 自动存档
              </div>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="text-left px-3.5 py-3 rounded-lg hud-panel hover:border-sky-400/60 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-teal-300" />
                玩法说明
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                操作快捷键、4X 流程与胜利规则
              </div>
            </button>
          </div>

          {/* Footer Auto-save status */}
          <div className="pt-2 text-[11px] text-slate-500 flex flex-col gap-0.5">
            <div>
              {autoSave
                ? `自动存档：${autoSave.empireName}（${autoSave.leaderName}）· ${autoSave.year}.${String(autoSave.month).padStart(2, '0')} · ${DIFFICULTIES[autoSave.difficulty]?.name ?? '标准'} · ${formatSavedTime(autoSave.savedAt)}`
                : '尚未开始星海征程 · 点击「开始新游戏」创建你的星际帝国'}
            </div>
            <div className="text-slate-600">Half Series · Halfstar v1.7</div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Empire & Leader Showcase Card (Fixed Height) */}
        <div className="lg:col-span-7">
          <div className="hud-panel rounded-2xl overflow-hidden border border-sky-400/35 shadow-2xl h-[476px] flex flex-col">
            {/* Top Strip */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-sky-500/20 bg-slate-950/50 text-xs shrink-0">
              <div className="flex items-center gap-2 text-sky-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>星际文明图鉴</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-1">
                  {PLAYABLE_EMPIRES.map((emp, idx) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setShowcaseIdx(idx);
                        setLeaderIdx(0);
                      }}
                      title={emp.name}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === showcaseIdx ? 'w-4' : 'w-1.5 opacity-40 hover:opacity-80'
                      }`}
                      style={{ backgroundColor: emp.color }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {showcaseIdx + 1} / {PLAYABLE_EMPIRES.length}
                </span>
                <button
                  onClick={() => cycleEmpire(-1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cycleEmpire(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Star-Emblem Stage */}
            <div
              className="relative h-52 shrink-0 flex flex-col items-center justify-center overflow-hidden px-6"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${curEmpire.color}2a 0%, rgba(7,15,28,0.92) 72%)`,
              }}
            >
              {/* Unique Bespoke Civilization Heraldic Crest with soft breathing halo */}
              <div className="relative mb-5 flex items-center justify-center">
                <div
                  className="absolute w-32 h-32 rounded-full blur-2xl opacity-30 animate-pulse pointer-events-none"
                  style={{ backgroundColor: curEmpire.color }}
                />
                <EmpireEmblem
                  empireId={curEmpire.id}
                  color={curEmpire.color}
                  className="relative w-36 h-36 opacity-95 transition-transform duration-500 hover:scale-105"
                />
              </div>

              <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-white tracking-wide">
                    {curEmpire.name}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {curEmpire.speciesName} · {curEmpire.ethicsLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-end gap-1.5">
                    {curLeader.tag && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-600/40 border border-purple-400/60 text-purple-200 text-[9px]">
                        {curLeader.tag}
                      </span>
                    )}
                    <span>
                      {curLeader.title} · {curLeader.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    母星：{curEmpire.homeworldName}（{curEmpire.homeSystemName}）
                  </div>
                </div>
              </div>
            </div>

            {/* Info & Leader Switcher Footer */}
            <div className="p-5 flex-1 flex flex-col justify-between text-xs bg-slate-950/70">
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed italic line-clamp-2 min-h-[2.5rem]">
                  「{curLeader.quote}」
                </p>

                <div className="flex flex-col gap-1.5">
                  <span className="px-2.5 py-1 rounded bg-sky-950/80 border border-sky-500/35 text-sky-200 text-[11px] truncate">
                    帝国特性：{curEmpire.baseSummary}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-500/35 text-amber-200 text-[11px] line-clamp-2">
                    领袖技能：{curLeader.summary}
                  </span>
                </div>
              </div>

              {/* Switch between leaders of this empire right on the Title Card */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 mr-1">可选领袖：</span>
                  {curEmpire.leaders.map((l, idx) => (
                    <button
                      key={l.id}
                      onClick={() => setLeaderIdx(idx)}
                      className={`px-2 py-1 rounded text-[11px] border cursor-pointer transition-colors ${
                        leaderIdx % curEmpire.leaders.length === idx
                          ? 'bg-sky-600/35 border-sky-400 text-white font-semibold'
                          : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {l.name}
                      {l.tag ? ' ✦' : ''}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => openSetupWithEmpire(curEmpire.id)}
                  className="px-3 py-1.5 rounded-md bg-sky-600/35 hover:bg-sky-500/50 border border-sky-400/60 text-sky-100 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  以此文明开局
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
