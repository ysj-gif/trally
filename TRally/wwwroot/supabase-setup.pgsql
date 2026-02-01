-- Supabase 테이블 생성 SQL
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 사용자 테이블
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    intro TEXT,
    role TEXT DEFAULT 'member',
    approved BOOLEAN DEFAULT false,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 일정 테이블
CREATE TABLE schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number INTEGER NOT NULL,
    date TEXT NOT NULL,
    topic TEXT NOT NULL,
    presenter TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 주제 테이블
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author TEXT NOT NULL,
    topic TEXT NOT NULL,
    keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 관리자 계정 추가
INSERT INTO users (name, username, password, email, role, approved)
VALUES ('관리자', 'admin', '1234', 'frtysj@gmail.com', 'admin', true);

-- 초기 일정 데이터
INSERT INTO schedules (number, date, topic, presenter) VALUES
(205, '2026년 3월 8일', 'AI로 인한 삶의 변화', '유승종'),
(204, '2026년 2월 22일', '버츄얼 휴먼의 등장', '이민구'),
(203, '2026년 2월 8일', '변동성의 습격 - 일관성+연속성이 계속 유의미할 영역은?', '신아름');

-- 초기 주제 데이터
INSERT INTO topics (author, topic) VALUES
('다흰', '예쁨의 차별은 과정과 상관 없이 절대수용 되는 이유'),
('다흰', '죄책감 마케팅의 장단점과 대안'),
('샘', '다중정체성(부계정)의 보편화'),
('승종', '공정하다는 착각'),
('민구', '전문성의 축적, 전문가가 되어가는 과정'),
('아름', '억울함의 메커니즘'),
('아름', '호기심의 작동원리');

-- Row Level Security (RLS) 설정 - 읽기는 모두 허용, 쓰기는 제한
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- 모든 테이블 읽기 허용
CREATE POLICY "Allow read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON topics FOR SELECT USING (true);

-- 사용자 테이블 쓰기 허용 (회원가입, 승인 등)
CREATE POLICY "Allow insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON users FOR DELETE USING (true);

-- 주제 테이블 쓰기 허용
CREATE POLICY "Allow insert" ON topics FOR INSERT WITH CHECK (true);

-- ============================================
-- 출석부 관련 테이블
-- ============================================

-- 출석부 연도 테이블
CREATE TABLE attendance_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 출석부 멤버 테이블
CREATE TABLE attendance_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year_id UUID REFERENCES attendance_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 출석부 일정 테이블
CREATE TABLE attendance_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year_id UUID REFERENCES attendance_years(id) ON DELETE CASCADE,
    schedule_date TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 출석 기록 테이블
CREATE TABLE attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES attendance_schedules(id) ON DELETE CASCADE,
    member_id UUID REFERENCES attendance_members(id) ON DELETE CASCADE,
    attendance TEXT CHECK (attendance IN ('O', 'X', '')),
    reason TEXT,
    record_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schedule_id, member_id)
);

-- 출석부 테이블 RLS 설정
ALTER TABLE attendance_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 출석부 테이블 읽기 허용
CREATE POLICY "Allow read access" ON attendance_years FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON attendance_members FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON attendance_schedules FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON attendance_records FOR SELECT USING (true);

-- 출석부 테이블 쓰기 허용
CREATE POLICY "Allow insert" ON attendance_years FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON attendance_years FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON attendance_years FOR DELETE USING (true);

CREATE POLICY "Allow insert" ON attendance_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON attendance_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON attendance_members FOR DELETE USING (true);

CREATE POLICY "Allow insert" ON attendance_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON attendance_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON attendance_schedules FOR DELETE USING (true);

CREATE POLICY "Allow insert" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON attendance_records FOR DELETE USING (true);

-- 2026년 초기 데이터
INSERT INTO attendance_years (year) VALUES (2026);

-- 2026년 멤버 추가
INSERT INTO attendance_members (year_id, name, sort_order)
SELECT id, '신아름', 1 FROM attendance_years WHERE year = 2026
UNION ALL
SELECT id, '유승종', 2 FROM attendance_years WHERE year = 2026
UNION ALL
SELECT id, '이민구', 3 FROM attendance_years WHERE year = 2026
UNION ALL
SELECT id, '장원혁', 4 FROM attendance_years WHERE year = 2026
UNION ALL
SELECT id, '권동원', 5 FROM attendance_years WHERE year = 2026;

-- 2026년 일정 추가
INSERT INTO attendance_schedules (year_id, schedule_date, sort_order)
SELECT id, '1/11', 1 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '1/25', 2 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '2/8', 3 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '2/22', 4 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '3/8', 5 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '3/22', 6 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '4/5', 7 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '4/19', 8 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '5/3', 9 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '5/17', 10 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '5/31', 11 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '6/14', 12 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '6/28', 13 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '7/12', 14 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '7/26', 15 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '8/9', 16 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '8/23', 17 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '9/6', 18 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '9/20', 19 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '10/18', 20 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '11/01', 21 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '11/15', 22 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '11/29', 23 FROM attendance_years WHERE year = 2026
UNION ALL SELECT id, '12/20', 24 FROM attendance_years WHERE year = 2026;

-- ============================================
-- 갤러리 테이블
-- ============================================

-- 갤러리 테이블
CREATE TABLE gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_data TEXT NOT NULL,
    uploader TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 갤러리 테이블 RLS 설정
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- 갤러리 테이블 읽기 허용
CREATE POLICY "Allow read access" ON gallery FOR SELECT USING (true);

-- 갤러리 테이블 쓰기 허용
CREATE POLICY "Allow insert" ON gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON gallery FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON gallery FOR DELETE USING (true);
