import { Course, GradeSimulationParams, GradeSimulationResult } from '../types';

/**
 * 成績・出席状況のシミュレーションエンジン
 * 足切り点や欠席上限などの特殊ルールもリアルタイムに反映して判定します。
 */
export function simulateCourseGrade(
  course: Course,
  params: GradeSimulationParams
): GradeSimulationResult {
  const { simulatedScores, additionalAbsences, additionalLates } = params;
  const attendance = course.attendance;
  const rules = course.rules || [];

  // 1. 出席シミュレーション
  const simulatedAbsent = attendance.absentCount + (additionalAbsences || 0);
  const simulatedLate = attendance.lateCount + (additionalLates || 0);
  const lateRatio = attendance.latePenaltyRatio || 3;
  const effectiveAbsences = simulatedAbsent + Math.floor(simulatedLate / lateRatio);

  // 欠席上限ルール
  const maxAbsenceRule = rules.find(r => r.type === 'max_absences');
  let isAttendanceOk = true;
  let attendanceFailReason = '';

  if (maxAbsenceRule && maxAbsenceRule.params.maxAbsences !== undefined) {
    if (effectiveAbsences >= maxAbsenceRule.params.maxAbsences) {
      isAttendanceOk = false;
      attendanceFailReason = `欠席換算が${effectiveAbsences}回となり、欠席上限ルール（${maxAbsenceRule.params.maxAbsences}回以上で失格）に抵触しています。`;
    }
  } else {
    const minRequiredAttendances = Math.ceil(attendance.totalClasses * attendance.minAttendanceRate);
    const maxAllowedAbsences = attendance.totalClasses - minRequiredAttendances;
    if (effectiveAbsences > maxAllowedAbsences) {
      isAttendanceOk = false;
      attendanceFailReason = `欠席換算が${effectiveAbsences}回（許容上限${maxAllowedAbsences}回）となり、出席要件不足です。`;
    }
  }

  const attendanceRate = attendance.totalClasses > 0
    ? Math.max(0, Math.min(100, Math.round(((attendance.totalClasses - effectiveAbsences) / attendance.totalClasses) * 100)))
    : 100;

  // 2. 得点シミュレーション
  let finalScore = 0;
  let isDisqualified = false;
  let disqualificationReason = '';

  const finalExamItem = course.evaluations.find(e => e.type === 'final');
  const minScoreRules = rules.filter(r => r.type === 'min_score');

  for (const item of course.evaluations) {
    let scoreToUse = 0;

    if (item.type === 'attendance') {
      scoreToUse = attendanceRate;
    } else if (simulatedScores[item.id] !== undefined) {
      scoreToUse = simulatedScores[item.id];
    } else if (item.isGraded && item.score !== null) {
      scoreToUse = item.score;
    } else {
      scoreToUse = 0;
    }

    // 足切り点判定 (min_score)
    for (const msRule of minScoreRules) {
      const isTarget = (finalExamItem && item.id === finalExamItem.id && msRule.name.includes('期末')) ||
                       msRule.targetItemId === item.id;
      if (isTarget && msRule.params.minScore !== undefined && msRule.params.isDisqualification) {
        if (scoreToUse < msRule.params.minScore) {
          isDisqualified = true;
          disqualificationReason = `${item.name}が${scoreToUse}点のため、足切り条件（${msRule.params.minScore}点以上）を満たせず単位不可（F）となります。`;
        }
      }
    }

    finalScore += (scoreToUse / 100) * item.weight;
  }

  finalScore = Math.round(finalScore * 10) / 10;

  // 3. 成績評価（S, A, B, C, F）
  const passingScore = course.passingScore || 60;
  let gradeRank: 'S' | 'A' | 'B' | 'C' | 'F' = 'F';
  let isPassed = false;

  if (!isAttendanceOk || isDisqualified) {
    gradeRank = 'F';
    isPassed = false;
  } else if (finalScore >= 90) {
    gradeRank = 'S';
    isPassed = true;
  } else if (finalScore >= 80) {
    gradeRank = 'A';
    isPassed = true;
  } else if (finalScore >= 70) {
    gradeRank = 'B';
    isPassed = true;
  } else if (finalScore >= passingScore) {
    gradeRank = 'C';
    isPassed = true;
  } else {
    gradeRank = 'F';
    isPassed = false;
  }

  // 4. シミュレーション結果メッセージ
  let message = '';
  if (!isAttendanceOk) {
    message = `【出席不足警告】${attendanceFailReason}テスト得点に関わらず単位取得不可（F）になります。`;
  } else if (isDisqualified) {
    message = `【足切り失格警告】総合点は${finalScore}点ですが、${disqualificationReason}`;
  } else if (isPassed) {
    message = `総合得点${finalScore}点で「${gradeRank}評価」にて単位取得見込みです！`;
    if (gradeRank === 'S' || gradeRank === 'A') {
      message += ' 非常に優秀な成績です。このペースを維持しましょう。';
    } else {
      message += ` 合格ライン(${passingScore}点)をクリアできています。`;
    }
  } else {
    const diff = Math.round((passingScore - finalScore) * 10) / 10;
    message = `総合得点${finalScore}点で単位取得ライン(${passingScore}点)まであと${diff}点不足しています。期末試験や課題の目標点を引き上げる必要があります。`;
  }

  return {
    finalScore,
    gradeRank,
    isPassed,
    attendanceRate,
    isAttendanceOk,
    isDisqualified,
    disqualificationReason,
    message,
  };
}
