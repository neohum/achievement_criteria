"use client";

import React from 'react';
import { useBoard } from '@/contexts/BoardContext';
import { Droppable, Draggable } from '@hello-pangea/dnd';

export default function MainBoard() {
    const { boardCards, updateMemo, removeCard } = useBoard();

    return (
        <main className="flex-1 bg-gray-100 p-4 md:p-8 overflow-y-auto relative h-[55%] md:h-auto">
            <div className="max-w-4xl mx-auto min-h-[50vh] md:min-h-[80vh] bg-white/50 backdrop-blur border border-dashed border-gray-300 rounded-2xl p-4 md:p-6 flex flex-col">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <span>🎯</span> 내 성취기준 보드
                    <span className="text-xs md:text-sm font-normal text-gray-500 ml-1 md:ml-2">({boardCards.length}개)</span>
                </h2>

                <Droppable droppableId="main-board">
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`flex-1 flex flex-col gap-4 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                        >
                            {boardCards.length === 0 ? (
                                <div className="w-full border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center text-gray-400 font-medium bg-gray-50/50">
                                    <span className="text-3xl mb-2">📥</span>
                                    오른쪽에서 카드를 드래그하여 이곳에 배치하세요.
                                </div>
                            ) : (
                                boardCards.map((card, index) => (
                                    <Draggable key={card.id} draggableId={card.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 flex flex-col gap-2 md:gap-3 relative group
                                                    ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 scale-[1.02] z-50' : 'hover:shadow-md'}
                                                `}
                                            >
                                                {/* Drag Handle & Delete Button */}
                                                <div className="flex items-center justify-between">
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="flex items-center gap-2 cursor-grab text-gray-400 hover:text-gray-600 transition-colors py-1"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                                                        </svg>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">{card.criteria.gradeGroup}</span>
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">{card.criteria.subject}</span>
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{card.criteria.code}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeCard(card.id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 md:opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all shrink-0"
                                                        title="삭제"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                </div>

                                                {/* Description */}
                                                <div className="text-sm md:text-base text-gray-800 font-medium pl-1 md:pl-7">
                                                    {card.criteria.description}
                                                </div>

                                                {/* Memo area */}
                                                <div className="pl-1 md:pl-7 mt-1 md:mt-2">
                                                    <textarea
                                                        value={card.memo}
                                                        onChange={(e) => updateMemo(card.id, e.target.value)}
                                                        placeholder="이 성취기준에 대한 메모를 입력하세요 (예: 4월 2주차 1차시 수업 적용)"
                                                        className="w-full text-sm bg-yellow-50/50 border border-yellow-200 rounded-lg p-3 min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-700/40"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {/* Trash Zone */}
                <Droppable droppableId="trash">
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`mt-8 h-20 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors
                ${snapshot.isDraggingOver ? 'bg-red-500/10 border-red-500 text-red-600' : 'border-transparent text-transparent bg-transparent'}
              `}
                        >
                            <span className="text-sm font-bold tracking-wider">이곳으로 드래그하여 삭제</span>
                            <div className="hidden">{provided.placeholder}</div>
                        </div>
                    )}
                </Droppable>
            </div>
        </main>
    );
}
