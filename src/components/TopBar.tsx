"use client";

import { useBoard } from "@/contexts/BoardContext";
import * as XLSX from "xlsx";

export default function TopBar() {
  const { saveStatus, boardCards, activeUsers } = useBoard();

  const handleExport = () => {
    // Flatten data for Excel
    const exportData = boardCards.map((card, idx) => ({
      순서: idx + 1,
      학년군: card.criteria.gradeGroup,
      교과: card.criteria.subject,
      영역: card.criteria.domain,
      성취기준코드: card.criteria.code,
      성취기준: card.criteria.description,
      메모: card.memo || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "성취기준 카드");

    // Adjust column widths automatically based on header names (rough estimation)
    worksheet['!cols'] = [
      { wch: 6 }, // 순서
      { wch: 10 }, // 학년군
      { wch: 10 }, // 교과
      { wch: 15 }, // 영역
      { wch: 15 }, // 성취기준코드
      { wch: 60 }, // 성취기준
      { wch: 40 }, // 메모
    ];

    XLSX.writeFile(workbook, "성취기준_분류결과.xlsx");
  };

  return (
    <header className="h-16 w-full bg-white/70 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
          에듀
        </div>
        <h1 className="text-xl font-bold text-gray-800">성취기준 카드 보드</h1>
      </div>
      <div className="flex items-center gap-4">

        {/* Presence indicator */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold shadow-sm border border-blue-100/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {activeUsers.length}명 접속 중
          </div>
        )}

        {/* Autosave indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500 transition-opacity">
          {saveStatus === 'saving' && (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              저장 중...
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              모든 변경사항 저장됨
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              저장 실패
            </>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={boardCards.length === 0}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors shadow-sm"
        >
          엑셀 다운로드
        </button>
      </div>
    </header>
  );
}
