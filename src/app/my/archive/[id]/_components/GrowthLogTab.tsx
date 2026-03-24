interface CookingLog {
  log_id: number;
  status: 'SUCCESS' | 'REGRET' | 'FAIL';
  lesson_note: string | null;
  companion: string | null;
  cooked_at: string;
}

export default function GrowthLogTab({
  logs,
  cookCount,
}: {
  logs: CookingLog[];
  cookCount: number;
}) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-8 shadow-sm h-[500px] flex items-center justify-center text-[#A59A94]">
        요리 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] py-10 px-12 shadow-sm relative overflow-hidden flex flex-col min-h-[500px]">
      <h2 className="text-[18px] font-bold text-[#3C2D23] mb-10 shrink-0">
        총 {cookCount}번 요리하며 성장완료! 🚀
      </h2>

      <div className="relative border-l border-[#EAE7E4] ml-[7px] pb-10 space-y-6 flex-1">
        {logs.map((log, index) => {
          const isFirstLog = index === logs.length - 1;
          const isLatestLog = index === 0;

          // determine styles
          let statusBg = '';
          let statusBorder = '';
          let statusText = '';
          let indicatorColor = '';
          let emoji = '';
          let statusLabel = '';

          switch (log.status) {
            case 'SUCCESS':
              statusBg = 'bg-[#F0FDF4]';
              statusBorder = 'border-[#BBF7D0]';
              statusText = 'text-[#4CAF50]';
              indicatorColor = 'bg-[#4CAF50]';
              emoji = '🤩';
              statusLabel = '성공';
              break;
            case 'REGRET':
              statusBg = 'bg-[#FFFBE6]';
              statusBorder = 'border-[#FFE58F]';
              statusText = 'text-[#F59E0B]';
              indicatorColor = 'bg-[#F59E0B]';
              emoji = '🥺';
              statusLabel = '아쉬움';
              break;
            case 'FAIL':
              statusBg = 'bg-[#FFF4F4]';
              statusBorder = 'border-[#FFBABA]';
              statusText = 'text-[#EF4444]';
              indicatorColor = 'bg-[#EF4444]';
              emoji = '😭';
              statusLabel = '실패';
              break;
          }

          const dateObj = new Date(log.cooked_at);
          const formattedDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
          let dateSuffix = '';
          if (isLatestLog) dateSuffix = ' (최신)';
          else if (isFirstLog) dateSuffix = ' (첫 요리)';

          const noteText = log.lesson_note ? `"${log.lesson_note}"` : '"기록한 메모가 없습니다."';

          return (
            <div key={log.log_id} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute w-[15px] h-[15px] rounded-full ${indicatorColor} -left-[8px] top-[40%] bg-clip-content p-[2.5px] bg-white border-2 border-transparent`}
                style={{ borderColor: indicatorColor.replace('bg-', '') }} // simple trick or just use pure CSS classes. We'll stick to simple classes.
              />
              {/* Simplified Timeline dot for Tailwind without inline dynamic logic */}
              <div
                className={`absolute w-[16px] h-[16px] rounded-full -left-[8.5px] top-6 border-4 border-white shadow-sm ${indicatorColor}`}
              />

              {/* Content Card */}
              <div
                className={`border ${statusBorder} ${statusBg} rounded-[16px] p-5 flex flex-col gap-2.5 shadow-sm`}
              >
                <div className="flex justify-between items-center text-[14px]">
                  <span className={`font-bold ${statusText}`}>
                    {formattedDate}
                    <span className="font-medium text-[#F59E0B] ml-1">{dateSuffix}</span>
                  </span>
                  <span className={`font-bold ${statusText}`}>
                    {emoji} {statusLabel}
                  </span>
                </div>
                <div className="text-[15px] font-medium text-[#3C2D23] flex items-center justify-between">
                  <span>{noteText}</span>
                  {log.companion && (
                    <span className="text-[13px] text-[#A59A94] font-normal">
                      | {log.companion}과 함께
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full flex justify-center mt-auto pt-6 shrink-0">
        <button className="bg-white border border-[#EAE7E4] px-5 py-2.5 rounded-full text-[13px] text-[#554A43] font-medium shadow-sm hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
          과거 기록 더 보기 <span className="text-[10px]">▼</span>
        </button>
      </div>
    </div>
  );
}
