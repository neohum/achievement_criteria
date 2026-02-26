import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code || !/^\d{6}$/.test(code)) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }

        const board = await prisma.board.findUnique({
            where: { shareCode: code },
            select: { id: true },
        });

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        return NextResponse.json({ boardId: board.id });
    } catch (error) {
        console.error('Join API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
