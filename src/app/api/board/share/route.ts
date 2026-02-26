import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
    try {
        const { boardId } = await req.json();

        if (!boardId) {
            return NextResponse.json({ error: 'Missing boardId' }, { status: 400 });
        }

        const board = await prisma.board.findUnique({ where: { id: boardId } });
        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // Return existing code if already generated
        if (board.shareCode) {
            return NextResponse.json({ shareCode: board.shareCode });
        }

        // Generate unique 6-digit code with retry
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateCode();
            const existing = await prisma.board.findUnique({ where: { shareCode: code } });
            if (!existing) {
                await prisma.board.update({
                    where: { id: boardId },
                    data: { shareCode: code },
                });
                return NextResponse.json({ shareCode: code });
            }
        }

        return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
    } catch (error) {
        console.error('Share API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
