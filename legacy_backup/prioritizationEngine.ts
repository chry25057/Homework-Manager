import { Task, Course, PrioritizedTask, PriorityCategory, CourseCalculations } from '../types';
import { calculateCourseStatus } from './courseCalculator';

/**
 * AI説明生成への拡張を見据えたインターフェース
 */
export interface PriorityExplanationProvider {
  generateExplanation(
    task: Task,
    course: Course,
    calc: CourseCalculations,
    score: number,
    hoursUntilDue: number,
    category: PriorityCategory
  ): { mainReason: string; reasons: string[] };
}

/**
 * ルールベースによる説明文生成（MVP実装）
 */
export class RuleBasedExplanationProvider implements PriorityExplanationProvider {
  generateExplanation(
    task: Task,
    course: Course,
    calc: CourseCalculations,
    score: number,
    hoursUntilDue: number,
    category: PriorityCategory
  ): { mainReason: string; reasons: string[] } {
    const reasons: string[] = [];
    let mainReason = '';

    const isUrgent = hoursUntilDue <= 24;
    const isVeryUrgent = hoursUntilDue <= 12;
    const daysUntilDue = Math.ceil(hoursUntilDue / 24);

    // 1. 「今はやらなくていいこと」の場合
    if (category === 'deferrable') {
      if (calc.isPassingSecured) {
        mainReason = '現在の成績だけで単位取得ラインを確保しているため、現時点では優先度が低いです。';
        reasons.push(`確定得点が${calc.currentEarnedScore}点ですでに合格基準(${course.passingScore}点)をクリアしています。`);
        reasons.push('緊急度の高い他科目の課題を優先してください。');
      } else if (daysUntilDue > 10) {
        mainReason = `締切までまだ${daysUntilDue}日あり、講義の単位状況も安全なため、直前の着手で十分間に合います。`;
        reasons.push('直近に締切を迎える他タスクの完了後に着手することをおすすめします。');
      } else if (task.impact === 'low') {
        mainReason = '成績への影響度が低いため、主要科目の対策を優先しましょう。';
        reasons.push('配点や影響度が小さく、現時点での工数対効果が低めです。');
      } else {
        mainReason = '現在は他科目の緊急課題を優先すべきタイミングです。';
      }
      return { mainReason, reasons };
    }

    // 2. 「今やるべきこと / 順次やるべきこと」の場合
    if (isVeryUrgent) {
      if (hoursUntilDue < 0) {
        mainReason = '締切を過ぎています！減点を最小限にするため至急提出してください。';
      } else {
        mainReason = task.impact === 'high'
          ? '今日締切で、成績への影響が大きいため最優先です。'
          : `締切まであと${Math.max(1, Math.round(hoursUntilDue))}時間です。今日中に完了させましょう。`;
      }
    } else if (isUrgent) {
      mainReason = '明日までに提出が必要です。早めに終わらせて余裕を持ちましょう。';
    } else if (calc.dangerLevel === 'critical' || calc.dangerLevel === 'danger') {
      if (calc.finalExamRequiredScore && calc.finalExamRequiredScore >= 70) {
        mainReason = `単位取得に${calc.finalExamRequiredScore}点必要で、試験難易度も高いため早めの対策が必要です。`;
      } else if (calc.remainingAllowedAbsences <= 0) {
        mainReason = '出席ペナルティの危険がある講義です。課題で確実に評価点を稼ぎましょう。';
      } else {
        mainReason = `単位危険度が「${calc.dangerLabel}」の講義です。このタスクで確実な得点獲得が必要です。`;
      }
    } else if (course.testDifficulty === 'hard' || course.testDifficulty === 'very_hard') {
      mainReason = `難易度が高い科目のため、試験直前の詰め込みを避けて早めの準備が推奨されます。`;
    } else if (task.estimatedMinutes >= 120) {
      mainReason = `所要時間（約${task.estimatedMinutes}分）が長いタスクです。分割して今日から着手しましょう。`;
    } else {
      mainReason = `順調に単位を確保するため、計画的に進めておきましょう。`;
    }

    // 詳細理由リストの組み立て
    if (hoursUntilDue <= 24) {
      reasons.push(`締切まで残り${Math.max(0, Math.round(hoursUntilDue))}時間`);
    } else {
      reasons.push(`締切まであと${daysUntilDue}日`);
    }

    if (calc.dangerLevel === 'critical' || calc.dangerLevel === 'danger') {
      reasons.push(`単位危険度: ${calc.dangerLabel}（${calc.dangerReason}）`);
    }

    if (calc.finalExamMinScoreRule && (task.type === 'final_prep' || task.title.includes('期末'))) {
      reasons.push(`期末試験足切り条件あり（${calc.finalExamMinScoreRule}点未満で即失格）`);
    }

    if (calc.finalExamRequiredScore && calc.finalExamRequiredScore > 0) {
      reasons.push(`単位取得に必要な得点: ${calc.finalExamRequiredScore}点以上`);
    }

    if (task.impact === 'high') {
      reasons.push('成績への影響度: 大（評価割合が大きい）');
    }

    if (task.difficulty === 'hard' || task.difficulty === 'very_hard') {
      reasons.push('難易度: 高');
    }

    if (task.estimatedMinutes) {
      reasons.push(`推定所要時間: ${task.estimatedMinutes}分`);
    }

    return { mainReason, reasons };
  }
}

/**
 * デフォルトの説明生成インスタンス
 */
let currentExplanationProvider: PriorityExplanationProvider = new RuleBasedExplanationProvider();

/**
 * 将来AIプロバイダー（Gemini API等）に切り替えるためのフック
 */
