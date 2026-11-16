import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { simulateCourseGrade } from '../../services/gradeSimulator';
import { getDayPeriodLabel } from '../../utils/formatters';

interface SimulatorViewProps {
  initialCourseId?: string;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ initialCourseId }) => {
  const { courses } = useUniPilot();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return initialCourseId || courses[0]?.id || '';
  });

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // シミュレーションパラメータ
  const [simulatedScores, setSimulatedScores] = useState<Record<string, number>>({});
  const [additionalAbsences, setAdditionalAbsences] = useState<number>(0);
  const [additionalLates, setAdditionalLates] = useState<number>(0);

  // 選択講義が切り替わった時の初期化
  useEffect(() => {
    if (selectedCourse) {
      const initialScores: Record<string, number> = {};
      selectedCourse.evaluations.forEach(item => {
        if (item.type !== 'attendance') {
          // 確定点があればその点数、未実施なら70点などを仮設定
          initialScores[item.id] = item.score !== null ? item.score : 70;
        }
      });
      setSimulatedScores(initialScores);
      setAdditionalAbsences(0);
      setAdditionalLates(0);
    }
  }, [selectedCourseId]);

  if (!selectedCourse) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
        講義が登録されていません。まず講義を登録してください。
      </div>
    );
  }

  // シミュレーション実行
  const result = simulateCourseGrade(selectedCourse, {
    courseId: selectedCourse.id,
    simulatedScores,
    additionalAbsences,
    additionalLates,
  });

  const handleScoreChange = (evalId: string, val: number) => {
    setSimulatedScores(prev => ({
      ...prev,
      [evalId]: Math.max(0, Math.min(100, val)),
    }));
  };

  const handleReset = () => {
    const initialScores: Record<string, number> = {};
    selectedCourse.evaluations.forEach(item => {
      if (item.type !== 'attendance') {
        initialScores[item.id] = item.score !== null ? item.score : 70;
      }
    });
    setSimulatedScores(initialScores);
    setAdditionalAbsences(0);
    setAdditionalLates(0);
  };

  // ランクごとの色スタイル
  const getRankBadgeStyle = (rank: 'S' | 'A' | 'B' | 'C' | 'F') => {
    switch (rank) {
      case 'S':
        return 'from-amber-400 to-yellow-500 text-white shadow-amber-500/20';
      case 'A':
        return 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20';
      case 'B':
        return 'from-blue-500 to-indigo-600 text-white shadow-blue-500/20';
      case 'C':
        return 'from-slate-600 to-slate-700 text-white shadow-slate-500/20';
      case 'F':
      default:
        return 'from-red-600 to-rose-700 text-white shadow-red-500/20';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-7 h-7 text-blue-600" />
            成績・出席シミュレーター
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            「期末試験で〇〇点取ったら最終成績はどうなるか？」「あと〇回欠席したらどうなるか？」を自由に試算できます。
          </p>
        </div>

        {/* 講義選択プルダウン */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="text-xs sm:text-sm font-bold px-4 py-2 rounded-xl border border-slate-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({getDayPeriodLabel(c.dayOfWeek, c.period)})
              </option>
            ))}
          </select>

          <button
            onClick={handleReset}
            title="初期値に戻す"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* メイングリッド：左 入力スライダー VS 右 結果判定 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左カラム：シミュレーション設定スライダー */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. 期末試験・各評価項目の仮得点設定 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  仮の得点を調整（各項目の点数をシミュレート）
                </h2>
                <p className="text-xs text-slate-500">
                  スライダーを動かして「期末試験で70点取った場合」などを試算
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedCourse.evaluations.map((item) => {
                if (item.type === 'attendance') return null; // 出席は下の出席セクションで連動

                const score = simulatedScores[item.id] ?? (item.score ?? 70);
                const isFinal = item.type === 'final';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isFinal
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          配点 {item.weight}%
                        </span>
                        {isFinal && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-600 text-white rounded">
                            重要
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center text-sm font-bold py-1 rounded-lg border border-slate-300 bg-white"
                        />
                        <span className="text-xs font-bold text-slate-600">点</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>0点</span>
                      <span>50点</span>
                      <span>70点</span>
                      <span>100点</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 出席状況のシミュレーション */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              出席状況のシミュレーション（あと〇回欠席したら？）
            </h2>
            <p className="text-xs text-slate-500">
              現在の欠席回数（{selectedCourse.attendance.absentCount}回）に加えて、今後の欠席・遅刻を仮定します。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* 追加欠席 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>今後さらに欠席する回数</span>
                  <span className={`text-base font-black ${additionalAbsences > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    +{additionalAbsences} 回
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={additionalAbsences}
                  onChange={(e) => setAdditionalAbsences(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>+0回 (無欠席)</span>
                  <span>+2回</span>
                  <span>+5回</span>
                </div>
              </div>

              {/* 追加遅刻 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>今後さらに遅刻する回数</span>
                  <span className="text-base font-black text-slate-800">
                    +{additionalLates} 回
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  value={additionalLates}
                  onChange={(e) => setAdditionalLates(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>+0回</span>
                  <span>+3回 (欠席1換算)</span>
                  <span>+6回</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 右カラム：リアルタイム予測結果カード */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-6 sticky top-24">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  シミュレーション判定結果
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                合格基準: {selectedCourse.passingScore}点
              </span>
            </div>

            {/* 成績ランク ＆ 総合得点表示 */}
            <div className="text-center py-4 space-y-3">
              <div className="inline-block">
                <div className={`w-28 h-28 mx-auto rounded-3xl bg-gradient-to-tr ${getRankBadgeStyle(result.gradeRank)} flex flex-col items-center justify-center shadow-xl`}>
                  <span className="text-4xl font-black tracking-tight">{result.gradeRank}</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase opacity-90">評価</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  最終予想総合得点
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tight mt-1">
                  {result.finalScore} <span className="text-lg font-bold text-slate-500">点</span>
                </div>
              </div>

              {/* 合格・不合格バッジ */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-black shadow-xs ${
                  result.isPassed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.isPassed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      単位取得見込み (合格)
                    </>
                  ) : result.isDisqualified ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      足切り・失格条件抵触 (落単 / F)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      単位取得不可 (落単 / F)
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 出席状況判定 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">予想出席率</span>
                <span className={result.isAttendanceOk ? 'text-emerald-700' : 'text-red-600 font-black'}>
                  {result.attendanceRate}% ({result.isAttendanceOk ? '要件クリア' : '出席回数不足'})
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    result.isAttendanceOk ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.attendanceRate}%` }}
                />
              </div>
            </div>

            {/* ★ メッセージ・アドバイス (要件9) */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed font-medium space-y-1.5 ${
              !result.isAttendanceOk
                ? 'bg-red-50 text-red-900 border-red-200'
                : result.isPassed
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-orange-50 text-orange-950 border-orange-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>分析・アドバイス：</span>
              </div>
              <p className="pl-5">
                {result.message}
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
