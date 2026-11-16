import { EvaluationItem, EvaluationRule, EvaluationType, RuleType } from '../types';

export interface ParsedRuleResult {
  evaluations: EvaluationItem[];
  rules: EvaluationRule[];
  interpretations: string[];
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

export interface RuleExtractionProvider {
  parseText(text: string): Promise<ParsedRuleResult>;
}

/**
 * 決定論的パターンマッチングによる自然言語ルールパーサー（オフライン対応）
 * ユーザーが入力した日本語の評価方法から、構造化された評価項目とルールを抽出します。
 */
export class DeterministicRuleParser implements RuleExtractionProvider {
  async parseText(text: string): Promise<ParsedRuleResult> {
    const raw = text.trim();
    if (!raw) {
      return {
        evaluations: [],
        rules: [],
        interpretations: ['入力されたテキストが空です。'],
        isAmbiguous: true,
        ambiguityReason: '評価方法の記述がありません。',
      };
    }

    const evaluations: EvaluationItem[] = [];
    const rules: EvaluationRule[] = [];
    const interpretations: string[] = [];

    // ヘルパー：ID生成
    const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // 1. 評価項目と割合の抽出
    // 例: "中間30%", "期末40%", "レポート20%", "出席10%", "小テスト15%"
    const weightMatches: { type: EvaluationType; name: string; weight: number }[] = [];
    const typePatterns: { pattern: RegExp; type: EvaluationType; name: string }[] = [
      { pattern: /期末(?:試験|テスト)?[^\d%]{0,5}(\d{1,3})%/i, type: 'final', name: '期末試験' },
      { pattern: /中間(?:試験|テスト)?[^\d%]{0,5}(\d{1,3})%/i, type: 'midterm', name: '中間試験' },
      { pattern: /レポート[^\d%]{0,5}(\d{1,3})%/i, type: 'report', name: 'レポート' },
      { pattern: /小テスト[^\d%]{0,5}(\d{1,3})%/i, type: 'quiz', name: '小テスト' },
      { pattern: /課題[^\d%]{0,5}(\d{1,3})%/i, type: 'assignment', name: '課題' },
      { pattern: /出席[^\d%]{0,5}(\d{1,3})%/i, type: 'attendance', name: '出席' },
      { pattern: /(?:平常点|その他)[^\d%]{0,5}(\d{1,3})%/i, type: 'other', name: 'その他・平常点' },
    ];

    for (const tp of typePatterns) {
      const m = raw.match(tp.pattern);
      if (m && m[1]) {
        weightMatches.push({
          type: tp.type,
          name: tp.name,
          weight: parseInt(m[1], 10),
        });
      }
    }

    // 「残りは出席」「残りはレポート」などの抽出
    const remainderMatch = raw.match(/残りは?(出席|レポート|課題|期末|平常点)/);
    let remainderType: EvaluationType | null = null;
    let remainderName = '';
    if (remainderMatch) {
      const word = remainderMatch[1];
      if (word.includes('出席')) { remainderType = 'attendance'; remainderName = '出席'; }
      else if (word.includes('レポート')) { remainderType = 'report'; remainderName = 'レポート'; }
      else if (word.includes('課題')) { remainderType = 'assignment'; remainderName = '課題'; }
      else if (word.includes('期末')) { remainderType = 'final'; remainderName = '期末試験'; }
      else { remainderType = 'other'; remainderName = '平常点'; }
    }

    // 評価項目の組み立て
    weightMatches.forEach(wm => {
      evaluations.push({
        id: makeId(`eval-${wm.type}`),
        type: wm.type,
        name: wm.name,
        weight: wm.weight,
        isGraded: false,
        score: null,
      });
    });

    // 残りの配分を計算
    const currentSum = evaluations.reduce((sum, e) => sum + e.weight, 0);
    if (remainderType && currentSum < 100) {
      const restWeight = 100 - currentSum;
      const existing = evaluations.find(e => e.type === remainderType);
      if (existing) {
        existing.weight += restWeight;
      } else {
        evaluations.push({
          id: makeId(`eval-${remainderType}`),
          type: remainderType,
          name: remainderName,
          weight: restWeight,
          isGraded: false,
          score: null,
        });
      }
    }

    // 2. 出席ルールの抽出
    // A) 最初のX回は評価に入らない / 第X回〜第Y回のみ
    const skipEarlyMatch = raw.match(/最初[の]?(\d+)回[はのを]?(?:評価に入らない|除外|カウントしない|取らない)/);
    const rangeMatch = raw.match(/第?(\d+)回?[〜~～-]第?(\d+)回?(?:[の|な]出席(?:のみ|だけ|を評価))?/);
    let startSession = 1;
    let endSession = 15;
    let hasAttendanceRange = false;

    if (skipEarlyMatch) {
      const skipCount = parseInt(skipEarlyMatch[1], 10);
      startSession = skipCount + 1;
      hasAttendanceRange = true;
    } else if (rangeMatch) {
      startSession = parseInt(rangeMatch[1], 10);
      endSession = parseInt(rangeMatch[2], 10);
      hasAttendanceRange = true;
    }

    if (hasAttendanceRange) {
      rules.push({
        id: makeId('rule-range'),
        type: 'attendance_range',
        name: '出席評価対象範囲',
        description: `第${startSession}回〜第${endSession}回の出席のみ評価対象`,
        params: { startSession, endSession },
      });
    }

    // B) 特定の日の出席が必須
    // 例: "4月10日、5月8日、6月12日の出席が必須", "第1回と第8回は出席必須"
    const dateMatch = raw.match(/((?:\d+月\d+日[、, ]*)+|(?:第?\d+回[、, と]*)+)の?出席[がは]?必須/);
    if (dateMatch) {
      const datesRaw = dateMatch[1];
      const dates = datesRaw.split(/[、, と]+/).map(s => s.trim()).filter(Boolean);
      if (dates.length > 0) {
        rules.push({
          id: makeId('rule-mand-dates'),
          type: 'mandatory_dates',
          name: '必須出席日・回',
          description: `${dates.join('、')} の出席が必須`,
          params: { mandatoryDates: dates },
        });
      }
    }

    // C) 欠席上限
    // 例: "3回以上欠席すると失格", "4回欠席で単位不可", "欠席3回で落単"
    const maxAbsentMatch = raw.match(/(\d+)回(?:以上)?(?:欠席|休む)(?:と|たら|で|以上で)?(?:単位(?:取得)?(?:不?可|落とす)|失格)/);
    if (maxAbsentMatch) {
      const limit = parseInt(maxAbsentMatch[1], 10);
      rules.push({
        id: makeId('rule-absent-limit'),
        type: 'max_absences',
        name: '欠席上限失格ルール',
        description: `${limit}回以上欠席すると失格（単位不可）`,
        params: { maxAbsences: limit },
      });
    }

    // 3. 試験足切り点ルールの抽出
    // 例: "期末で40点未満だったら単位不可", "期末試験40点未満の場合、総合点に関係なく単位不可"
    const minFinalMatch = raw.match(/(期末(?:試験)?)[^\d]{0,6}(\d{1,2})点未満[ならだったらは場合]*(?:単位(?:取得)?(?:不?可|落とす)|失格)/);
    if (minFinalMatch) {
      const minScore = parseInt(minFinalMatch[2], 10);
      rules.push({
        id: makeId('rule-final-cutoff'),
        type: 'min_score',
        name: '期末試験足切り条件',
        description: `期末試験${minScore}点未満の場合、総合点に関係なく単位不可`,
        params: {
          minScore,
          isDisqualification: true,
        },
      });
    }

    // 中間試験足切り・最低点
    const minMidMatch = raw.match(/(中間(?:試験)?)[^\d]{0,6}(\d{1,2})点(?:未満|以上)[必要|なら|で]/);
    if (minMidMatch) {
      const minScore = parseInt(minMidMatch[2], 10);
      rules.push({
        id: makeId('rule-mid-min'),
        type: 'min_score',
        name: '中間試験最低点条件',
        description: `中間試験で${minScore}点以上必要`,
        params: {
          minScore,
          isDisqualification: false,
        },
      });
    }

    // 4. レポート・課題ルールの抽出
    // A) レポートN個すべて提出必須
    // 例: "レポートは3つ全部提出必須", "レポート3つ全提出必須", "課題5つ全て提出必須"
    const submitAllMatch = raw.match(/(レポート|課題)[^\d]{0,4}(\d+)つ?(?:全(?:部|て)?|全て)?提出必須/);
    if (submitAllMatch) {
      const count = parseInt(submitAllMatch[2], 10);
      const targetType = submitAllMatch[1] === 'レポート' ? 'report' : 'assignment';
      rules.push({
        id: makeId('rule-submit-all'),
        type: 'must_submit_all',
        name: `${submitAllMatch[1]}全提出必須`,
        description: `${submitAllMatch[1]}${count}件をすべて提出必須`,
        params: {
          totalCount: count,
        },
      });
      // 評価項目がまだ無ければ自動補完
      if (!evaluations.some(e => e.type === targetType)) {
        evaluations.push({
          id: makeId(`eval-${targetType}`),
          type: targetType,
          name: submitAllMatch[1],
          weight: 0,
          isGraded: false,
          score: null,
        });
      }
    }

    // B) 特定の課題が提出必須
    // 例: "レポート1を提出しなければ単位取得不可", "課題3の提出が必須"
    const submitSpecificMatch = raw.match(/([^\s、。]+(?:レポート|課題)[^\s、。]*)[をはの]?(?:提出(?:しなければ|しないと)|提出が?必須)(?:単位(?:取得)?(?:不?可|落とす))?/);
    if (submitSpecificMatch) {
      const specificName = submitSpecificMatch[1].trim();
      rules.push({
        id: makeId('rule-submit-specific'),
        type: 'must_submit_specific',
        name: `特定課題提出必須`,
        description: `「${specificName}」を提出しなければ単位取得不可`,
        params: {
          specificItemNames: [specificName],
        },
      });
    }

    // C) 提出ノルマ (N件中M件以上)
    // 例: "5つの課題のうち4つ以上提出必須", "課題5件中4件提出必須"
    const quotaMatch = raw.match(/(\d+)つ?の?(課題|レポート)[のうち中](\d+)つ?以上提出(?:必須|必要)/);
    if (quotaMatch) {
      const total = parseInt(quotaMatch[1], 10);
      const req = parseInt(quotaMatch[3], 10);
      const label = quotaMatch[2];
      rules.push({
        id: makeId('rule-quota'),
        type: 'min_submissions',
        name: `${label}提出ノルマ`,
        description: `${total}件の${label}のうち${req}件以上提出必須`,
        params: {
          totalCount: total,
          requiredCount: req,
        },
      });
    }

    // D) 上位N件採用 (ドロップルール)
    // 例: "小テスト10回のうち得点上位8回を評価", "課題10回のうち上位8回採用"
    const dropMatch = raw.match(/(小テスト|課題)(\d+)回のうち(?:得点)?上位(\d+)回(?:を評価|採用)?/);
    if (dropMatch) {
      const label = dropMatch[1];
      const total = parseInt(dropMatch[2], 10);
      const best = parseInt(dropMatch[3], 10);
      rules.push({
        id: makeId('rule-best-n'),
        type: 'drop_lowest',
        name: `${label}上位件数採用`,
        description: `${label}${total}回のうち得点上位${best}回を評価`,
        params: {
          totalCount: total,
          bestNCount: best,
        },
      });
    }

    // 5. 試験平均化ルール
    // 例: "中間試験と期末試験の平均点を試験成績とする", "中間と期末の平均"
    if (raw.includes('中間') && raw.includes('期末') && raw.includes('平均')) {
      rules.push({
        id: makeId('rule-blend'),
        type: 'blend_exams',
        name: '試験平均化ルール',
        description: '中間試験と期末試験の平均点を試験成績とする',
        params: {},
      });
    }

    // 6. 解釈結果テキストの組み立て
    evaluations.forEach(e => {
      const relatedRule = rules.find(r => r.type === 'attendance_range' && e.type === 'attendance');
      if (relatedRule) {
        interpretations.push(`${e.name}：${e.weight}%、第${relatedRule.params.startSession}回〜第${relatedRule.params.endSession}回`);
      } else {
        interpretations.push(`${e.name}：${e.weight}%`);
      }
    });

    rules.forEach(r => {
      if (r.type !== 'attendance_range') {
        interpretations.push(r.description);
      }
    });

    // 曖昧性チェック
    const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
    let isAmbiguous = false;
    let ambiguityReason: string | undefined;

    if (evaluations.length === 0) {
      isAmbiguous = true;
      ambiguityReason = '評価項目や配分割合が読み取れませんでした。手動ルールビルダーで設定してください。';
    } else if (totalWeight !== 100) {
      isAmbiguous = true;
      ambiguityReason = `配分割合の合計が${totalWeight}%となっています（100%になるよう調整が必要です）。`;
    }

    return {
      evaluations,
      rules,
      interpretations,
      isAmbiguous,
      ambiguityReason,
    };
  }
}

/**
 * 将来AI APIプロバイダ（Gemini等）と差し替え可能なシングルトン
 */
let currentParser: RuleExtractionProvider = new DeterministicRuleParser();

export function setRuleExtractionProvider(provider: RuleExtractionProvider) {
  currentParser = provider;
}

export function parseRuleText(text: string): Promise<ParsedRuleResult> {
  return currentParser.parseText(text);
}
