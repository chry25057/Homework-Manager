import { RequiredScoreCalculationInput, RequiredScoreCalculationResult } from '../types';

/**
 * 試験 必要得点計算機（決定論的計算ロジック）
 * 
 * 確定持ち点およびこれから受ける1つ以上の試験割合から、
 * 単位取得ライン（60点等）に到達するための各試験の平均必要得点を計算します。
 */
export function calculateRequiredExamScore(
  input: RequiredScoreCalculationInput
): RequiredScoreCalculationResult {
  const missingFields: string[] = [];

  if (input.currentTotalScore === undefined || isNaN(input.currentTotalScore)) {
    missingFields.push('確定している・今後取れるであろう点数');
  }
  if (!input.exams || input.exams.length === 0) {
    missingFields.push('試験情報（少なくとも1つの試験）');
  }
  if (input.passingBorderScore === undefined || isNaN(input.passingBorderScore)) {
    missingFields.push('単位取得ライン（合格ボーダー点数）');
  }

  const validExams = (input.exams || []).filter(e => !isNaN(e.weightPercent) && e.weightPercent > 0);
  const totalExamWeight = validExams.reduce((sum, e) => sum + e.weightPercent, 0);

  if (validExams.length === 0 || totalExamWeight <= 0) {
    missingFields.push('試験の有効な評価割合（合計1%以上）');
  }

  // 入力不足の場合
  if (missingFields.length > 0) {
    return {
      hasSufficientInput: false,
      totalExamWeight,
      averageRequiredScore: null,
      neededScoreFromExams: 0,
      isAlreadySecured: false,
      isImpossible: false,
      calculationBasis: `計算に必要な情報が不足しています（不足: ${missingFields.join('、')}）。数値を入力してください。`,
      missingFields,
    };
  }

  const currentScore = input.currentTotalScore!;
  const border = input.passingBorderScore!;

  // 単位取得ラインまでの不足点数（総合点ベース）
  const neededScoreFromExams = border - currentScore;

  // すでに単位ラインを確保しているか
  const isAlreadySecured = neededScoreFromExams <= 0;

  // 各試験で平均して必要な得点 (100点満点換算)
  // 例: 不足20点、合計試験割合50% => (20 / 50) * 100 = 40点
  let averageRequiredScore: number | null = null;
  if (isAlreadySecured) {
    averageRequiredScore = 0;
  } else {
    averageRequiredScore = Math.ceil((neededScoreFromExams / totalExamWeight) * 100);
  }

  // 100点満点でも届かないか
  const isImpossible = !isAlreadySecured && (neededScoreFromExams > totalExamWeight || averageRequiredScore > 100);

  // 計算根拠のテキスト
  let calculationBasis = '';
  const examNames = validExams.map(e => `${e.name} (${e.weightPercent}%)`).join(' + ');

  if (isAlreadySecured) {
    calculationBasis = `確定・見込み点数（${currentScore}点）がすでに単位取得ライン（${border}点）に達しています。試験で0点でも合格ラインを満たします。`;
  } else if (isImpossible) {
    calculationBasis = `試験の合計配点は ${totalExamWeight}%（${examNames}）です。全試験で100点満点を取っても総合点は ${(currentScore + totalExamWeight).toFixed(1)}点 となり、合格ライン ${border}点 に届きません。`;
  } else {
    if (validExams.length === 1) {
      calculationBasis = `必要点数 = (合格ライン ${border}点 - 持ち点 ${currentScore}点) ÷ 試験割合 ${totalExamWeight}% × 100 = ${(neededScoreFromExams / totalExamWeight * 100).toFixed(1)}点 → ${averageRequiredScore}点 以上`;
    } else {
      calculationBasis = `対象試験合計割合: ${totalExamWeight}%（${examNames}）。\n必要点数 = 不足 ${neededScoreFromExams.toFixed(1)}点 ÷ 試験割合合計 ${totalExamWeight}% × 100 = ${(neededScoreFromExams / totalExamWeight * 100).toFixed(1)}点 → 各試験で平均 ${averageRequiredScore}点 以上`;
    }
  }

  let warningMessage: string | undefined;
  if (isImpossible) {
    warningMessage = `すべての試験で100点満点を獲得しても、総合点は${(currentScore + totalExamWeight).toFixed(1)}点にとどまり、単位取得ライン（${border}点）に到達できません。課題の再提出や救済措置がないか確認してください。`;
  }

  return {
    hasSufficientInput: true,
    totalExamWeight,
    averageRequiredScore,
    neededScoreFromExams: Math.max(0, neededScoreFromExams),
    isAlreadySecured,
    isImpossible,
    calculationBasis,
    warningMessage,
    missingFields: [],
  };
}
