import React from 'react';
import { 
  X, 
  Compass, 
  FileText, 
  GraduationCap, 
  Calculator, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Homework Manager の使い方
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-700 text-xs sm:text-sm leading-relaxed">
          
          {/* コンセプト */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-950 space-y-1.5">
            <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>アプリのコンセプト</span>
            </div>
            <p className="text-xs sm:text-sm text-blue-900/90 leading-relaxed">
              大学生が限られた時間で確実に単位を取得し、成績を維持・向上させるための意思決定支援アプリです。
              管理対象を<strong>「提出課題」</strong>と<strong>「試験勉強」</strong>に特化し、「今、何を最優先でやるべきか」「後回しにしてよいこと」を客観的に自動判断します。
            </p>
          </div>

          {/* 1. 提出課題の登録 */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>1. 提出課題の登録（「+ 課題」ボタン）</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>基本登録:</strong> 課題名、提出期限（時刻デフォルト 23:59）、進捗状況（未着手・進行中・完了・提出済み）を管理できます。講義名は任意です。
              </li>
              <li>
                <strong>毎週課題の一括登録:</strong> 毎週課される課題は「毎週」をONにし、曜日と実施回数を選ぶだけで一括登録できます。学期途中から使い始める場合も「開始回数（例: 第5回から）」を指定可能です。
              </li>
              <li>
                <strong>配点割合の自動計算:</strong> 毎週課題全体の配点割合と回数を入力すると、1回あたりの配点を自動算出します。配点0%で出席扱いになる課題も登録できます。
              </li>
              <li>
                <strong>未提出ペナルティ:</strong> 「期限後は提出不可」「未提出だと単位取得不可」「出席がなくなる」など、講義のシラバス基準に合わせて複数選択可能です。
              </li>
            </ul>
          </div>

          {/* 2. 試験勉強の登録 */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>2. 試験勉強の登録（「+ 試験」ボタン）</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>試験日程:</strong> 試験日と試験時間（1限〜5限、または時刻指定）を設定できます。
              </li>
              <li>
                <strong>理解度と勉強時間:</strong> 現在の理解度（0〜100%）と必要な推定勉強時間を入力します。理解度はスライダーでいつでも簡単に更新できます。
              </li>
              <li>
                <strong>配点・ボーダー点:</strong> 成績への影響度（配点割合%）、単位取得に必要な点数（通常60点）、現在の予想得点を記録できます。
              </li>
            </ul>
          </div>

          {/* 3. 今やるべきことランキング */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. 今やるべきことランキング（ダッシュボード）</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>横断的優先順位判定:</strong> 提出期限、ペナルティの重さ（単位不可・出席消失など）、試験日までの日数、理解度ギャップを総合評価し、今やるべき順に並べ替えます。締切直前の課題は最優先されます。
              </li>
              <li>
                <strong>後回しにしてよいこと:</strong> 登録タスクが6件以上ある場合、最優先の上位5件に集中できるよう、残りのタスクは右側の「後回しにしてよいこと」に優先度が低い順で表示されます。
              </li>
            </ul>
          </div>

          {/* 4. 試験 必要得点計算機 */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>4. 試験 必要得点計算機（上部タブ）</span>
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              出席、小テスト、提出課題などすでに確定している持ち点と単位取得ライン（60点など）から、中間試験や期末試験で<strong>「最低何点取れば単位が取れるか」</strong>を逆算できます。複数の試験に配点を分けてシミュレーションすることも可能です。
            </p>
          </div>

          {/* 5. 設定メニュー */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Settings className="w-4 h-4 text-slate-700" />
              <span>5. 設定メニュー（画面右上端 ⚙️）</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>使い方:</strong> 本ガイドをいつでも確認できます。
              </li>
              <li>
                <strong>大学シラバスを開く:</strong> お使いの大学のシラバスページを1クリックで開けます（未設定時はURL入力ダイアログが開きます）。
              </li>
              <li>
                <strong>シラバスURLの設定・変更:</strong> 登録したシラバスURLをいつでも変更できます。
              </li>
              <li>
                <strong>全データを削除（初期化）:</strong> 登録済みの全データをクリアして初期状態に戻します。
              </li>
            </ul>
          </div>

        </div>

        {/* モーダルフッター */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
