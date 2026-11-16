import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  FileText, 
  GraduationCap, 
  Calculator,
  Plus,
  RotateCcw,
  ExternalLink,
  Settings,
  Edit2
} from 'lucide-react';
import { useUniPilot } from '../context/useUniPilot';

export type TabType = 'dashboard' | 'assignments' | 'exams' | 'scoreCalculator';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenAssignmentModal: () => void;
  onOpenExamModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAssignmentModal,
  onOpenExamModal,
}) => {
  const { clearAllData } = useUniPilot();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // 外側クリックで設定メニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // シラバスを開く
  const handleOpenSyllabus = () => {
    setIsSettingsOpen(false);
    let url = localStorage.getItem('unipilot_syllabus_url');
    if (!url) {
      const input = window.prompt('大学のシラバスページのURLを入力・登録してください（例: https://syllabus.example.ac.jp）');
      if (input && input.trim()) {
        let clean = input.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = 'https://' + clean;
        }
        localStorage.setItem('unipilot_syllabus_url', clean);
        url = clean;
      } else {
        return;
      }
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // シラバスURLの登録・変更
  const handleChangeSyllabusUrl = () => {
    setIsSettingsOpen(false);
    const current = localStorage.getItem('unipilot_syllabus_url') || '';
    const input = window.prompt('大学のシラバスページのURLを入力・変更してください', current);
    if (input !== null) {
      let clean = input.trim();
      if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      localStorage.setItem('unipilot_syllabus_url', clean);
      if (clean) {
        alert('シラバスURLを保存しました。');
      }
    }
  };

  // 全データクリア
  const handleClearAll = () => {
    setIsSettingsOpen(false);
    if (confirm('登録されているすべての課題・試験データを削除して初期化しますか？')) {
      clearAllData();
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '今やるべきこと', icon: <Compass className="w-4 h-4" /> },
    { id: 'assignments', label: '提出課題', icon: <FileText className="w-4 h-4" /> },
    { id: 'exams', label: '試験勉強', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'scoreCalculator', label: '試験 必要得点計算機', icon: <Calculator className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onTabChange('dashboard')} 
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  Homework Manager
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* 課題追加ボタン */}
            <button
              onClick={onOpenAssignmentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs cursor-pointer"
              title="新しい課題を登録"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>課題</span>
            </button>

            {/* 試験追加ボタン */}
            <button
              onClick={onOpenExamModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
              title="新しい試験を登録"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>試験</span>
            </button>

            {/* 右上端の設定ボタン（ドロップダウンメニュー） */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                title="設定"
                className={`p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer ${
                  isSettingsOpen ? 'bg-slate-100 text-slate-900 ring-2 ring-blue-500/20' : ''
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* ドロップダウンメニュー */}
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    設定メニュー
                  </div>

                  <button
                    onClick={handleOpenSyllabus}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>大学シラバスを開く</span>
                  </button>

                  <button
                    onClick={handleChangeSyllabusUrl}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>シラバスURLの設定・変更</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={handleClearAll}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                    <span>全データを削除（初期化）</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-slate-200/80 bg-white px-2 py-1.5 flex justify-around">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <span className="mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
