import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, TaskType, Difficulty, ImpactLevel } from '../../types';
import { useUniPilot } from '../../context/useUniPilot';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id'>) => void;
  initialTask?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const { courses } = useUniPilot();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<TaskType>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [impact, setImpact] = useState<ImpactLevel>('high');
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setCourseId(initialTask.courseId);
      setType(initialTask.type);
      setDueDate(initialTask.dueDate ? initialTask.dueDate.slice(0, 16) : '');
      setEstimatedMinutes(initialTask.estimatedMinutes);
      setDifficulty(initialTask.difficulty);
      setImpact(initialTask.impact);
      setProgress(initialTask.progress);
      setNotes(initialTask.notes || '');
    } else {
      setTitle('');
      setCourseId(courses[0]?.id || '');
      setType('assignment');
      // デフォルト: 明日の23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      setDueDate(tomorrow.toISOString().slice(0, 16));
      setEstimatedMinutes(60);
      setDifficulty('normal');
      setImpact('high');
      setProgress(0);
      setNotes('');
    }
  }, [initialTask, isOpen, courses]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('タスク名を入力してください。');
      return;
    }
    if (!courseId) {
      alert('対象の講義を選択してください。');
      return;
    }

    onSave({
      title,
      courseId,
      type,
      dueDate: new Date(dueDate).toISOString(),
      estimatedMinutes,
      difficulty,
      impact,
      progress,
      isCompleted: progress >= 100,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
        
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialTask ? 'タスク情報の編集' : '新しいタスクの登録'}
            </h2>
            <p className="text-xs text-slate-500">
              締切や影響度を入力すると、自動で優先順位スコアが計算されます。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: プログラミング課題5、期末試験過去問演習"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                対象講義 <span className="text-red-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {courses.length === 0 && <option value="">講義が登録されていません</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                タスク種類
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="assignment">課題（毎週/定期課題）</option>
                <option value="report">レポート・論文</option>
                <option value="final_prep">期末試験対策</option>
                <option value="midterm_prep">中間試験対策</option>
                <option value="quiz_prep">小テスト対策</option>
                <option value="review">復習・自主学習</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                締切日時 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                推定所要時間
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 30)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">分</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                難易度
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="high">大（評価割合が高い・試験対策など）</option>
                <option value="medium">中（通常の定期課題など）</option>
                <option value="low">小（平常点の一部・復習など）</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>現在の進捗</span>
              <span className="font-bold text-blue-600">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>未着手 (0%)</span>
              <span>半分 (50%)</span>
              <span>完了 (100%)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              メモ・詳細
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="出題範囲や提出形式など"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              {initialTask ? 'タスクを更新' : 'タスクを登録'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
