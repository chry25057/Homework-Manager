import React from 'react';
import { 
  Clock, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Coffee,
  Check
} from 'lucide-react';
import { useUniPilot } from '../../context/useUniPilot';
import { formatDateTime, getImpactBadge, getTaskTypeLabel } from '../../utils/formatters';

export const TimePlannerView: React.FC = () => {
  const {
    availableHours,
    setAvailableHours,
    timeProposal,
    toggleTaskCompleted,
    updateTaskProgress,
  } = useUniPilot();

  const availableMinutes = Math.round(availableHours * 60);

  // タイムスケジュール作成 (仮に現在時刻または19:00スタートとしてシミュレート)
  const now = new Date();
  let currentScheduleTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);

  const presets = [
    { label: '30分 (隙間時間)', hours: 0.5 },
    { label: '1時間 (集中)', hours: 1.0 },
    { label: '2時間 (標準)', hours: 2.0 },
    { label: '3時間 (じっくり)', hours: 3.0 },
    { label: '4時間 (休日)', hours: 4.0 },
  ];

  return (
    <div className="space-y-8 pb-12">
      
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-7 h-7 text-blue-600" />
          今日使える時間・最適タイムボクシング
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          今日確保できる時間を入力すると、優先順位スコアと所要時間から最も効果的なタスクの組み合わせを自動提案します。
        </p>
      </div>

      {/* 時間設定カード */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              ステップ 1：今日勉強できる時間を設定
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{availableHours} 時間</span>
              <span className="text-sm font-semibold text-slate-500">
                （合計 {availableMinutes} 分）
              </span>
            </div>
          </div>

          {/* プリセットボタン */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.hours}
                onClick={() => setAvailableHours(p.hours)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  availableHours === p.hours
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* スライダー */}
        <div className="space-y-2">
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.5"
            value={availableHours}
            onChange={(e) => setAvailableHours(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>30分</span>
            <span>2時間</span>
            <span>4時間</span>
            <span>6時間</span>
            <span>8時間</span>
          </div>
        </div>
      </div>

      {/* 提案結果エリア */}
      <div className="space-y-6">
        
        {/* サマリーバー */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              AI/アルゴリズムによる最適配分プラン
            </div>
            <h2 className="text-lg sm:text-xl font-black">
              {timeProposal.summary}
            </h2>
          </div>

          <div className="flex items-center gap-6 shrink-0 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
            <div>
              <div className="text-xs text-blue-200">予定消化時間</div>
              <div className="text-xl font-black">
                {timeProposal.totalAllocatedMinutes} <span className="text-xs font-normal">/ {availableMinutes}分</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-blue-200">時間利用率</div>
              <div className="text-xl font-black">{timeProposal.utilizationRate}%</div>
            </div>
          </div>
        </div>

        {/* 2カラム表示：選ばれたタスクリスト VS 推奨スケジュール */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左：選ばれたタスクの詳細 */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              本日取り組むべきタスク一覧（優先度順）
            </h3>

            {timeProposal.selectedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                現在取り組むべき未完了タスクがありません。
              </div>
            ) : (
              <div className="space-y-3">
                {timeProposal.selectedTasks.map((item, index) => {
                  const { task, course, allocatedMinutes, reason, priorityScore } = item;
                  const impactBadge = getImpactBadge(task.impact);

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              #{index + 1}
                            </span>
                            <span className="font-bold text-slate-700">{course.name}</span>
                            <span className="text-[11px] text-slate-500">{getTaskTypeLabel(task.type)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${impactBadge.color}`}>
                              {impactBadge.label}
                            </span>
                          </div>

                          <div className="text-base font-bold text-slate-900">
                            {task.title}
                          </div>
                        </div>

                        {/* 配分時間バッジ */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm border border-blue-200">
                            <Clock className="w-4 h-4" />
                            {allocatedMinutes}分 充当
                          </div>
                        </div>
                      </div>

                      {/* 理由 */}
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        🎯 <span className="font-semibold">{reason}</span>
                      </p>

                      {/* クイック進捗更新 */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">現在の進捗: {task.progress}%</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateTaskProgress(task.id, Math.min(100, task.progress + 25))}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                          >
                            +25%進捗
                          </button>
                          <button
                            onClick={() => toggleTaskCompleted(task.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            完了
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右：推奨スケジュール・タイムライン */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              本日のおすすめタイムスケジュール例
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <p className="text-xs text-slate-500">
                集中力が最も高まるよう、合間に適度な休憩（5〜10分）を挟んだスケジュール例です。
              </p>

              {timeProposal.selectedTasks.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  時間枠内に割り当てられたタスクがありません
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-100">
                  {timeProposal.selectedTasks.map((item, idx) => {
                    const startH = currentScheduleTime.getHours().toString().padStart(2, '0');
                    const startM = currentScheduleTime.getMinutes().toString().padStart(2, '0');
                    
                    // 終了時刻計算
                    currentScheduleTime = new Date(currentScheduleTime.getTime() + item.allocatedMinutes * 60 * 1000);
                    const endH = currentScheduleTime.getHours().toString().padStart(2, '0');
                    const endM = currentScheduleTime.getMinutes().toString().padStart(2, '0');

                    // 休憩10分
                    currentScheduleTime = new Date(currentScheduleTime.getTime() + 10 * 60 * 1000);

                    return (
                      <div key={item.task.id} className="relative pl-8 space-y-1">
                        <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs -translate-x-1/2" />
                        
                        <div className="text-xs font-extrabold text-blue-600">
                          {startH}:{startM} 〜 {endH}:{endM} ({item.allocatedMinutes}分)
                        </div>

                        <div className="text-sm font-bold text-slate-800">
                          {item.task.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.course.name}
                        </div>
                      </div>
                    );
                  })}

                  <div className="relative pl-8 pt-2">
                    <div className="absolute left-1.5 top-3.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white -translate-x-1/2" />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                      本日の目標時間達成！ゆっくりリフレッシュ
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
