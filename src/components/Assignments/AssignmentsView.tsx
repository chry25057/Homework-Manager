import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Trash2, 
  Edit3, 
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { Assignment, AssignmentProgress } from '../../types';
import { 
  formatDueDisplay, 
  formatPenalty, 
  formatPenaltiesList,
  formatProgress, 
  formatImpact, 
  formatDifficulty 
} from '../../utils/formatters';

interface AssignmentsViewProps {
  onOpenAddModal: () => void;
  onEditAssignment: (assignment: Assignment) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  onOpenAddModal,
  onEditAssignment,
}) => {
  const { 
    assignments, 
    deleteAssignment, 
    deleteAssignmentSeries,
    toggleAssignmentSubmitted,
    updateAssignmentProgress 
  } = useUniPilot();

  const [filter, setFilter] = useState<'all' | 'active' | 'submitted' | 'overdue'>('active');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 対象講義リスト
  const courses = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => {
      if (a.courseName && a.courseName !== '（講義名未設定）' && a.courseName !== '(講義名未設定)') {
        set.add(a.courseName);
      }
    });
    return Array.from(set);
  }, [assignments]);

  // 課題の分類
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      // 講義フィルター
      if (courseFilter !== 'all' && a.courseName !== courseFilter) {
        return false;
      }

      const isSubmitted = a.progress === 'submitted';
      const isOverdue = !isSubmitted && new Date(a.dueDate).getTime() < now.getTime();
      const isFutureWeekly = a.isWeekly && new Date(a.dueDate).getTime() > oneWeekLater.getTime();

      // 未完了フィルター：提出済みでなく、期限切れでなく、来週以降の毎週課題でない（今週分のみ）
      if (filter === 'active') return !isSubmitted && !isOverdue && !isFutureWeekly;
      if (filter === 'submitted') return isSubmitted;
      if (filter === 'overdue') return isOverdue;
      return true; // all
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assignments, filter, courseFilter, now, oneWeekLater]);

  // 統計情報
  const stats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter(a => a.progress === 'submitted').length;
    const overdue = assignments.filter(a => a.progress !== 'submitted' && new Date(a.dueDate).getTime() < now.getTime()).length;
    // 未完了（今週分のみカウント）
    const active = assignments.filter(a => {
      const isSubmitted = a.progress === 'submitted';
      const isOverdue = !isSubmitted && new Date(a.dueDate).getTime() < now.getTime();
      const isFutureWeekly = a.isWeekly && new Date(a.dueDate).getTime() > oneWeekLater.getTime();
      return !isSubmitted && !isOverdue && !isFutureWeekly;
    }).length;
    return { total, submitted, overdue, active };
  }, [assignments, now, oneWeekLater]);

  return (
    <div className="space-y-6">
      
      {/* 画面ヘッダー */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">提出課題の管理</h1>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>課題を追加する</span>
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'all' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-semibold mb-1">すべての課題</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>

        <div 
          onClick={() => setFilter('active')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'active' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-amber-700 font-semibold mb-1">未着手・進行中</div>
          <div className="text-2xl font-black text-amber-600">{stats.active}</div>
        </div>

        <div 
          onClick={() => setFilter('submitted')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'submitted' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-emerald-700 font-semibold mb-1">提出済み (完了)</div>
          <div className="text-2xl font-black text-emerald-600">{stats.submitted}</div>
        </div>

        <div 
          onClick={() => setFilter('overdue')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'overdue' ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-red-700 font-semibold mb-1">期限切れ</div>
          <div className="text-2xl font-black text-red-600">{stats.overdue}</div>
        </div>
      </div>

      {/* フィルタバー */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> 状態:
          </span>
          {[
            { id: 'all', label: 'すべて' },
            { id: 'active', label: '未完了' },
            { id: 'submitted', label: '提出済み' },
            { id: 'overdue', label: '期限切れ' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {courses.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">講義別:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべての講義</option>
              {courses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 課題リスト */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">表示する課題がありません</h3>
          <p className="text-xs text-slate-400 mb-4">
            「課題を追加する」ボタンから提出課題を登録してみましょう。
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 課題を追加する
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map(assignment => {
            const isSubmitted = assignment.progress === 'submitted';
            const isOverdue = !isSubmitted && new Date(assignment.dueDate).getTime() < now.getTime();
            const dueInfo = formatDueDisplay(assignment.dueDate);
            const penaltyInfo = formatPenalty(assignment.penalty);
            const progressInfo = formatProgress(assignment.progress);

            return (
              <div
                key={assignment.id}
                className={`group bg-white rounded-xl p-4 sm:p-5 border transition-all ${
                  isSubmitted
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isOverdue
                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-400/30'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* 左側: チェック & タイトル & 属性 */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleAssignmentSubmitted(assignment.id)}
                      title={isSubmitted ? '未着手・進行中に戻す' : '提出済みにする'}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                        isSubmitted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {assignment.courseName && assignment.courseName !== '（講義名未設定）' && assignment.courseName !== '(講義名未設定)' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            {assignment.courseName}
                          </span>
                        )}
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progressInfo.bgColor} ${progressInfo.color}`}>
                          {progressInfo.text}
                        </span>

                        {assignment.isWeekly && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {assignment.weeklyIndex ? `毎週 (第${assignment.weeklyIndex}回)` : '毎週課題'}
                          </span>
                        )}

                        {formatPenaltiesList(assignment.penalties || assignment.penalty).map((p, idx) => (
                          <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bgColor} ${p.color}`}>
                            {p.text}
                          </span>
                        ))}

                        {assignment.weightPercent !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            配点 {assignment.weightPercent}%
                            {assignment.totalWeightPercent && assignment.totalOccurrences && assignment.totalOccurrences > 1 ? ` (全${assignment.totalWeightPercent}%)` : ''}
                          </span>
                        )}

                        {assignment.impact && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            影響: {formatImpact(assignment.impact)}
                          </span>
                        )}

                        {assignment.difficulty && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            難易度: {formatDifficulty(assignment.difficulty)}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-base font-bold ${isSubmitted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {assignment.title || (assignment.courseName && assignment.courseName !== '（講義名未設定）' && assignment.courseName !== '(講義名未設定)' ? `${assignment.courseName} 課題` : '無題の課題')}
                      </h3>

                      {assignment.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {assignment.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右側: 締切・所要時間 & アクション */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="flex items-center sm:justify-end gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-600">
                          {assignment.estimatedMinutes !== undefined
                            ? `所要 ${assignment.estimatedMinutes}分`
                            : '所要時間 未設定'}
                        </span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1 text-xs mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`font-bold ${dueInfo.color}`}>
                          {dueInfo.text}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(assignment.dueDate).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditAssignment(assignment)}
                        title="編集"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      
                      {assignment.weeklySeriesId ? (
                        <button
                          onClick={() => {
                            const choice = window.confirm(
                              `「${assignment.title}」は毎週課題シリーズです。\n\n【OK】: このシリーズの課題（全回）を一括削除する\n【キャンセル】: この1回分のみ削除するか確認する`
                            );
                            if (choice) {
                              deleteAssignmentSeries(assignment.weeklySeriesId!);
                            } else {
                              const singleDelete = window.confirm(`この1回分「${assignment.title}」のみ削除しますか？`);
                              if (singleDelete) {
                                deleteAssignment(assignment.id);
                              }
                            }
                          }}
                          title="削除（シリーズ一括またはこの回のみ）"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[10px] text-red-500 font-bold hidden sm:inline">一括削除可</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`「${assignment.title}」を削除してもよろしいですか？`)) {
                              deleteAssignment(assignment.id);
                            }
                          }}
                          title="削除"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
