// 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // EmailJS 초기화
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // 데이터 로드
    await initializeData();

    // 상단 스크롤바 동기화
    initScrollSync();

    console.log('TRally 앱 초기화 완료');
});

// 스크롤바 동기화
let scrollSyncInitialized = false;

function initScrollSync() {
    if (scrollSyncInitialized) return;

    const scrollTop = document.getElementById('scrollTop');
    const tableContainer = document.getElementById('tableContainer');

    if (!scrollTop || !tableContainer) return;

    let isSyncing = false;

    scrollTop.addEventListener('scroll', () => {
        if (isSyncing) return;
        isSyncing = true;
        tableContainer.scrollLeft = scrollTop.scrollLeft;
        isSyncing = false;
    });

    tableContainer.addEventListener('scroll', () => {
        if (isSyncing) return;
        isSyncing = true;
        scrollTop.scrollLeft = tableContainer.scrollLeft;
        isSyncing = false;
    });

    scrollSyncInitialized = true;
}

// 상단 스크롤바 너비 업데이트
function updateScrollWidth() {
    const table = document.getElementById('scheduleTable');
    const scrollTopInner = document.getElementById('scrollTopInner');
    const scrollTop = document.getElementById('scrollTop');

    if (table && scrollTopInner && scrollTop) {
        const tableWidth = table.scrollWidth;
        scrollTopInner.style.width = tableWidth + 'px';
        scrollTop.style.display = tableWidth > scrollTop.parentElement.offsetWidth ? 'block' : 'none';
    }

    initScrollSync();
}

// 날짜 포맷 (년월일)
function formatDate(dateStr) {
    if (!dateStr) return '';

    // 문자열로 변환
    dateStr = String(dateStr);

    // 이미 "년 월 일" 형식이면 그대로 반환
    if (dateStr.includes('년')) return dateStr;

    // 엑셀 시리얼 날짜 변환 (숫자인 경우)
    const numDate = Number(dateStr);
    if (!isNaN(numDate) && numDate > 10000 && numDate < 100000) {
        // 엑셀 시리얼 날짜: 1900년 1월 1일부터의 일수
        const excelEpoch = new Date(1899, 11, 30); // 엑셀 버그 보정
        const date = new Date(excelEpoch.getTime() + numDate * 24 * 60 * 60 * 1000);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}년 ${month}월 ${day}일`;
    }

    // Date 객체로 변환 시도
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}년 ${month}월 ${day}일`;
}

// 페이지 전환
function showPage(pageName) {
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.add('hidden');
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const pages = {
        'schedule': [document.getElementById('schedulePage'), 0],
        'topics': [document.getElementById('topicsPage'), 1],
        'attendance': [document.getElementById('attendancePage'), 2],
        'admin': [document.getElementById('adminPage'), 3]
    };

    if (pages[pageName]) {
        pages[pageName][0].classList.remove('hidden');
        document.querySelectorAll('.menu-item')[pages[pageName][1]].classList.add('active');

        // 주제 페이지면 주제 로드
        if (pageName === 'topics') {
            loadTopics();
            // 로그인 사용자는 추가 버튼 표시
            if (currentUser) {
                document.getElementById('topicButtons').classList.remove('hidden');
            }
        }

        // 출석부 페이지면 출석부 로드
        if (pageName === 'attendance') {
            loadAttendancePage();
        }
    }
}

