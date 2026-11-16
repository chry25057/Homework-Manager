import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ExternalLink, CheckSquare, Square, Repeat } from 'lucide-react';
import { Assignment, Difficulty, ImpactLevel, AssignmentPenalty, AssignmentProgress } from '../../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>) => void;
  onSaveMultiple?: (dataList: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>[]) => void;
  initialAssignment?: Assignment | null;
}

const DAY_LABELS = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 0, label: '日' },
];

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  initialAssignment,
}) => {
  // 基本項目
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [progress, setProgress] = useState<AssignmentProgress>('not_started');

  // 毎週課題の設定
  const [isWeekly, setIsWeekly] = useState(false);
  const [weeklyDayOfWeek, setWeeklyDayOfWeek] = useState<number>(1); // 1: 月曜
  const [weeklyDueTime, setWeeklyDueTime] = useState<string>('23:59'); // デフォルト23:59
  const [startOccurrence, setStartOccurrence] = useState<number>(1); // デフォルト1回目から
  const [totalOccurrences, setTotalOccurrences] = useState<number>(14); // デフォルト14回
  const [batchCreateAll, setBatchCreateAll] = useState(true);

  // 配点割合の設定（全体割合 ÷ 回数、0%対応）
  const [totalWeightPercent, setTotalWeightPercent] = useState<string>('');

  // 任意項目
  const [impact, setImpact] = useState<ImpactLevel>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedPenalties, setSelectedPenalties] = useState<AssignmentPenalty[]>(['unknown']);
  const [notes, setNotes] = useState('');

  // 変更検知用の初期スナップショット
  const initialSnapshotRef = useRef<string>('');

  // 1回あたりの配点割合を自動計算
  const calculatedPerItemWeight = useMemo(() => {
    if (totalWeightPercent === '' || isNaN(parseFloat(totalWeightPercent))) return null;
    const total = parseFloat(totalWeightPercent);
    if (total <= 0) return 0;
    const count = totalOccurrences || 14;
    const perItem = Math.round((total / count) * 10) / 10;
    return perItem;
  }, [totalWeightPercent, totalOccurrences]);

  // シラバスを開く（未登録なら入力ダイアログ）
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
    } else {
      // 登録済みの場合でも、もしURLを変更したい場合は確認できるようにする
      // 通常クリックはそのまま別タブで開く
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // シラバスURLの変更
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

  // モーダルオープン / 初期値セット
  useEffect(() => {
    if (!isOpen) return;

    if (initialAssignment) {
      setTitle(initialAssignment.title || '');
      setCourseName(initialAssignment.courseName || '');
      setDueDate(initialAssignment.dueDate ? initialAssignment.dueDate.slice(0, 16) : '');
      setEstimatedMinutes(initialAssignment.estimatedMinutes !== undefined ? initialAssignment.estimatedMinutes.toString() : '');
      setProgress(initialAssignment.progress);
      setImpact(initialAssignment.impact || 'medium');
      setDifficulty(initialAssignment.difficulty || 'normal');
      setNotes(initialAssignment.notes || '');

      if (initialAssignment.totalWeightPercent !== undefined) {
        setTotalWeightPercent(initialAssignment.totalWeightPercent.toString());
      } else if (initialAssignment.weightPercent !== undefined) {
        setTotalWeightPercent(initialAssignment.weightPercent.toString());
      } else {
        setTotalWeightPercent('');
      }

      setTotalOccurrences(initialAssignment.totalOccurrences || 14);
      setStartOccurrence(initialAssignment.weeklyIndex || 1);
      setIsWeekly(!!initialAssignment.isWeekly);
      setBatchCreateAll(false);

      if (initialAssignment.penalties && initialAssignment.penalties.length > 0) {
        setSelectedPenalties(initialAssignment.penalties);
      } else if (initialAssignment.penalty) {
        setSelectedPenalties([initialAssignment.penalty]);
      } else {
        setSelectedPenalties(['unknown']);
      }

      // スナップショット記録
      initialSnapshotRef.current = JSON.stringify({
        title: initialAssignment.title || '',
        courseName: initialAssignment.courseName || '',
        dueDate: initialAssignment.dueDate ? initialAssignment.dueDate.slice(0, 16) : '',
        estimatedMinutes: initialAssignment.estimatedMinutes !== undefined ? initialAssignment.estimatedMinutes.toString() : '',
        progress: initialAssignment.progress,
        impact: initialAssignment.impact || 'medium',
        difficulty: initialAssignment.difficulty || 'normal',
        notes: initialAssignment.notes || '',
        totalWeightPercent: initialAssignment.totalWeightPercent !== undefined ? initialAssignment.totalWeightPercent.toString() : '',
      });
    } else {
      // 新規登録初期化
      setTitle('');
      setCourseName('');

      // デフォルト: 明日の23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowYear = tomorrow.getFullYear();
      const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
      setDueDate(`${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}T23:59`);

      setWeeklyDayOfWeek(tomorrow.getDay());
      setWeeklyDueTime('23:59');
      setStartOccurrence(1);
      setTotalOccurrences(14); // デフォルト14

      setEstimatedMinutes('');
      setProgress('not_started');
      setImpact('medium');
      setTotalWeightPercent('');
      setIsWeekly(false);
      setBatchCreateAll(true);
      setDifficulty('normal');
      setSelectedPenalties(['unknown']);
      setNotes('');

      initialSnapshotRef.current = '';
    }
  }, [initialAssignment, isOpen]);

  if (!isOpen) return null;

  // フォームが変更されたかチェック
  const isFormDirty = () => {
    if (!initialAssignment) return false;
    const current = JSON.stringify({
      title,
      courseName,
      dueDate,
      estimatedMinutes,
      progress,
      impact,
      difficulty,
      notes,
      totalWeightPercent,
    });
    return current !== initialSnapshotRef.current;
  };

  // ペナルティの複数選択トグル
  const handleTogglePenalty = (penalty: AssignmentPenalty) => {
    if (penalty === 'unknown') {
      setSelectedPenalties(['unknown']);
      return;
    }

    let next: AssignmentPenalty[] = selectedPenalties.filter(p => p !== 'unknown');
    if (next.includes(penalty)) {
      next = next.filter(p => p !== penalty);
      if (next.length === 0) next = ['unknown'];
    } else {
      next.push(penalty);
    }
    setSelectedPenalties(next);
  };

  // 保存処理の本体
  const performSave = () => {
    if (!title.trim()) {
      alert('課題名を入力してください。');
      return false;
    }

    const parsedEstimated = estimatedMinutes.trim() !== '' ? parseInt(estimatedMinutes) : undefined;
    const perItemWeight = calculatedPerItemWeight !== null ? calculatedPerItemWeight : undefined;
    const totalWeight = totalWeightPercent.trim() !== '' ? parseFloat(totalWeightPercent) : undefined;
    const cleanCourseName = courseName.trim() || '（講義名未設定）';

    // 毎週課題の一括登録モード（新規作成時）
    if (isWeekly && batchCreateAll && !initialAssignment) {
      const now = new Date();
      const [dueHour, dueMinute] = weeklyDueTime.split(':').map(Number);
      
      const currentDay = now.getDay();
      let diffDays = (weeklyDayOfWeek - currentDay + 7) % 7;
      
      const nextDue = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffDays, dueHour, dueMinute, 0, 0);
      if (diffDays === 0 && nextDue.getTime() <= now.getTime()) {
        nextDue.setDate(nextDue.getDate() + 7);
      }

      const seriesId = `series-${Date.now()}`;
      const itemsToCreate: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>[] = [];
      const startIdx = Math.max(1, startOccurrence);
      const totalCount = Math.max(startIdx, totalOccurrences || 14);

      for (let i = startIdx; i <= totalCount; i++) {
        const weekOffset = i - startIdx;
        const itemDueDate = new Date(nextDue.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
        const itemTitle = `${title.trim()} 第${i}回`;

        itemsToCreate.push({
          title: itemTitle,
          courseName: cleanCourseName,
          dueDate: itemDueDate.toISOString(),
          estimatedMinutes: parsedEstimated,
          progress: i === startIdx ? progress : 'not_started',
          impact,
          weightPercent: perItemWeight,
          totalWeightPercent: totalWeight,
          totalOccurrences: totalCount,
          startOccurrence: startIdx,
          difficulty,
          penalties: selectedPenalties,
          penalty: selectedPenalties[0] || 'unknown',
          notes: notes.trim() || undefined,
          isWeekly: true,
          weeklyIndex: i,
          weeklySeriesId: seriesId,
        });
      }

      if (onSaveMultiple) {
        onSaveMultiple(itemsToCreate);
      } else {
        itemsToCreate.forEach(item => onSave(item));
      }

      onClose();
      return true;
    }

    // 単発登録または編集更新
    let finalDueDateStr = dueDate;
    if (isWeekly && !dueDate) {
      const now = new Date();
      const [dueHour, dueMinute] = weeklyDueTime.split(':').map(Number);
      const currentDay = now.getDay();
      let diffDays = (weeklyDayOfWeek - currentDay + 7) % 7;
      const calcDue = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffDays, dueHour, dueMinute, 0, 0);
      if (diffDays === 0 && calcDue.getTime() <= now.getTime()) {
        calcDue.setDate(calcDue.getDate() + 7);
      }
      finalDueDateStr = calcDue.toISOString();
    } else if (dueDate) {
      finalDueDateStr = new Date(dueDate).toISOString();
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      finalDueDateStr = tomorrow.toISOString();
    }

    onSave({
      title: title.trim(),
      courseName: cleanCourseName,
      dueDate: finalDueDateStr,
      estimatedMinutes: parsedEstimated,
      progress,
      impact,
      weightPercent: perItemWeight,
      totalWeightPercent: totalWeight,
      totalOccurrences,
      difficulty,
      penalties: selectedPenalties,
      penalty: selectedPenalties[0] || 'unknown',
      notes: notes.trim() || undefined,
      isWeekly,
    });

    onClose();
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSave();
  };

  // ×ボタンまたはモーダル閉じる時のハンドラ（編集時変更確認）
  const handleCloseAttempt = () => {
    if (initialAssignment && isFormDirty()) {
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
              {initialAssignment ? '提出課題の編集' : '新しい提出課題を登録'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* シラバスボタン */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={handleOpenSyllabus}
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-2 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                title="大学のシラバスを開く（未登録時はURL登録）"
              >
                <ExternalLink className="w-3 h-3 text-blue-600" />
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
          
          {/* 基本設定 */}
          <div className="space-y-4">
            
            {/* 1. 課題名（一番上・必須） */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                課題名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 小テスト、レポート課題、演習問題"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                placeholder="例: プログラミング演習、線形代数学、英語"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. 提出期限 & 毎週設定ブロック */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  提出期限の設定 <span className="text-red-500">*</span>
                </label>

                {/* 毎週トグル */}
                {!initialAssignment && (
                  <button
                    type="button"
                    onClick={() => setIsWeekly(!isWeekly)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      isWeekly 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span>毎週</span>
                  </button>
                )}
              </div>

              {/* 毎週モード: 曜日を選ぶだけ */}
              {isWeekly && !initialAssignment ? (
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-blue-200/80">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      毎週の提出曜日を選択:
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAY_LABELS.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setWeeklyDayOfWeek(d.value)}
                          className={`py-2 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            weeklyDayOfWeek === d.value
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        提出時刻
                      </label>
                      <input
                        type="time"
                        value={weeklyDueTime}
                        onChange={(e) => setWeeklyDueTime(e.target.value)}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        スタート回 <span className="text-slate-400 font-normal">（学期途中からの場合）</span>
                      </label>
                      <select
                        value={startOccurrence}
                        onChange={(e) => setStartOccurrence(Number(e.target.value))}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-900 focus:outline-none"
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>第{num}回 から開始</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 全何回か & 一括生成 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">全何回まで実施:</span>
                    <select
                      value={totalOccurrences}
                      onChange={(e) => setTotalOccurrences(Number(e.target.value))}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num} disabled={num < startOccurrence}>
                          全{num}回まで
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-blue-950 bg-blue-50/50 p-2 rounded-lg border border-blue-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchCreateAll}
                      onChange={(e) => setBatchCreateAll(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>第{startOccurrence}回〜第{totalOccurrences}回（全{Math.max(1, totalOccurrences - startOccurrence + 1)}回分）を一括登録する</span>
                  </label>
                  <p className="text-[11px] text-blue-700/90 leading-relaxed">
                    ※直近の{DAY_LABELS.find(d => d.value === weeklyDayOfWeek)?.label}曜 {weeklyDueTime} を起点に、学期終了まで順次カレンダー配置されます。
                  </p>
                </div>
              ) : (
                /* 通常モード: 日時ピッカー（初期値23:59） */
                <div>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  />
                </div>
              )}
            </div>

            {/* 推定所要時間 (任意) ＆ 進捗 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  推定所要時間 <span className="text-slate-400 font-normal">（任意）</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="未設定可 (例: 30)"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-500 font-semibold shrink-0">分</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  現在の進捗
                </label>
                <select
                  value={progress}
                  onChange={(e) => setProgress(e.target.value as AssignmentProgress)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="submitted">提出済み (完了)</option>
                </select>
              </div>
            </div>

          </div>

          {/* 配点割合の設定（全体% ÷ 回数、0%許可） */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              配点割合の設定（全体割合から自動計算・0%可）
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    課題全体の配点割合
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="例: 30 (0も可)"
                      value={totalWeightPercent}
                      onChange={(e) => setTotalWeightPercent(e.target.value)}
                      className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <span className="text-xs text-slate-500 font-semibold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    全何回出されるか
                  </label>
                  <select
                    value={totalOccurrences}
                    onChange={(e) => setTotalOccurrences(Number(e.target.value))}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num === 1 ? '1回のみ (単発)' : `全${num}回 (毎週等)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1回あたりの自動計算結果 */}
              {calculatedPerItemWeight !== null ? (
                <div className="flex items-center justify-between text-xs bg-indigo-50/80 text-indigo-900 px-3 py-2 rounded-lg border border-indigo-200 font-medium">
                  <span>1回あたりの配点（自動計算）:</span>
                  <span className="font-extrabold text-sm text-indigo-700">
                    約 {calculatedPerItemWeight}% <span className="text-[11px] font-normal text-indigo-600">({totalWeightPercent}% ÷ {totalOccurrences}回)</span>
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  ※配点がなく提出で出席扱いになる課題は「0%」のまま登録できます。
                </p>
              )}
            </div>
          </div>

          {/* 未提出の場合のペナルティ（複数選択対応・フッターサブ説明を削除） */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                未提出の場合のペナルティ <span className="text-slate-400 font-normal">（複数選択可）</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'fail_course', label: '未提出だと単位取得不可', color: 'border-red-300 bg-red-50/60 text-red-900' },
                { id: 'lose_attendance', label: '出席がなくなる', color: 'border-rose-300 bg-rose-50/60 text-rose-900' },
                { id: 'no_late_submission', label: '期限後は提出不可', color: 'border-orange-300 bg-orange-50/60 text-orange-900' },
                { id: 'normal_deduction', label: '通常の減点', color: 'border-slate-200 bg-slate-50 text-slate-700' },
              ].map(opt => {
                const isChecked = selectedPenalties.includes(opt.id as AssignmentPenalty);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleTogglePenalty(opt.id as AssignmentPenalty)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? `${opt.color} ring-2 ring-blue-500/30 font-bold`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="shrink-0 text-blue-600">
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="font-bold text-xs">{opt.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* その他の任意項目（難易度・メモ） */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  難易度
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="easy">易しい</option>
                  <option value="normal">普通</option>
                  <option value="hard">難しい</option>
                  <option value="very_hard">非常に難しい</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  成績への影響度
                </label>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as ImpactLevel)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="high">大</option>
                  <option value="medium">中</option>
                  <option value="low">小</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                課題の説明や注意事項
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="提出先URLや注意事項、指定ファイル形式など"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              {initialAssignment
                ? '課題を更新'
                : isWeekly && batchCreateAll
                ? `第${startOccurrence}回〜第${totalOccurrences}回を一括登録する`
                : '課題を登録する'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
