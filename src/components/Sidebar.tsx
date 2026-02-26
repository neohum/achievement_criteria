"use client";

import React from 'react';
import { useBoard } from '@/contexts/BoardContext';
import { Droppable, Draggable } from '@hello-pangea/dnd';

export default function Sidebar() {
    const {
        gradeGroupFilter, setGradeGroupFilter,
        subjectFilter, setSubjectFilter,
        domainFilter, setDomainFilter,
        availableGradeGroups,
        availableSubjects,
        availableDomains,
        filteredCriteria
    } = useBoard();

    return (
        <aside className="w-full h-[45%] md:w-80 md:h-full bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col pt-2 md:pt-4 shrink-0 overflow-hidden">
            <div className="px-4 md:px-5 pb-3 md:pb-4 border-b border-gray-200">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-4">카드 필터링</h2>
                <div className="flex flex-row md:flex-col gap-2 md:gap-3">
                    <div className="flex-1">
                        <label className="hidden md:block text-sm font-medium text-gray-700 mb-1">학년군</label>
                        <select
                            value={gradeGroupFilter}
                            onChange={(e) => setGradeGroupFilter(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">학년군 선택</option>
                            {availableGradeGroups.map((group) => (
                                <option key={group} value={group}>{group}학년군</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="hidden md:block text-sm font-medium text-gray-700 mb-1">과목</label>
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            disabled={!gradeGroupFilter}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">과목 선택</option>
                            {availableSubjects.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="hidden md:block text-sm font-medium text-gray-700 mb-1">영역</label>
                        <select
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                            disabled={!subjectFilter}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">영역 선택</option>
                            {availableDomains.map((domain) => (
                                <option key={domain} value={domain}>{domain}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <div className="text-xs font-semibold text-gray-500 mb-1 px-1">
                    조회된 성취기준: {filteredCriteria.length}개
                </div>

                <Droppable droppableId="sidebar-list" isDropDisabled={true}>
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="flex flex-col gap-3 min-h-[100px]"
                        >
                            {filteredCriteria.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400 bg-gray-100/50 rounded-lg border border-dashed border-gray-300">
                                    조건을 선택해주세요.
                                </div>
                            ) : (
                                filteredCriteria.map((item, index) => (
                                    <Draggable key={`${item.code}-${index}`} draggableId={`sidebar-${item.code}-${index}`} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`p-4 bg-white rounded-lg border border-gray-200 cursor-grab hover:shadow-md transition-shadow relative
                          ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105 z-50 ring-2 ring-blue-400 border-transparent' : 'shadow-sm'}
                        `}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm">{item.code}</div>
                                                    <div className="text-[10px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]" title={item.domain}>{item.domain}</div>
                                                </div>
                                                <p className="text-sm text-gray-700 font-medium leading-snug break-keep">{item.description}</p>
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </aside>
    );
}
