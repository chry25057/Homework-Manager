import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Exam, Difficulty, ImpactLevel } from '../../types';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Exam, 'id' | 'itemType' | 'createdAt'>) => void;
  initialExam?: Exam | null;
}

const PERIOD_OPTIONS = [
  { period: 1, label: '1限 (09:00〜)', time: '09:00' },
  { period: 2, label: '2限 (10:40〜)', time: '10:40' },
  { period: 3, label: '3限 (13:00〜)', time: '13:00' },
  { period: 4, label: '4限 (14:40〜)', time: '14:40' },
  { period: 5, label: '5限 (16:20〜)', time: '16:20' },
  { period: 6, label: '6限 (18:00〜)', time: '18:00' },
];

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExam,
}) => {
  // 基本項目
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  
  // 試験日時: 日付 + 何限
  const [examDateDay, setExamDateDay] = useState('');
  const [examPeriod, setExamPeriod] = useState<number>(2); // デフォルト2限

  const [understanding, setUnderstanding] = useState<number>(50);
  const [estimatedStudyMinutes, setEstimatedStudyMinutes] = useState<number>(180);

  // 任意項目
  const [impact, setImpact] = useState<ImpactLevel>('high');
  const [weightPercent, setWeightPercent] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [targetScore, setTargetScore] = useState<string>('80');
  const [passingRequiredScore, setPassingRequiredScore] = useState<string>('60');
  const [currentExpectedScore, setCurrentExpectedScore] = useState<string>('');
  const [studyProgress, setStudyProgress] = useState<number>(20);
  const [notes, setNotes] = useState('');

  // 変更検知用スナップショット
  const initialSnapshotRef = useRef<string>('');

  // シラバスを開く
  const handleOpenSyllabus = () => {
    let url = localStorage.getItem('unipilot_syllabus_url');
    if (!url) {
      const input = window.prompt('大学のシラバスページのURLを登録してください（例: https://syllabus.example.ac.jp）');
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

  // シラバスURL変更
  const handleChangeSyllabus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = localStorage.getItem('unipilot_syllabus_url') || '';
    const input = window.prompt('大学のシラバスページのURLを入力・変更してください', current);
    if (input !== null) {
      let clean = input.trim();
      if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      localStorage.setItem('unipilot_syllabus_url', clean);
      if (clean) {
        alert('シラバスURLを更新しました。');
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialExam) {
      setTitle(initialExam.title);
      setCourseName(initialExam.courseName || '');
      
      if (initialExam.examDate) {
        const d = new Date(initialExam.examDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setExamDateDay(`${yyyy}-${mm}-${dd}`);
        
        // 時刻から該当する時限を推定
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const found = PERIOD_OPTIONS.find(p => p.time === timeStr);
        setExamPeriod(found ? found.period : 2);
      } else {
        setExamDateDay('');
        setExamPeriod(2);
      }

      setUnderstanding(initialExam.understanding);
      setEstimatedStudyMinutes(initialExam.estimatedStudyMinutes ?? 180);
      setImpact(initialExam.impact || 'high');
      setWeightPercent(initialExam.weightPercent !== undefined ? initialExam.weightPercent.toString() : '');
      setDifficulty(initialExam.difficulty || 'normal');
      setTargetScore(initialExam.targetScore !== undefined ? initialExam.targetScore.toString() : '');
      setPassingRequiredScore(initialExam.passingRequiredScore !== undefined ? initialExam.passingRequiredScore.toString() : '');
      setCurrentExpectedScore(initialExam.currentExpectedScore !== undefined ? initialExam.currentExpectedScore.toString() : '');
      setStudyProgress(initialExam.studyProgress ?? 0);
      setNotes(initialExam.notes || '');

      // スナップショット
      initialSnapshotRef.current = JSON.stringify({
        title: initialExam.title,
        courseName: initialExam.courseName || '',
        examDateDay: initialExam.examDate ? initialExam.examDate.slice(0, 10) : '',
        understanding: initialExam.understanding,
        estimatedStudyMinutes: initialExam.estimatedStudyMinutes ?? 180,
        impact: initialExam.impact || 'high',
        weightPercent: initialExam.weightPercent !== undefined ? initialExam.weightPercent.toString() : '',
        difficulty: initialExam.difficulty || 'normal',
        targetScore: initialExam.targetScore !== undefined ? initialExam.targetScore.toString() : '',
        passingRequiredScore: initialExam.passingRequiredScore !== undefined ? initialExam.passingRequiredScore.toString() : '',
        notes: initialExam.notes || '',
      });
    } else {
      setTitle('');
      setCourseName('');

      // デフォルト: 1週間後
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const yyyy = nextWeek.getFullYear();
      const mm = String(nextWeek.getMonth() + 1).padStart(2, '0');
      const dd = String(nextWeek.getDate()).padStart(2, '0');
      setExamDateDay(`${yyyy}-${mm}-${dd}`);
      setExamPeriod(2); // デフォルト2限

      setUnderstanding(50);
      setEstimatedStudyMinutes(180);
      setImpact('high');
      setWeightPercent('');
      setDifficulty('normal');
      setTargetScore('80');
      setPassingRequiredScore('60');
      setCurrentExpectedScore('');
      setStudyProgress(10);
      setNotes('');

      initialSnapshotRef.current = '';
    }
  }, [initialExam, isOpen]);

  if (!isOpen) return null;

  // 変更検知
  const isFormDirty = () => {
    if (!initialExam) return false;
    const current = JSON.stringify({
      title,
      courseName,
      examDateDay,
      understanding,
      estimatedStudyMinutes,
      impact,
      weightPercent,
      difficulty,
      targetScore,
      passingRequiredScore,
      notes,
    });
    return current !== initialSnapshotRef.current;
  };

  const performSave = () => {
    if (!title.trim()) {
      alert('試験名を入力してください。');
      return false;
    }
    if (!examDateDay) {
      alert('試験日を選択してください。');
      return false;
    }

    const selectedPeriod = PERIOD_OPTIONS.find(p => p.period === examPeriod) || PERIOD_OPTIONS[1];
    const finalDateStr = `${examDateDay}T${selectedPeriod.time}:00`;

    onSave({
      title: title.trim(),
      courseName: courseName.trim(),
      examDate: new Date(finalDateStr).toISOString(),
      understanding: Number(understanding),
      estimatedStudyMinutes: Number(estimatedStudyMinutes) || 120,
      impact,
      weightPercent: weightPercent !== '' ? Number(weightPercent) : undefined,
      difficulty,
      targetScore: targetScore !== '' ? Number(targetScore) : undefined,
      passingRequiredScore: passingRequiredScore !== '' ? Number(passingRequiredScore) : undefined,
      currentExpectedScore: currentExpectedScore !== '' ? Number(currentExpectedScore) : undefined,
      studyProgress: Number(studyProgress),
      notes: notes.trim() || undefined,
      isCompleted: initialExam?.isCompleted ?? false,
    });

    onClose();
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSave();
  };

  // ×ボタンまたはモーダル閉じる時の確認ハンドラ
  const handleCloseAttempt = () => {
    if (initialExam && isFormDirty()) {
      const shouldSave = window.confirm(
        '変更内容が保存されていません。更新して保存しますか？\n（「キャンセル」を押すと変更を破棄して閉じます）'
      );
      if (shouldSave) {
        const ok = performSave();
        if (ok) return;
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
        
        {/* モーダルヘッダー（左のアイコンマークと下部フッター文を完全削除） */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialExam ? '試験勉強の編集' : '新しい試験勉強を登録'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* シラバスボタン */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={handleOpenSyllabus}
                className="text-xs font-semibold text-slate-700 hover:text-amber-700 px-2 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                title="大学のシラバスを開く（未登録時はURL登録）"
              >
                <ExternalLink className="w-3 h-3 text-amber-600" />
                <span>シラバス</span>
              </button>
              <button
                type="button"
                onClick={handleChangeSyllabus}
                className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-1 hover:bg-slate-100 border-l border-slate-200 cursor-pointer"
                title="シラバスURLを変更"
              >
                設定
              </button>
            </div>

            <button
              type="button"
              onClick={handleCloseAttempt}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          <div className="space-y-4">
            
            {/* 1. 試験名（必須） */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                試験名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 期末試験、中間試験、第3回小テスト"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* 2. 対象講義（任意） */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                対象講義 <span className="text-slate-400 font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="例: 線形代数学、ミクロ経済学、英語"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 3. 試験日時の設定（日付 + 何限） */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                試験日時の設定 <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    試験日
                  </label>
                  <input
                    type="date"
                    required
                    value={examDateDay}
                    onChange={(e) => setExamDateDay(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    時間帯（何限）
                  </label>
                  <select
                    value={examPeriod}
                    onChange={(e) => setExamPeriod(Number(e.target.value))}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold text-slate-800"
                  >
                    {PERIOD_OPTIONS.map(p => (
                      <option key={p.period} value={p.period}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. 理解度スライダー */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  現在の理解度
                </label>
                <span className="text-sm font-extrabold text-amber-600">
                  {understanding}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={understanding}
                onChange={(e) => setUnderstanding(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (未習)</span>
                <span>50% (標準)</span>
                <span>100% (完璧)</span>
              </div>
            </div>

            {/* 5. 必要な推定勉強時間（文言変更） */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                必要な推定勉強時間
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  step="30"
                  value={estimatedStudyMinutes}
                  onChange={(e) => setEstimatedStudyMinutes(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">
                  分 (約{(estimatedStudyMinutes / 60).toFixed(1)}時間)
                </span>
              </div>
            </div>

          </div>

          {/* 任意項目 */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              成績評価・目標点設定（任意）
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  配点割合 (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="例: 40"
                  value={weightPercent}
                  onChange={(e) => setWeightPercent(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  試験の難易度
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="easy">易しい</option>
                  <option value="normal">普通</option>
                  <option value="hard">難しい</option>
                  <option value="very_hard">非常に難しい</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  単位取得ライン (点)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingRequiredScore}
                  onChange={(e) => setPassingRequiredScore(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  目標点数 (点)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                試験範囲やメモ
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="教科書p.30〜p.85、持ち込み可否、重点ポイントなど"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
            >
              {initialExam ? '試験勉強を更新' : '試験勉強を登録する'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
