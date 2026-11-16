import React, { useState } from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  Info,
  ShieldCheck,
  Plus,
  Trash2
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { calculateRequiredExamScore } from '../../services/scoreReverseCalculator';
import { ExamCalculationItem } from '../../types';

interface ScoreCalculatorViewProps {
  initialCourse?: string;
  initialExam?: string;
}

export const ScoreCalculatorView: React.FC<ScoreCalculatorViewProps> = ({
  initialCourse,
  initialExam,
}) => {
  const { exams } = useUniPilot();

  const [courseName, setCourseName] = useState(initialCourse || '');
  const [currentScore, setCurrentScore] = useState<string>('40');
  const [passingBorder, setPassingBorder] = useState<string>('60');

  // 試験リスト（複数対応）
  const [examItems, setExamItems] = useState<{ id: string; name: string; weightPercent: string }[]>([
    { id: '1', name: initialExam || '期末試験', weightPercent: '40' },
  ]);

  // 登録済み試験から引用
  const selectableExams = exams.filter(e => !e.isCompleted);

  const handleSelectPreloadExam = (selectedId: string) => {
    const target = exams.find(e => e.id === selectedId);
    if (target) {
      setCourseName(target.courseName);
      setExamItems([
        {
          id: `exam-${Date.now()}`,
          name: target.title,
          weightPercent: target.weightPercent ? target.weightPercent.toString() : '40',
        },
      ]);
      if (target.passingRequiredScore) {
        setPassingBorder(target.passingRequiredScore.toString());
      }
    }
  };

  // 試験を追加
  const handleAddExam = () => {
    const nextNumber = examItems.length + 1;
    const defaultName = nextNumber === 2 ? '中間試験' : `試験${nextNumber}`;
    setExamItems(prev => [
      ...prev,
      { id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, name: defaultName, weightPercent: '30' },
    ]);
  };

  // 試験を削除
  const handleRemoveExam = (id: string) => {
    if (examItems.length <= 1) {
      alert('試験は少なくとも1つ必要です。');
      return;
    }
    setExamItems(prev => prev.filter(e => e.id !== id));
  };

  // 試験項目更新
  const handleUpdateExam = (id: string, field: 'name' | 'weightPercent', value: string) => {
    setExamItems(prev => prev.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };

  // 計算実行
  const examsForCalc: ExamCalculationItem[] = examItems.map(e => ({
    id: e.id,
    name: e.name.trim() || '試験',
    weightPercent: e.weightPercent !== '' ? parseFloat(e.weightPercent) : 0,
  }));

  const calculationInput = {
    courseName: courseName.trim() || undefined,
    currentTotalScore: currentScore !== '' ? parseFloat(currentScore) : undefined,
    passingBorderScore: passingBorder !== '' ? parseFloat(passingBorder) : 60,
    exams: examsForCalc,
  };

  const result = calculateRequiredExamScore(calculationInput);

  // 試験割合の合計
  const totalWeight = examItems.reduce((sum, e) => {
    const val = parseFloat(e.weightPercent);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* 画面ヘッダー */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">試験 必要得点計算機</h1>
        </div>

        {selectableExams.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold shrink-0">登録試験から引用:</span>
            <select
              onChange={(e) => handleSelectPreloadExam(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue=""
            >
              <option value="" disabled>テストを選択...</option>
              {selectableExams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.courseName} - {e.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 左側: 入力パネル */}
        <div className="md:col-span-6 space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
            成績評価・試験パラメータの入力
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              講義名 (任意)
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="例: 線形代数学、英語コミュニケーション"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 現在までに確定している・今後取れるであろう点数 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              現在までに確定している・今後取れるであろう点数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                placeholder="例: 40"
                className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500 font-semibold shrink-0">点</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              出席、小テスト、課題などすでに確定している持ち点や、今後少なくとも取れる点数(出席や課題など)の合計
            </p>
          </div>

          {/* 単位取得ライン */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              単位取得ライン (合格ボーダー)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                max="100"
                value={passingBorder}
                onChange={(e) => setPassingBorder(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500 font-semibold shrink-0">点 (通常60点)</span>
            </div>
          </div>

          {/* 受験予定の試験一覧（2個以上追加可能） */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                これから受ける試験（配点割合） <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddExam}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>試験を追加</span>
              </button>
            </div>

            <div className="space-y-2">
              {examItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateExam(item.id, 'name', e.target.value)}
                      placeholder={`試験名 (例: ${index === 0 ? '中間試験' : '期末試験'})`}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="w-28 flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={item.weightPercent}
                      onChange={(e) => handleUpdateExam(item.id, 'weightPercent', e.target.value)}
                      placeholder="配点"
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-right"
                    />
                    <span className="text-xs text-slate-500 font-semibold">%</span>
                  </div>

                  {examItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExam(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="この試験を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs px-2 pt-1 font-semibold text-slate-600">
              <span>試験配点の合計割合:</span>
              <span className={`font-bold ${totalWeight > 100 ? 'text-red-600' : 'text-indigo-700'}`}>
                {totalWeight}% {totalWeight > 100 && '(※100%を超えています)'}
              </span>
            </div>
          </div>

        </div>

        {/* 右側: 判定結果ディスプレイ */}
        <div className="md:col-span-6 flex flex-col justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              計算結果判定
            </div>

            {/* 結果表示メイン */}
            {!result.hasSufficientInput ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">
                  入力値が不足しています
                </h3>
                <p className="text-xs text-slate-500">
                  {result.calculationBasis}
                </p>
              </div>
            ) : result.isImpossible ? (
              <div className="p-6 rounded-xl bg-red-50 border border-red-300 text-center">
                <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-red-700 mb-1">
                  【警告】単位取得ライン到達不可
                </div>
                <div className="text-2xl font-black text-red-600 mb-2">
                  全試験100点でも不可
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  {result.warningMessage}
                </p>
              </div>
            ) : result.isAlreadySecured ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-300 text-center">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-emerald-800 mb-1">
                  単位取得ライン確保済み
                </div>
                <div className="text-2xl font-black text-emerald-700 mb-2">
                  試験0点でも合格確定
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {result.calculationBasis}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                <div className="text-xs font-bold text-indigo-700 mb-1">
                  {courseName ? `「${courseName}」` : ''}
                  {examItems.length > 1 ? '各試験で必要な平均得点' : `${examItems[0]?.name || '試験'}での必要得点`}
                </div>
                <div className="text-4xl font-black text-indigo-600 my-2">
                  {examItems.length > 1 ? `平均 ${result.averageRequiredScore}点 以上` : `${result.averageRequiredScore}点 以上`}
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  {examItems.length > 1 ? (
                    <>
                      登録された{examItems.length}つの試験（合計配点 {result.totalExamWeight}%）で、100点満点中 <span className="font-bold underline">平均 {result.averageRequiredScore}点</span> を獲得すれば合格ライン（{passingBorder}点）に到達します。
                    </>
                  ) : (
                    <>
                      100点満点の試験で <span className="font-bold underline">{result.averageRequiredScore}点</span> を獲得すれば、合格ライン（{passingBorder}点）に到達します。
                    </>
                  )}
                </p>
              </div>
            )}

            {/* 計算根拠 */}
            {result.hasSufficientInput && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-700">
                  計算根拠
                </div>
                <div className="font-mono text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {result.calculationBasis}
                </div>
              </div>
            )}
          </div>

          {/* クイックガイド */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-slate-500 text-[11px] space-y-1">
            <p className="font-semibold text-slate-600">💡 計算の仕組み:</p>
            <p>
              ・総合点 = 持ち点 + (各試験の得点 × 各試験割合 ÷ 100)
            </p>
            <p>
              ・平均必要得点 = (合格ライン - 持ち点) ÷ 試験合計割合 × 100
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
