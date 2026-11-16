import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';
import { Course, EvaluationItem } from '../../types';
import { calculateCourseStatus } from '../../services/courseCalculator';

interface GradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onSave: (courseId: string, updatedAttendance: Course['attendance'], updatedEvaluations: EvaluationItem[]) => void;
}

export const GradesModal: React.FC<GradesModalProps> = ({
  isOpen,
  onClose,
  course,
  onSave,
}) => {
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [lateCount, setLateCount] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);

  useEffect(() => {
    if (course) {
      setAbsentCount(course.attendance.absentCount);
      setLateCount(course.attendance.lateCount);
      setEvaluations(JSON.parse(JSON.stringify(course.evaluations)));
    }
  }, [course, isOpen]);

  if (!isOpen || !course) return null;

  // リアルタイム計算プレビュー
  const tempCourse: Course = {
    ...course,
    attendance: {
      ...course.attendance,
      absentCount,
      lateCount,
    },
    evaluations,
  };
  const calc = calculateCourseStatus(tempCourse);

  const handleScoreChange = (id: string, scoreVal: number) => {
    setEvaluations(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            score: Math.max(0, Math.min(100, scoreVal)),
            isGraded: true,
          };
        }
        return item;
      })
    );
  };

  const handleToggleGraded = (id: string, isGraded: boolean) => {
    setEvaluations(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            isGraded,
            score: isGraded ? (item.score ?? 70) : null,
          };
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    onSave(
      course.id,
      {
        ...course.attendance,
        absentCount,
        lateCount,
      },
      evaluations
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              成績・出席状況の入力
            </h2>
            <p className="text-xs text-slate-500">
              {course.name}（単位合格基準: {course.passingScore}点）
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* リアルタイム計算プレビューバー */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900">リアルタイム計算結果</span>
              <span className="font-extrabold text-blue-700">
                現在の確定得点: {calc.currentEarnedScore}点 / {course.passingScore}点
              </span>
            </div>

            {/* 必要得点・ステータスアナウンス */}
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              {calc.isAmbiguous ? (
                <span className="text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  この講義は評価基準が曖昧なため、正確な成績予測ができません
                </span>
              ) : calc.creditStatus === 'disqualified' ? (
                <div className="text-red-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-black">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    失格条件に抵触しています（単位取得不可）
                  </div>
                  <div className="text-[11px] font-normal text-red-600 pl-5">
                    {calc.disqualificationReasons.join(' ')}
                  </div>
                </div>
              ) : calc.creditStatus === 'secured' ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  現時点で単位取得が確定しています！
                </span>
              ) : calc.creditStatus === 'impossible' ? (
                <span className="text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  単位取得不可（今後満点を取っても基準未達）
                </span>
              ) : calc.finalExamItem && !calc.finalExamItem.isGraded ? (
                <span className="text-indigo-900">
                  💡 期末試験で <span className="text-blue-600 text-base underline underline-offset-2 font-black">{calc.finalExamRequiredScore}点以上</span> 必要
                  {calc.finalExamMinScoreRule && (
                    <span className="text-xs text-red-600 font-bold ml-1.5">
                      (足切り{calc.finalExamMinScoreRule}点以上必須)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-indigo-900">
                  💡 残りの評価で平均 <span className="text-blue-600 text-base underline underline-offset-2 font-black">{calc.requiredScoreOnRemaining}%以上</span> 必要
                </span>
              )}
            </div>

            {/* 出席状況 */}
            <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-blue-100">
              <span>出席率: {calc.attendanceRate}%</span>
              <span className={calc.remainingAllowedAbsences <= 0 ? 'text-red-600 font-bold' : ''}>
                あと{calc.remainingAllowedAbsences}回欠席可能
              </span>
            </div>
          </div>

          {/* 出席状況入力 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              出席状況（全{course.attendance.totalClasses}回中）
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  欠席回数
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAbsentCount(Math.max(0, absentCount - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={course.attendance.totalClasses}
                    value={absentCount}
                    onChange={(e) => setAbsentCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-sm font-bold py-1.5 rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setAbsentCount(absentCount + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  遅刻回数（{course.attendance.latePenaltyRatio}回で欠席1換算）
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLateCount(Math.max(0, lateCount - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={lateCount}
                    onChange={(e) => setLateCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-sm font-bold py-1.5 rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setLateCount(lateCount + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 各評価項目の成績入力 */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                各項目の得点（100点換算）
              </h3>
              <span className="text-[11px] text-slate-500">
                未実施のものはチェックを外してください
              </span>
            </div>

            <div className="space-y-3">
              {evaluations.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.isGraded
                      ? 'bg-white border-slate-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`graded-${item.id}`}
                        checked={item.isGraded}
                        onChange={(e) => handleToggleGraded(item.id, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <label
                        htmlFor={`graded-${item.id}`}
                        className="text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        {item.name}
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        (配点 {item.weight}%)
                      </span>
                    </div>

                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      item.isGraded ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.isGraded ? '実施・採点済み' : 'まだ実施されていない'}
                    </span>
                  </div>

                  {item.isGraded ? (
                    <div className="space-y-1.5 pl-6 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">得点（100点満点）:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.score ?? 0}
                            onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 text-center text-sm font-bold py-1 rounded border border-slate-300"
                          />
                          <span className="text-xs text-slate-500">点</span>
                          <span className="text-xs text-blue-600 font-bold ml-2">
                            (総合寄与: {(((item.score ?? 0) / 100) * item.weight).toFixed(1)}点)
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={item.score ?? 0}
                        onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  ) : (
                    <div className="pl-6 text-xs text-slate-400 italic">
                      未実施のため、確定得点にはカウントされません
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              成績・出席を更新する
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
