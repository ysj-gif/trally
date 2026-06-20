# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

_Last updated: 2026-06-20_ (댓글 수정/삭제, 갤러리 이미지 모달 수정, 일정 편집 스크롤 수정)

---

## Project Overview

**TRally** is a discussion-community web application (토론 모임 웹사이트) for a specific group of members who organize regular debate sessions. It manages:

- Discussion **schedules** (일정) with file attachments and comments
- Topic **proposals** (주제)
- **User registration** with admin approval workflow
- **Attendance tracking** (출석부)
- **Photo gallery** (갤러리)
- **Feature requests** (요청사항)

The UI is primarily in **Korean**.

---

## Architecture

### Backend: ASP.NET Core 10.0

`TRally/Program.cs` is intentionally minimal — it does only three things:
1. Enables Brotli + Gzip compression for CSS, JS, JSON, and Markdown
2. Registers `.md` files as `text/markdown` MIME type
3. Serves `wwwroot/` as static files with 24-hour cache headers

There are **no custom API routes**. All data access happens from the browser via the Supabase JS client.

### Frontend: Vanilla JS SPA

`wwwroot/index.html` is the single HTML entry point. Navigation between views is handled by JS showing/hiding DOM sections — no router library. All six SPA pages live inside `#mainPage`:

| Page ID | Route key | Description |
|---|---|---|
| `#schedulePage` | `'schedule'` | Schedule table with file attachments and per-row comments |
| `#topicsPage` | `'topics'` | Topic proposals, filtered by author/status |
| `#attendancePage` | `'attendance'` | Year-based attendance grid |
| `#galleryPage` | `'gallery'` | Photo gallery (base64 images stored in DB) |
| `#requestsPage` | `'requests'` | Feature requests / feedback board |
| `#adminPage` | `'admin'` | Admin-only: member approval, topic/schedule management |

JavaScript files are loaded in dependency order — all share the global scope (no ES modules):

| File | Purpose |
|---|---|
| `js/config.js` | Environment constants (Supabase URL/key, EmailJS keys, admin email) |
| `js/supabase-client.js` | Supabase client init, all global state, all DB/Storage CRUD functions |
| `js/auth.js` | Login/signup UI, authentication, admin approval, EmailJS notifications |
| `js/main.js` | Page navigation, schedule/topic/attendance/gallery/requests UI logic |

### Database: Supabase (PostgreSQL)

Full schema is in `TRally/wwwroot/supabase-setup.pgsql`. RLS is enabled on all tables with permissive policies (public read, public write).

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | Display name |
| `username` | TEXT | Login ID (UNIQUE) |
| `password` | TEXT | Plain text — known limitation |
| `email` | TEXT | |
| `intro` | TEXT | Bio |
| `role` | TEXT | `'admin'` or `'member'` |
| `approved` | BOOLEAN | Admin must approve |
| `request_date` | TIMESTAMP | When they applied |
| `created_at` | TIMESTAMP | When approved |

### `schedules`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `number` | INTEGER | Session number (회차) |
| `date` | TEXT | Discussion date |
| `topic` | TEXT | Topic title |
| `presenter` | TEXT | 발제자 |
| `moderator` | TEXT | 사회자 |
| `location` | TEXT | Venue |
| `guest` | TEXT | Guest speaker |
| `remarks` | TEXT | Additional notes |
| `file_url` | TEXT | JSON array of `{url, name}` objects (Supabase Storage); may be a plain URL for legacy rows |
| `file_name` | TEXT | Legacy — single filename for old rows |
| `created_at` | TIMESTAMP | |

### `schedule_comments`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `schedule_id` | UUID | FK → `schedules.id` |
| `author` | TEXT | |
| `content` | TEXT | |
| `created_at` | TIMESTAMP | |

Comments are loaded on-demand per schedule row, not preloaded in `initializeData()`.

### `topics`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `author` | TEXT | |
| `topic` | TEXT | |
| `keywords` | TEXT | |
| `date` | TEXT | Scheduled discussion date |
| `completed` | BOOLEAN | Whether discussion is done |
| `created_at` | TIMESTAMP | |

### `gallery`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | |
| `description` | TEXT | |
| `image_data` | TEXT | Base64-encoded image stored directly in DB |
| `uploader` | TEXT | |
| `created_at` | TIMESTAMP | |

### `topic_comments`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `topic_id` | UUID | FK → `topics.id` (no DB-level constraint) |
| `author` | TEXT | |
| `content` | TEXT | |
| `created_at` | TIMESTAMP | |

Comments are loaded on-demand per topic item, not preloaded.

### `requests`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | Requester name |
| `content` | TEXT | |
| `is_resolved` | BOOLEAN | Admin-toggled |
| `created_at` | TIMESTAMP | |

`requests` has a `localStorage` fallback: if the Supabase table is unavailable, data is stored/read from `localStorage.getItem('trally_requests')`.

