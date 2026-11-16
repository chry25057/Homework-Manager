import { PrioritizedItem, TimeStudyPlan } from '../types';

/**
 * 今日使える勉強時間（分）に対して、優先順位と効果的な組み合わせを考慮した学習計画を自動生成する
 */
export function generateStudyPlan(
  prioritizedItems: PrioritizedItem[],
  availableMinutes: number
): TimeStudyPlan {
  if (availableMinutes <= 0 || prioritizedItems.length === 0) {
    return {
      availableMinutes,
      selectedItems: [],
      totalAllocatedMinutes: 0,
      utilizationRate: 0,
      unassignedItemsCount: 0,
    };
  }

  // 対象: 'do_now' または 'deferrable' の未完了タスク
  const candidates = prioritizedItems.filter(
    item => item.category === 'do_now' || item.category === 'deferrable'
  );

  let remainingBudget = availableMinutes;
  const selected: TimeStudyPlan['selectedItems'] = [];
  let missingTimeCount = 0;

  // 1. まず「短時間で完了し大きな失点を防げる重要課題 (Quick Win)」を優先的に拾う
  const quickWins = candidates.filter(
    item => item.isQuickWin && item.task.itemType === 'assignment'
  );

  for (const item of quickWins) {
    if (item.task.itemType !== 'assignment') continue;
    const mins = item.task.estimatedMinutes ?? 30;
    if (mins <= remainingBudget) {
      selected.push({
        task: item.task,
        order: selected.length + 1,
        allocatedMinutes: mins,
        reason: `【短時間完了＆失点防止】所要時間約${mins}分で確実に提出を完了させ、大きな失点を回避できます。`,
        nextAction: item.nextAction,
      });
      remainingBudget -= mins;
    }
  }

  // 2. 残りの優先度上位タスクを時間枠内に賢く詰め込む
  for (const item of candidates) {
    if (remainingBudget <= 0) break;
    // 既に選ばれているものはスキップ
    if (selected.some(s => s.task.id === item.task.id)) continue;

    if (item.task.itemType === 'assignment') {
      const needed = item.task.estimatedMinutes ?? 30;
      if (needed <= remainingBudget) {
        selected.push({
          task: item.task,
          order: selected.length + 1,
          allocatedMinutes: needed,
          reason: `【優先度${item.priorityScore}点】${item.reason}`,
          nextAction: item.nextAction,
        });
        remainingBudget -= needed;
      } else if (remainingBudget >= 30) {
        // 全部は無理だが一部着手（30分以上ある場合）
        selected.push({
          task: item.task,
          order: selected.length + 1,
          allocatedMinutes: remainingBudget,
          reason: `【部分着手】本日は${remainingBudget}分進めて骨組みを完成させ、次回に繋げます。`,
          nextAction: `まず前半の重要パートを集中して進めてください。`,
        });
        remainingBudget = 0;
      }
    } else {
      // テスト勉強 (Exam)
      const exam = item.task;
      const needed = exam.estimatedStudyMinutes;
      if (needed === undefined || needed <= 0) {
        missingTimeCount++;
      }

      // 試験勉強は、利用可能な残り時間に応じてブロック配分（例: 45分〜90分の集中復習枠）
      const studyBlockMinutes = Math.min(
        remainingBudget,
        needed && needed > 0 ? Math.min(needed, 90) : Math.min(remainingBudget, 60)
      );

      if (studyBlockMinutes >= 20) {
        selected.push({
          task: item.task,
          order: selected.length + 1,
          allocatedMinutes: studyBlockMinutes,
          reason: `【試験対策集中枠】理解度（${exam.understanding}%）の向上に向けて${studyBlockMinutes}分の集中復習を行います。`,
          nextAction: item.nextAction,
        });
        remainingBudget -= studyBlockMinutes;
      }
    }
  }

  const totalAllocatedMinutes = availableMinutes - remainingBudget;
  const utilizationRate = Math.round((totalAllocatedMinutes / availableMinutes) * 100);
  const unassignedCount = candidates.length - selected.length;

  let missingNotice = undefined;
  if (missingTimeCount > 0) {
    missingNotice = `${missingTimeCount}件のテストで「目標到達に必要な勉強時間」が未設定です。設定するとより精密な時間配分が可能です。`;
  }

  return {
    availableMinutes,
    selectedItems: selected,
    totalAllocatedMinutes,
    utilizationRate,
    unassignedItemsCount: Math.max(0, unassignedCount),
    missingTimeNotice: missingNotice,
  };
}