export function setExplanationProvider(provider: PriorityExplanationProvider) {
  currentExplanationProvider = provider;
}

/**
 * 登録されたタスクと講義情報から優先順位を計算するエンジン
 */
export function calculatePriorities(
  tasks: Task[],
  courses: Course[],
  now: Date = new Date()
): {
  doNowTasks: PrioritizedTask[];
  shouldDoTasks: PrioritizedTask[];
  deferrableTasks: PrioritizedTask[];
  allPrioritized: PrioritizedTask[];
} {
  const courseMap = new Map<string, Course>();
  const courseCalcMap = new Map<string, CourseCalculations>();

  courses.forEach(course => {
    courseMap.set(course.id, course);
    courseCalcMap.set(course.id, calculateCourseStatus(course));
  });

  const prioritizedList: PrioritizedTask[] = [];

  for (const task of tasks) {
    if (task.isCompleted) {
      continue; // 完了済みタスクは計算から除外
    }

    const course = courseMap.get(task.courseId);
    if (!course) continue;

    const calc = courseCalcMap.get(course.id)!;

    // 締切までの時間（時間単位）
    const dueDate = new Date(task.dueDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const hoursUntilDue = diffMs / (1000 * 60 * 60);

    // 優先度スコアの計算 (100点ベース)
    let score = 0;

    // 1. 締切緊急度 (0〜35点)
    if (hoursUntilDue < 0) {
      // 期限超過
      score += 35;
    } else if (hoursUntilDue <= 12) {
      score += 35;
    } else if (hoursUntilDue <= 24) {
      score += 30;
    } else if (hoursUntilDue <= 48) {
      score += 24;
    } else if (hoursUntilDue <= 72) {
      score += 18;
    } else if (hoursUntilDue <= 168) { // 1週間以内
      score += 12;
    } else if (hoursUntilDue <= 336) { // 2週間以内
      score += 6;
    } else {
      score += 2;
    }

    // 2. 単位危険度 (0〜25点)
    switch (calc.dangerLevel) {
      case 'critical':
        score += 25;
        break;
      case 'danger':
        score += 18;
        break;
      case 'caution':
        score += 10;
        break;
      case 'safe':
        score += 2;
        break;
    }

    // 3. 成績への影響度 (0〜20点)
    if (task.impact === 'high') {
      score += 20;
    } else if (task.impact === 'medium') {
      score += 12;
    } else {
      score += 4;
    }

    // 4. 必要得点と難易度 (0〜15点)
    if (calc.requiredScoreOnRemaining >= 75) {
      score += 10;
    } else if (calc.requiredScoreOnRemaining >= 60) {
      score += 6;
    }

    const diffWeight: Record<string, number> = {
      easy: 1,
      normal: 3,
      hard: 5,
      very_hard: 7,
    };
    score += diffWeight[task.difficulty] || 3;

    // 5. 所要時間と進捗補正
    // 進捗が進んでいれば残りは少しで終わるため「今すぐ片付けやすい」
    // 進捗0%で所要時間が長いタスクは早めに始めないとパンクする
    if (task.progress > 0 && task.progress < 100) {
      score += 4; // 少し手を付けているものは完了ブースト
    }
    if (task.estimatedMinutes >= 90 && hoursUntilDue <= 72) {
      score += 5; // 重いタスクで期限が迫っている場合は加点
    }

    // 6. 出席ピンチ補正
    if (calc.remainingAllowedAbsences <= 0) {
      score += 6;
    }

    // 7. 減点要素（単位確保済みで期限も余裕がある場合）
    if (calc.isPassingSecured && hoursUntilDue > 48) {
      score -= 20;
    }

    // スコア範囲を 1〜100 に収める
    const priorityScore = Math.max(1, Math.min(100, Math.round(score)));

    // カテゴリ判定
    // 'do_now' (今やるべきこと: 70以上 または 24時間以内)
    // 'should_do' (順次やるべきこと: 45〜69)
    // 'deferrable' (今はやらなくていいこと: 45未満、または単位確保済みかつ余裕あり)
    let category: PriorityCategory = 'should_do';

    const isDeferrableCondition =
      (calc.isPassingSecured && hoursUntilDue > 48 && task.impact !== 'high') ||
      (hoursUntilDue > 240 && calc.dangerLevel === 'safe') ||
      priorityScore < 40;

    if (isDeferrableCondition) {
      category = 'deferrable';
    } else if (priorityScore >= 70 || hoursUntilDue <= 24) {
      category = 'do_now';
    } else {
      category = 'should_do';
    }

    // 説明文の生成
    const explanation = currentExplanationProvider.generateExplanation(
      task,
      course,
      calc,
      priorityScore,
      hoursUntilDue,
      category
    );

    prioritizedList.push({
      task,
      course,
      courseCalculations: calc,
      priorityScore,
      rank: 0, // ソート後に設定
      category,
      reasons: explanation.reasons,
      mainReason: explanation.mainReason,
      hoursUntilDue,
    });
  }

  // 優先度スコア降順でソート
  prioritizedList.sort((a, b) => b.priorityScore - a.priorityScore);

  // ランクを付与 (1位, 2位, ...)
  prioritizedList.forEach((item, index) => {
    item.rank = index + 1;
  });

  const doNowTasks = prioritizedList.filter(t => t.category === 'do_now');
  const shouldDoTasks = prioritizedList.filter(t => t.category === 'should_do');
  const deferrableTasks = prioritizedList.filter(t => t.category === 'deferrable');

  return {
    doNowTasks,
    shouldDoTasks,
    deferrableTasks,
    allPrioritized: prioritizedList,
  };
}
