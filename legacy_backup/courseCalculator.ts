import { Course, CourseCalculations, DangerLevel, CreditStatus, RuleCheckResult, EvaluationItem } from '../types';

/**
 * 決定論的な成績・評価ルール計算エンジン
 * 必須条件・失格条件・足切り点・集計方法などを厳密に考慮して合否と必要得点を算出します。
 */
export function calculateCourseStatus(course: Course): CourseCalculations {
  const passingScore = course.passingScore || 60;
  const evaluations = course.evaluations || [];
  const rules = course.rules || [];

  // 1. 曖昧性チェック（評価基準が不完全または合計が100%でない）
  const totalWeight = evaluations.reduce((sum, e) => sum + (Number(e.weight) || 0), 0);
  const isAmbiguous = evaluations.length === 0 || totalWeight !== 100;
  const ambiguityReason = evaluations.length === 0
    ? '評価項目が登録されていません。'
    : totalWeight !== 100
    ? `評価割合の合計が${totalWeight}%であり、100%になっていません。`
    : undefined;

  // 2. 出席状況の計算（特殊ルール: 出席範囲や欠席上限を考慮）
  const attendance = course.attendance;
  const rangeRule = rules.find(r => r.type === 'attendance_range');
  const maxAbsenceRule = rules.find(r => r.type === 'max_absences');
  const mandatoryDatesRule = rules.find(r => r.type === 'mandatory_dates');

  const effectiveAbsences = attendance.absentCount + Math.floor(attendance.lateCount / (attendance.latePenaltyRatio || 3));
  
  // 出席対象回数の決定
  let effectiveTotalClasses = attendance.totalClasses;
  if (rangeRule && rangeRule.params.startSession && rangeRule.params.endSession) {
    effectiveTotalClasses = Math.max(1, rangeRule.params.endSession - rangeRule.params.startSession + 1);
  }

  const minRequiredAttendances = Math.ceil(effectiveTotalClasses * attendance.minAttendanceRate);
  const standardMaxAbsences = Math.max(0, effectiveTotalClasses - minRequiredAttendances);
  
  // 欠席上限ルールがあれば優先採用
  const allowedAbsenceLimit = maxAbsenceRule && maxAbsenceRule.params.maxAbsences !== undefined
    ? Math.max(0, maxAbsenceRule.params.maxAbsences - 1) // 3回以上で失格なら許容は2回
    : standardMaxAbsences;

  const remainingAllowedAbsences = Math.max(0, allowedAbsenceLimit - effectiveAbsences);
  const isAttendanceFailed = effectiveAbsences > allowedAbsenceLimit;

  const attendanceRate = effectiveTotalClasses > 0
    ? Math.max(0, Math.min(100, Math.round(((effectiveTotalClasses - effectiveAbsences) / effectiveTotalClasses) * 100)))
    : 100;

  // 3. 各評価項目の確定得点計算（上位N件や試験平均化等の集計方式を考慮）
  let currentEarnedScore = 0;
  let gradedWeightSum = 0;
  let remainingWeightSum = 0;

  const finalExamItem = evaluations.find(e => e.type === 'final');
  const midtermExamItem = evaluations.find(e => e.type === 'midterm');

  // 試験平均化ルールのチェック
  const blendExamsRule = rules.find(r => r.type === 'blend_exams');

  for (const item of evaluations) {
    // 上位N件採用ルールの適用チェック
    const dropRule = rules.find(r => r.type === 'drop_lowest' && (r.targetItemId === item.id || (item.type === 'quiz' && r.name.includes('小テスト'))));
    
    let computedScore: number | null = item.score;

    if (dropRule && item.subItems && item.subItems.length > 0 && dropRule.params.bestNCount) {
      const gradedSubs = item.subItems.filter(s => s.score !== null && s.score !== undefined);
      if (gradedSubs.length > 0) {
        // スコア降順にソートして上位N件を採用
        const sortedScores = gradedSubs.map(s => s.score!).sort((a, b) => b - a);
        const bestScores = sortedScores.slice(0, dropRule.params.bestNCount);
        computedScore = Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length);
      }
    }

    if (item.type === 'attendance') {
      // 出席配点の場合、出席率に応じて算出
      const attContribution = (attendanceRate / 100) * item.weight;
      currentEarnedScore += attContribution;
      gradedWeightSum += item.weight;
    } else if (item.isGraded && computedScore !== null) {
      const contribution = (computedScore / 100) * item.weight;
      currentEarnedScore += contribution;
      gradedWeightSum += item.weight;
    } else {
      remainingWeightSum += item.weight;
    }
  }

  currentEarnedScore = Math.round(currentEarnedScore * 10) / 10;
  const scoreNeeded = Math.max(0, passingScore - currentEarnedScore);
  const maxPossibleScore = currentEarnedScore + remainingWeightSum;

  // 4. 特殊ルール・失格条件・必須条件の検証
  const disqualificationReasons: string[] = [];
  const ruleResults: RuleCheckResult[] = [];

  // A) 欠席上限ルール
  if (maxAbsenceRule && maxAbsenceRule.params.maxAbsences !== undefined) {
    const isExceeded = effectiveAbsences >= maxAbsenceRule.params.maxAbsences;
    if (isExceeded) {
      disqualificationReasons.push(`欠席回数が${effectiveAbsences}回となり、欠席上限（${maxAbsenceRule.params.maxAbsences}回以上で失格）を超過しました。`);
    }
    ruleResults.push({
      ruleId: maxAbsenceRule.id,
      ruleName: maxAbsenceRule.name,
      status: isExceeded ? 'failed' : remainingAllowedAbsences === 0 ? 'pending' : 'satisfied',
      message: isExceeded
        ? `失格：欠席${effectiveAbsences}回（上限: ${maxAbsenceRule.params.maxAbsences}回）`
        : `現在欠席${effectiveAbsences}回（あと${remainingAllowedAbsences}回で失格）`,
      isDisqualification: true,
    });
  } else if (isAttendanceFailed) {
    disqualificationReasons.push(`必要出席率（${Math.round(attendance.minAttendanceRate * 100)}%）を下回る欠席回数（${effectiveAbsences}回）のため出席不足です。`);
  }

  // B) 必須出席日ルール
  if (mandatoryDatesRule && mandatoryDatesRule.params.mandatoryDates) {
    ruleResults.push({
      ruleId: mandatoryDatesRule.id,
      ruleName: mandatoryDatesRule.name,
      status: 'pending',
      message: `指定日（${mandatoryDatesRule.params.mandatoryDates.join('、')}）の出席が必須です。`,
      isDisqualification: true,
    });
  }

  // C) 最低点・足切り点ルール (min_score)
  let finalExamMinScoreRule: number | null = null;
  const minScoreRules = rules.filter(r => r.type === 'min_score');

  for (const msRule of minScoreRules) {
    const isFinalRule = msRule.name.includes('期末') || (finalExamItem && msRule.targetItemId === finalExamItem.id);
    const minVal = msRule.params.minScore || 0;

    if (isFinalRule) {
      finalExamMinScoreRule = minVal;
      if (finalExamItem && finalExamItem.isGraded && finalExamItem.score !== null) {
        if (finalExamItem.score < minVal && msRule.params.isDisqualification) {
          disqualificationReasons.push(`期末試験の得点（${finalExamItem.score}点）が足切り点（${minVal}点）未満のため失格です。`);
          ruleResults.push({
            ruleId: msRule.id,
            ruleName: msRule.name,
            status: 'failed',
            message: `期末試験得点${finalExamItem.score}点 < 足切り${minVal}点（失格）`,
            isDisqualification: true,
          });
          continue;
        }
      }
    } else if (msRule.name.includes('中間') && midtermExamItem && midtermExamItem.isGraded && midtermExamItem.score !== null) {
      if (midtermExamItem.score < minVal) {
        if (msRule.params.isDisqualification) {
          disqualificationReasons.push(`中間試験の得点（${midtermExamItem.score}点）が足切り点（${minVal}点）未満のため失格です。`);
        }
        ruleResults.push({
          ruleId: msRule.id,
          ruleName: msRule.name,
          status: 'failed',
          message: `中間試験得点${midtermExamItem.score}点 < 最低点${minVal}点`,
          isDisqualification: !!msRule.params.isDisqualification,
        });
        continue;
      }
    }

    ruleResults.push({
      ruleId: msRule.id,
      ruleName: msRule.name,
      status: 'satisfied',
      message: `${msRule.description}`,
      isDisqualification: !!msRule.params.isDisqualification,
    });
  }

  // D) 提出必須ルール (must_submit_all, must_submit_specific, min_submissions)
  const submitRules = rules.filter(r => ['must_submit_all', 'must_submit_specific', 'min_submissions'].includes(r.type));
  for (const sRule of submitRules) {
    ruleResults.push({
      ruleId: sRule.id,
      ruleName: sRule.name,
      status: 'pending',
      message: sRule.description,
      isDisqualification: true,
    });
  }

  // 5. 期末試験および残りの評価項目での必要得点率の計算
  let finalExamRequiredScore: number | null = null;
  let requiredScoreOnRemaining = 0;

  if (currentEarnedScore >= passingScore && disqualificationReasons.length === 0) {
    requiredScoreOnRemaining = 0;
    // 足切り点ルールがあれば足切り点が最低必須得点
    finalExamRequiredScore = finalExamMinScoreRule !== null ? finalExamMinScoreRule : 0;
  } else if (remainingWeightSum > 0) {
    requiredScoreOnRemaining = Math.ceil((scoreNeeded / remainingWeightSum) * 100);

    if (finalExamItem && !finalExamItem.isGraded) {
      const otherRemainingWeight = remainingWeightSum - finalExamItem.weight;
      let calculatedNeeded = 0;
      if (otherRemainingWeight <= 0) {
        calculatedNeeded = Math.ceil((scoreNeeded / finalExamItem.weight) * 100);
      } else {
        calculatedNeeded = Math.ceil((scoreNeeded / remainingWeightSum) * 100);
      }

      // ★ 足切り点ルールがある場合、合格必要点と足切り点のうち高い方を要求！
      if (finalExamMinScoreRule !== null) {
        finalExamRequiredScore = Math.max(calculatedNeeded, finalExamMinScoreRule);
      } else {
        finalExamRequiredScore = calculatedNeeded;
      }
    }
  }

  // 6. 単位取得可能性ステータス (CreditStatus) の厳密判定
  let creditStatus: CreditStatus = 'achievable';
  let creditStatusLabel = '単位取得可能';
  let creditStatusDescription = '残りの課題や試験を着実にこなせば単位取得可能です。';

  const isPassingSecured = currentEarnedScore >= passingScore && disqualificationReasons.length === 0;
  const isImpossibleToPass = maxPossibleScore < passingScore || (finalExamMinScoreRule !== null && finalExamMinScoreRule > 100);

  if (isAmbiguous) {
    creditStatus = 'ambiguous';
    creditStatusLabel = '評価基準が曖昧';
    creditStatusDescription = 'この講義は評価基準が曖昧なため、正確な成績予測ができません。講義設定で配分割合等を正しく設定してください。';
  } else if (disqualificationReasons.length > 0) {
    creditStatus = 'disqualified';
    creditStatusLabel = '失格条件に抵触（単位不可）';
    creditStatusDescription = disqualificationReasons.join(' ');
  } else if (isImpossibleToPass) {
    creditStatus = 'impossible';
    creditStatusLabel = '単位取得不可';
    creditStatusDescription = '今後の評価項目を満点（100点）で完了しても合格基準（60点）に届かないため、単位取得が極めて困難です。';
  } else if (isPassingSecured) {
    creditStatus = 'secured';
    creditStatusLabel = '単位取得確定（安全圏）';
    creditStatusDescription = `確定得点（${currentEarnedScore}点）が合格基準(${passingScore}点)を超えており、現時点で単位取得が確定しています。`;
  } else if (requiredScoreOnRemaining >= 75 || remainingAllowedAbsences === 0 || (finalExamRequiredScore !== null && finalExamRequiredScore >= 75)) {
    creditStatus = 'at_risk';
    creditStatusLabel = '現在は危険（挽回可能）';
    creditStatusDescription = `単位取得には残りの評価で高得点(${requiredScoreOnRemaining}%以上)が必要です。まだ十分挽回可能ですので早期に対策を開始しましょう。`;
  } else {
    creditStatus = 'achievable';
    creditStatusLabel = '単位取得可能';
    creditStatusDescription = `合格ラインまであと${scoreNeeded.toFixed(1)}点です。残りの課題や試験を通常通りこなせば単位確保可能です。`;
  }

  // 7. 4段階危険度判定 (DangerLevel)
  let dangerLevel: DangerLevel = 'safe';
  let dangerLabel = '安全';
  let dangerReason = creditStatusDescription;

  if (creditStatus === 'disqualified' || creditStatus === 'impossible') {
    dangerLevel = 'critical';
    dangerLabel = '非常に危険';
  } else if (creditStatus === 'at_risk' || remainingAllowedAbsences <= 0) {
    dangerLevel = 'danger';
    dangerLabel = '危険';
  } else if (creditStatus === 'ambiguous') {
    dangerLevel = 'caution';
    dangerLabel = '注意';
  } else if (scoreNeeded > 0) {
    dangerLevel = requiredScoreOnRemaining >= 50 ? 'caution' : 'safe';
    dangerLabel = requiredScoreOnRemaining >= 50 ? '注意' : '安全';
  } else {
    dangerLevel = 'safe';
    dangerLabel = '安全';
  }

  // 8. 次にやるべきこと (Next Action) の生成
  let nextAction = '平常通りの講義出席と復習を行いましょう。';
  if (isAmbiguous) {
    nextAction = '講義の評価割合（合計100%）をルールビルダーで設定してください。';
  } else if (creditStatus === 'disqualified') {
    nextAction = '失格条件に該当しています。担当教員に救済措置の有無を至急確認してください。';
  } else if (creditStatus === 'impossible') {
    nextAction = '追加課題の提出や救済措置がないか担当教員に相談してください。';
  } else if (remainingAllowedAbsences <= 0) {
    nextAction = '今後の講義は絶対に無遅刻・無欠席で出席してください（次で失格となります）。';
  } else if (finalExamItem && !finalExamItem.isGraded) {
    const targetScore = finalExamRequiredScore !== null ? `${finalExamRequiredScore}点以上` : `${requiredScoreOnRemaining}%以上`;
    const cutoffNote = finalExamMinScoreRule ? `（足切り${finalExamMinScoreRule}点以上必須）` : '';
    nextAction = `期末試験で${targetScore}${cutoffNote}の獲得を目指して試験対策を進めましょう。`;
  } else if (!isPassingSecured) {
    nextAction = `残りの課題・小テストを漏れなく提出し、${scoreNeeded.toFixed(1)}点以上の上積みを目指しましょう。`;
  } else {
    nextAction = '単位取得確定済みです。他科目の課題を優先するか、さらなる高評価（A/S）を目指しましょう。';
  }

  return {
    currentEarnedScore,
    gradedWeightSum,
    remainingWeightSum,
    finalExamItem,
    finalExamRequiredScore,
    finalExamMinScoreRule,
    requiredScoreOnRemaining,
    creditStatus,
    creditStatusLabel,
    creditStatusDescription,
    disqualificationReasons,
    ruleResults,
    isAmbiguous,
    ambiguityReason,
    isPassingSecured,
    isImpossibleToPass,
    dangerLevel,
    dangerLabel,
    dangerReason,
    attendanceRate,
    remainingAllowedAbsences,
    isAttendanceFailed,
    nextAction,
  };
}
