"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    useEffect(() => {
        // Generate or fetch session ID from localStorage
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
            .catch((err) => {
                console.error("Failed to load boards:", err);
                setLoading(false);
            });
    }, []);

    const createNewBoard = async () => {
        if (!sessionId) return;
        const title = prompt("새 보드의 이름을 입력해주세요:");
        if (title === null) return; // cancelled

        try {
            const res = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, title: title || "새 성취기준 보드" }),
            });
            const data = await res.json();
            if (data.board) {
                router.push(`/board/${data.board.id}`);
            }
        } catch (err) {
            console.error("Failed to create board:", err);
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
        <div className="min-h-screen bg-slate-50 font-sans px-8 py-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            에듀
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">내 작업 공간</h1>
                    </div>
                    <button
                        onClick={createNewBoard}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                    >
                        + 새 보드 만들기
                    </button>
                </header>

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
