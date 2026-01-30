// Supabase 클라이언트 초기화
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터 저장소 (Supabase에서 로드)
let users = [];
let pendingUsers = [];
let currentUser = null;
let schedules = [];
let topics = [];
let currentFilter = 'all';

// 초기 데이터 로드
async function initializeData() {
    const results = await Promise.allSettled([
        loadUsersFromDB(),
        loadPendingUsersFromDB(),
        loadSchedulesFromDB(),
        loadTopicsFromDB()
    ]);

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.warn(`데이터 로드 ${index} 실패:`, result.reason);
        }
    });

    console.log('데이터 로드 완료');
}

// 사용자 로드
async function loadUsersFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('approved', true);

        if (error) {
            console.warn('사용자 로드 실패:', error.message);
            users = [];
            return;
        }
        users = data || [];
    } catch (e) {
        console.warn('사용자 DB 연결 실패:', e.message);
        users = [];
    }
}

// 대기 사용자 로드
async function loadPendingUsersFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('approved', false);

        if (error) {
            console.warn('대기 사용자 로드 실패:', error.message);
            pendingUsers = [];
            return;
        }
        pendingUsers = data || [];
    } catch (e) {
        console.warn('대기 사용자 DB 연결 실패:', e.message);
        pendingUsers = [];
    }
}

// 일정 로드
async function loadSchedulesFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('schedules')
            .select('*')
            .order('number', { ascending: false });

        if (error) {
            console.warn('일정 로드 실패:', error.message);
            schedules = [];
            return;
        }
        schedules = data || [];
    } catch (e) {
        console.warn('일정 DB 연결 실패:', e.message);
        schedules = [];
    }
}

// 주제 로드
async function loadTopicsFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('topics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('주제 DB 로드 실패 (마크다운 사용):', error.message);
            topics = [];
            return;
        }
        topics = data || [];
    } catch (e) {
        console.warn('주제 DB 연결 실패 (마크다운 사용):', e.message);
        topics = [];
    }
}

// 사용자 추가 (회원가입)
async function addPendingUser(user) {
    const { data, error } = await supabaseClient
        .from('users')
        .insert([{
            name: user.name,
            username: user.username,
            password: user.password,
            email: user.email,
            intro: user.intro,
            role: 'member',
            approved: false,
            request_date: new Date().toISOString()
        }])
        .select();

    if (error) throw error;
    return data[0];
}

// 사용자 승인
async function approveUserInDB(userId) {
    const { error } = await supabaseClient
        .from('users')
        .update({ approved: true })
        .eq('id', userId);

    if (error) throw error;
}

// 사용자 거부 (삭제)
async function rejectUserInDB(userId) {
    const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
}

// 사용자 승인 해제
async function unapproveUserInDB(userId) {
    const { error } = await supabaseClient
        .from('users')
        .update({ approved: false })
        .eq('id', userId);

    if (error) throw error;
}

// 회원 삭제
async function deleteMemberFromDB(userId) {
    const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
}

// 주제 추가
async function addTopicToDB(topicData) {
    const { data, error } = await supabaseClient
        .from('topics')
        .insert([{
            author: topicData.author,
            topic: topicData.topic,
            keywords: topicData.keywords || null,
            date: topicData.date || null,
            completed: topicData.completed || false,
            created_at: new Date().toISOString()
        }])
        .select();
    if (error) throw error;
    return data[0];
}

// 주제 수정
async function updateTopicInDB(topicId, topicData) {
    const { error } = await supabaseClient
        .from('topics')
        .update({
            author: topicData.author,
            topic: topicData.topic,
            keywords: topicData.keywords,
            date: topicData.date,
            completed: topicData.completed
        })
        .eq('id', topicId);
    if (error) throw error;
}

// 주제 삭제
async function deleteTopicFromDB(topicId) {
    const { error } = await supabaseClient
        .from('topics')
        .delete()
        .eq('id', topicId);
    if (error) throw error;
}

// 일정 추가
async function addScheduleToDB(schedule) {
    const { data, error } = await supabaseClient
        .from('schedules')
        .insert([{
            number: schedule.number,
            presenter: schedule.presenter,
            moderator: schedule.moderator,
            date: schedule.date,
            topic: schedule.topic,
            location: schedule.location,
            guest: schedule.guest,
            remarks: schedule.remarks
        }])
        .select();

    if (error) throw error;
    return data[0];
}

// 일정 수정
async function updateScheduleInDB(scheduleId, schedule) {
    const { error } = await supabaseClient
        .from('schedules')
        .update({
            number: schedule.number,
            presenter: schedule.presenter,
            moderator: schedule.moderator,
            date: schedule.date,
            topic: schedule.topic,
            location: schedule.location,
            guest: schedule.guest,
            remarks: schedule.remarks
        })
        .eq('id', scheduleId);

    if (error) throw error;
}

// 일정 삭제
async function deleteScheduleFromDB(scheduleId) {
    const { error } = await supabaseClient
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

    if (error) throw error;
}

// 아이디 중복 확인
async function checkUsernameExists(username) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('username')
        .eq('username', username);

    if (error) throw error;
    return data && data.length > 0;
}

// 로그인 확인
async function authenticateUser(username, password) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('approved', true)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// ============================================
// 출석부 관련 함수
// ============================================