### Attendance Tables
Four tables implement the attendance system: `attendance_years` → `attendance_members` and `attendance_schedules` → `attendance_records`. Years cascade-delete their members, schedules, and records.

`attendance_records.attendance` is constrained to `'O'`, `'X'`, or `''`. Records use manual upsert (check existence first, then insert or update).

### Supabase Storage
Files attached to schedules are stored in the `schedules-files` bucket. `file_url` in the `schedules` table holds a JSON-stringified array of `{url, name}` objects. `parseScheduleFiles()` in `main.js` handles backward compatibility with old single-file rows.

---

## Global State (`supabase-client.js`)

All state is module-level and mutated directly by DB functions. `initializeData()` loads everything in parallel via `Promise.allSettled()` at app startup.

```js
// Core
let currentUser = null;
let users = [];           // approved members
let pendingUsers = [];    // awaiting approval
let schedules = [];
let topics = [];
let topicFilters = { status: 'all', authors: [], categories: [] };

// Gallery & requests
let galleryItems = [];
let requestItems = [];

// Attendance (loaded on-demand when attendance page opens)
let attendanceYears = [];
let attendanceMembers = [];
let attendanceSchedules = [];
let attendanceRecords = [];
let currentYearId = null;
```

Session persistence: on `DOMContentLoaded`, `restoreSession()` reads `sessionStorage` to re-authenticate across page refreshes.

---

## Key Conventions

### JavaScript Style
- **ES6+ async/await** for all DB calls — no `.then()` chains
- **Error handling**: `try/catch` with `console.warn()` for soft failures; `alert()` for user-facing errors
- **No frameworks**: vanilla DOM manipulation (`document.getElementById`, `innerHTML`, etc.)
- All files share global scope — no ES modules

### CSS
- **Design language**: glassmorphism with blue gradient backgrounds (`#0f172a` → `#1e40af`)
- **Responsive breakpoints**: 1024px (tablet), 768px (mobile), 480px (small mobile)
- Single stylesheet: `css/style.css`

### Author Ordering
The custom display order for topic authors in `main.js`:
```
다흰 → 민구 → 아름 → 승종 → 원혁 → 동원 → 기타
```
Preserve this when modifying author filter/sort logic.

### Admin Role
`role === 'admin'` unlocks: member approval/removal, schedule CRUD, topic management, attendance editing, request resolution.

---

## Development Setup

### Prerequisites
- .NET 10.0 SDK
- Visual Studio 2022 (or `dotnet` CLI)

### First-Time Setup
```bash
# 1. Create config.js from the template
cp TRally/wwwroot/js/config.sample.js TRally/wwwroot/js/config.js

# 2. Fill in config.js: SUPABASE_URL, SUPABASE_ANON_KEY, EMAILJS_* (optional), ADMIN_EMAIL

# 3. Run supabase-setup.pgsql in Supabase SQL Editor to create all tables
```

### Running
```bash
cd TRally && dotnet run
# HTTP: http://localhost:5001   HTTPS: https://localhost:7001
```

---

## Build & Deployment

- **Debug build**: `Ctrl+Shift+B` in Visual Studio
- **Release build**: Switch dropdown to Release, then `Ctrl+Shift+B`
- **Publish**: Right-click project → Publish
- **Netlify**: `wwwroot/netlify.toml` redirects all routes to `index.html`

---

## Gitignored Files

| File | Reason |
|---|---|
| `TRally/wwwroot/js/config.js` | Live API keys and secrets |
| `appsettings.Development.json` | Dev-only settings |
| `appsettings.Production.json` | Production secrets |

Reference `config.sample.js` for the required constants.

---

## Security Considerations

- **Passwords are plain text** — known limitation; bcrypt is planned
- **RLS policies are permissive** — public read and write on all tables
- **`innerHTML` is used widely** — sanitize or escape any user-provided content before insertion
- SQL injection is not a risk — all DB access goes through Supabase JS client (parameterized)

---

## External Services

| Service | Purpose | Config |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL DB + Storage | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| [EmailJS](https://www.emailjs.com) | Email on signup/approval | `EMAILJS_*` |
| [SheetJS (XLSX)](https://sheetjs.com) | Excel import/export for schedules | CDN |
| [Marked.js](https://marked.js.org) | Markdown rendering | CDN |
| Google Fonts | Poppins + Noto Sans KR | CDN |

---

## Key Files Quick Reference

| Task | File(s) |
|---|---|
| Server middleware / ports | `TRally/Program.cs`, `Properties/launchSettings.json` |
| Page layout / HTML structure | `wwwroot/index.html` |
| Visual design | `wwwroot/css/style.css` |
| DB functions / global state | `wwwroot/js/supabase-client.js` |
| Auth / approval flow | `wwwroot/js/auth.js` |
| Page navigation / feature logic | `wwwroot/js/main.js` |
| Config constants | `wwwroot/js/config.js` (local), `config.sample.js` (template) |
| DB schema | `wwwroot/supabase-setup.pgsql` |
| Topic seed data | `TRally/import_topics.sql` |
