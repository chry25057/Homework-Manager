import { PrioritizedTask, TimeAllocationProposal } from '../types';

/**
 * ユーザーが入力した利用可能時間（分）に対して、
 * 優先順位スコアと所要時間を考慮して最適なタスクの組み合わせと配分を提案する
 */
export function optimizeTimeAllocation(
  prioritizedTasks: PrioritizedTask[],
  availableMinutes: number
): TimeAllocationProposal {
  if (availableMinutes <= 0 || prioritizedTasks.length === 0) {
    return {
      availableMinutes,
      selectedTasks: [],
      totalAllocatedMinutes: 0,
      utilizationRate: 0,
      summary: '勉強時間を指定すると、最適なタスクの組み合わせを提案します。',
    };
  }

  // 完了していない、かつ deferrable ではない優先タスクを優先（なければ全体）
  const candidateTasks = prioritizedTasks.filter(p => !p.task.isCompleted);

  // 各タスクの実際の残り所要時間
  const tasksWithRemainingTime = candidateTasks.map(p => {
    const progressRate = (p.task.progress || 0) / 100;
    const remainingMinutes = Math.max(15, Math.round(p.task.estimatedMinutes * (1 - progressRate)));
    return {
      prioritized: p,
      remainingMinutes,
    };
  });

  let remainingBudget = availableMinutes;
  const selected: TimeAllocationProposal['selectedTasks'] = [];

  // グリーディ + 部分配分: 優先順位スコア順に可能な限り配分
  for (const item of tasksWithRemainingTime) {
    if (remainingBudget <= 0) break;

    const { prioritized, remainingMinutes } = item;
    const { task, course, priorityScore } = prioritized;

    if (remainingMinutes <= remainingBudget) {
      // まるごと完了可能
      selected.push({
        task,
        course,
        priorityScore,
        allocatedMinutes: remainingMinutes,
        reason: remainingMinutes === task.estimatedMinutes
          ? `優先度${priorityScore}位。今日で完全に完了（100%）できます。`
          : `残り${remainingMinutes}分でタスクを完了（100%）まで持っていけます。`,
      });
      remainingBudget -= remainingMinutes;
    } else {
      // 時間が足りないが、一部着手可能（最低20分以上ある場合）
      if (remainingBudget >= 20) {
        selected.push({
          task,
          course,
          priorityScore,
          allocatedMinutes: remainingBudget,
          reason: `優先度${priorityScore}位。本日は${remainingBudget}分進め、次回に繋げましょう。`,
        });
        remainingBudget = 0;
      }
    }
  }

  const totalAllocatedMinutes = availableMinutes - remainingBudget;
  const utilizationRate = Math.round((totalAllocatedMinutes / availableMinutes) * 100);

  let summary = '';
  if (selected.length === 0) {
    summary = '予定可能なタスクがありません。ゆっくり休息するか新しいタスクを登録しましょう。';
  } else if (selected.length === 1) {
    summary = `本日は最優先の「${selected[0].course.name}：${selected[0].task.title}」に集中して取り組みましょう！`;
  } else {
    summary = `本日利用可能な${availableMinutes}分で、重要度の高い${selected.length}個のタスクに最適配分しました。`;
  }

  return {
    availableMinutes,
    selectedTasks: selected,
    totalAllocatedMinutes,
    utilizationRate,
    summary,
  };
}
