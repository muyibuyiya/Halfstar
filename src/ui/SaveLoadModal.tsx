import React, { useRef, useState } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  formatSavedTime,
  listManualSaves,
  loadAutoSave,
} from '../engine/saveSystem';
import { DIFFICULTIES } from '../data/playableEmpires';

export const SaveLoadModal: React.FC = () => {
  const mode = useGameStore((s) => s.showSaveModal);
  const screen = useGameStore((s) => s.screen);
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.saveListVersion);
  const setShowSaveModal = useGameStore((s) => s.setShowSaveModal);
  const saveToLocalStorage = useGameStore((s) => s.saveToLocalStorage);
  const loadSaveRecord = useGameStore((s) => s.loadSaveRecord);
  const deleteSaveRecord = useGameStore((s) => s.deleteSaveRecord);
  const importSaveJson = useGameStore((s) => s.importSaveJson);

  const [saveName, setSaveName] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (mode === 'none') return null;

  const autoSave = loadAutoSave();
  const manualSaves = listManualSaves();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halfstar_${game.date.year}_${game.date.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl hud-panel rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-500/25 bg-sky-950/40">
          <div className="flex items-center gap-2">
            {mode === 'save' ? (
              <Save className="w-4 h-4 text-emerald-400" />
            ) : (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            )}
            <h2 className="text-sm font-bold text-white">
              {mode === 'save' ? '保存星海进度' : '读取存档'}
            </h2>
          </div>
          <button
            onClick={() => setShowSaveModal('none')}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* New Manual Save Form (only when playing & mode === 'save') */}
          {mode === 'save' && screen === 'playing' && (
            <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/35 space-y-2">
              <div className="text-[11px] font-semibold text-emerald-300">新建手动存档槽位</div>
              <div className="flex gap-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={`例如：${game.empires[game.playerEmpireId]?.name} · ${game.date.year}年决战前`}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-950/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={() => {
                    saveToLocalStorage(saveName);
                    setSaveName('');
                  }}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {/* Auto-Save Slot */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
              自动存档槽位
            </div>
            {autoSave ? (
              <div className="p-3 rounded-lg bg-sky-950/35 border border-sky-500/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sky-100 flex items-center gap-2">
                    <span>{autoSave.empireName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/25 text-sky-200">
                      自动
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    领袖：{autoSave.leaderName} · {autoSave.year}.{String(autoSave.month).padStart(2, '0')}.{String(autoSave.day).padStart(2, '0')} · {DIFFICULTIES[autoSave.difficulty]?.name ?? '标准'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatSavedTime(autoSave.savedAt)}
                  </div>
                </div>
                <button
                  onClick={() => loadSaveRecord(autoSave)}
                  className="px-3.5 py-1.5 rounded bg-sky-600/80 hover:bg-sky-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  读取
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-500 text-center">
                暂无自动存档
              </div>
            )}
          </div>

          {/* Manual Save Slots */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
              手动存档 ({manualSaves.length}/8)
            </div>
            {manualSaves.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-500 text-center">
                暂无手动存档记录
              </div>
            ) : (
              <div className="space-y-2">
                {manualSaves.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-lg bg-slate-900/75 border border-slate-800 hover:border-slate-600 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{slot.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {slot.empireName}（{slot.leaderName}）· {slot.year}.{String(slot.month).padStart(2, '0')} · {DIFFICULTIES[slot.difficulty]?.name ?? '标准'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatSavedTime(slot.savedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => loadSaveRecord(slot)}
                        className="px-3 py-1.5 rounded bg-sky-700/80 hover:bg-sky-600 text-white font-medium cursor-pointer"
                      >
                        读取
                      </button>
                      <button
                        onClick={() => deleteSaveRecord(slot.id)}
                        title="删除存档"
                        className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-400 hover:text-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON File Import / Export */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            {screen === 'playing' && (
              <button
                onClick={handleExport}
                className="flex-1 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                导出 .JSON 文件
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              导入 .JSON 存档
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') importSaveJson(reader.result);
                };
                reader.readAsText(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
