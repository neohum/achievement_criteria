# 성취기준 카드 분류 및 정렬 서비스 태스크

- [x] Phase 1: 프로젝트 세팅 및 기본 UI 구축
  - [x] `create-next-app`으로 Next.js 프로젝트 생성
  - [x] 전역 스타일(테마, 색상) 및 폰트 세팅(Vanilla CSS)
  - [x] 메인 레이아웃 및 뼈대(TopBar, MainBoard, Sidebar) 작성

- [x] Phase 2: 데이터 연동 및 패널(사이드바) 구현
  - [x] 구글 스프레드시트 배포 또는 CSV 파싱(`papaparse`) 적용
  - [x] 데이터 파싱 후 상태(State) 로드
  - [x] 3~4학년군, 5~6학년군 및 과목 필터링 렌더링
  - [x] 사이드바 성취기준 카드 UI (draggable) 구현

- [x] Phase 3: 드래그 앤 드롭 기능
  - [x] `@hello-pangea/dnd` 패키지 설치
  - [x] DragDropContext, Droppable, Draggable 구조 세팅
  - [x] 사이드바에서 메인 영역(Droppable 2)으로 카드 드래그 이동
  - [x] 메인 영역 내부 순서 변경 (Sortable) 로직 구현

- [x] Phase 4: 데이터베이스(PostgreSQL) & Redis 연동 및 오토세이브
  - [x] PostgreSQL 세팅 및 Prisma 스키마 설계
  - [x] Upstash 등 Redis 프로젝트 셋업 및 클라이언트 연결
  - [x] Next.js API Routes / Action 생성 (저장 API)
  - [x] 프론트엔드 드래그(onDragEnd) 시 캐싱 DB(Redis)에 실시간 상태 업데이트
  - [x] 초기 렌더링 시 Redis(또는 DB 폴백)에서 상태 Fetch 및 반영
  - [x] Cron Job 또는 Background Worker를 이용해 Redis 캐시를 PostgreSQL로 동기화

- [x] Phase 5: 메모 및 엑셀 다운로드
  - [x] 메인 영역의 카드에 메모 입력(`textarea`) 추가 (입력 시 DB 상태 동기화)
  - [x] 입력된 메모 상태(State) 관리
  - [x] `xlsx` 패키지 설치
  - [x] 현재 메인 영역의 정렬된 카드(순서, 성취기준, 메모) 데이터를 엑셀로 변환/다운로드 로직 구현

- [x] Phase 6: 디자인 및 애니메이션 (Polish)
  - [x] 고품질 UI/UX 적용 (Hover, Transition, Glassmorphism 디자인 등)
  - [x] 반응형 최적화 혹은 데스크톱 화면 비율 고정 등 환경 대응
  - [x] 코드 리팩토링 및 주석 추가

- [x] Phase 8: 다중 보드 및 실시간 협업 시스템 (Advanced)
  - [x] Prisma 스키마 업데이트 (`Board` 모델 생성, UUID 라우팅)
  - [x] `npx prisma db push` 및 `prisma generate` 재실행
  - [x] 다중 작업 목록 로비(Lobby) 페이지 및 라우팅 설정 (`/`, `/board/[id]`)
  - [x] 새 작업 생성 및 리스트 조회 API 생성
  - [ ] Next.js Server-Sent Events(SSE) 스트리밍 라우트 (`/api/board/stream`) 구현
  - [ ] Redis Pub/Sub 채널 설정 및 기존 업데이트 API에 Publish 로직 통합
  - [x] 클라이언트(BoardContext)에서 SSE 구독 수신 및 실시간 UI 업데이트 로직 연동
  - [x] 동시 접속자(Presence) 정보 시각화 표시 구현

- [x] Phase 9: 모바일 최적화 및 반응형 웹(Responsive Web) 지원
  - [x] `TopBar` 요소들의 모바일 뷰 축소 및 Flex 조정
  - [x] 로비 메뉴(`page.tsx`) 모바일 해상도 패딩/마진 및 스태킹 구조 적용
  - [x] `MainBoard` 및 `Sidebar` 컴포넌트의 모바일 화면 분할 (Flex-col stacking)
  - [x] 터치 환경에서 원활한 스크롤 및 Drag & Drop 대응

- [x] Phase 10: 성취기준 데이터 PostgreSQL 자체 DB 전환
  - [x] `prisma/schema.prisma`에 `AchievementCriteria` 모델 추가
  - [x] `npx prisma db push` 실행으로 DB 테이블 생성
  - [x] 기존 구글 시트 데이터를 1회 파싱하여 DB에 저장하는 Seed 로직(또는 임시 API Route) 구현하고 실행
  - [x] `src/utils/fetchData.ts` 코드를 Google Sheet Fetch 방식에서 `prisma.achievementCriteria.findMany()` 방식(DB 조회)으로 전면 교체

- [x] Phase 11: 실시간 성취기준 사용 횟수(Usage Count) 뱃지 표시
  - [x] `Sidebar.tsx`: 현재 선택된 성취기준이 보드에 몇 번 올라갔는지 계산하여 우측 상단 뱃지로 시각화
  - [x] `MainBoard.tsx`: 보드에 중복 배치된 성취기준에 한하여, '현재 순번 / 전체 사용 횟수'를 배지에 추가로 명시