// 일정 로드
function loadSchedules() {
    const tableBody = document.getElementById('scheduleTableBody');
    const isLoggedIn = currentUser !== null;
    const isAdmin = currentUser && currentUser.role === 'admin';

    // 로그인한 사용자는 추가/수정/삭제 가능
    if (isLoggedIn) {
        document.getElementById('scheduleButtons').classList.remove('hidden');
        document.getElementById('scheduleActionsHeader').classList.remove('hidden');
    }

    // 관리자만 엑셀 업로드 가능
    if (isAdmin) {
        document.getElementById('excelUploadBtn').classList.remove('hidden');
    }

    tableBody.innerHTML = '';

    schedules.forEach(schedule => {
        const row = document.createElement('tr');
        if (isLoggedIn) {
            row.style.cursor = 'pointer';
            row.ondblclick = () => editSchedule(schedule.id);
        }
        row.innerHTML = `
            <td><span class="schedule-number-badge">${schedule.number || ''}회</span></td>
            <td>${schedule.presenter || ''}</td>
            <td>${schedule.moderator || ''}</td>
            <td>${formatDate(schedule.date)}</td>
            <td>${schedule.topic || ''}</td>
            <td>${schedule.location || ''}</td>
            <td>${schedule.guest || ''}</td>
            <td class="remarks-cell">${schedule.remarks || ''}</td>
            ${isLoggedIn ? `
            <td class="actions-cell">
                <button class="edit-btn" onclick="editSchedule('${schedule.id}')">수정</button>
                <button class="delete-btn" onclick="deleteSchedule('${schedule.id}')">삭제</button>
            </td>
            ` : ''}
        `;
        tableBody.appendChild(row);
    });

    // 스크롤바 너비 업데이트
    setTimeout(updateScrollWidth, 100);
}

// 일정 폼 표시
function showScheduleForm() {
    document.getElementById('scheduleFormContainer').classList.remove('hidden');
    document.getElementById('scheduleButtons').classList.add('hidden');
    document.getElementById('scheduleEditId').value = '';
    document.getElementById('scheduleNumber').value = '';
    document.getElementById('schedulePresenter').value = '';
    document.getElementById('scheduleModerator').value = '';
    document.getElementById('scheduleDate').value = '';
    document.getElementById('scheduleTopic').value = '';
    document.getElementById('scheduleLocation').value = '';
    document.getElementById('scheduleGuest').value = '';
    document.getElementById('scheduleRemarks').value = '';
}

// 날짜를 ISO 형식(YYYY-MM-DD)으로 변환
function parseToISODate(dateStr) {
    if (!dateStr) return '';
    dateStr = String(dateStr);

    // 이미 ISO 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // "년 월 일" 형식 파싱
    const korMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (korMatch) {
        const [, year, month, day] = korMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // 엑셀 시리얼 날짜 변환
    const numDate = Number(dateStr);
    if (!isNaN(numDate) && numDate > 10000 && numDate < 100000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + numDate * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    }

    // Date 객체로 변환 시도
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }

    return '';
}

// 일정 수정 폼
function editSchedule(scheduleId) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    document.getElementById('scheduleFormContainer').classList.remove('hidden');
    document.getElementById('scheduleButtons').classList.add('hidden');
    document.getElementById('scheduleEditId').value = scheduleId;
    document.getElementById('scheduleNumber').value = schedule.number || '';
    document.getElementById('schedulePresenter').value = schedule.presenter || '';
    document.getElementById('scheduleModerator').value = schedule.moderator || '';
    document.getElementById('scheduleDate').value = parseToISODate(schedule.date);
    document.getElementById('scheduleTopic').value = schedule.topic || '';
    document.getElementById('scheduleLocation').value = schedule.location || '';
    document.getElementById('scheduleGuest').value = schedule.guest || '';
    document.getElementById('scheduleRemarks').value = schedule.remarks || '';
}

// 일정 저장 (추가/수정)
async function saveSchedule(event) {
    event.preventDefault();

    const editId = document.getElementById('scheduleEditId').value;
    const schedule = {
        number: parseInt(document.getElementById('scheduleNumber').value) || null,
        presenter: document.getElementById('schedulePresenter').value || null,
        moderator: document.getElementById('scheduleModerator').value || null,
        date: document.getElementById('scheduleDate').value || null,
        topic: document.getElementById('scheduleTopic').value || null,
        location: document.getElementById('scheduleLocation').value || null,
        guest: document.getElementById('scheduleGuest').value || null,
        remarks: document.getElementById('scheduleRemarks').value || null
    };

    try {
        if (editId) {
            await updateScheduleInDB(editId, schedule);
            alert('일정이 수정되었습니다.');
        } else {
            await addScheduleToDB(schedule);
            alert('일정이 추가되었습니다.');
        }

        await loadSchedulesFromDB();
        loadSchedules();
        cancelScheduleEdit();
    } catch (error) {
        console.error('일정 저장 오류:', error);
        alert('일정 저장 중 오류가 발생했습니다.');
    }
}

