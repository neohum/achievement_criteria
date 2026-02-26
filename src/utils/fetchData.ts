import Papa from 'papaparse';
import { AchievementCriteria } from '@/types';

const SPREADSHEET_ID = "1WrCgrScwfr0fxBQydadL7HhY8lIW24kT1GJogxbmDQY";
const SHEET_GIDS = [
    "1886026176", // 3~4학년군
    "293991459",  // 5~6학년군
];

function parseSheet(csvText: string): AchievementCriteria[] {
    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    return parsed.data
        .map((row: any) => ({
            gradeGroup: row['학년군'] || '',
            subject: row['교과'] || '',
            domain: row['영역'] || '',
            contentElement: row['내용요소 (지식/이해만)'] || '',
            code: row['성취기준 코드'] || '',
            description: row['성취기준'] || '',
        }))
        .filter((item) => item.code && item.description);
}

export async function fetchAchievementData(): Promise<AchievementCriteria[]> {
    const results = await Promise.allSettled(
        SHEET_GIDS.map(async (gid) => {
            const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
            const res = await fetch(url, { next: { revalidate: 3600 } });
            if (!res.ok) throw new Error(`Sheet gid=${gid} returned ${res.status}`);
            const csvText = await res.text();
            return parseSheet(csvText);
        })
    );

    return results.flatMap((result) => {
        if (result.status === 'fulfilled') return result.value;
        console.error("Failed to fetch sheet:", result.reason);
        return [];
    });
}
