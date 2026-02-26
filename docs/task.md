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
  - [x] Next.js Server-Sent Events(SSE) 스트리밍 라우트 (`/api/board/stream`) 구현
  - [x] Redis Pub/Sub 채널 설정 및 기존 업데이트 API에 Publish 로직 통합
  - [x] 클라이언트(BoardContext)에서 SSE 구독 수신 및 실시간 UI 업데이트 로직 연동
  - [ ] 동시 접속자(Presence) 정보 시각화 표시 구현Background Worker를 이용해 Redis 캐시를 PostgreSQL로 동기화

- [x] Phase 5: 메모 및 엑셀 다운로드
  - [x] 메인 영역의 카드에 메모 입력(`textarea`) 추가 (입력 시 DB 상태 동기화)
  - [x] 입력된 메모 상태(State) 관리
  - [x] `xlsx` 패키지 설치
  - [x] 현재 메인 영역의 정렬된 카드(순서, 성취기준, 메모) 데이터를 엑셀로 변환/다운로드 로직 구현

- [x] Phase 6: 디자인 및 애니메이션 (Polish)
  - [x] 고품질 UI/UX 적용 (Hover, Transition, Glassmorphism 디자인 등)
  - [x] 반응형 최적화 혹은 데스크톱 화면 비율 고정 등 환경 대응
  - [x] 코드 리팩토링 및 주석 추가
