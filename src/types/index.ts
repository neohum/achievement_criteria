export interface AchievementCriteria {
    gradeGroup: string; // "3~4" or "5~6"
    subject: string; // 교과
    domain: string; // 영역
    contentElement: string; // 내용요소
    code: string; // 성취기준 코드
    description: string; // 성취기준
}

export interface BoardCard {
    id: string; // unqiue id (can be same as code but need uniqueness in case of duplicates, though usually codes are unique)
    criteria: AchievementCriteria;
    memo: string;
}

export interface BoardState {
    cards: BoardCard[];
}
