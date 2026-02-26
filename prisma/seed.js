const { PrismaClient } = require('@prisma/client');
const Papa = require('papaparse');

const prisma = new PrismaClient();

const SPREADSHEET_ID = "1WrCgrScwfr0fxBQydadL7HhY8lIW24kT1GJogxbmDQY";
const SHEET_GIDS = [
    "1886026176", // 3~4학년군
    "293991459",  // 5~6학년군
];

function parseSheet(csvText) {
    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    return parsed.data
        .map((row) => ({
            gradeGroup: row['학년군'] || '',
            subject: row['교과'] || '',
            domain: row['영역'] || '',
            contentElement: row['내용요소 (지식/이해만)'] || '',
            code: row['성취기준 코드'] || '',
            description: row['성취기준'] || '',
        }))
        .filter((item) => item.code && item.description);
}

async function main() {
    console.log("Downloading data from Google Sheets...");

    const allCriteria = [];

    for (const gid of SHEET_GIDS) {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Sheet gid=${gid} returned ${res.status}`);
        const csvText = await res.text();
        const parsedData = parseSheet(csvText);
        allCriteria.push(...parsedData);
        console.log(`- Fetched ${parsedData.length} records from gid=${gid}`);
    }

    console.log(`Total records parsed: ${allCriteria.length}. Upserting to database...`);

    let count = 0;
    for (const item of allCriteria) {
        await prisma.achievementCriteria.upsert({
            where: { code: item.code },
            update: {
                gradeGroup: item.gradeGroup,
                subject: item.subject,
                domain: item.domain,
                contentElement: item.contentElement,
                description: item.description,
            },
            create: item,
        });
        count++;
        if (count % 50 === 0) console.log(`... Upserted ${count} records`);
    }

    console.log("🎉 Seeding finished successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
