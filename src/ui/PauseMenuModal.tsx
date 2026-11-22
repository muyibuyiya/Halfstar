import React from 'react';
import {
  Play,
  Save,
  FolderOpen,
  BookOpen,
  Settings,
  HelpCircle,
  LogOut,
  Globe,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const PauseMenuModal: React.FC = () => {
  const show = useGameStore((s) => s.showPauseMenu);
  const game = useGameStore((s) => s.game);
  const setShowPauseMenu = useGameStore((s) => s.setShowPauseMenu);
  const setShowSaveModal = useGameStore((s) => s.setShowSaveModal);
  const setShowCodexModal = useGameStore((s) => s.setShowCodexModal);
  const setShowSettingsModal = useGameStore((s) => s.setShowSettingsModal);
  const setShowGuideModal = useGameStore((s) => s.setShowGuideModal);
  const returnToTitle = useGameStore((s) => s.returnToTitle);

  if (!show) return null;

  const empire = game.empires[game.playerEmpireId];

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs hud-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-sky-500/20 bg-sky-950/35 text-center">
          <div className="flex items-center justify-center gap-2 text-sky-300 text-xs font-semibold">
            <Globe className="w-4 h-4" />
            <span>{empire?.name}</span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">游戏暂停菜单</h2>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {game.date.year}.{String(game.date.month).padStart(2, '0')}.{String(game.date.day).padStart(2, '0')}
          </div>
        </div>

        <div className="p-4 space-y-2 text-xs">
          <button
            onClick={() => setShowPauseMenu(false)}
            className="w-full py-2.5 px-4 rounded-lg bg-sky-600/85 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            继续游戏
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setShowPauseMenu(false);
                setShowSaveModal('save');
              }}
              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              保存进度
            </button>
            <button
              onClick={() => {
                setShowPauseMenu(false);
                setShowSaveModal('load');
              }}
              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              读取存档
            </button>
          </div>

          <button
            onClick={() => {
              setShowPauseMenu(false);
              setShowCodexModal(true);
            }}
            className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            星海百科（Codex）
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setShowPauseMenu(false);
                setShowSettingsModal(true);
              }}
              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              设置
            </button>
            <button
              onClick={() => {
                setShowPauseMenu(false);
                setShowGuideModal(true);
              }}
              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-300" />
              玩法说明
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={returnToTitle}
              className="w-full py-2 px-4 rounded-lg bg-rose-950/60 hover:bg-rose-800/70 border border-rose-500/50 text-rose-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              返回主界面（自动保存）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
