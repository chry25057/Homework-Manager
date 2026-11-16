import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  FileText,
  GraduationCap,
  Check,
  Timer,
  Edit3
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { Assignment, Exam } from '../../types';
import { 
  formatDueDisplay, 
  formatPenaltiesList,
  formatProgress 
} from '../../utils/formatters';

interface DashboardViewProps {
  onNavigateToTab: (tab: 'dashboard' | 'assignments' | 'exams' | 'scoreCalculator') => void;
  onOpenAssignmentModal: () => void;
  onOpenExamModal: () => void;
  onEditAssignment?: (assignment: Assignment) => void;
  onEditExam?: (exam: Exam) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTab,
  onOpenAssignmentModal,
  onOpenExamModal,
  onEditAssignment,
  onEditExam,
}) => {
  const {
    assignments,
    exams,
    prioritizedData,
    toggleAssignmentSubmitted,
    toggleExamCompleted,
    updateExamUnderstanding,
  } = useUniPilot();

  const {
    needsAttentionItems,
    allPrioritized,
  } = prioritizedData;

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 毎週課題のうち来週以降のものを除いた未完了課題
  const currentWeekPendingAssignments = assignments.filter(a => {
    const isSubmitted = a.progress === 'submitted';
    const isFutureWeekly = a.isWeekly && new Date(a.dueDate).getTime() > oneWeekLater.getTime();
    return !isSubmitted && !isFutureWeekly;
  });

  const pendingAssignmentsCount = currentWeekPendingAssignments.length;
  const upcomingExamsCount = exams.filter(e => !e.isCompleted).length;

  // 今やるべきことランキング（未完了タスクをすべて優先順位順で表示）
  // 毎週課題の来週以降（7日より先）は除外
  const rankingItems = allPrioritized.filter(item => {
    if (item.task.itemType === 'assignment') {
      const a = item.task as Assignment;
      const isSubmitted = a.progress === 'submitted';
      const isFutureWeekly = a.isWeekly && new Date(a.dueDate).getTime() > oneWeekLater.getTime();
      return !isSubmitted && !isFutureWeekly;
    } else {
      const e = item.task as Exam;
      return !e.isCompleted;
    }
  });

  // 後回しにしてよいこと:
  // 「タスクが6個以上ある場合のみ、優先度が低い順に表示し、優先度の高い5項目を除いたものだけを表示」
  const hasSixOrMoreTasks = rankingItems.length >= 6;
  const deferrableItems = hasSixOrMoreTasks
    ? [...rankingItems.slice(5)].reverse() // 6番目以降のタスクを優先度が低い順（ランキング下位から）にソート
    : [];

  return (
    <div className="space-y-8 pb-12">
      
      {/* クイックステータス（未完了の課題・テスト勉強の2項目のみ・「表示」削除） */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => onNavigateToTab('assignments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="text-xs font-semibold text-slate-500 group-hover:text-blue-700">
            未完了の課題
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-blue-600 mt-1">
            {pendingAssignmentsCount} <span className="text-sm font-semibold text-slate-500">件</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateToTab('exams')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="text-xs font-semibold text-slate-500 group-hover:text-amber-700">
            試験勉強
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-amber-600 mt-1">
            {upcomingExamsCount} <span className="text-sm font-semibold text-slate-500">件</span>
          </div>
        </div>
      </section>

      {/* 対応が必要な項目がある場合の警告バナー */}
      {needsAttentionItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-red-900">
                期限切れや確認が必要な項目があります（{needsAttentionItems.length}件）
              </h2>
              <p className="text-xs text-red-700 mt-0.5">
                {needsAttentionItems.map(i => i.task.title).join('、')} の提出期限または試験日を過ぎています。
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('assignments')}
            className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            課題一覧で確認
          </button>
        </div>
      )}

      {/* メインエリア：2カラム (今やるべきことランキング VS 後回しにしてよいこと) */}
      <div className={`grid grid-cols-1 ${hasSixOrMoreTasks ? 'lg:grid-cols-12' : ''} gap-8`}>
        
        {/* 左カラム：今やるべきことランキング */}
        <section className={`${hasSixOrMoreTasks ? 'lg:col-span-8' : 'w-full'} space-y-4`}>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                今やるべきことランキング
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAssignmentModal}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 cursor-pointer transition-colors"
              >
                + 課題追加
              </button>
              <button
                onClick={onOpenExamModal}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer transition-colors"
              >
                + テスト勉強追加
              </button>
            </div>
          </div>

          {rankingItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">未完了のタスクはありません！</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                今週提出の課題や直近の試験勉強は完了しています。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankingItems.map((item, index) => {
                const { task } = item;
                const displayRank = index + 1;
                const isAssignment = task.itemType === 'assignment';
                const assignment = isAssignment ? (task as Assignment) : null;
                const exam = !isAssignment ? (task as Exam) : null;
                const dueInfo = formatDueDisplay(isAssignment ? assignment!.dueDate : exam!.examDate);

                // 順位バッジ：シンプルな単色デザイン
                const rankBadgeClass = displayRank === 1
                  ? 'bg-slate-900 text-white font-extrabold'
                  : displayRank === 2
                  ? 'bg-slate-700 text-white font-bold'
                  : displayRank === 3
                  ? 'bg-slate-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold';

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 transition-all shadow-xs p-4 sm:p-5 space-y-3"
                  >
                    {/* 上部ヘッダー：順位、種別、講義名 */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 順位バッジ (単色) */}
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs tracking-wider ${rankBadgeClass}`}>
                          {displayRank}位
                        </span>

                        {/* 種別バッジ */}
                        {isAssignment ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            提出課題
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            試験勉強
                          </span>
                        )}

                        {/* 講義名 */}
                        {task.courseName && task.courseName !== '（講義名未設定）' && task.courseName !== '(講義名未設定)' && (
                          <span className="font-bold text-slate-700 text-xs sm:text-sm">
                            {task.courseName}
                          </span>
                        )}
                      </div>

                      {/* 締切日時 */}
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${dueInfo.color}`}>
                          {dueInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* タスク名 */}
                    <div className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{task.title || (isAssignment ? (task.courseName && task.courseName !== '（講義名未設定）' && task.courseName !== '(講義名未設定)' ? `${task.courseName} 課題` : '無題の課題') : (task.courseName && task.courseName !== '（講義名未設定）' && task.courseName !== '(講義名未設定)' ? `${task.courseName} 試験` : '無題の試験'))}</span>
                      {isAssignment && assignment!.isWeekly && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          {assignment!.weeklyIndex ? `毎週 (第${assignment!.weeklyIndex}回)` : '毎週課題'}
                        </span>
                      )}
                    </div>

                    {/* タスクメタデータ（所要時間・ペナルティ・配点・理解度） */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-600 pt-0.5">
                      <div className="flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {isAssignment
                            ? (assignment!.estimatedMinutes !== undefined
                              ? `所要時間: ${assignment!.estimatedMinutes}分`
                              : '所要時間: 未設定')
                            : `目標勉強: ${exam!.estimatedStudyMinutes ?? 120}分`}
                        </span>
                      </div>

                      {isAssignment && formatPenaltiesList(assignment!.penalties || assignment!.penalty).map((p, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.bgColor} ${p.color}`}>
                          {p.text}
                        </span>
                      ))}

                      {isAssignment && assignment!.weightPercent !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          配点: {assignment!.weightPercent}%
                        </span>
                      )}

                      {!isAssignment && exam && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          理解度: {exam.understanding}%
                        </span>
                      )}
                    </div>

                    {/* クイックアクションバー */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                      <div>
                        {isAssignment ? (
                          <div className="text-xs text-slate-500">
                            進捗: <strong className="text-slate-700">{formatProgress(assignment!.progress).text}</strong>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>理解度:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={exam!.understanding}
                              onChange={(e) => updateExamUnderstanding(exam!.id, Number(e.target.value))}
                              className="w-24 accent-amber-500 h-1.5 bg-slate-200 rounded cursor-pointer"
                            />
                            <span className="font-bold text-slate-700">{exam!.understanding}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssignment ? (
                          <>
                            {onEditAssignment && (
                              <button
                                onClick={() => onEditAssignment(assignment!)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="編集"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleAssignmentSubmitted(assignment!.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              提出済みにする
                            </button>
                          </>
                        ) : (
                          <>
                            {onEditExam && (
                              <button
                                onClick={() => onEditExam(exam!)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="編集"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleExamCompleted(exam!.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              試験終了にする
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </section>

        {/* 右カラム：後回しにしてよいこと（タスクが6個以上ある場合のみ、優先度が低い順に表示） */}
        {hasSixOrMoreTasks && (
          <section className="lg:col-span-4 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                後回しにしてよいこと
              </h3>
            </div>

            <div className="space-y-2.5">
              {deferrableItems.map((item) => {
                const isAssignment = item.task.itemType === 'assignment';
                const dueInfo = formatDueDisplay(
                  isAssignment ? (item.task as Assignment).dueDate : (item.task as Exam).examDate
                );

                return (
                  <div
                    key={item.task.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      {item.task.courseName && item.task.courseName !== '（講義名未設定）' && item.task.courseName !== '(講義名未設定)' ? (
                        <span className="font-semibold text-slate-600 truncate">
                          {item.task.courseName}
                        </span>
                      ) : <span />}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                        後回しOK
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      {item.task.title}
                    </div>

                    <div className="text-[11px] text-slate-500 pt-0.5">
                      {isAssignment ? '提出期限' : '試験日'}: <span className="font-semibold">{dueInfo.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>

    </div>
  );
};
