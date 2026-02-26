"use client";

import React, { useRef, useCallback } from 'react';
import { useBoard } from '@/contexts/BoardContext';
import {
    ReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    useReactFlow,
    type OnNodeDrag,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CriteriaNode from '@/components/CriteriaNode';
import CustomEdge from '@/components/CustomEdge';
import CursorOverlay from '@/components/CursorOverlay';
import { AchievementCriteria } from '@/types';

const nodeTypes = {
    criteriaNode: CriteriaNode,
};

const edgeTypes = {
    customEdge: CustomEdge,
};

export default function MainBoard() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, sendCursorPosition, sendDragStart, sendDragEnd } = useBoard();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const criteriaStr = event.dataTransfer.getData('application/reactflow-criteria');

            if (!criteriaStr) return;

            const criteria = JSON.parse(criteriaStr);

            const position = screenToFlowPosition({
                x: event.clientX - 150,
                y: event.clientY - 50,
            });

            const newNode = {
                id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: 'criteriaNode',
                position,
                data: { criteria, memo: "" },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [setNodes, screenToFlowPosition]
    );

    const onMouseMove = useCallback((event: React.MouseEvent) => {
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        sendCursorPosition(flowPos.x, flowPos.y);
    }, [screenToFlowPosition, sendCursorPosition]);

    const onNodeDragStart: OnNodeDrag<Node> = useCallback((_event, node) => {
        const criteria = node.data?.criteria as AchievementCriteria | undefined;
        const title = criteria?.description || criteria?.code || node.id;
        sendDragStart(node.id, title);
    }, [sendDragStart]);

    const onNodeDragStop: OnNodeDrag<Node> = useCallback(() => {
        sendDragEnd();
    }, [sendDragEnd]);

    return (
        <main className="flex-1 bg-gray-100 p-0 md:p-4 overflow-hidden relative h-[55%] md:h-auto flex flex-col">
            <div className="w-full flex justify-between items-center px-4 py-2 bg-white/50 backdrop-blur border-b border-gray-200 z-10 shrink-0">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🎯</span> 내 성취기준 보드
                    <span className="text-xs md:text-sm font-normal text-gray-500 ml-1 md:ml-2">({nodes.length}개)</span>
                </h2>

                <div className="text-xs text-gray-500 flex gap-4">
                    <span>드래그로 이동</span>
                    <span>핸들 드래그로 선 연결</span>
                    <span>선 선택 후 Backspace로 삭제</span>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onMouseMove={onMouseMove}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    colorMode="light"
                    className="bg-gray-50/50"
                >
                    <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                    <Controls />
                    <CursorOverlay />
                </ReactFlow>
                {nodes.length === 0 && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 font-medium z-10 bg-white/30 backdrop-blur-sm">
                        <span className="text-4xl mb-3">📥</span>
                        <div className="bg-white/80 px-6 py-4 rounded-2xl shadow-sm border border-gray-200 text-center pointer-events-auto">
                            오른쪽 패널에서 성취기준 카드를 <br />
                            <span className="text-blue-500 font-bold">드래그하여 이곳에 배치</span>하세요.
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
