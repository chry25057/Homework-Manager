import { 
  AcademicTask, 
  Assignment, 
  Exam, 
  PrioritizedItem, 
  PriorityCategory 
} from '../types';

/**
 * 提出課題とテスト勉強を横断的に比較し、優先度スコア・カテゴリ・理由・次の行動を決定論的に計算する
 */
export function calculateAcademicPriorities(
  tasks: AcademicTask[],
  now: Date = new Date()
): {
  doNowItems: PrioritizedItem[];
  deferrableItems: PrioritizedItem[];
  notNeededNowItems: PrioritizedItem[];
  needsAttentionItems: PrioritizedItem[];
  allPrioritized: PrioritizedItem[];
} {
  const resultList: PrioritizedItem[] = [];

  for (const task of tasks) {
    // 完了・提出済みタスクはランキングから除外
    if (task.itemType === 'assignment' && task.progress === 'submitted') {
      continue;
    }
    if (task.itemType === 'exam' && task.isCompleted) {
      continue;
    }

    // 締切または試験日
    const targetDateStr = task.itemType === 'assignment' ? task.dueDate : task.examDate;
    const targetDate = new Date(targetDateStr);
    const diffMs = targetDate.getTime() - now.getTime();
    const hoursUntilDue = diffMs / (1000 * 60 * 60);
    const daysUntilDue = Math.ceil(hoursUntilDue / 24);

    let baseScore = 0;
    const reasons: string[] = [];
    let mainReason = '';
    let nextAction = '';
    const uncertaintyList: string[] = [];
    let isQuickWin = false;
    let isHighLossRisk = false;

    // --- 課題 (Assignment) の計算 ---
    if (task.itemType === 'assignment') {
      const assignment = task as Assignment;
      
      // 1. 期限切れ判定
      const isPastDue = hoursUntilDue < 0;
      const hasNoLate = assignment.penalties?.includes('no_late_submission') || assignment.penalty === 'no_late_submission';
      if (isPastDue) {
        if (hasNoLate) {
          // 期限後は提出不可
          resultList.push({
            task,
            rank: 0,
            priorityScore: 0,
            category: 'needs_attention',
            categoryLabel: '対応が必要（期限切れ）',
            hoursUntilDue,
            daysUntilDue,
            reason: `提出期限を過ぎており、期限後提出不可のルールが設定されています。`,
            nextAction: `担当教員に事情を説明し、救済や遅延提出の可否を至急確認してください。`,
            uncertaintyNotes: undefined,
            isQuickWin: false,
            isHighLossRisk: true,
          });
          continue;
        } else {
          // 通常減点や不明の場合は遅れても提出すべき（超高優先）
          baseScore += 55;
          reasons.push('提出期限を過ぎています（速やかな提出で減点を最小限に抑制）');
        }
      } else if (hoursUntilDue <= 16) {
        // 今日の夜など当日締切の課題は最優先（テストが極端に危険な場合を除きトップ）
        baseScore += 52;
        reasons.push('本日中に提出期限を迎えます');
      } else if (hoursUntilDue <= 24) {
        baseScore += 40;
        reasons.push('明日までに提出が必要です');
      } else if (hoursUntilDue <= 48) {
        baseScore += 28;
        reasons.push('2日以内に締切が迫っています');
      } else if (hoursUntilDue <= 96) {
        baseScore += 18;
      } else if (hoursUntilDue <= 168) {
        baseScore += 12;
      } else {
        baseScore += 4;
      }

      // 2. 成績への影響度
      let impactScore = 15; // デフォルト（未設定時は中立）
      if (assignment.weightPercent !== undefined) {
        if (assignment.weightPercent >= 30) impactScore = 25;
        else if (assignment.weightPercent >= 15) impactScore = 18;
        else impactScore = 10;
        reasons.push(`評価割合が${assignment.weightPercent}%と設定されています`);
      } else if (assignment.impact) {
        if (assignment.impact === 'high') { impactScore = 24; reasons.push('成績への影響度が「大」です'); }
        else if (assignment.impact === 'medium') { impactScore = 15; }
        else { impactScore = 8; }
      } else {
        uncertaintyList.push('配点・影響度が未入力のため、標準値（中）として暫定計算');
      }
      baseScore += impactScore;

      // 3. 未提出ペナルティ（損失リスク：複数選択対応）
      const penaltyList: string[] = [];
      if (assignment.penalties && Array.isArray(assignment.penalties)) {
        penaltyList.push(...assignment.penalties);
      } else if (assignment.penalty) {
        penaltyList.push(assignment.penalty);
      }

      if (penaltyList.includes('fail_course')) {
        baseScore += 25;
        isHighLossRisk = true;
        reasons.push('未提出の場合に単位取得不可となる重大な課題です');
      }
      if (penaltyList.includes('lose_attendance')) {
        baseScore += 20;
        isHighLossRisk = true;
        reasons.push('未提出の場合に出席扱いが取り消されるため要注意です');
      }
      if (penaltyList.includes('no_late_submission')) {
        baseScore += 15;
        isHighLossRisk = true;
        reasons.push('期限後の提出が認められないため遅延が許されません');
      }
      if (penaltyList.length === 0 || (penaltyList.length === 1 && penaltyList[0] === 'unknown')) {
        uncertaintyList.push('未提出時のペナルティが未設定です');
      }

      // 4. 所要時間と難易度（Quick Win 判定、所要時間未設定時は30分と仮定）
      const mins = assignment.estimatedMinutes ?? 30;
      if (assignment.estimatedMinutes === undefined) {
        uncertaintyList.push('推定所要時間が未設定（30分と仮定）');
      }

      if (mins <= 60 && hoursUntilDue <= 72 && (impactScore >= 15 || penaltyList.includes('fail_course') || penaltyList.includes('lose_attendance'))) {
        baseScore += 10; // 短時間で完了し大きな失点を防げるボーナス
        isQuickWin = true;
        reasons.push(`所要時間約${mins}分と短時間で完了し、失点を確実に防げます`);
      } else if (mins >= 120 && hoursUntilDue <= 96) {
        baseScore += 8; // 重い課題で期限が近い場合は前倒し
        reasons.push(`所要時間約${mins}分と作業量が多いため早期着手が必要です`);
      }

      if (assignment.difficulty === 'hard' || assignment.difficulty === 'very_hard') {
        baseScore += 6;
      }

      // 5. 進捗状況
      if (assignment.progress === 'in_progress') {
        baseScore += 5; // すでに着手しているものは早く終わらせる
      }

      // 行動と理由の組み立て
      if (penaltyList.includes('fail_course')) {
        mainReason = '未提出の場合に単位取得不可となるため、最優先で提出を完了させる必要があります。';
        nextAction = '課題の要件と提出形式を確認し、直ちに作業を完了させて提出してください。';
      } else if (penaltyList.includes('lose_attendance')) {
        mainReason = '未提出の場合に出席扱いが取り消されるため、確実に提出を完了させて出席を確保しましょう。';
        nextAction = '課題を速やかに完了させ、出席取り消し（欠席扱い）を回避してください。';
      } else if (hoursUntilDue <= 24) {
        mainReason = isQuickWin
          ? '締切が迫っていますが短時間で完了できるため、今すぐ片付けて失点を防ぎましょう。'
          : '締切が明日までのため、最優先で着手して提出を確実にしてください。';
        nextAction = assignment.progress === 'in_progress'
          ? '現在進行中の課題を一気に仕上げて提出を完了してください。'
          : '課題の出題内容と要件をまず確認し、作業に取り掛かってください。';
      } else if (isQuickWin) {
        mainReason = '所要時間が短く確実に提出できるため、早めに終わらせて他のタスクに集中するのが効果的です。';
        nextAction = `約${mins}分の作業時間を確保し、一気に終わらせて提出してください。`;
      } else if (hoursUntilDue > 168 && impactScore <= 10) {
        mainReason = '締切まで1週間以上あり配点も比較的小さいため、現時点での優先度は低めです。';
        nextAction = '直近に締切を迎える重要タスクの完了後に着手してください。';
      } else {
        mainReason = `締切（あと${daysUntilDue}日）に向けて計画的に進めておきましょう。`;
        nextAction = '作業内容を整理し、必要な資料や環境を準備してください。';
      }
    }

    // --- テスト勉強 (Exam) の計算 ---
    if (task.itemType === 'exam') {
      const exam = task as Exam;

      // 1. 試験日までの時間
      if (hoursUntilDue < 0) {
        // 試験終了
        resultList.push({
          task,
          rank: 0,
          priorityScore: 0,
          category: 'needs_attention',
          categoryLabel: '対応が必要（試験日経過）',
          hoursUntilDue,
          daysUntilDue,
          reason: '試験日時を過ぎています。',
          nextAction: '試験が終了している場合は完了にして一覧を整理してください。',
          uncertaintyNotes: undefined,
          isQuickWin: false,
          isHighLossRisk: false,
        });
        continue;
      } else if (hoursUntilDue <= 24) {
        baseScore += 38;
        reasons.push('明日が試験本番です');
      } else if (hoursUntilDue <= 72) {
        baseScore += 30;
        reasons.push('試験まで3日以内です');
      } else if (hoursUntilDue <= 168) {
        baseScore += 20;
        reasons.push('試験まで1週間以内です');
      } else if (hoursUntilDue <= 336) {
        baseScore += 10;
      } else {
        baseScore += 4;
      }

      // 2. 理解度と目標点数のギャップ
      const under = exam.understanding; // 0〜100
      let gapScore = 0;
      if (under <= 30) {
        gapScore = 26;
        reasons.push(`現在の理解度が${under}%と低く、重点的な勉強が必要です`);
      } else if (under <= 55) {
        gapScore = 18;
        reasons.push(`現在の理解度が${under}%であり、合格ラインへの底上げが必要です`);
      } else if (under <= 75) {
        gapScore = 10;
      } else {
        gapScore = 2; // 理解度が十分高い
      }
      baseScore += gapScore;

      // 3. 単位取得必要点数や足切りライン
      if (exam.passingRequiredScore !== undefined) {
        const expected = exam.currentExpectedScore ?? (under * 0.8);
        if (expected < exam.passingRequiredScore) {
          baseScore += 18;
          isHighLossRisk = true;
          reasons.push(`単位取得に必要な点数（${exam.passingRequiredScore}点）に対して現在の予想得点が不足しています`);
        }
      }

      // 4. 必要勉強時間
      const studyMins = exam.estimatedStudyMinutes;
      if (studyMins !== undefined) {
        const studyHours = Math.round((studyMins / 60) * 10) / 10;
        if (studyMins >= 240 && hoursUntilDue <= 168) {
          baseScore += 12; // 勉強時間が大量に必要で1週間以内
          reasons.push(`目標到達に約${studyHours}時間の勉強量が必要なため、早めの着手が不可欠です`);
        } else if (studyMins <= 90 && hoursUntilDue <= 72) {
          baseScore += 6;
        }
      } else {
        uncertaintyList.push('目標到達に必要な勉強時間が未設定です');
      }

      // 5. 難易度・影響度
      if (exam.impact === 'high' || (exam.weightPercent && exam.weightPercent >= 35)) {
        baseScore += 12;
        reasons.push('成績への影響度が大きい試験です');
      }
      if (exam.difficulty === 'hard' || exam.difficulty === 'very_hard') {
        baseScore += 6;
      }

      // 理解度が高く、試験まで十分遠い場合の大幅減点
      if (under >= 80 && hoursUntilDue > 168) {
        baseScore -= 18;
      }

      // 行動と理由の組み立て
      if (hoursUntilDue <= 24) {
        mainReason = '明日が試験本番です。最終確認と重要ポイントの整理に集中してください。';
        nextAction = '過去問や重要公式・キーワードを最終確認し、早めに休息を取って本番に備えてください。';
      } else if (hoursUntilDue <= 168 && under <= 50) {
        mainReason = `試験まであと${daysUntilDue}日ですが理解度が${under}%と低いため、集中的な対策が必要です。`;
        nextAction = '苦手分野・出題頻度の高い範囲を確認し、最初の60分で重点項目を復習してください。';
      } else if (isHighLossRisk) {
        mainReason = '単位取得に必要な点数への到達が危ぶまれるため、早めの対策が不可欠です。';
        nextAction = '合格基準に届くための必須単元を特定し、基礎問題の演習から始めてください。';
      } else if (under >= 80 && hoursUntilDue > 168) {
        mainReason = '理解度が高く試験日にも余裕があるため、現時点では他タスクを優先して構いません。';
        nextAction = '直前（試験1週間前など）に再復習するスケジュールを立てておきましょう。';
      } else {
        mainReason = `試験（あと${daysUntilDue}日）に向けて着実に理解を深めておきましょう。`;
        nextAction = '試験範囲全体を見渡し、章ごとの練習問題を解き進めてください。';
      }
    }

    // スコア範囲の丸め (1〜100)
    const priorityScore = Math.max(1, Math.min(100, Math.round(baseScore)));

    // カテゴリ判定
    // 'do_now': 最優先 (スコア68以上、または24時間以内、または未提出単位不可)
    // 'deferrable': 後回しでよい (締切まで余裕があり、より優先すべきタスクがある: スコア40〜67)
    // 'not_needed_now': 今はやらなくてよい (理解度が高く時間がある、または配点が小さく締切が2週間以上先: スコア40未満)
    // 'needs_attention': 期限切れ等
    let category: PriorityCategory = 'deferrable';
    let categoryLabel = '後回しでよい';

    const isHighPenalty = task.itemType === 'assignment' && (
      (task as Assignment).penalties?.includes('fail_course') ||
      (task as Assignment).penalty === 'fail_course' ||
      (task as Assignment).penalties?.includes('lose_attendance')
    );

    if (hoursUntilDue < 0) {
      category = 'needs_attention';
      categoryLabel = '対応が必要';
    } else if (priorityScore >= 68 || hoursUntilDue <= 24 || isHighPenalty) {
      category = 'do_now';
      categoryLabel = '今やるべきこと';
    } else if (priorityScore < 40 || (task.itemType === 'exam' && task.understanding >= 80 && hoursUntilDue > 240)) {
      category = 'not_needed_now';
      categoryLabel = '今はやらなくてよい';
      if (task.itemType === 'assignment') {
        mainReason = '成績への影響が小さく締切にも余裕があるため、現時点では着手する必要性が低いです。';
      } else {
        mainReason = '現在の理解度が十分高く試験日にも余裕があるため、現時点で取り組む必要はありません。';
      }
    } else {
      category = 'deferrable';
      categoryLabel = '後回しでよい';
      if (!mainReason.includes('後回し')) {
        mainReason = `締切・試験まであと${daysUntilDue}日あり、より優先度の高いタスクがあるため後回しで十分間に合います。`;
      }
    }

    resultList.push({
      task,
      rank: 0, // 後でソートして設定
      priorityScore,
      category,
      categoryLabel,
      hoursUntilDue,
      daysUntilDue,
      reason: mainReason,
      nextAction,
      uncertaintyNotes: uncertaintyList.length > 0 ? uncertaintyList.join('、') : undefined,
      isQuickWin,
      isHighLossRisk,
    });
  }

  // 優先度スコア降順にソート（期限切れ対応が必要なものは末尾または専用枠）
  resultList.sort((a, b) => {
    if (a.category === 'needs_attention' && b.category !== 'needs_attention') return 1;
    if (b.category === 'needs_attention' && a.category !== 'needs_attention') return -1;
    return b.priorityScore - a.priorityScore;
  });

  // ランキング順位 (1位, 2位, ...)
  resultList.forEach((item, index) => {
    item.rank = index + 1;
  });

  const doNowItems = resultList.filter(item => item.category === 'do_now');
  const deferrableItems = resultList.filter(item => item.category === 'deferrable');
  const notNeededNowItems = resultList.filter(item => item.category === 'not_needed_now');
  const needsAttentionItems = resultList.filter(item => item.category === 'needs_attention');

  return {
    doNowItems,
    deferrableItems,
    notNeededNowItems,
    needsAttentionItems,
    allPrioritized: resultList,
  };
}
