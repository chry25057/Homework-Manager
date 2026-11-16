import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Course, Difficulty, EvaluationItem, EvaluationRule, EvaluationType } from '../../types';
import { RuleBuilder } from './RuleBuilder';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: Omit<Course, 'id'>) => void;
  initialCourse?: Course | null;
}

const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  attendance: '出席',
  absence: '欠席（減点等）',
  lateness: '遅刻（減点等）',
  quiz: '小テスト',
  assignment: '課題（演習・宿題）',
  report: 'レポート',
  midterm: '中間試験',
  final: '期末試験',
  other: 'その他の得点',
};

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCourse,
}) => {
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<Course['dayOfWeek']>('mon');
  const [period, setPeriod] = useState<number>(1);
  const [credits, setCredits] = useState<number>(2);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [testDifficulty, setTestDifficulty] = useState<Difficulty>('normal');
  const [assignmentDifficulty, setAssignmentDifficulty] = useState<Difficulty>('normal');
  const [notes, setNotes] = useState('');

  // 出席設定
  const [totalClasses, setTotalClasses] = useState<number>(15);
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [lateCount, setLateCount] = useState<number>(0);
  const [minAttendanceRate, setMinAttendanceRate] = useState<number>(0.67);

  // 評価項目
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([
    { id: 'eval-1', type: 'attendance', name: '出席', weight: 20, isGraded: true, score: 100 },
    { id: 'eval-2', type: 'assignment', name: '課題', weight: 30, isGraded: false, score: null },
    { id: 'eval-3', type: 'final', name: '期末試験', weight: 50, isGraded: false, score: null },
  ]);

  // ★ 評価ルール
  const [rules, setRules] = useState<EvaluationRule[]>([]);
  const [rawRuleText, setRawRuleText] = useState<string>('');

  useEffect(() => {
    if (initialCourse) {
      setName(initialCourse.name);
      setInstructor(initialCourse.instructor);
      setDayOfWeek(initialCourse.dayOfWeek);
      setPeriod(initialCourse.period);
      setCredits(initialCourse.credits);
      setPassingScore(initialCourse.passingScore || 60);
      setTestDifficulty(initialCourse.testDifficulty);
      setAssignmentDifficulty(initialCourse.assignmentDifficulty);
      setNotes(initialCourse.notes || '');
      setTotalClasses(initialCourse.attendance.totalClasses);
      setAbsentCount(initialCourse.attendance.absentCount);
      setLateCount(initialCourse.attendance.lateCount);
      setMinAttendanceRate(initialCourse.attendance.minAttendanceRate);
      setEvaluations(initialCourse.evaluations || []);
      setRules(initialCourse.rules || []);
      setRawRuleText(initialCourse.rawRuleText || '');
    } else {
      setName('');
      setInstructor('');
      setDayOfWeek('mon');
      setPeriod(1);
      setCredits(2);
      setPassingScore(60);
      setTestDifficulty('normal');
      setAssignmentDifficulty('normal');
      setNotes('');
      setTotalClasses(15);
      setAbsentCount(0);
      setLateCount(0);
      setMinAttendanceRate(0.67);
      setEvaluations([
        { id: `eval-${Date.now()}-1`, type: 'attendance', name: '出席', weight: 20, isGraded: true, score: 100 },
        { id: `eval-${Date.now()}-2`, type: 'assignment', name: '課題', weight: 30, isGraded: false, score: null },
        { id: `eval-${Date.now()}-3`, type: 'final', name: '期末試験', weight: 50, isGraded: false, score: null },
      ]);
      setRules([]);
      setRawRuleText('');
    }
  }, [initialCourse, isOpen]);

  // 割合合計チェック
  const totalWeight = evaluations.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  if (!isOpen) return null;

  const handleAddEvaluation = () => {
    const newItem: EvaluationItem = {
      id: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'assignment',
      name: '新規評価項目',
      weight: 10,
      isGraded: false,
      score: null,
    };
    setEvaluations(prev => [...prev, newItem]);
  };

  const handleRemoveEvaluation = (id: string) => {
    setEvaluations(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateEvaluation = (id: string, field: keyof EvaluationItem, value: any) => {
    setEvaluations(prev =>
      prev.map(e => {
        if (e.id === id) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('講義名を入力してください。');
      return;
    }
    if (!isWeightValid) {
      alert(`評価割合の合計が100%になっていません（現在: ${totalWeight}%）。100%に調整してください。`);
      return;
    }

    onSave({
      name,
      instructor,
      dayOfWeek,
      period,
      credits,
      passingScore,
      testDifficulty,
      assignmentDifficulty,
      notes,
      attendance: {
        totalClasses,
        absentCount,
        lateCount,
        latePenaltyRatio: 3,
        minAttendanceRate,
      },
      evaluations,
      rules,
      rawRuleText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
        
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialCourse ? '講義情報の編集' : '新しい講義の登録'}
            </h2>
            <p className="text-xs text-slate-500">
              大学・講義ごとの特殊な評価ルールや足切り条件を自由に組み合わせて登録できます。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. 講義の基本情報
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  講義名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 線形代数学、ミクロ経済学"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  担当教員名
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="例: 佐藤 教授"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  曜日
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="mon">月曜日</option>
                  <option value="tue">火曜日</option>
                  <option value="wed">水曜日</option>
                  <option value="thu">木曜日</option>
                  <option value="fri">金曜日</option>
                  <option value="sat">土曜日</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  時限
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(parseInt(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(p => (
                    <option key={p} value={p}>{p}限</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  単位数
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={credits}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 2)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  単位合格ライン
                </label>
                <input
                  type="number"
                  min="50"
                  max="90"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 60)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 難易度設定 */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. 難易度設定（優先度計算に反映されます）
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  テストの難易度
                </label>
                <select
                  value={testDifficulty}
                  onChange={(e) => setTestDifficulty(e.target.value as Difficulty)}
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
                  レポート・課題の難易度
                </label>
                <select
                  value={assignmentDifficulty}
                  onChange={(e) => setAssignmentDifficulty(e.target.value as Difficulty)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="easy">易しい</option>
                  <option value="normal">普通</option>
                  <option value="hard">難しい</option>
                  <option value="very_hard">非常に難しい</option>
                </select>
              </div>
            </div>
          </div>

          {/* 成績評価割合（合計100%自動チェック） */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. 成績評価方法と配分割合（合計100%）
                </h3>
                <p className="text-xs text-slate-500">
                  基本的な評価項目と配分を入力してください。
                </p>
              </div>

              {/* ★ 自動合計チェックバッジ */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isWeightValid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}>
                {isWeightValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>合計 100% (適正)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>
                      現在 {totalWeight}% 
                      {totalWeight < 100 ? ` (あと${100 - totalWeight}%不足)` : ` (${totalWeight - 100}%超過)`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {evaluations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70"
                >
                  <select
                    value={item.type}
                    onChange={(e) => handleUpdateEvaluation(item.id, 'type', e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    {Object.entries(EVALUATION_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateEvaluation(item.id, 'name', e.target.value)}
                    placeholder="項目名"
                    className="text-xs flex-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.weight}
                      onChange={(e) => handleUpdateEvaluation(item.id, 'weight', parseInt(e.target.value) || 0)}
                      className="w-16 text-xs px-2 py-1.5 text-right font-bold rounded border border-slate-300 bg-white"
                    />
                    <span className="text-xs font-semibold text-slate-500">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEvaluation(item.id)}
                    disabled={evaluations.length <= 1}
                    className="text-slate-400 hover:text-red-500 p-1 rounded disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddEvaluation}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              評価項目を追加
            </button>
          </div>

          {/* ★ 4. ルールビルダー（特殊評価ルール & 自然言語入力） */}
          <RuleBuilder
            evaluations={evaluations}
            setEvaluations={setEvaluations}
            rules={rules}
            setRules={setRules}
            rawRuleText={rawRuleText}
            setRawRuleText={setRawRuleText}
          />

          {/* 5. 出席設定 */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              5. 出席・欠席基本設定
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  総講義回数
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={totalClasses}
                  onChange={(e) => setTotalClasses(parseInt(e.target.value) || 15)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  必要出席率
                </label>
                <select
                  value={minAttendanceRate}
                  onChange={(e) => setMinAttendanceRate(parseFloat(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={0.67}>2/3以上 (66.7%)</option>
                  <option value={0.70}>70%以上</option>
                  <option value={0.75}>3/4以上 (75%)</option>
                  <option value={0.80}>80%以上</option>
                  <option value={0.50}>半分以上 (50%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  現在の欠席回数
                </label>
                <input
                  type="number"
                  min="0"
                  value={absentCount}
                  onChange={(e) => setAbsentCount(parseInt(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  現在の遅刻回数
                </label>
                <input
                  type="number"
                  min="0"
                  value={lateCount}
                  onChange={(e) => setLateCount(parseInt(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* フッター操作 */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!isWeightValid}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-md shadow-blue-500/20"
            >
              {initialCourse ? '講義情報を更新' : '講義を登録する'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
