"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useBoard } from "@/contexts/BoardContext";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { toast } from "sonner";

export default function TopBar() {
  const { saveStatus, boardCards, activeUsers, boardId } = useBoard();
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
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

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 60 },
      { wch: 40 },
    ];

    XLSX.writeFile(workbook, "성취기준_분류결과.xlsx");
  };

  const handleShare = async () => {
    setShowShareModal(true);
    if (shareCode) return;

    setShareLoading(true);
    try {
      const res = await fetch("/api/board/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      const data = await res.json();
      if (data.shareCode) {
        setShareCode(data.shareCode);
      } else {
        toast.error("접속번호 생성에 실패했습니다.");
        setShowShareModal(false);
      }
    } catch {
      toast.error("접속번호 생성에 실패했습니다.");
      setShowShareModal(false);
    } finally {
      setShareLoading(false);
    }
  };

  // Generate QR code sized to fit the modal width
  useEffect(() => {
    if (showShareModal && shareCode && canvasRef.current) {
      const boardUrl = `${window.location.origin}/board/${boardId}`;
      // Use parent container width for responsive sizing
      const container = canvasRef.current.parentElement;
      const size = container ? container.clientWidth : 300;
      QRCode.toCanvas(canvasRef.current, boardUrl, {
        width: size,
        margin: 1,
        color: { dark: "#1e293b", light: "#ffffff" },
      });
    }
  }, [showShareModal, shareCode, boardId]);

  // Close modal on outside click
  useEffect(() => {
    if (!showShareModal) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowShareModal(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showShareModal]);

  const copyShareInfo = () => {
    const boardUrl = `${window.location.origin}/board/${boardId}`;
    const text = `성취기준 보드 공유\n접속번호: ${shareCode}\n링크: ${boardUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("복사되었습니다!");
    });
  };

  return (
    <>
      <header className="h-14 md:h-16 w-full bg-white/70 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-3 md:px-6 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs md:text-base">
            에듀
          </div>
          <h1 className="text-base md:text-xl font-bold text-gray-800 whitespace-nowrap">성취기준 보드</h1>
        </Link>
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto hide-scrollbar pl-2">

          {/* Presence indicator */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs md:text-sm font-bold shadow-sm border border-blue-100/50 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="hidden md:inline">{activeUsers.length}명 접속 중</span>
              <span className="md:hidden">{activeUsers.length}명</span>
            </div>
          )}

          {/* Autosave indicator */}
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500 transition-opacity whitespace-nowrap">
            {saveStatus === 'saving' && (
              <>
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <span className="hidden sm:inline">저장 중...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></span>
                <span className="hidden sm:inline">모든 변경사항 저장됨</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500"></span>
                <span className="hidden sm:inline">저장 실패</span>
              </>
            )}
          </div>

          <button
            onClick={handleShare}
            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            공유
          </button>

          <button
            onClick={handleExport}
            disabled={boardCards.length === 0}
            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-gray-900 text-white rounded-md text-xs md:text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">엑셀 다운로드</span>
            <span className="sm:hidden">엑셀 저장</span>
          </button>
        </div>
      </header>

      {/* Share Modal — fullscreen */}
      {showShareModal && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">보드 공유</h2>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 text-xl"
            >
              &times;
            </button>
          </div>

          {shareLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse">접속번호 생성 중...</div>
          ) : shareCode ? (
            <div ref={modalRef} className="flex-1 flex flex-col items-center px-4 py-6 overflow-auto">
              {/* QR Code — fills width */}
              <div className="w-full max-w-md">
                <canvas ref={canvasRef} className="w-full h-auto" />
              </div>

              {/* Access Code */}
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500 mb-1">접속번호</p>
                <p className="text-4xl md:text-5xl font-mono font-bold tracking-[0.3em] text-gray-900">
                  {shareCode}
                </p>
              </div>

              {/* Copy Button */}
              <button
                onClick={copyShareInfo}
                className="mt-6 w-full max-w-md py-3 bg-blue-600 text-white rounded-xl text-base font-medium hover:bg-blue-700 transition"
              >
                공유 정보 복사
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
