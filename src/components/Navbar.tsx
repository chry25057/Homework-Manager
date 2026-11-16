import React from 'react';
import { 
  Compass, 
  FileText, 
  GraduationCap, 
  Calculator,
  Plus,
  RotateCcw,
  ExternalLink
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

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '今やるべきこと', icon: <Compass className="w-4 h-4" /> },
    { id: 'assignments', label: '提出課題', icon: <FileText className="w-4 h-4" /> },
    { id: 'exams', label: 'テスト勉強', icon: <GraduationCap className="w-4 h-4" /> },
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
              className="flex items-center gap-2.5 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  UniPilot
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
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
            <button
              onClick={() => {
                let url = localStorage.getItem('unipilot_syllabus_url');
                if (!url) {
                  const input = window.prompt('大学のシラバスページのURLを入力してください（例: https://syllabus.example.ac.jp）');
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
              }}
              title="大学のシラバスページを開く"
              className="px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">シラバス</span>
            </button>

            <button
              onClick={() => {
                if (confirm('登録されているすべての課題・テストデータを削除して空にしますか？')) {
                  clearAllData();
                }
              }}
              title="すべての登録データを削除して初期化"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs flex items-center gap-1 border border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">全データクリア</span>
            </button>

            <button
              onClick={onOpenAssignmentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>課題を追加</span>
            </button>

            <button
              onClick={onOpenExamModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>テストを追加</span>
            </button>
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
