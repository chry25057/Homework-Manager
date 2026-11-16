import { Difficulty, ImpactLevel, AssignmentPenalty, AssignmentProgress } from '../types';

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[d.getDay()];

    return `${month}月${date}日(${dayName}) ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function formatRelativeDueDate(isoString: string): { text: string; isUrgent: boolean; isPast: boolean } {
  try {
    const now = new Date();
    const due = new Date(isoString);
    if (isNaN(due.getTime())) return { text: isoString, isUrgent: false, isPast: false };

    const diffMs = due.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      const pastHours = Math.abs(Math.round(diffHours));
      if (pastHours < 24) {
        return { text: `期限切れ (${pastHours}時間前)`, isUrgent: true, isPast: true };
      }
      const pastDays = Math.ceil(pastHours / 24);
      return { text: `期限切れ (${pastDays}日前)`, isUrgent: true, isPast: true };
    }

    if (diffHours <= 12) {
      return { text: `今日 (あと${Math.max(1, Math.round(diffHours))}時間)`, isUrgent: true, isPast: false };
    }

    if (diffHours <= 24) {
      return { text: `明日`, isUrgent: true, isPast: false };
    }

    const days = Math.ceil(diffHours / 24);
    return { text: `あと${days}日`, isUrgent: days <= 3, isPast: false };
  } catch {
    return { text: isoString, isUrgent: false, isPast: false };
  }
}

export function formatDueDisplay(isoString: string): { text: string; color: string } {
  const rel = formatRelativeDueDate(isoString);
  if (rel.isPast) {
    return { text: rel.text, color: 'text-red-600 font-bold' };
  }
  if (rel.isUrgent) {
    return { text: rel.text, color: 'text-amber-600 font-bold' };
  }
  return { text: rel.text, color: 'text-slate-600 font-medium' };
}

export function formatDifficulty(diff?: Difficulty): string {
  switch (diff) {
    case 'easy':
      return '易しい';
    case 'normal':
      return '普通';
    case 'hard':
      return '難しい';
    case 'very_hard':
      return '非常に難しい';
    default:
      return '標準';
  }
}

export function formatImpact(impact?: ImpactLevel): string {
  switch (impact) {
    case 'high':
      return '大';
    case 'medium':
      return '中';
    case 'low':
      return '小';
    default:
      return '中';
  }
}

export function formatSinglePenalty(penalty?: AssignmentPenalty): { text: string; color: string; bgColor: string } {
  switch (penalty) {
    case 'fail_course':
      return { text: '未提出で単位不可', color: 'text-red-800', bgColor: 'bg-red-100 border border-red-300' };
    case 'lose_attendance':
      return { text: '出席がなくなる', color: 'text-rose-800', bgColor: 'bg-rose-100 border border-rose-300' };
    case 'no_late_submission':
      return { text: '期限後提出不可', color: 'text-orange-800', bgColor: 'bg-orange-100 border border-orange-300' };
    case 'normal_deduction':
      return { text: '通常の減点', color: 'text-slate-700', bgColor: 'bg-slate-100 border border-slate-200' };
    case 'unknown':
    default:
      return { text: 'ペナルティ不明', color: 'text-slate-500', bgColor: 'bg-slate-50 border border-slate-200' };
  }
}

export function formatPenalty(penalty?: AssignmentPenalty | AssignmentPenalty[]): { text: string; color: string; bgColor: string } {
  if (Array.isArray(penalty)) {
    if (penalty.length === 0 || (penalty.length === 1 && penalty[0] === 'unknown')) {
      return { text: 'ペナルティ不明', color: 'text-slate-500', bgColor: 'bg-slate-50 border border-slate-200' };
    }
    const filtered = penalty.filter(p => p !== 'unknown');
    if (filtered.includes('fail_course')) {
      return { text: filtered.length > 1 ? `未提出で単位不可 他${filtered.length - 1}件` : '未提出で単位不可', color: 'text-red-800', bgColor: 'bg-red-100 border border-red-300' };
    }
    if (filtered.includes('lose_attendance')) {
      return { text: filtered.length > 1 ? `出席取消 他${filtered.length - 1}件` : '出席がなくなる', color: 'text-rose-800', bgColor: 'bg-rose-100 border border-rose-300' };
    }
    return formatSinglePenalty(filtered[0]);
  }
  return formatSinglePenalty(penalty);
}

export function formatPenaltiesList(penalties?: AssignmentPenalty[] | AssignmentPenalty): { text: string; color: string; bgColor: string }[] {
  if (!penalties) return [];
  const list = Array.isArray(penalties) ? penalties : [penalties];
  return list
    .filter(p => p !== 'unknown')
    .map(p => formatSinglePenalty(p));
}

export function formatProgress(progress: AssignmentProgress): { text: string; color: string; bgColor: string } {
  switch (progress) {
    case 'submitted':
      return { text: '提出済み', color: 'text-emerald-800', bgColor: 'bg-emerald-100 border border-emerald-300' };
    case 'in_progress':
      return { text: '進行中', color: 'text-amber-800', bgColor: 'bg-amber-100 border border-amber-300' };
    case 'not_started':
    default:
      return { text: '未着手', color: 'text-slate-700', bgColor: 'bg-slate-100 border border-slate-200' };
  }
}
