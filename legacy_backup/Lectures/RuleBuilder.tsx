import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  HelpCircle,
  FileText,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { EvaluationItem, EvaluationRule, RuleType } from '../../types';
import { parseRuleText, ParsedRuleResult } from '../../services/naturalLanguageRuleParser';

interface RuleBuilderProps {
  evaluations: EvaluationItem[];
  setEvaluations: React.Dispatch<React.SetStateAction<EvaluationItem[]>>;
  rules: EvaluationRule[];
  setRules: React.Dispatch<React.SetStateAction<EvaluationRule[]>>;
  rawRuleText?: string;
  setRawRuleText?: (text: string) => void;
}

const RULE_TYPE_INFO: Record<RuleType, { label: string; icon: string; description: string }> = {
  min_score: {
    label: '最低点・足切り条件',
    icon: '🎯',
    description: '特定の試験や課題で最低点を要求（例: 期末試験40点未満で単位不可）',
  },
  must_submit_all: {
    label: '全提出必須ルール',
    icon: '📋',
    description: '指定した課題やレポートをすべて提出しなければ単位取得不可',
  },
  min_submissions: {
    label: '提出ノルマ条件',
    icon: '🔢',
    description: '複数の課題から一定数以上の提出を要求（例: 5件中4件以上）',
  },
  must_submit_specific: {
    label: '特定課題の提出必須',
    icon: '⭐',
    description: '特定の最重要課題（例: レポート1）の提出を必須とする',
  },
  max_absences: {
    label: '欠席上限失格ルール',
    icon: '🚫',
    description: '一定回数以上の欠席で即時単位不可（例: 3回以上欠席で失格）',
  },
  attendance_range: {
    label: '出席評価対象範囲',
    icon: '📅',
    description: '特定の講義回のみを出席評価に算入（例: 第4回〜第15回のみ）',
  },
  mandatory_dates: {
    label: '必須出席日・指定回',
    icon: '📌',
    description: '特定の日や回の講義への出席を必須とする（例: 4/10, 5/8 必須）',
  },
  drop_lowest: {
    label: '上位N件採用（足切り除外）',
    icon: '🏆',
    description: '複数回の中で得点が高い上位○回のみを評価に算入（例: 10回中8回）',
  },
  blend_exams: {
    label: '複数試験の平均化',
    icon: '⚖️',
    description: '中間試験と期末試験の平均点を試験成績とする',
  },
};

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  evaluations,
  setEvaluations,
  rules,
  setRules,
  rawRuleText,
  setRawRuleText,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'natural'>('builder');

  // 自然言語入力用
  const [inputText, setInputText] = useState(rawRuleText || '');
  const [parsedResult, setParsedResult] = useState<ParsedRuleResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // 手動ルール追加フォーム用
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleType, setRuleType] = useState<RuleType>('min_score');
  const [targetItemId, setTargetItemId] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(40);
  const [isDisqualification, setIsDisqualification] = useState<boolean>(true);
  const [maxAbsences, setMaxAbsences] = useState<number>(3);
  const [startSession, setStartSession] = useState<number>(4);
  const [endSession, setEndSession] = useState<number>(15);
  const [mandatoryDatesStr, setMandatoryDatesStr] = useState<string>('4月10日、5月8日、6月12日');
  const [totalCount, setTotalCount] = useState<number>(5);
  const [requiredCount, setRequiredCount] = useState<number>(4);
  const [bestNCount, setBestNCount] = useState<number>(8);
  const [specificName, setSpecificName] = useState<string>('レポート1');

  // 自然言語の例文
  const samplePrompts = [
    '出席は全部取るけど、最初の3回は評価に入らない。レポートは3つ全部提出必須。中間30%、期末40%、残りは出席。期末で40点未満だったら単位不可',
    '期末試験50%、中間試験30%、課題20%。期末試験で60点以上必要。3回以上欠席すると失格',
    '小テスト10回のうち得点上位8回を評価。期末試験50%、出席20%、小テスト30%。レポート1を提出しなければ単位取得不可',
  ];

  const handleParseText = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseRuleText(inputText);
      setParsedResult(result);
      if (setRawRuleText) {
        setRawRuleText(inputText);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyParsedResult = () => {
    if (!parsedResult) return;
    if (parsedResult.evaluations.length > 0) {
      setEvaluations(parsedResult.evaluations);
    }
    if (parsedResult.rules.length > 0) {
      setRules(parsedResult.rules);
    }
    setActiveTab('builder');
  };

  const handleAddManualRule = () => {
    let description = '';
    let name = RULE_TYPE_INFO[ruleType].label;

    switch (ruleType) {
      case 'min_score': {
        const item = evaluations.find(e => e.id === targetItemId);
        const itemName = item ? item.name : '期末試験';
        name = `${itemName}最低点条件`;
        description = `${itemName}${minScore}点未満の場合、${isDisqualification ? '総合点に関係なく単位不可' : '基準未達'}`;
        break;
      }
      case 'must_submit_all': {
        const item = evaluations.find(e => e.id === targetItemId);
        const itemName = item ? item.name : 'レポート';
        name = `${itemName}全提出必須`;
        description = `${itemName}${totalCount}件をすべて提出必須（未提出は単位不可）`;
        break;
      }
      case 'min_submissions': {
        const item = evaluations.find(e => e.id === targetItemId);
        const itemName = item ? item.name : '課題';
        name = `${itemName}提出ノルマ`;
        description = `${totalCount}件の${itemName}のうち${requiredCount}件以上提出必須`;
        break;
      }
      case 'must_submit_specific': {
        name = '特定課題提出必須';
        description = `「${specificName}」を提出しなければ単位取得不可`;
        break;
      }
      case 'max_absences': {
        name = '欠席上限失格ルール';
        description = `${maxAbsences}回以上欠席すると失格（単位不可）`;
        break;
      }
      case 'attendance_range': {
        name = '出席評価対象範囲';
        description = `第${startSession}回〜第${endSession}回の出席のみ評価対象`;
        break;
      }
      case 'mandatory_dates': {
        const dates = mandatoryDatesStr.split(/[、, ]+/).filter(Boolean);
        name = '必須出席日・指定回';
        description = `${dates.join('、')} の出席が必須`;
        break;
      }
      case 'drop_lowest': {
        const item = evaluations.find(e => e.id === targetItemId);
        const itemName = item ? item.name : '小テスト';
        name = `${itemName}上位件数採用`;
        description = `${itemName}${totalCount}回のうち得点上位${bestNCount}回を評価`;
        break;
      }
      case 'blend_exams': {
        name = '試験平均化ルール';
        description = '中間試験と期末試験の平均点を試験成績とする';
        break;
      }
    }

    const newRule: EvaluationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: ruleType,
      name,
      description,
      targetItemId: targetItemId || undefined,
      params: {
        minScore,
        isDisqualification,
        maxAbsences,
        startSession,
        endSession,
        mandatoryDates: mandatoryDatesStr.split(/[、, ]+/).filter(Boolean),
        totalCount,
        requiredCount,
        bestNCount,
        specificItemNames: [specificName],
      },
    };

    setRules(prev => [...prev, newRule]);
    setIsAddingRule(false);
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4 pt-3 border-t border-slate-200">
      
      {/* タブ切り替えバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'builder'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            ルールビルダー（一覧・手動追加）
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('natural')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'natural'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            自然言語でルールを入力（自動解析）
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          設定中のルール: {rules.length}件
        </span>
      </div>

      {/* --- タブ 1: 自然言語入力 --- */}
      {activeTab === 'natural' && (
        <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-200 rounded-xl p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              シラバスや教員の説明文をそのまま入力してください
            </h4>
            <p className="text-[11px] text-indigo-800/80 leading-relaxed">
              「レポート3つ全提出必須」「期末40点未満で単位不可」「第4回〜第15回出席のみ対象」などの特殊な大学独自ルールを構文解析エンジンが構造化します。
            </p>
          </div>

          {/* 例文プリセットボタン */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-900 block">例文を試す：</span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(p)}
                  className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-white/90 border border-indigo-200 text-indigo-900 hover:bg-indigo-100/60 transition-colors"
                >
                  例{idx + 1}: {p.slice(0, 32)}...
                </button>
              ))}
            </div>
          </div>

          {/* テキスト入力エリア */}
          <div className="space-y-2">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例：出席は全部取るけど、最初の3回は評価に入らない。レポートは3つ全部提出必須。中間30%、期末40%、残りは出席。期末で40点未満だったら単位不可"
              className="w-full text-xs p-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseText}
                disabled={isParsing || !inputText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isParsing ? '解析中...' : 'ルールを解析・変換'}
              </button>
            </div>
          </div>

          {/* ★ 「以下のルールとして解釈しました」確認ブロック */}
          {parsedResult && (
            <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  以下のルールとして解釈しました（確認・適用）：
                </span>
                {parsedResult.isAmbiguous && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    要調整（100%未達など）
                  </span>
                )}
              </div>

              {/* 解釈箇条書きリスト */}
              <ul className="space-y-1.5 pl-2 text-xs text-slate-800">
                {parsedResult.interpretations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>

              {parsedResult.ambiguityReason && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parsedResult.ambiguityReason}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={handleApplyParsedResult}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  このルールを講義に適用する
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- タブ 2: 手動ルールビルダー（一覧 & 新規追加） --- */}
      {activeTab === 'builder' && (
        <div className="space-y-3">
          
          {/* 現在登録されている特殊ルール一覧 */}
          {rules.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50/50">
              特殊な評価ルール（足切り点、提出ノルマ、欠席上限など）はまだ登録されていません。
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const info = RULE_TYPE_INFO[rule.type] || { icon: '⚙️', label: rule.name };
                return (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-xs hover:border-blue-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{info.icon}</span>
                        <span className="text-xs font-bold text-slate-800">{rule.name}</span>
                        {rule.params.isDisqualification && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            失格条件（単位不可）
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-6">
                        {rule.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                      title="ルールを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 新規ルール追加フォーム（トグル） */}
          {!isAddingRule ? (
            <button
              type="button"
              onClick={() => setIsAddingRule(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              特殊な評価ルールを追加する
            </button>
          ) : (
            <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/30 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  新しい評価ルールを組み立てる
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  キャンセル
                </button>
              </div>

              {/* ルール種類の選択 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ルールの種類を選択
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as RuleType)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {Object.entries(RULE_TYPE_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label} - {info.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* 各ルール別のパラメータ入力 */}
              <div className="p-3 rounded-lg bg-white border border-blue-200 space-y-3">
                
                {/* 1. 最低点・足切り点 (min_score) */}
                {ruleType === 'min_score' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">対象の評価項目</label>
                        <select
                          value={targetItemId}
                          onChange={(e) => setTargetItemId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                        >
                          <option value="">期末試験（デフォルト）</option>
                          {evaluations.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.weight}%)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">最低点（100点換算）</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={minScore}
                            onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                            className="w-20 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                          />
                          <span className="text-xs text-slate-600">点</span>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-700">
                      <input
                        type="checkbox"
                        checked={isDisqualification}
                        onChange={(e) => setIsDisqualification(e.target.checked)}
                        className="rounded text-red-600"
                      />
                      <span>この最低点未満の場合は、総合得点に関係なく即時単位不可（失格）とする</span>
                    </label>
                  </div>
                )}

                {/* 2. 欠席上限 (max_absences) */}
                {ruleType === 'max_absences' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      何回以上の欠席で単位不可（失格）とするか
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={maxAbsences}
                        onChange={(e) => setMaxAbsences(parseInt(e.target.value) || 1)}
                        className="w-20 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                      <span className="text-xs font-bold text-slate-700">回以上の欠席で失格</span>
                    </div>
                  </div>
                )}

                {/* 3. 出席範囲 (attendance_range) */}
                {ruleType === 'attendance_range' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">開始回</label>
                      <input
                        type="number"
                        min="1"
                        max={endSession}
                        value={startSession}
                        onChange={(e) => setStartSession(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">終了回</label>
                      <input
                        type="number"
                        min={startSession}
                        max="30"
                        value={endSession}
                        onChange={(e) => setEndSession(parseInt(e.target.value) || 15)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* 4. 必須出席日 (mandatory_dates) */}
                {ruleType === 'mandatory_dates' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      出席必須の日程または回（読点区切り）
                    </label>
                    <input
                      type="text"
                      value={mandatoryDatesStr}
                      onChange={(e) => setMandatoryDatesStr(e.target.value)}
                      placeholder="例: 4月10日、5月8日、6月12日 または 第1回、第8回"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                )}

                {/* 5. レポート・課題全提出必須 (must_submit_all) */}
                {ruleType === 'must_submit_all' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">対象項目</label>
                      <select
                        value={targetItemId}
                        onChange={(e) => setTargetItemId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                      >
                        <option value="">レポート・課題全般</option>
                        {evaluations.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">全課題件数</label>
                      <input
                        type="number"
                        min="1"
                        value={totalCount}
                        onChange={(e) => setTotalCount(parseInt(e.target.value) || 1)}
                        className="w-20 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* 6. 特定課題提出必須 (must_submit_specific) */}
                {ruleType === 'must_submit_specific' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      提出必須の課題名
                    </label>
                    <input
                      type="text"
                      value={specificName}
                      onChange={(e) => setSpecificName(e.target.value)}
                      placeholder="例: レポート1、卒業研究中間原稿"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                    />
                  </div>
                )}

                {/* 7. 提出ノルマ (min_submissions) */}
                {ruleType === 'min_submissions' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">全課題数</label>
                      <input
                        type="number"
                        min="1"
                        value={totalCount}
                        onChange={(e) => setTotalCount(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">必要提出数</label>
                      <input
                        type="number"
                        min="1"
                        max={totalCount}
                        value={requiredCount}
                        onChange={(e) => setRequiredCount(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* 8. 上位N件採用 (drop_lowest) */}
                {ruleType === 'drop_lowest' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">全実施回数</label>
                      <input
                        type="number"
                        min="2"
                        value={totalCount}
                        onChange={(e) => setTotalCount(parseInt(e.target.value) || 2)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">採用する上位件数</label>
                      <input
                        type="number"
                        min="1"
                        max={totalCount}
                        value={bestNCount}
                        onChange={(e) => setBestNCount(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* 保存ボタン */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAddManualRule}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  このルールを追加する
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