// 일정 삭제
async function deleteSchedule(scheduleId) {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    try {
        await deleteScheduleFromDB(scheduleId);
        alert('일정이 삭제되었습니다.');
        await loadSchedulesFromDB();
        loadSchedules();
    } catch (error) {
        console.error('일정 삭제 오류:', error);
        alert('일정 삭제 중 오류가 발생했습니다.');
    }
}

// 일정 편집 취소
function cancelScheduleEdit() {
    document.getElementById('scheduleFormContainer').classList.add('hidden');
    document.getElementById('scheduleButtons').classList.remove('hidden');
}

// 엑셀 업로드
async function uploadExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
            alert('엑셀 파일에 데이터가 없습니다.');
            return;
        }

        // 열 이름 매핑 (엑셀 헤더 → DB 필드)
        const columnMap = {
            '회차': 'number',
            '발제자': 'presenter',
            '사회자': 'moderator',
            '날짜': 'date',
            '주제': 'topic',
            '장소': 'location',
            '게스트': 'guest',
            '비고': 'remarks'
        };

        const scheduleData = jsonData.map(row => {
            const schedule = {};
            for (const [korName, engName] of Object.entries(columnMap)) {
                if (row[korName] !== undefined) {
                    schedule[engName] = engName === 'number'
                        ? parseInt(row[korName]) || null
                        : String(row[korName] || '');
                }
            }
            return schedule;
        });

        const validData = scheduleData.filter(s => s.number);

        if (validData.length === 0) {
            alert('업로드할 유효한 데이터가 없습니다.\n엑셀 첫 행에 "회차, 발제자, 사회자, 날짜, 주제, 장소, 게스트, 비고" 헤더가 있어야 합니다.');
            return;
        }

        const replaceAll = confirm(`${validData.length}개의 일정을 업로드합니다.\n\n[확인] 기존 데이터 삭제 후 새로 업로드\n[취소] 기존 데이터 유지하고 추가`);

        if (replaceAll) {
            // 기존 데이터 모두 삭제
            for (const schedule of schedules) {
                await deleteScheduleFromDB(schedule.id);
            }
        }

        // 데이터 업로드
        let uploadCount = 0;
        for (const schedule of validData) {
            // 기존 데이터 유지 모드면 중복 체크
            if (!replaceAll) {
                const exists = schedules.find(s => s.number === schedule.number);
                if (exists) continue; // 중복이면 건너뛰기
            }
            await addScheduleToDB(schedule);
            uploadCount++;
        }

        alert(`${uploadCount}개의 일정이 업로드되었습니다.`);
        await loadSchedulesFromDB();
        loadSchedules();

    } catch (error) {
        console.error('엑셀 업로드 오류:', error);
        alert('엑셀 파일 처리 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    event.target.value = '';
}

// 주제 로드 (DB 기반)
function loadTopics() {
    displayTopics(currentFilter);
}

// 주제 표시
function displayTopics(author) {
    const topicContent = document.getElementById('topicContent');
    const isLoggedIn = currentUser !== null;

    // 필터링
    let filteredTopics = topics;
    if (author !== 'all') {
        filteredTopics = topics.filter(t => {
            const primaryAuthor = (t.author || '').split(/[-,+]/)[0].trim();
            return primaryAuthor === author || (t.author && t.author.includes(author));
        });
    }

    // 정렬: 제안자 이름순(가나다), 미진행 먼저
    filteredTopics.sort((a, b) => {
        // 제안자 이름순 (첫 번째 제안자 기준)
        const authorA = (a.author || '').split(/[-,+]/)[0].trim();
        const authorB = (b.author || '').split(/[-,+]/)[0].trim();
        const authorCompare = authorA.localeCompare(authorB, 'ko');
        if (authorCompare !== 0) return authorCompare;

        // 미진행(completed=false) 먼저
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return 0;
    });

    if (filteredTopics.length === 0) {
        topicContent.innerHTML = author === 'all'
            ? '<p>등록된 주제가 없습니다.</p>'
            : `<p>${author}님의 제안 주제가 없습니다.</p>`;
        return;
    }

    // 제안자별 그룹핑
    const grouped = {};
    filteredTopics.forEach(topic => {
        const primaryAuthor = (topic.author || '기타').split(/[-,+]/)[0].trim();
        if (!grouped[primaryAuthor]) {
            grouped[primaryAuthor] = { completed: [], pending: [] };
        }
        if (topic.completed) {
            grouped[primaryAuthor].completed.push(topic);
        } else {
            grouped[primaryAuthor].pending.push(topic);
        }
    });

    // 제안자 지정 순서 정렬 (다흰, 민구, 아름, 승종, 원혁, 동원, 그외)
    const authorOrder = ['다흰', '민구', '아름', '승종', '원혁', '동원'];
    const sortedAuthors = Object.keys(grouped).sort((a, b) => {
        const indexA = authorOrder.indexOf(a);
        const indexB = authorOrder.indexOf(b);
        // 둘 다 지정 순서에 있으면 그 순서대로
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // 하나만 지정 순서에 있으면 그게 먼저
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // 둘 다 없으면 가나다순
        return a.localeCompare(b, 'ko');
    });

    let html = '';
    for (const authorName of sortedAuthors) {
        const topicGroups = grouped[authorName];
        html += `<h2>${authorName}</h2>`;

        // 미진행 주제 먼저
        if (topicGroups.pending.length > 0) {
            html += `<h3>제안 주제 (미진행)</h3><ul>`;
            topicGroups.pending.forEach(topic => {
                const itemClass = isLoggedIn ? 'topic-item clickable' : 'topic-item';
                const dblClick = isLoggedIn ? `ondblclick="editTopic('${topic.id}')"` : '';
                html += `<li class="${itemClass}" ${dblClick}>${topic.topic}${topic.keywords ? ` <span class="topic-keywords">(${topic.keywords})</span>` : ''}</li>`;
            });
            html += `</ul>`;
        }

        // 진행된 주제
        if (topicGroups.completed.length > 0) {
            html += `<h3>실제 토론 진행된 주제</h3><ul>`;
            topicGroups.completed.forEach(topic => {
                const dateStr = topic.date ? ` (${formatDate(topic.date)})` : '';
                const itemClass = isLoggedIn ? 'topic-item clickable' : 'topic-item';
                const dblClick = isLoggedIn ? `ondblclick="editTopic('${topic.id}')"` : '';
                html += `<li class="${itemClass}" ${dblClick}>${topic.topic}${dateStr}</li>`;
            });
            html += `</ul>`;
        }

        html += `<hr>`;
    }

    topicContent.innerHTML = html;
}

// 제안자별 필터
function filterByAuthor(author) {
    currentFilter = author;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    displayTopics(author);
}

// 주제 폼 표시
function showTopicForm() {
    document.getElementById('topicFormContainer').classList.remove('hidden');
    document.getElementById('topicButtons').classList.add('hidden');
    document.getElementById('topicEditId').value = '';
    document.getElementById('topicAuthor').value = '';
    document.getElementById('topicTitle').value = '';
    document.getElementById('topicKeywords').value = '';
    document.getElementById('topicDate').value = '';
    document.getElementById('topicCompleted').value = 'false';
    document.getElementById('topicDeleteBtn').style.display = 'none';
}

// 주제 수정 폼
function editTopic(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    document.getElementById('topicFormContainer').classList.remove('hidden');
    document.getElementById('topicButtons').classList.add('hidden');
    document.getElementById('topicEditId').value = topicId;
    document.getElementById('topicAuthor').value = topic.author || '';
    document.getElementById('topicTitle').value = topic.topic || '';
    document.getElementById('topicKeywords').value = topic.keywords || '';
    document.getElementById('topicDate').value = parseToISODate(topic.date);
    document.getElementById('topicCompleted').value = topic.completed ? 'true' : 'false';
    document.getElementById('topicDeleteBtn').style.display = 'inline-block';
}

// 주제 저장
async function saveTopic(event) {
    event.preventDefault();

    const editId = document.getElementById('topicEditId').value;
    const dateValue = document.getElementById('topicDate').value;
    const topic = {
        author: document.getElementById('topicAuthor').value,
        topic: document.getElementById('topicTitle').value,
        keywords: document.getElementById('topicKeywords').value || null,
        date: dateValue && dateValue.trim() !== '' ? dateValue : null,
        completed: document.getElementById('topicCompleted').value === 'true'
    };

    try {
        if (editId) {
            await updateTopicInDB(editId, topic);
            alert('주제가 수정되었습니다.');
        } else {
            await addTopicToDB(topic);
            alert('주제가 추가되었습니다.');
        }

        await loadTopicsFromDB();
        loadTopics();
        cancelTopicEdit();
    } catch (error) {
        console.error('주제 저장 오류:', error);
        alert('주제 저장 중 오류: ' + (error.message || error));
    }
}

// 주제 삭제
async function deleteCurrentTopic() {
    const topicId = document.getElementById('topicEditId').value;
    if (!topicId) return;

    if (!confirm('이 주제를 삭제하시겠습니까?')) return;

    try {
        await deleteTopicFromDB(topicId);
        alert('주제가 삭제되었습니다.');
        await loadTopicsFromDB();
        loadTopics();
        cancelTopicEdit();
    } catch (error) {
        console.error('주제 삭제 오류:', error);
        alert('주제 삭제 중 오류가 발생했습니다.');
    }
}

// 주제 편집 취소
function cancelTopicEdit() {
    document.getElementById('topicFormContainer').classList.add('hidden');
    document.getElementById('topicButtons').classList.remove('hidden');
}

// 승인 대기 목록 로드
function loadPendingUsers() {
    const pendingList = document.getElementById('pendingList');
    const pendingAlert = document.getElementById('pendingAlert');
    const pendingCount = document.getElementById('pendingCount');

    pendingCount.textContent = pendingUsers.length;

    if (pendingUsers.length === 0) {
        pendingAlert.classList.remove('hidden');
        pendingList.innerHTML = '';
        return;
    }

    pendingAlert.classList.add('hidden');
    pendingList.innerHTML = '';

    pendingUsers.forEach((user) => {
        const item = document.createElement('div');
        item.className = 'pending-item';
        item.innerHTML = `
            <div class="pending-info">
                <strong>이름:</strong> ${user.name}<br>
                <strong>아이디:</strong> ${user.username}<br>
                <strong>이메일:</strong> ${user.email}<br>
                <strong>신청 일시:</strong> ${new Date(user.request_date).toLocaleString('ko-KR')}<br>
                <strong>소개:</strong> ${user.intro}
            </div>
            <div class="pending-actions">
                <button class="approve-btn" onclick="approveUser('${user.id}')">승인</button>
                <button class="reject-btn" onclick="rejectUser('${user.id}')">거부</button>
            </div>
        `;
        pendingList.appendChild(item);
    });
}

// 승인된 회원 목록 로드
function loadApprovedMembers() {
    const memberList = document.getElementById('memberList');
    const memberCount = document.getElementById('memberCount');

    // 관리자 제외한 회원 수
    const members = users.filter(u => u.role !== 'admin');
    memberCount.textContent = members.length;

    if (members.length === 0) {
        memberList.innerHTML = '<div class="alert alert-warning">등록된 회원이 없습니다.</div>';
        return;
    }

    memberList.innerHTML = '';

    members.forEach((user) => {
        const item = document.createElement('div');
        item.className = 'member-item';
        item.innerHTML = `
            <div class="member-info">
                <strong>${user.name}</strong> (${user.username})<br>
                <span class="member-email">${user.email}</span><br>
                <span class="member-intro">${user.intro || '소개 없음'}</span>
            </div>
            <div class="member-actions">
                <button class="unapprove-btn" onclick="unapproveUser('${user.id}')">승인 해제</button>
                <button class="delete-member-btn" onclick="deleteMember('${user.id}')">삭제</button>
            </div>
        `;
        memberList.appendChild(item);
    });
}

// ============================================
// 출석부 관련 함수
// ============================================

// 출석부 페이지 로드
async function loadAttendancePage() {
    await loadAttendanceYearsFromDB();

    // 연도 탭 렌더링
    renderYearTabs();

    // 첫 번째 연도 선택
    if (attendanceYears.length > 0) {
        await selectYear(attendanceYears[0].id);
    }

    // 로그인한 사용자만 관리 버튼 표시
    if (currentUser) {
        document.getElementById('attendanceActions').classList.remove('hidden');
        document.getElementById('addYearBtn').classList.remove('hidden');
    }
}

// 연도 탭 렌더링
function renderYearTabs() {
    const tabsContainer = document.getElementById('yearTabs');
    tabsContainer.innerHTML = '';

    attendanceYears.forEach(year => {
        const tab = document.createElement('button');
        tab.className = 'year-tab' + (year.id === currentYearId ? ' active' : '');
        tab.textContent = year.year + '년';
        tab.onclick = () => selectYear(year.id);

        // 로그인한 사용자만 삭제 버튼 표시
        if (currentUser && attendanceYears.length > 1) {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'year-tab-delete';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteYear(year.id, year.year);
            };
            tab.appendChild(deleteBtn);
        }

        tabsContainer.appendChild(tab);
    });
}

