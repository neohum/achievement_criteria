"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BoardInfo {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

export default function LobbyPage() {
    const router = useRouter();
    const [boards, setBoards] = useState<BoardInfo[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [loading, setLoading] = useState(true);
    const [showNewBoard, setShowNewBoard] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        let sid = localStorage.getItem("achievement_board_session");
        if (!sid) {
            sid = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("achievement_board_session", sid);
        }
        setSessionId(sid);

        fetch(`/api/boards?sessionId=${sid}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.boards) {
                    setBoards(data.boards);
                }
                setLoading(false);
            })
            .catch(() => {
                toast.error("보드 목록을 불러오는데 실패했습니다.");
                setLoading(false);
            });
    }, []);

    const createNewBoard = async () => {
        if (!sessionId || creating) return;
        setCreating(true);

        try {
            const res = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, title: newBoardTitle.trim() || "새 성취기준 보드" }),
            });
            const data = await res.json();
            if (data.board) {
                toast.success("새 보드가 생성되었습니다.");
                router.push(`/board/${data.board.id}`);
            }
        } catch {
            toast.error("보드 생성에 실패했습니다.");
        } finally {
            setCreating(false);
            setShowNewBoard(false);
            setNewBoardTitle("");
        }
    };

    const handleJoinBoard = async () => {
        const code = joinCode.trim();
        if (!/^\d{6}$/.test(code) || joining) return;
        setJoining(true);

        try {
            const res = await fetch(`/api/board/join?code=${code}`);
            const data = await res.json();
            if (res.ok && data.boardId) {
                router.push(`/board/${data.boardId}`);
            } else {
                toast.error("존재하지 않는 접속번호입니다.");
            }
        } catch {
            toast.error("접속에 실패했습니다.");
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-gray-500 animate-pulse">불러오는 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans px-4 md:px-8 py-8 md:py-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 md:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-base md:text-lg">
                            에듀
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">내 작업 공간</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleJoinBoard(); }}
                                placeholder="접속번호 6자리"
                                className="w-28 text-sm text-center font-mono tracking-wider focus:outline-none text-black placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleJoinBoard}
                                disabled={joinCode.length !== 6 || joining}
                                className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors whitespace-nowrap"
                            >
                                {joining ? "접속 중..." : "입장"}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowNewBoard(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm hover:shadow-md text-center"
                        >
                            + 새 보드 만들기
                        </button>
                    </div>
                </header>

                {showNewBoard && (
                    <div className="mb-6 bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                            autoFocus
                            type="text"
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") createNewBoard(); if (e.key === "Escape") setShowNewBoard(false); }}
                            placeholder="새 보드의 이름을 입력해주세요"
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={createNewBoard}
                                disabled={creating}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:bg-blue-400"
                            >
                                {creating ? "생성 중..." : "만들기"}
                            </button>
                            <button
                                onClick={() => { setShowNewBoard(false); setNewBoardTitle(""); }}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boards.map((board) => (
                        <div
                            key={board.id}
                            onClick={() => router.push(`/board/${board.id}`)}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-4 group"
                        >
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                {board.title}
                            </h3>
                            <div className="text-xs text-gray-400 mt-auto">
                                마지막 수정: {new Date(board.updatedAt).toLocaleString("ko-KR")}
                            </div>
                        </div>
                    ))}
                    {boards.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                            아직 생성된 보드가 없습니다. 새 보드를 만들어 작업을 시작해보세요!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
