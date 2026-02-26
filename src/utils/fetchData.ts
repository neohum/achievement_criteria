import { AchievementCriteria } from '@/types';
import prisma from '@/lib/prisma';

export async function fetchAchievementData(): Promise<AchievementCriteria[]> {
    try {
        const dbCriteria = await prisma.achievementCriteria.findMany({
            orderBy: [
                { gradeGroup: 'asc' },
                { subject: 'asc' },
                { code: 'asc' }
            ]
        });

        // Map Prisma DB models back to the app's AchievementCriteria interface
        return dbCriteria.map((item: any) => ({
            gradeGroup: item.gradeGroup,
            subject: item.subject,
            domain: item.domain,
            contentElement: item.contentElement,
            code: item.code,
            description: item.description,
        }));
    } catch (error) {
        console.error("Failed to load achievement criteria from database", error);
        return [];
    }
}
