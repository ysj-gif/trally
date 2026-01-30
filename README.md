# TRally - Visual Studio 프로젝트

토론으로 성장하는 커뮤니티를 위한 ASP.NET 웹 애플리케이션

## 프로젝트 구조

```
TRally/
├── TRally.sln                  # Visual Studio 솔루션 파일
├── README.md                   # 프로젝트 설명서
├── DOCS.md                     # 상세 기술 문서
├── .gitignore                  # Git 무시 파일
└── TRally/
    ├── TRally.csproj           # 프로젝트 파일
    ├── Program.cs              # ASP.NET Core 진입점
    ├── appsettings.json        # 애플리케이션 설정
    ├── import_topics.sql       # 주제 SQL 임포트 스크립트
    ├── Properties/
    │   └── launchSettings.json # 실행 포트 및 환경 설정
    └── wwwroot/                # 정적 파일 (프론트엔드)
        ├── index.html          # 메인 HTML
        ├── supabase-setup.pgsql # PostgreSQL 테이블 생성 스크립트
        ├── topics.md           # 토론 주제 마크다운
        ├── css/
        │   └── style.css       # 스타일시트 (반응형)
        └── js/
            ├── config.js       # 환경 설정 (Supabase, EmailJS)
            ├── config.sample.js # 환경 설정 샘플
            ├── supabase-client.js # 데이터베이스 클라이언트
            ├── auth.js         # 인증 로직
            └── main.js         # 메인 애플리케이션 로직
```

## 시작하기

### 사전 요구사항

- .NET 10.0 SDK
- Visual Studio 2022 (또는 2019 이상)
- ASP.NET 및 웹 개발 워크로드

### 환경 설정

1. **Supabase 설정**
   - [Supabase](https://supabase.com)에서 새 프로젝트 생성
   - `TRally/wwwroot/supabase-setup.pgsql` 스크립트 실행하여 테이블 생성

2. **config.js 설정**
   ```bash
   # config.sample.js를 복사하여 config.js 생성
   cp TRally/wwwroot/js/config.sample.js TRally/wwwroot/js/config.js
   ```
   - `config.js`에 Supabase URL과 API Key 입력
   - EmailJS 설정값 입력 (선택사항)

3. **EmailJS 설정** (선택사항)
   - [EmailJS](https://www.emailjs.com)에서 계정 생성
   - 서비스 및 템플릿 생성 후 `config.js`에 설정

### Visual Studio에서 실행

1. Visual Studio 실행
2. **파일 > 열기 > 프로젝트/솔루션**에서 `TRally.sln` 선택
3. **F5** 또는 **디버그 > 디버깅 시작**
4. 브라우저가 자동으로 열리며 `https://localhost:7001` 또는 `http://localhost:5001`로 접속

### CLI에서 실행

```bash
cd TRally
dotnet run
```

## 테스트 계정

**관리자 계정:**
- 아이디: `admin`
- 비밀번호: `1234`

## 주요 기능

### 회원 관리
- 회원가입 (관리자 승인 대기)
- 로그인/로그아웃
- 아이디 중복 확인
- 가입 신청자 승인/거부 (관리자)
- 회원 정보 수정 및 삭제
- 이메일 자동 알림 (회원가입 신청, 승인/거부)

### 토론 일정
- 일정 목록 조회
- 새 일정 추가/수정/삭제 (관리자)
- 엑셀 파일 대량 업로드
- 날짜 포맷 자동 변환

### 주제 관리
- 주제 목록 조회
- 제안자별 필터링
- 새 주제 제안
- 주제 수정/삭제
- 마크다운 형식 지원

## 기술 스택

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| ASP.NET Core | 10.0 | 웹 서버 프레임워크 |
| C# | 13 | 백엔드 언어 |

### 프론트엔드
| 기술 | 용도 |
|------|------|
| HTML5 | 마크업 |
| CSS3 | 스타일링 (반응형 디자인) |
| JavaScript (ES6+) | 클라이언트 로직 |

### 데이터베이스
| 기술 | 용도 |
|------|------|
| Supabase | PostgreSQL 호스팅 |
| PostgreSQL | 관계형 데이터베이스 |

### 외부 라이브러리
| 라이브러리 | 용도 |
|-----------|------|
| Supabase JS | PostgreSQL 데이터베이스 연동 |
| EmailJS | 이메일 발송 자동화 |
| SheetJS (XLSX) | 엑셀 파일 import/export |
| Marked.js | 마크다운 렌더링 |
| Google Fonts | 웹 폰트 (Poppins, Noto Sans KR) |

## 데이터베이스 구조

### users 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본키 |
| name | TEXT | 사용자 이름 |
| username | TEXT | 로그인 아이디 (UNIQUE) |
| password | TEXT | 비밀번호 |
| email | TEXT | 이메일 |
| intro | TEXT | 자기소개 |
| role | TEXT | 권한 (member/admin) |
| approved | BOOLEAN | 회원 승인 여부 |
| request_date | TIMESTAMP | 가입 신청 날짜 |
| created_at | TIMESTAMP | 계정 생성 날짜 |

### schedules 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본키 |
| number | INTEGER | 회차 번호 |
| date | TEXT | 개최 날짜 |
| topic | TEXT | 토론 주제 |
| presenter | TEXT | 발제자 |
| moderator | TEXT | 사회자 |
| location | TEXT | 장소 |
| guest | TEXT | 게스트 |
| remarks | TEXT | 비고 |

### topics 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본키 |
| author | TEXT | 제안자 |
| topic | TEXT | 주제 |
| keywords | TEXT | 키워드 |
| date | TEXT | 진행 날짜 |
| completed | BOOLEAN | 진행 여부 |

## 개발 가이드

### 정적 파일 수정
`wwwroot` 폴더 내의 파일들을 수정하세요:
- **HTML**: `wwwroot/index.html`
- **CSS**: `wwwroot/css/style.css`
- **JavaScript**: `wwwroot/js/` 폴더

### 서버 설정 수정
- **Program.cs**: 서버 설정 및 미들웨어
- **appsettings.json**: 애플리케이션 설정
- **launchSettings.json**: 실행 포트 및 환경 설정

### 디버깅
1. Visual Studio에서 중단점 설정
2. F5로 디버깅 시작
3. 브라우저 F12로 개발자 도구 열기
4. JavaScript 콘솔에서 로그 확인

## 빌드 및 배포

### 디버그 빌드
```
빌드 > 솔루션 빌드 (Ctrl+Shift+B)
```

### 릴리스 빌드
```
1. 상단 툴바에서 Debug > Release 변경
2. 빌드 > 솔루션 빌드
```

### 게시
```
1. 솔루션 탐색기에서 프로젝트 우클릭
2. 게시 선택
3. 게시 대상 선택 (폴더, Azure, IIS 등)
```

## 포트 변경

`Properties/launchSettings.json` 파일에서 포트 수정:
```json
"applicationUrl": "https://localhost:원하는포트;http://localhost:원하는포트"
```

## 보안 주의사항

- `config.js`는 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다
- 배포 시 환경별로 별도의 `config.js`를 구성하세요
- Supabase RLS(Row Level Security) 정책을 프로덕션 환경에 맞게 강화하세요

## 향후 개발 계획

- [ ] 비밀번호 해싱 (bcrypt)
- [ ] JWT 인증 구현
- [ ] RLS 정책 강화
- [ ] 파일 업로드 기능
- [ ] 실시간 알림

## 문의

관리자 이메일: frtysj@gmail.com

## 라이선스

MIT License

---

Made with TRally Community
