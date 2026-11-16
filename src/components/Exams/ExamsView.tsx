import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  GraduationCap, 
  Clock, 
  Calendar, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Target,
  Sparkles
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { Exam } from '../../types';
import { 
  formatDueDisplay, 
  formatImpact, 
  formatDifficulty 
} from '../../utils/formatters';

interface ExamsViewProps {
  onOpenAddModal: () => void;
  onEditExam: (exam: Exam) => void;
  onOpenScoreCalculator?: (courseName: string, examName: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  onOpenAddModal,
  onEditExam,
  onOpenScoreCalculator,
}) => {
  const { 
    exams, 
    deleteExam, 
    toggleExamCompleted, 
    updateExamUnderstanding 
  } = useUniPilot();

  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const now = new Date();

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const isCompleted = e.isCompleted;
      if (filter === 'upcoming') return !isCompleted;
      if (filter === 'completed') return isCompleted;
      return true;
    }).sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [exams, filter]);

  const stats = useMemo(() => {
    const total = exams.length;
    const upcoming = exams.filter(e => !e.isCompleted).length;
    const completed = total - upcoming;
    return { total, upcoming, completed };
  }, [exams]);

  return (
    <div className="space-y-6">
      
      {/* 画面ヘッダー */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">試験勉強の管理</h1>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>試験を追加</span>
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'all' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-semibold mb-1">登録試験総数</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>

        <div 
          onClick={() => setFilter('upcoming')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'upcoming' ? 'bg-amber-100/60 border-amber-400 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-amber-800 font-semibold mb-1">控えている試験</div>
          <div className="text-2xl font-black text-amber-700">{stats.upcoming}</div>
        </div>

        <div 
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filter === 'completed' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-emerald-700 font-semibold mb-1">終了・完了</div>
          <div className="text-2xl font-black text-emerald-600">{stats.completed}</div>
        </div>
      </div>

      {/* フィルタタブ */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 w-fit">
        {[
          { id: 'upcoming', label: '今後の試験' },
          { id: 'all', label: 'すべて' },
          { id: 'completed', label: '終了済み' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === f.id
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 試験一覧 */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">該当する試験がありません</h3>
          <p className="text-xs text-slate-400 mb-4">
            「試験を追加」ボタンから中間試験や期末試験の計画を登録しましょう。
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 試験を追加
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map(exam => {
            const isCompleted = !!exam.isCompleted;
            const dueInfo = formatDueDisplay(exam.examDate);
            const isDangerUnderstanding = exam.understanding < 40;
            const isScoreWarning = exam.currentExpectedScore !== undefined && 
              exam.passingRequiredScore !== undefined && 
              exam.currentExpectedScore < exam.passingRequiredScore;
            const hasValidCourseName = exam.courseName && 
              exam.courseName !== '（講義名未設定）' && 
              exam.courseName !== '(講義名未設定)';

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/50 opacity-75'
                    : isDangerUnderstanding
                    ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-400/30'
                    : 'border-slate-200 hover:border-amber-300 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* メイン情報 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasValidCourseName && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          {exam.courseName}
                        </span>
                      )}
                      
                      {exam.weightPercent !== undefined && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          配点: {exam.weightPercent}%
                        </span>
                      )}

                      {exam.impact && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          影響: {formatImpact(exam.impact)}
                        </span>
                      )}

                      {exam.difficulty && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          難易度: {formatDifficulty(exam.difficulty)}
                        </span>
                      )}

                      {isCompleted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          試験終了
                        </span>
                      )}
                    </div>

                    <h3 className={`text-lg font-bold ${isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>
                      {exam.title}
                    </h3>

                    {/* スコア・目標点バー */}
                    <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
                      {exam.targetScore !== undefined && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Target className="w-3.5 h-3.5 text-blue-500" />
                          <span>目標: <strong className="text-blue-600 font-black">{exam.targetScore}点</strong></span>
                        </div>
                      )}

                      {exam.passingRequiredScore !== undefined && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>単位必要: <strong className="text-amber-700 font-black">{exam.passingRequiredScore}点</strong></span>
                        </div>
                      )}

                      {exam.currentExpectedScore !== undefined && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                          <span>予想得点: <strong className={isScoreWarning ? 'text-red-600 font-black' : 'text-slate-700 font-bold'}>{exam.currentExpectedScore}点</strong></span>
                          {isScoreWarning && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded">
                              単位ライン不足！
                            </span>
                          )}
                        </div>
                      )}

                      {onOpenScoreCalculator && (
                        <button
                          onClick={() => onOpenScoreCalculator(exam.courseName, exam.title)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 ml-auto"
                        >
                          <Sparkles className="w-3 h-3" /> 必要得点を逆算する
                        </button>
                      )}
                    </div>

                    {exam.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {exam.notes}
                      </p>
                    )}
                  </div>

                  {/* 右側: 試験日・時間 & アクション */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center md:justify-end gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">
                          目標勉強 {exam.estimatedStudyMinutes ?? 120}分
                          {exam.estimatedStudyMinutes ? ` (約${(exam.estimatedStudyMinutes / 60).toFixed(1)}h)` : ''}
                        </span>
                      </div>
                      <div className="flex items-center md:justify-end gap-1 text-xs mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`font-bold ${dueInfo.color}`}>
                          {dueInfo.text}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(exam.examDate).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExamCompleted(exam.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {isCompleted ? '未完了に戻す' : '試験終了にする'}
                      </button>

                      <button
                        onClick={() => onEditExam(exam)}
                        title="編集"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`「${exam.title}」を削除してもよろしいですか？`)) {
                            deleteExam(exam.id);
                          }
                        }}
                        title="削除"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>

                {/* 理解度スライダー (インラインでクイック調整可能) */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      理解度:
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={exam.understanding}
                      onChange={(e) => updateExamUnderstanding(exam.id, Number(e.target.value))}
                      className="w-full max-w-xs accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      exam.understanding < 40 
                        ? 'bg-red-100 text-red-700' 
                        : exam.understanding < 70 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {exam.understanding}%
                    </span>
                  </div>

                  {exam.studyProgress !== undefined && (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>勉強進捗:</span>
                      <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${exam.studyProgress}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700">{exam.studyProgress}%</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
