import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Calculator, 
  SlidersHorizontal,
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  ShieldAlert,
  AlertCircle,
  Sliders,
  Check
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { Course } from '../../types';
import { getDangerBadge, getDayPeriodLabel, getDifficultyLabel } from '../../utils/formatters';
import { CourseModal } from './CourseModal';
import { GradesModal } from './GradesModal';

interface LecturesViewProps {
  onOpenCourseModal: () => void;
  onNavigateToSimulator: (courseId?: string) => void;
}

export const LecturesView: React.FC<LecturesViewProps> = ({
  onOpenCourseModal,
  onNavigateToSimulator,
}) => {
  const {
    courses,
    courseCalculations,
    deleteCourse,
    updateCourse,
  } = useUniPilot();

  const [selectedCourseForGrades, setSelectedCourseForGrades] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const handleSaveCourse = (courseData: Omit<Course, 'id'>) => {
    if (editingCourse) {
      updateCourse(editingCourse.id, courseData);
      setEditingCourse(null);
    }
  };

  const handleSaveGrades = (courseId: string, updatedAttendance: Course['attendance'], updatedEvaluations: any[]) => {
    updateCourse(courseId, {
      attendance: updatedAttendance,
      evaluations: updatedEvaluations,
    });
  };

  const getCreditStatusBadge = (calc: any) => {
    switch (calc.creditStatus) {
      case 'secured':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          title: '現時点で単位取得が確定している',
        };
      case 'achievable':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <Sparkles className="w-4 h-4 text-blue-600" />,
          title: '残りの評価項目によって単位取得可能',
        };
      case 'at_risk':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          title: '現在は危険だが、まだ十分挽回可能',
        };
      case 'impossible':
        return {
          bg: 'bg-rose-50 text-rose-900 border-rose-300',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          title: '今後満点を取っても単位取得できない',
        };
      case 'disqualified':
        return {
          bg: 'bg-red-50 text-red-900 border-red-300 font-black',
          icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
          title: '失格条件を満たしている（単位不可確定）',
        };
      case 'ambiguous':
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
          title: 'この講義は評価基準が曖昧なため、正確な成績予測ができません',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            講義一覧・成績状況
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            大学・講義ごとの特殊な評価ルール（足切り・欠席上限・提出ノルマ等）を組み合わせて正確な成績状況と必要得点を算出します。
          </p>
        </div>

        <button
          onClick={onOpenCourseModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          新しい講義を登録
        </button>
      </div>

      {/* 講義カードグリッド */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">登録された講義がありません</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            履修している講義を登録し、シラバスの評価ルールや足切り条件を設定して単位取得状況を管理しましょう。
          </p>
          <button
            onClick={onOpenCourseModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20"
          >
            + 講義を登録する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => {
            const calc = courseCalculations.get(course.id);
            if (!calc) return null;

            const dangerBadge = getDangerBadge(calc.dangerLevel);
            const statusBadge = getCreditStatusBadge(calc);
            const scorePercent = Math.min(100, Math.round((calc.currentEarnedScore / course.passingScore) * 100));

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  
                  {/* カード上部：講義名・曜日・危険度バッジ */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {getDayPeriodLabel(course.dayOfWeek, course.period)}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {course.credits}単位
                        </span>
                        <span className="text-xs text-slate-500">
                          {course.instructor || '担当教員未設定'}
                        </span>
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {course.name}
                      </h2>
                    </div>

                    {/* 4段階危険度バッジ */}
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border ${dangerBadge.bgClass} ${dangerBadge.textClass} ${dangerBadge.borderClass}`}>
                        {calc.dangerLevel === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
                        危険度: {dangerBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* ★ 単位取得可能性ステータスバー */}
                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${statusBadge.bg}`}>
                    <div className="mt-0.5 shrink-0">{statusBadge.icon}</div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black tracking-tight">
                        {statusBadge.title}
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {calc.creditStatusDescription}
                      </p>
                    </div>
                  </div>

                  {/* ★ 期末試験の必要得点計算ハイライトボックス */}
                  {!calc.isAmbiguous && (
                    <div className={`p-4 rounded-xl border ${
                      calc.creditStatus === 'secured'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : calc.creditStatus === 'disqualified' || calc.creditStatus === 'impossible'
                        ? 'bg-red-50/80 border-red-200 text-red-900'
                        : calc.dangerLevel === 'danger'
                        ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                        : 'bg-blue-50/80 border-blue-200 text-blue-950'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="uppercase tracking-wider">単位判定 (合格ライン: {course.passingScore}点)</span>
                        <span>確定得点: {calc.currentEarnedScore}点</span>
                      </div>

                      {/* メイン判定テキスト */}
                      <div className="text-base sm:text-lg font-black tracking-tight mt-1">
                        {calc.creditStatus === 'secured' ? (
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>単位取得ライン確保済み</span>
                          </div>
                        ) : calc.creditStatus === 'disqualified' ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            <span>失格条件に抵触（単位取得不可）</span>
                          </div>
                        ) : calc.creditStatus === 'impossible' ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            <span>挽回不能（残り全問満点でも未達）</span>
                          </div>
                        ) : calc.finalExamItem && !calc.finalExamItem.isGraded ? (
                          <div>
                            <span>期末試験（配点{calc.finalExamItem.weight}%）で </span>
                            <span className="text-xl sm:text-2xl text-blue-600 font-black underline decoration-2 underline-offset-4">
                              {calc.finalExamRequiredScore}点以上
                            </span>
                            <span> 必要</span>
                            {calc.finalExamMinScoreRule && (
                              <span className="text-xs text-red-600 font-bold ml-1.5 block sm:inline">
                                (足切り{calc.finalExamMinScoreRule}点以上必須)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span>残りの評価項目で </span>
                            <span className="text-xl sm:text-2xl text-blue-600 font-black underline decoration-2 underline-offset-4">
                              平均 {calc.requiredScoreOnRemaining}%以上
                            </span>
                            <span> 必要</span>
                          </div>
                        )}
                      </div>

                      {/* プログレスバー */}
                      <div className="w-full bg-black/10 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            calc.creditStatus === 'secured' ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, scorePercent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ★ 設定されている特殊評価ルールバッジ一覧 */}
                  {course.rules && course.rules.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>適用中の特殊評価ルール：</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {course.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                              rule.params.isDisqualification
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{rule.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 出席状況 & 難易度 */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">出席状況 (全{course.attendance.totalClasses}回)</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        出席率 {calc.attendanceRate}%
                        <span className="text-[11px] font-normal text-slate-500 ml-1">
                          (欠席{course.attendance.absentCount}回 / 遅刻{course.attendance.lateCount}回)
                        </span>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${calc.remainingAllowedAbsences <= 0 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                        あと欠席可能: {calc.remainingAllowedAbsences}回
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">難易度設定</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        テスト: {getDifficultyLabel(course.testDifficulty)}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        課題: {getDifficultyLabel(course.assignmentDifficulty)}
                      </div>
                    </div>
                  </div>

                  {/* 次にやるべきこと (Next Action) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>次にやるべきこと：</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed pl-5 font-medium">
                      {calc.nextAction}
                    </p>
                  </div>

                </div>

                {/* カードフッター操作ボタン */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedCourseForGrades(course)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      成績・出席を入力
                    </button>
                    <button
                      onClick={() => onNavigateToSimulator(course.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      シミュレーション
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCourse(course)}
                      title="講義・ルールを編集"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`「${course.name}」を削除しますか？関連するタスクも削除されます。`)) {
                          deleteCourse(course.id);
                        }
                      }}
                      title="講義を削除"
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
      {editingCourse && (
        <CourseModal
          isOpen={!!editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={handleSaveCourse}
          initialCourse={editingCourse}
        />
      )}

      {/* 成績入力モーダル */}
      {selectedCourseForGrades && (
        <GradesModal
          isOpen={!!selectedCourseForGrades}
          onClose={() => setSelectedCourseForGrades(null)}
          course={selectedCourseForGrades}
          onSave={handleSaveGrades}
        />
      )}

    </div>
  );
};