// 연도 선택
async function selectYear(yearId) {
    currentYearId = yearId;

    // 탭 활성화 표시 업데이트
    document.querySelectorAll('.year-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.year-tab[onclick*="${yearId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // 해당 연도 데이터 로드
    await loadAttendanceMembersFromDB(yearId);
    await loadAttendanceSchedulesFromDB(yearId);
    await loadAttendanceRecordsFromDB(yearId);

    // 테이블 렌더링
    renderAttendanceTable();

    // 탭 다시 렌더링 (활성화 표시)
    renderYearTabs();
}

// 출석부 테이블 렌더링
function renderAttendanceTable() {
    const thead = document.getElementById('attendanceTableHead');
    const tbody = document.getElementById('attendanceTableBody');
    const isLoggedIn = currentUser !== null;

    // 헤더 생성: 일정 | 멤버1 | 멤버2 | ... | 관리(로그인시)
    let headerHtml = '<tr><th class="schedule-col">일정</th>';
    attendanceMembers.forEach(member => {
        headerHtml += `<th class="member-col">
            ${member.name}
            ${isLoggedIn ? `<span class="member-delete" onclick="deleteMember('${member.id}')">&times;</span>` : ''}
        </th>`;
    });
    if (isLoggedIn) {
        headerHtml += '<th class="action-col">관리</th>';
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // 본문 생성
    tbody.innerHTML = '';

    attendanceSchedules.forEach(schedule => {
        // 각 일정에 대해 3개의 행 생성 (참석, 사유, 작성일)
        const rows = ['attendance', 'reason', 'record_date'];
        const rowLabels = ['참석', '사유', '작성일'];

        rows.forEach((rowType, rowIndex) => {
            const tr = document.createElement('tr');
            tr.className = rowType === 'attendance' ? 'attendance-row-first' : '';

            // 첫 번째 열: 일정 날짜 (첫 행에만 rowspan)
            if (rowIndex === 0) {
                tr.innerHTML = `<td class="schedule-cell" rowspan="3">${schedule.schedule_date}</td>`;
            }

            // 각 멤버별 셀
            attendanceMembers.forEach(member => {
                const record = attendanceRecords.find(r =>
                    r.schedule_id === schedule.id && r.member_id === member.id
                ) || {};

                const cellId = `${schedule.id}_${member.id}_${rowType}`;
                let cellContent = '';

                if (rowType === 'attendance') {
                    if (isLoggedIn) {
                        cellContent = `
                            <select class="attendance-select" id="${cellId}"
                                    onchange="updateAttendanceRecord('${schedule.id}', '${member.id}')">
                                <option value="" ${!record.attendance ? 'selected' : ''}></option>
                                <option value="O" ${record.attendance === 'O' ? 'selected' : ''}>O</option>
                                <option value="X" ${record.attendance === 'X' ? 'selected' : ''}>X</option>
                            </select>
                        `;
                    } else {
                        cellContent = `<span class="attendance-display ${record.attendance === 'O' ? 'present' : record.attendance === 'X' ? 'absent' : ''}">${record.attendance || ''}</span>`;
                    }
                } else if (rowType === 'reason') {
                    if (isLoggedIn) {
                        cellContent = `<input type="text" class="reason-input" id="${cellId}"
                                        value="${record.reason || ''}"
                                        placeholder="사유"
                                        onchange="updateAttendanceRecord('${schedule.id}', '${member.id}')">`;
                    } else {
                        cellContent = record.reason || '';
                    }
                } else if (rowType === 'record_date') {
                    if (isLoggedIn) {
                        cellContent = `<input type="text" class="date-input" id="${cellId}"
                                        value="${record.record_date || ''}"
                                        placeholder="월/일"
                                        onchange="updateAttendanceRecord('${schedule.id}', '${member.id}')">`;
                    } else {
                        cellContent = record.record_date || '';
                    }
                }

                tr.innerHTML += `<td class="${rowType}-cell">${cellContent}</td>`;
            });

            // 관리 열 (첫 행에만 rowspan)
            if (isLoggedIn && rowIndex === 0) {
                tr.innerHTML += `<td class="action-cell" rowspan="3">
                    <button class="delete-schedule-btn" onclick="deleteAttendanceScheduleItem('${schedule.id}')">삭제</button>
                </td>`;
            }

            tbody.appendChild(tr);
        });
    });
}

// 출석 기록 업데이트
async function updateAttendanceRecord(scheduleId, memberId) {
    const attendance = document.getElementById(`${scheduleId}_${memberId}_attendance`)?.value || '';
    const reason = document.getElementById(`${scheduleId}_${memberId}_reason`)?.value || '';
    const recordDate = document.getElementById(`${scheduleId}_${memberId}_record_date`)?.value || '';

    try {
        await saveAttendanceRecordToDB(scheduleId, memberId, attendance, reason, recordDate);
        // 로컬 데이터 업데이트
        const existingIndex = attendanceRecords.findIndex(r =>
            r.schedule_id === scheduleId && r.member_id === memberId
        );
        if (existingIndex >= 0) {
            attendanceRecords[existingIndex] = {
                ...attendanceRecords[existingIndex],
                attendance, reason, record_date: recordDate
            };
        } else {
            attendanceRecords.push({
                schedule_id: scheduleId,
                member_id: memberId,
                attendance, reason, record_date: recordDate
            });
        }
    } catch (error) {
        console.error('출석 기록 저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 모달 관련 함수
function showAddMemberModal() {
    document.getElementById('newMemberName').value = '';
    document.getElementById('addMemberModal').classList.remove('hidden');
}

function showAddScheduleModal() {
    document.getElementById('newScheduleDate').value = '';
    document.getElementById('addScheduleModal').classList.remove('hidden');
}

function showAddYearModal() {
    document.getElementById('newYear').value = new Date().getFullYear() + 1;
    document.getElementById('addYearModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// 멤버 추가
async function addMember() {
    const name = document.getElementById('newMemberName').value.trim();
    if (!name) {
        alert('멤버 이름을 입력하세요.');
        return;
    }

    try {
        await addAttendanceMemberToDB(currentYearId, name);
        closeModal('addMemberModal');
        await loadAttendanceMembersFromDB(currentYearId);
        renderAttendanceTable();
        alert('멤버가 추가되었습니다.');
    } catch (error) {
        console.error('멤버 추가 오류:', error);
        alert('멤버 추가 중 오류가 발생했습니다.');
    }
}

// 멤버 삭제
async function deleteMember(memberId) {
    const member = attendanceMembers.find(m => m.id === memberId);
    if (!confirm(`"${member?.name}" 멤버를 삭제하시겠습니까?\n해당 멤버의 모든 출석 기록이 삭제됩니다.`)) return;

    try {
        await deleteAttendanceMemberFromDB(memberId);
        await loadAttendanceMembersFromDB(currentYearId);
        await loadAttendanceRecordsFromDB(currentYearId);
        renderAttendanceTable();
        alert('멤버가 삭제되었습니다.');
    } catch (error) {
        console.error('멤버 삭제 오류:', error);
        alert('멤버 삭제 중 오류가 발생했습니다.');
    }
}

// 일정 추가
async function addAttendanceSchedule() {
    const scheduleDate = document.getElementById('newScheduleDate').value.trim();
    if (!scheduleDate) {
        alert('일정 날짜를 입력하세요.');
        return;
    }

    // 형식 검증 (숫자/숫자)
    if (!/^\d{1,2}\/\d{1,2}$/.test(scheduleDate)) {
        alert('날짜 형식이 올바르지 않습니다. (예: 1/11)');
        return;
    }

    try {
        await addAttendanceScheduleToDB(currentYearId, scheduleDate);
        closeModal('addScheduleModal');
        await loadAttendanceSchedulesFromDB(currentYearId);
        renderAttendanceTable();
        alert('일정이 추가되었습니다.');
    } catch (error) {
        console.error('일정 추가 오류:', error);
        alert('일정 추가 중 오류가 발생했습니다.');
    }
}

// 일정 삭제
async function deleteAttendanceScheduleItem(scheduleId) {
    const schedule = attendanceSchedules.find(s => s.id === scheduleId);
    if (!confirm(`"${schedule?.schedule_date}" 일정을 삭제하시겠습니까?\n해당 일정의 모든 출석 기록이 삭제됩니다.`)) return;

    try {
        await deleteAttendanceScheduleFromDB(scheduleId);
        await loadAttendanceSchedulesFromDB(currentYearId);
        await loadAttendanceRecordsFromDB(currentYearId);
        renderAttendanceTable();
        alert('일정이 삭제되었습니다.');
    } catch (error) {
        console.error('일정 삭제 오류:', error);
        alert('일정 삭제 중 오류가 발생했습니다.');
    }
}

// 연도 추가
async function addYear() {
    const year = parseInt(document.getElementById('newYear').value);
    if (!year || year < 2020 || year > 2100) {
        alert('올바른 연도를 입력하세요.');
        return;
    }

    // 중복 체크
    if (attendanceYears.some(y => y.year === year)) {
        alert('이미 존재하는 연도입니다.');
        return;
    }

    try {
        await addAttendanceYearToDB(year);
        closeModal('addYearModal');
        await loadAttendanceYearsFromDB();
        renderYearTabs();
        alert(`${year}년이 추가되었습니다.`);
    } catch (error) {
        console.error('연도 추가 오류:', error);
        alert('연도 추가 중 오류가 발생했습니다.');
    }
}

// 연도 삭제
async function deleteYear(yearId, year) {
    if (!confirm(`${year}년을 삭제하시겠습니까?\n해당 연도의 모든 멤버, 일정, 출석 기록이 삭제됩니다.`)) return;

    try {
        await deleteAttendanceYearFromDB(yearId);
        await loadAttendanceYearsFromDB();
        renderYearTabs();

        // 다른 연도 선택
        if (attendanceYears.length > 0) {
            await selectYear(attendanceYears[0].id);
        } else {
            currentYearId = null;
            document.getElementById('attendanceTableHead').innerHTML = '';
            document.getElementById('attendanceTableBody').innerHTML = '';
        }

        alert(`${year}년이 삭제되었습니다.`);
    } catch (error) {
        console.error('연도 삭제 오류:', error);
        alert('연도 삭제 중 오류가 발생했습니다.');
    }
}
