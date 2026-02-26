"use client";

import React from 'react';
import { useViewport } from '@xyflow/react';
import { useBoard, RemoteCursor } from '@/contexts/BoardContext';

// Approximate node dimensions (w-80 = 320px, estimated height ~200px)
const NODE_W = 320;
const NODE_H = 200;

function getHandleFlowPosition(nodeX: number, nodeY: number, handleId: string) {
    switch (handleId) {
        case 'top-target':
            return { x: nodeX + NODE_W / 2, y: nodeY };
        case 'bottom-source':
            return { x: nodeX + NODE_W / 2, y: nodeY + NODE_H };
        case 'left-target':
            return { x: nodeX, y: nodeY + NODE_H / 2 };
        case 'right-source':
            return { x: nodeX + NODE_W, y: nodeY + NODE_H / 2 };
        default:
            return { x: nodeX + NODE_W / 2, y: nodeY + NODE_H };
    }
}

function ConnectionLine({ cursor, viewport, nodes }: { cursor: RemoteCursor; viewport: { x: number; y: number; zoom: number }; nodes: any[] }) {
    if (!cursor.connecting || !cursor.connectSourceNodeId || !cursor.connectSourceHandleId) return null;

    const sourceNode = nodes.find(n => n.id === cursor.connectSourceNodeId);
    if (!sourceNode) return null;

    const handlePos = getHandleFlowPosition(sourceNode.position.x, sourceNode.position.y, cursor.connectSourceHandleId);

    // Convert flow coords to screen coords
    const startX = handlePos.x * viewport.zoom + viewport.x;
    const startY = handlePos.y * viewport.zoom + viewport.y;
    const endX = cursor.x * viewport.zoom + viewport.x;
    const endY = cursor.y * viewport.zoom + viewport.y;

    // Calculate control points for a smooth curve
    const dx = endX - startX;
    const dy = endY - startY;
    const cx1 = startX + dx * 0.3;
    const cy1 = startY + dy * 0.1;
    const cx2 = startX + dx * 0.7;
    const cy2 = startY + dy * 0.9;

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 40 }}>
            {/* Glow effect */}
            <path
                d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
                fill="none"
                stroke={cursor.color}
                strokeWidth="4"
                strokeOpacity="0.2"
                strokeLinecap="round"
            />
            {/* Main line */}
            <path
                d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
                fill="none"
                stroke={cursor.color}
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
            >
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.6s" repeatCount="indefinite" />
            </path>
            {/* Source dot */}
            <circle cx={startX} cy={startY} r="4" fill={cursor.color} />
            {/* Target dot */}
            <circle cx={endX} cy={endY} r="3" fill={cursor.color} opacity="0.6">
                <animate attributeName="r" values="3;5;3" dur="0.8s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

export default function CursorOverlay() {
    const { remoteCursors, nodes } = useBoard();
    const viewport = useViewport();

    if (remoteCursors.size === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from(remoteCursors.values()).map((cursor) => {
                // Convert flow coordinates to container-local coordinates
                const localX = cursor.x * viewport.zoom + viewport.x;
                const localY = cursor.y * viewport.zoom + viewport.y;

                return (
                    <React.Fragment key={cursor.sessionId}>
                        {/* Connection line preview */}
                        <ConnectionLine cursor={cursor} viewport={viewport} nodes={nodes} />

                        {/* Cursor */}
                        <div
                            className="absolute transition-all duration-75 ease-out"
                            style={{
                                left: localX,
                                top: localY,
                                transform: 'translate(-2px, -2px)',
                            }}
                        >
                            {/* Cursor arrow SVG */}
                            <svg
                                width="20"
                                height="24"
                                viewBox="0 0 20 24"
                                fill="none"
                                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                            >
                                <path
                                    d="M1 1L1 18L5.5 13.5L10 22L13 20.5L8.5 12L15 12L1 1Z"
                                    fill={cursor.color}
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                            </svg>

                            {/* Session label */}
                            <div
                                className="absolute left-4 top-5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
                                style={{ backgroundColor: cursor.color }}
                            >
                                {cursor.connecting ? '🔗 연결 중...' : cursor.sessionId.slice(0, 8)}
                            </div>

                            {/* Drag ghost */}
                            {cursor.dragging && cursor.dragCardTitle && (
                                <div
                                    className="absolute left-6 top-10 px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-lg opacity-80 max-w-48 truncate"
                                    style={{ backgroundColor: cursor.color }}
                                >
                                    {cursor.dragCardTitle}
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