// 출석부 데이터 저장소
let attendanceYears = [];
let attendanceMembers = [];
let attendanceSchedules = [];
let attendanceRecords = [];
let currentYearId = null;

// 연도 목록 로드
async function loadAttendanceYearsFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('attendance_years')
            .select('*')
            .order('year', { ascending: false });

        if (error) {
            console.warn('연도 로드 실패:', error.message);
            attendanceYears = [];
            return;
        }
        attendanceYears = data || [];
    } catch (e) {
        console.warn('연도 DB 연결 실패:', e.message);
        attendanceYears = [];
    }
}

// 멤버 목록 로드
async function loadAttendanceMembersFromDB(yearId) {
    try {
        const { data, error } = await supabaseClient
            .from('attendance_members')
            .select('*')
            .eq('year_id', yearId)
            .order('sort_order', { ascending: true });

        if (error) {
            console.warn('멤버 로드 실패:', error.message);
            attendanceMembers = [];
            return;
        }
        attendanceMembers = data || [];
    } catch (e) {
        console.warn('멤버 DB 연결 실패:', e.message);
        attendanceMembers = [];
    }
}

// 일정 목록 로드
async function loadAttendanceSchedulesFromDB(yearId) {
    try {
        const { data, error } = await supabaseClient
            .from('attendance_schedules')
            .select('*')
            .eq('year_id', yearId)
            .order('sort_order', { ascending: true });

        if (error) {
            console.warn('출석 일정 로드 실패:', error.message);
            attendanceSchedules = [];
            return;
        }
        attendanceSchedules = data || [];
    } catch (e) {
        console.warn('출석 일정 DB 연결 실패:', e.message);
        attendanceSchedules = [];
    }
}

// 출석 기록 로드
async function loadAttendanceRecordsFromDB(yearId) {
    try {
        // 해당 연도의 모든 일정 ID 가져오기
        const scheduleIds = attendanceSchedules.map(s => s.id);

        if (scheduleIds.length === 0) {
            attendanceRecords = [];
            return;
        }

        const { data, error } = await supabaseClient
            .from('attendance_records')
            .select('*')
            .in('schedule_id', scheduleIds);

        if (error) {
            console.warn('출석 기록 로드 실패:', error.message);
            attendanceRecords = [];
            return;
        }
        attendanceRecords = data || [];
    } catch (e) {
        console.warn('출석 기록 DB 연결 실패:', e.message);
        attendanceRecords = [];
    }
}

// 연도 추가
async function addAttendanceYearToDB(year) {
    const { data, error } = await supabaseClient
        .from('attendance_years')
        .insert([{ year: year }])
        .select();

    if (error) throw error;
    return data[0];
}

// 연도 삭제
async function deleteAttendanceYearFromDB(yearId) {
    const { error } = await supabaseClient
        .from('attendance_years')
        .delete()
        .eq('id', yearId);

    if (error) throw error;
}

// 멤버 추가
async function addAttendanceMemberToDB(yearId, name) {
    // 현재 최대 sort_order 가져오기
    const maxOrder = attendanceMembers.length > 0
        ? Math.max(...attendanceMembers.map(m => m.sort_order || 0))
        : 0;

    const { data, error } = await supabaseClient
        .from('attendance_members')
        .insert([{
            year_id: yearId,
            name: name,
            sort_order: maxOrder + 1
        }])
        .select();

    if (error) throw error;
    return data[0];
}

// 멤버 삭제
async function deleteAttendanceMemberFromDB(memberId) {
    const { error } = await supabaseClient
        .from('attendance_members')
        .delete()
        .eq('id', memberId);

    if (error) throw error;
}

// 출석 일정 추가
async function addAttendanceScheduleToDB(yearId, scheduleDate) {
    // 현재 최대 sort_order 가져오기
    const maxOrder = attendanceSchedules.length > 0
        ? Math.max(...attendanceSchedules.map(s => s.sort_order || 0))
        : 0;

    const { data, error } = await supabaseClient
        .from('attendance_schedules')
        .insert([{
            year_id: yearId,
            schedule_date: scheduleDate,
            sort_order: maxOrder + 1
        }])
        .select();

    if (error) throw error;
    return data[0];
}

// 출석 일정 삭제
async function deleteAttendanceScheduleFromDB(scheduleId) {
    const { error } = await supabaseClient
        .from('attendance_schedules')
        .delete()
        .eq('id', scheduleId);

    if (error) throw error;
}

// 출석 기록 저장 (upsert)
async function saveAttendanceRecordToDB(scheduleId, memberId, attendance, reason, recordDate) {
    // 기존 기록 확인
    const { data: existing } = await supabaseClient
        .from('attendance_records')
        .select('id')
        .eq('schedule_id', scheduleId)
        .eq('member_id', memberId)
        .single();

    if (existing) {
        // 업데이트
        const { error } = await supabaseClient
            .from('attendance_records')
            .update({
                attendance: attendance,
                reason: reason,
                record_date: recordDate
            })
            .eq('id', existing.id);

        if (error) throw error;
    } else {
        // 새로 추가
        const { error } = await supabaseClient
            .from('attendance_records')
            .insert([{
                schedule_id: scheduleId,
                member_id: memberId,
                attendance: attendance,
                reason: reason,
                record_date: recordDate
            }]);

        if (error) throw error;
    }
}
