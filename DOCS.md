# TRally 프로젝트 문서

토론 모임 관리 웹 애플리케이션

---

## 프로젝트 구조

```
TRally/
├── Program.cs                 # ASP.NET Core 서버 설정
├── Properties/
│   └── launchSettings.json    # 개발 서버 설정
└── wwwroot/
    ├── index.html             # 메인 HTML 페이지
    ├── css/
    │   └── style.css          # 스타일시트
    └── js/
        ├── config.js          # 설정 상수
        ├── supabase-client.js # 데이터베이스 클라이언트
        ├── auth.js            # 인증 관련 기능
        └── main.js            # 메인 애플리케이션 로직
```

---

## 서버 파일

### Program.cs

ASP.NET Core 웹 서버 설정 파일

| 기능 | 설명 |
|------|------|
| 응답 압축 | Brotli/Gzip 압축으로 전송 크기 최적화 |
| MIME 타입 | `.md` 파일을 `text/markdown`으로 제공 |
| 정적 파일 | wwwroot 폴더의 파일 제공 |
| 캐싱 | 정적 파일에 24시간 캐시 헤더 설정 |

### launchSettings.json

개발 환경 설정

- **HTTP 포트**: 5001
- **HTTPS 포트**: 7001
- **환경**: Development

---

## 프론트엔드 파일

### index.html

메인 HTML 페이지 (Single Page Application)

#### 페이지 구성

| 페이지 ID | 설명 |
|-----------|------|
| `loginPage` | 로그인/회원가입 폼 |
| `mainPage` | 로그인 후 메인 페이지 |
| `schedulePage` | 토론 일정 목록 |
| `topicsPage` | 제안된 주제 목록 |
| `adminPage` | 관리자용 회원 관리 |

#### 외부 라이브러리

- **Supabase JS**: 데이터베이스 연동
- **EmailJS**: 이메일 발송
- **SheetJS (XLSX)**: 엑셀 파일 처리
- **Marked.js**: 마크다운 파싱

---

### css/style.css

스타일시트

#### 주요 스타일 구성

- 반응형 레이아웃 (1024px, 768px, 480px 브레이크포인트)
- 로그인/회원가입 폼 스타일
- 일정 테이블 스타일
- 주제 목록 카드 스타일
- 관리자 페이지 스타일

---

## JavaScript 파일

### js/config.js

설정 상수 정의

| 상수 | 용도 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase 익명 API 키 |
| `EMAILJS_PUBLIC_KEY` | EmailJS 공개 키 |
| `EMAILJS_SERVICE_ID` | EmailJS 서비스 ID |
| `EMAILJS_TEMPLATE_ID` | EmailJS 템플릿 ID |
| `ADMIN_EMAIL` | 관리자 이메일 주소 |

---

### js/supabase-client.js

Supabase 데이터베이스 클라이언트 및 CRUD 함수

#### 전역 변수

| 변수 | 타입 | 설명 |
|------|------|------|
| `supabaseClient` | Object | Supabase 클라이언트 인스턴스 |
| `users` | Array | 승인된 사용자 목록 |
| `pendingUsers` | Array | 승인 대기 사용자 목록 |
| `currentUser` | Object | 현재 로그인한 사용자 |
| `schedules` | Array | 일정 목록 |
| `topics` | Array | 주제 목록 |
| `currentFilter` | String | 현재 주제 필터 |

#### 초기화 함수

| 함수 | 설명 |
|------|------|
| `initializeData()` | 모든 데이터(사용자, 일정, 주제) 병렬 로드 |

#### 사용자 관련 함수

| 함수 | 매개변수 | 반환값 | 설명 |
|------|----------|--------|------|
| `loadUsersFromDB()` | - | - | 승인된 사용자 목록 로드 |
| `loadPendingUsersFromDB()` | - | - | 대기 사용자 목록 로드 |
| `addPendingUser(user)` | user 객체 | 저장된 user | 회원가입 신청 추가 |
| `approveUserInDB(userId)` | userId | - | 사용자 승인 처리 |
| `rejectUserInDB(userId)` | userId | - | 사용자 거부 (삭제) |
| `unapproveUserInDB(userId)` | userId | - | 사용자 승인 해제 |
| `checkUsernameExists(username)` | username | boolean | 아이디 중복 확인 |
| `authenticateUser(username, password)` | username, password | user 또는 null | 로그인 인증 |

#### 일정 관련 함수

| 함수 | 매개변수 | 반환값 | 설명 |
|------|----------|--------|------|
| `loadSchedulesFromDB()` | - | - | 일정 목록 로드 (회차 내림차순) |
| `addScheduleToDB(schedule)` | schedule 객체 | 저장된 schedule | 새 일정 추가 |
| `updateScheduleInDB(scheduleId, schedule)` | scheduleId, schedule 객체 | - | 일정 수정 |
| `deleteScheduleFromDB(scheduleId)` | scheduleId | - | 일정 삭제 |

#### 주제 관련 함수

| 함수 | 매개변수 | 반환값 | 설명 |
|------|----------|--------|------|
| `loadTopicsFromDB()` | - | - | 주제 목록 로드 (생성일 내림차순) |
| `addTopicToDB(topicData)` | topicData 객체 | 저장된 topic | 새 주제 추가 |
| `updateTopicInDB(topicId, topicData)` | topicId, topicData 객체 | - | 주제 수정 |
| `deleteTopicFromDB(topicId)` | topicId | - | 주제 삭제 |

---

### js/auth.js

인증 및 사용자 관리 기능

#### UI 전환 함수

