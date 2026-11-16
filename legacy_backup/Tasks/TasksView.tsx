import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Check, 
  Clock, 
  Calendar,
  BookOpen,
  ArrowUpDown
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { Task } from '../../types';
import { formatDateTime, formatRelativeDueDate, getDifficultyLabel, getImpactBadge, getTaskTypeLabel } from '../../utils/formatters';
import { TaskModal } from './TaskModal';

interface TasksViewProps {
  onOpenTaskModal: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenTaskModal }) => {
  const {
    tasks,
    courses,
    deleteTask,
    updateTask,
    toggleTaskCompleted,
    updateTaskProgress,
    prioritizedData,
  } = useUniPilot();

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const courseMap = new Map(courses.map(c => [c.id, c]));
  const priorityScoreMap = new Map(prioritizedData.allPrioritized.map(p => [p.task.id, p.priorityScore]));

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    if (selectedCourseId !== 'all' && task.courseId !== selectedCourseId) {
      return false;
    }
    if (selectedStatus === 'pending' && task.isCompleted) {
      return false;
    }
    if (selectedStatus === 'completed' && !task.isCompleted) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const course = courseMap.get(task.courseId);
      const courseName = course?.name.toLowerCase() || '';
      return task.title.toLowerCase().includes(q) || courseName.includes(q);
    }
    return true;
  });

  // ソート：優先度スコア順、または締切順
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const scoreA = priorityScoreMap.get(a.id) || 0;
    const scoreB = priorityScoreMap.get(b.id) || 0;
    return scoreB - scoreA;
  });

  const handleSaveEditedTask = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
      setEditingTask(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            タスク管理
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            課題・レポート・試験対策の登録、進捗更新、優先度スコアの確認ができます。
          </p>
        </div>

        <button
          onClick={onOpenTaskModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          新しいタスクを追加
        </button>
      </div>

      {/* 検索・フィルターバー */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タスク名や講義名で検索..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* 講義フィルター */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべての講義 ({tasks.length})</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* ステータスフィルター */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold shrink-0">
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedStatus === 'pending' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              未完了
            </button>
            <button
              onClick={() => setSelectedStatus('completed')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedStatus === 'completed' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              完了済み
            </button>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedStatus === 'all' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              すべて
            </button>
          </div>
        </div>

      </div>

      {/* タスク一覧 */}
      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">条件に合致するタスクはありません</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            新しい課題やテスト勉強のタスクを登録して管理しましょう。
          </p>
          <button
            onClick={onOpenTaskModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
          >
            + タスクを追加する
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const course = courseMap.get(task.courseId);
            const score = priorityScoreMap.get(task.id) || 0;
            const relDue = formatRelativeDueDate(task.dueDate);
            const impactBadge = getImpactBadge(task.impact);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  task.isCompleted
                    ? 'border-slate-200 bg-slate-50/60 opacity-60'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                
                {/* 左側：チェックボックス、タスク詳細 */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      task.isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-blue-500 bg-white'
                    }`}
                  >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {course && (
                        <span className="font-semibold text-blue-700 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {course.name}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {getTaskTypeLabel(task.type)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${impactBadge.color} font-medium`}>
                        {impactBadge.label}
                      </span>
                    </div>

                    <div className={`text-sm sm:text-base font-bold text-slate-900 truncate ${
                      task.isCompleted ? 'line-through text-slate-500' : ''
                    }`}>
                      {task.title}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-500">
                      <span className={`flex items-center gap-1 ${relDue.isUrgent && !task.isCompleted ? 'text-red-600 font-bold' : ''}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(task.dueDate)} ({relDue.text})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        約{task.estimatedMinutes}分
                      </span>
                      <span>難易度: {getDifficultyLabel(task.difficulty)}</span>
                    </div>
                  </div>
                </div>

                {/* 右側：優先度スコア、進捗、アクション */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  
                  {/* 優先度スコア */}
                  {!task.isCompleted && (
                    <div className="text-center sm:text-right">
                      <div className="text-[10px] text-slate-400 font-medium">優先スコア</div>
                      <div className="text-base sm:text-lg font-black text-blue-600 leading-none mt-0.5">
                        {score}
                      </div>
                    </div>
                  )}

                  {/* 進捗スライダー */}
                  <div className="w-28 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>進捗</span>
                      <span>{task.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={task.progress}
                      onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTask(task)}
                      title="編集"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`タスク「${task.title}」を削除しますか？`)) {
                          deleteTask(task.id);
                        }
                      }}
                      title="削除"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 編集モーダル */}
      {editingTask && (
        <TaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEditedTask}
          initialTask={editingTask}
        />
      )}

    </div>
  );
};
