// UniPilot Type Definitions (課題 & テスト勉強 特化型)

export type Difficulty = 'easy' | 'normal' | 'hard' | 'very_hard';

export type ImpactLevel = 'high' | 'medium' | 'low';

// 課題の未提出ペナルティ
export type AssignmentPenalty =
  | 'fail_course'           // 未提出だと単位取得不可
  | 'lose_attendance'       // 出席がなくなる (NEW)
  | 'no_late_submission'    // 期限後は提出不可
  | 'normal_deduction'      // 通常の減点
  | 'unknown';              // 不明 / 特になし

// 課題の進捗
export type AssignmentProgress = 'not_started' | 'in_progress' | 'submitted';

// 1. 提出課題
export interface Assignment {
  id: string;
  itemType: 'assignment';
  title: string;                 // 必須：課題名
  courseName?: string;           // 任意：対象講義
  dueDate: string;               // 提出期限 (ISO 8601 string)
  estimatedMinutes?: number;     // 任意：推定所要時間 (分)
  progress: AssignmentProgress;  // 現在の進捗
  
  // 任意項目
  impact?: ImpactLevel;          // 成績への影響度
  weightPercent?: number;        // 1回あたりの配点や評価割合 (%)
  totalWeightPercent?: number;   // 毎週課題全体の配点割合 (%)
  totalOccurrences?: number;     // 課題の全回数（1〜15回、デフォルト13回）
  startOccurrence?: number;      // 開始回数（デフォルト1）
  difficulty?: Difficulty;       // 難易度
  penalties?: AssignmentPenalty[]; // 未提出ペナルティ（複数選択対応）
  penalty?: AssignmentPenalty;   // 後方互換用
  notes?: string;                // 課題の説明や注意事項
  isWeekly?: boolean;            // 毎週課題フラグ
  weeklyIndex?: number;          // 第何回目か
  weeklySeriesId?: string;       // 毎週シリーズID
  createdAt?: string;
}

// 2. テスト勉強
export interface Exam {
  id: string;
  itemType: 'exam';
  title: string;                 // 必須：テスト名
  courseName: string;            // 必須：対象講義
  examDate: string;              // 必須：試験日時 (ISO 8601 string)
  understanding: number;         // 必須：現在の理解度 (0〜100%)
  estimatedStudyMinutes?: number;// 推定勉強時間（分、目標点到達に必要な時間、未入力可）
  
  // 任意項目
  impact?: ImpactLevel;          // 成績への影響度
  weightPercent?: number;        // 配点や評価割合 (%)
  difficulty?: Difficulty;       // テストの難易度
  targetScore?: number;          // 目標点数 (例: 80点)
  passingRequiredScore?: number; // 単位取得に必要な点数 (例: 60点)
  currentExpectedScore?: number; // 現在の予想得点
  studyProgress?: number;        // 勉強の進捗 (0〜100%)
  notes?: string;                // 試験範囲やメモ
  isCompleted?: boolean;         // 完了・終了
  createdAt?: string;
}

// 統合タスク
export type AcademicTask = Assignment | Exam;

// 優先度カテゴリ
export type PriorityCategory = 
  | 'do_now'           // 今やるべきこと（最優先ランキング）
  | 'deferrable'       // 今は後回しでよい（締切まで余裕があり、より優先すべきタスクがある）
  | 'not_needed_now'   // 今はやらなくてよい（現時点では取り組む必要性が低く、後日改めて着手）
  | 'needs_attention'; // 対応が必要（期限切れ、確認が必要など）

// 優先順位計算結果
export interface PrioritizedItem {
  task: AcademicTask;
  rank: number;
  priorityScore: number;       // 0〜100点
  category: PriorityCategory;
  categoryLabel: string;
  hoursUntilDue: number;       // 締切・試験日までの残り時間（時間単位）
  daysUntilDue: number;        // 残り日数
  reason: string;              // 優先する理由 / 後回しにする理由
  nextAction: string;          // 次に行うべき具体的な行動
  uncertaintyNotes?: string;   // 任意項目未入力による暫定注意書き
  isQuickWin?: boolean;        // 短時間で完了し大きな失点を防げるか
  isHighLossRisk?: boolean;    // 未提出や試験失敗による損失が大きいか
}

// 今日使える時間に応じた学習計画
export interface TimeStudyPlan {
  availableMinutes: number;
  selectedItems: {
    task: AcademicTask;
    order: number;
    allocatedMinutes: number;
    reason: string;
    nextAction: string;
  }[];
  totalAllocatedMinutes: number;
  utilizationRate: number;
  unassignedItemsCount: number;
  missingTimeNotice?: string;
}

// 試験 必要得点計算機の入力項目
export interface ExamCalculationItem {
  id: string;
  name: string;
  weightPercent: number;
}

export interface RequiredScoreCalculationInput {
  courseName?: string;
  currentTotalScore?: number;      // 現在までに確定している・今後取れるであろう点数
  passingBorderScore?: number;     // 単位取得ライン (例: 60点)
  exams: ExamCalculationItem[];    // 受験予定の試験一覧（複数対応）
}

export interface RequiredScoreCalculationResult {
  hasSufficientInput: boolean;
  totalExamWeight: number;         // 試験の合計評価割合 (%)
  averageRequiredScore: number | null; // 各試験で平均して必要な得点 (100点満点換算)
  neededScoreFromExams: number;    // 総合点上で試験から獲得すべき点数
  isAlreadySecured: boolean;       // すでに単位取得ライン確保済みか
  isImpossible: boolean;           // 100点満点でも届かないか
  calculationBasis: string;        // 計算根拠
  warningMessage?: string;         // 警告・注意
  missingFields: string[];         // 不足している情報
}