| 함수 | 설명 |
|------|------|
| `showSignup()` | 회원가입 폼 표시 |
| `showLogin()` | 로그인 폼 표시 |

#### 인증 함수

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `signup(event)` | form event | 회원가입 처리 (중복확인, DB저장, 이메일발송) |
| `login(event)` | form event | 로그인 처리 및 메인 페이지 이동 |
| `logout()` | - | 로그아웃 처리 |

#### 이메일 발송 함수

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `sendAdminNotification(user)` | user 객체 | 관리자에게 가입 신청 알림 발송 |
| `sendUserNotification(user, approved)` | user 객체, boolean | 사용자에게 승인/거부 결과 발송 |

#### 회원 관리 함수 (관리자용)

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `approveUser(userId)` | userId | 회원 가입 승인 |
| `rejectUser(userId)` | userId | 회원 가입 거부 |
| `unapproveUser(userId)` | userId | 승인된 회원의 승인 해제 |

---

### js/main.js

메인 애플리케이션 로직

#### 초기화

| 함수/이벤트 | 설명 |
|-------------|------|
| `DOMContentLoaded` | 앱 초기화 (EmailJS, 데이터 로드, 스크롤 동기화) |

#### 유틸리티 함수

| 함수 | 매개변수 | 반환값 | 설명 |
|------|----------|--------|------|
| `initScrollSync()` | - | - | 상단/하단 스크롤바 동기화 설정 |
| `updateScrollWidth()` | - | - | 스크롤바 너비 업데이트 |
| `formatDate(dateStr)` | 날짜 문자열 | 포맷된 문자열 | 날짜를 "년 월 일" 형식으로 변환 |
| `parseToISODate(dateStr)` | 날짜 문자열 | ISO 문자열 | 날짜를 YYYY-MM-DD 형식으로 변환 |

#### 페이지 전환

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `showPage(pageName)` | 'schedule', 'topics', 'admin' | 해당 페이지로 전환 |

#### 일정 관련 함수

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `loadSchedules()` | - | 일정 테이블 렌더링 |
| `showScheduleForm()` | - | 새 일정 추가 폼 표시 |
| `editSchedule(scheduleId)` | scheduleId | 일정 수정 폼 표시 |
| `saveSchedule(event)` | form event | 일정 저장 (추가/수정) |
| `deleteSchedule(scheduleId)` | scheduleId | 일정 삭제 |
| `cancelScheduleEdit()` | - | 일정 편집 취소 |
| `uploadExcel(event)` | file event | 엑셀 파일에서 일정 일괄 업로드 |

#### 주제 관련 함수

| 함수 | 매개변수 | 설명 |
|------|----------|------|
| `loadTopics()` | - | 주제 목록 로드 |
| `displayTopics(author)` | 'all' 또는 제안자 이름 | 주제 목록 렌더링 (제안자별 그룹핑) |
| `filterByAuthor(author)` | 'all' 또는 제안자 이름 | 제안자별 필터링 |
| `showTopicForm()` | - | 새 주제 추가 폼 표시 |
| `editTopic(topicId)` | topicId | 주제 수정 폼 표시 |
| `saveTopic(event)` | form event | 주제 저장 (추가/수정) |
| `deleteCurrentTopic()` | - | 현재 편집 중인 주제 삭제 |
| `cancelTopicEdit()` | - | 주제 편집 취소 |

#### 주제 정렬 순서

제안자 표시 순서: 다흰 → 민구 → 아름 → 승종 → 원혁 → 동원 → 기타 (가나다순)

각 제안자 내에서: 미진행 주제 → 진행된 주제

#### 회원 관리 함수 (관리자용)

| 함수 | 설명 |
|------|------|
| `loadPendingUsers()` | 승인 대기 회원 목록 렌더링 |
| `loadApprovedMembers()` | 승인된 회원 목록 렌더링 |

---

## 데이터베이스 스키마 (Supabase)

### users 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본 키 |
| name | TEXT | 사용자 이름 |
| username | TEXT | 로그인 ID |
| password | TEXT | 비밀번호 |
| email | TEXT | 이메일 |
| intro | TEXT | 자기소개 |
| role | TEXT | 역할 ('admin' 또는 'member') |
| approved | BOOLEAN | 승인 여부 |
| request_date | TIMESTAMP | 가입 신청일 |

### schedules 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본 키 |
| number | INTEGER | 회차 |
| presenter | TEXT | 발제자 |
| moderator | TEXT | 사회자 |
| date | DATE | 날짜 |
| topic | TEXT | 주제 |
| location | TEXT | 장소 |
| guest | TEXT | 게스트 |
| remarks | TEXT | 비고 |

### topics 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본 키 |
| author | TEXT | 제안자 |
| topic | TEXT | 주제 |
| keywords | TEXT | 키워드 (선택) |
| date | DATE | 진행 날짜 (선택) |
| completed | BOOLEAN | 진행 여부 |
| created_at | TIMESTAMP | 생성일 |

---

## 사용자 권한

| 기능 | 비로그인 | 일반회원 | 관리자 |
|------|----------|----------|--------|
| 일정 조회 | X | O | O |
| 일정 추가/수정/삭제 | X | O | O |
| 엑셀 업로드 | X | X | O |
| 주제 조회 | X | O | O |
| 주제 추가/수정/삭제 | X | O | O |
| 회원 관리 | X | X | O |

---

## 개발 서버 실행

```bash
cd TRally
dotnet run
```

- HTTP: http://localhost:5001
- HTTPS: https://localhost:7001
