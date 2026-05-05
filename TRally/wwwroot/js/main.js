// 일정 폼의 현재 파일 목록 (기존 파일 유지용)
let scheduleCurrentFiles = [];

// 이미 로드된 댓글 패널 추적
let loadedCommentPanels = new Set();

// 일정 schedule의 파일 목록 파싱 (기존 단일 파일 형식과 호환)
function parseScheduleFiles(schedule) {
    if (!schedule.file_url) return [];
    try {
        const parsed = JSON.parse(schedule.file_url);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [{ url: schedule.file_url, name: schedule.file_name || '파일' }];
}

// 파일 목록 UI 렌더링
function renderScheduleFileList() {
    const container = document.getElementById('scheduleFileList');
    if (!container) return;
    if (scheduleCurrentFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = scheduleCurrentFiles.map((f, i) => `
        <div class="file-list-item">
            📎 <a href="${f.url}" target="_blank">${f.name}</a>
            <span class="file-remove-btn" onclick="removeScheduleFileAt(${i})">✕ 제거</span>
        </div>
    `).join('');
}

// 특정 인덱스의 파일 제거
function removeScheduleFileAt(index) {
    scheduleCurrentFiles.splice(index, 1);
    renderScheduleFileList();
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // EmailJS 초기화
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // 데이터 로드
    await initializeData();

    // 상단 스크롤바 동기화
    initScrollSync();

    // 세션 복원 시도 (새로고침 시 로그인 유지)
    const restored = await restoreSession();
    if (restored) {
        const savedPage = sessionStorage.getItem('currentPage');
        if (savedPage && savedPage !== 'schedule') {
            showPage(savedPage);
        }
    }

    // 스티키 헤더 설정
    setupStickyHeaders();

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
        'gallery': [document.getElementById('galleryPage'), 3],
        'requests': [document.getElementById('requestsPage'), 4],
        'admin': [document.getElementById('adminPage'), 5]
    };

    if (pages[pageName]) {
        // 현재 페이지 저장
        sessionStorage.setItem('currentPage', pageName);

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

        // 갤러리 페이지면 갤러리 로드
        if (pageName === 'gallery') {
            loadGallery();
            // 로그인 사용자는 추가 버튼 표시
            if (currentUser) {
                document.getElementById('galleryButtons').classList.remove('hidden');
            }
        }

        // 요청사항 페이지면 요청사항 로드
        if (pageName === 'requests') {
            loadRequests();
            // 추가 버튼은 항상 표시 (로그인 불필요)
            if (currentUser) {
                document.getElementById('requestsActionHeader').classList.remove('hidden');
            }
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
    loadedCommentPanels.clear();

    const totalCols = isLoggedIn ? 11 : 10;

    schedules.forEach(schedule => {
        const row = document.createElement('tr');
        if (isLoggedIn) {
            row.style.cursor = 'pointer';
            row.ondblclick = () => editSchedule(schedule.id);
        }
        const scheduleFiles = parseScheduleFiles(schedule);
        const fileCell = scheduleFiles.length > 0
            ? scheduleFiles.map(f => `<a class="file-link" href="${f.url}" target="_blank" title="${f.name}">📎 ${f.name}</a>`).join('<br>')
            : '';

        row.innerHTML = `
            <td><span class="schedule-number-badge">${schedule.number || ''}회</span></td>
            <td class="comment-cell">
                <button class="comment-toggle-btn" id="commentToggle_${schedule.id}"
                    onclick="toggleScheduleComments('${schedule.id}', event)">
                    💬 <span class="comment-count" id="commentCount_${schedule.id}">-</span>
                </button>
            </td>
            <td class="presenter-col">${schedule.presenter || ''}</td>
            <td>${schedule.moderator || ''}</td>
            <td>${formatDate(schedule.date)}</td>
            <td class="topic-cell">${schedule.topic || ''}</td>
            <td class="file-cell">${fileCell}</td>
            <td class="location-cell">${schedule.location || ''}</td>
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

        // 댓글 펼침 행
        const commentRow = document.createElement('tr');
        commentRow.className = 'comment-collapse-row hidden';
        commentRow.id = `commentRow_${schedule.id}`;
        const formHtml = currentUser
            ? `<form class="comment-form" onsubmit="submitScheduleComment(event, '${schedule.id}')">
                   <input type="text" class="comment-author-input" id="commentAuthor_${schedule.id}"
                       placeholder="작성자" value="${currentUser.name || ''}" readonly>
                   <input type="text" class="comment-content-input" id="commentContent_${schedule.id}"
                       placeholder="댓글을 입력하세요" required>
                   <button type="submit" class="comment-submit-btn">등록</button>
               </form>`
            : `<p class="comment-login-notice">댓글을 달려면 로그인하세요.</p>`;
        commentRow.innerHTML = `
            <td colspan="${totalCols}" class="comment-panel-cell">
                <div class="comment-panel">
                    <div class="comment-list" id="commentList_${schedule.id}"></div>
                    ${formHtml}
                </div>
            </td>
        `;
        tableBody.appendChild(commentRow);
    });

    // 댓글 수 비동기 로드
    loadAllCommentCounts();

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
    scheduleCurrentFiles = [];
    renderScheduleFileList();
    document.getElementById('scheduleFile').value = '';
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
    scheduleCurrentFiles = parseScheduleFiles(schedule);
    renderScheduleFileList();
    document.getElementById('scheduleFile').value = '';
}

// 일정 저장 (추가/수정)
async function saveSchedule(event) {
    event.preventDefault();

    const editId = document.getElementById('scheduleEditId').value;
    const fileInput = document.getElementById('scheduleFile');

    // 기존 파일 목록 복사 후 새 파일 추가
    const files = [...scheduleCurrentFiles];

    if (fileInput.files && fileInput.files.length > 0) {
        for (const file of fileInput.files) {
            try {
                const uploaded = await uploadScheduleFile(file);
                files.push({ url: uploaded.url, name: uploaded.name });
            } catch (uploadError) {
                console.error('파일 업로드 오류:', uploadError);
                alert(`"${file.name}" 업로드에 실패했습니다.\nSupabase Storage에 schedules-files 버킷이 있는지 확인하세요.`);
            }
        }
    }

    const file_url = files.length > 0 ? JSON.stringify(files) : null;
    const file_name = files.length > 0 ? files.map(f => f.name).join(', ') : null;

    const schedule = {
        number: parseInt(document.getElementById('scheduleNumber').value) || null,
        presenter: document.getElementById('schedulePresenter').value || null,
        moderator: document.getElementById('scheduleModerator').value || null,
        date: document.getElementById('scheduleDate').value || null,
        topic: document.getElementById('scheduleTopic').value || null,
        location: document.getElementById('scheduleLocation').value || null,
        guest: document.getElementById('scheduleGuest').value || null,
        remarks: document.getElementById('scheduleRemarks').value || null,
        file_url,
        file_name
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

// ── 댓글 기능 ─────────────────────────────────────────────────────────

// 전체 댓글 수 비동기 로드
async function loadAllCommentCounts() {
    try {
        const counts = await loadAllScheduleCommentCountsFromDB();
        schedules.forEach(s => {
            const el = document.getElementById(`commentCount_${s.id}`);
            if (el) el.textContent = counts[s.id] || 0;
        });
    } catch (e) {
        schedules.forEach(s => {
            const el = document.getElementById(`commentCount_${s.id}`);
            if (el) el.textContent = 0;
        });
    }
}

// 댓글 패널 토글
async function toggleScheduleComments(scheduleId, event) {
    event.stopPropagation();
    const commentRow = document.getElementById(`commentRow_${scheduleId}`);
    if (!commentRow) return;
    const isHidden = commentRow.classList.contains('hidden');
    if (isHidden) {
        commentRow.classList.remove('hidden');
        if (!loadedCommentPanels.has(scheduleId)) {
            await loadScheduleComments(scheduleId);
            loadedCommentPanels.add(scheduleId);
        }
    } else {
        commentRow.classList.add('hidden');
    }
}

// 특정 일정의 댓글 로드 및 렌더링
async function loadScheduleComments(scheduleId) {
    const commentList = document.getElementById(`commentList_${scheduleId}`);
    if (!commentList) return;
    commentList.innerHTML = '<p class="comment-loading">불러오는 중...</p>';
    try {
        const comments = await loadScheduleCommentsFromDB(scheduleId);
        renderScheduleComments(scheduleId, comments);
        const countEl = document.getElementById(`commentCount_${scheduleId}`);
        if (countEl) countEl.textContent = comments.length;
    } catch (e) {
        commentList.innerHTML = '<p class="comment-error">댓글을 불러오지 못했습니다.</p>';
    }
}

// 댓글 목록 렌더링
function renderScheduleComments(scheduleId, comments) {
    const commentList = document.getElementById(`commentList_${scheduleId}`);
    if (!commentList) return;
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (comments.length === 0) {
        commentList.innerHTML = '<p class="comment-empty">아직 댓글이 없습니다.</p>';
        return;
    }
    commentList.innerHTML = comments.map(c => `
        <div class="comment-item" id="comment_${c.id}">
            <span class="comment-author">${c.author}</span>
            <span class="comment-content">${c.content}</span>
            <span class="comment-date">${formatCommentDate(c.created_at)}</span>
            ${isAdmin ? `<button class="comment-delete-btn" onclick="deleteScheduleComment('${c.id}', '${scheduleId}')">✕</button>` : ''}
        </div>
    `).join('');
}

// 날짜 포맷 (댓글용)
function formatCommentDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 댓글 등록
async function submitScheduleComment(event, scheduleId) {
    event.preventDefault();
    const authorInput = document.getElementById(`commentAuthor_${scheduleId}`);
    const contentInput = document.getElementById(`commentContent_${scheduleId}`);
    const author = authorInput ? authorInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';
    if (!author || !content) return;
    try {
        await addScheduleCommentToDB(scheduleId, author, content);
        if (contentInput) contentInput.value = '';
        loadedCommentPanels.delete(scheduleId);
        await loadScheduleComments(scheduleId);
        loadedCommentPanels.add(scheduleId);
    } catch (e) {
        alert('댓글 등록 중 오류가 발생했습니다.');
    }
}

// 댓글 삭제 (관리자 전용)
async function deleteScheduleComment(commentId, scheduleId) {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
        await deleteScheduleCommentFromDB(commentId);
        loadedCommentPanels.delete(scheduleId);
        await loadScheduleComments(scheduleId);
        loadedCommentPanels.add(scheduleId);
    } catch (e) {
        alert('댓글 삭제 중 오류가 발생했습니다.');
    }
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

// ── 주제 카테고리 자동 분류 ──────────────────────────────────────────
const TOPIC_CATEGORIES = [
    {
        name: '기술/미래',
        keywords: [
            'ai', '인공지능', '기술', '미래', '디지털', '메타버스', '데이터', 'nft', '자동화', '로봇', '과학',
            '튜링', '버추얼', '증강', '암호화폐', '코딩', '인터넷', '온라인', '버츄어', '지식매체', '제조업',
            'sf', '특이점', '알고리즘', '플랫폼', '발명', '혁신', '컴퓨터', '스마트', '가상현실', '증강현실',
            '빅데이터', '자율', '딥러닝', '블록체인', '사이버', '클라우드', '소프트웨어', '하드웨어', '네트워크',
            '영상', '숏폼', '스트리밍', '유튜브', '넷플릭스', '게임', '앱', 'play to earn', '지능',
            '유동성지능', '증강인간', '인류멸망', '다른행성', '전기차', '친환경차', '생명공학', '유전자',
            '의료기술', '에너지', '우주', '빌런의시대', '책읽기의', '종이의미래', '짧은영상', '문서의미래',
            '4차', '산업혁명', '디지털전환', 'intelligence', '디지털전체주의', 'gpt', 'chatgpt'
        ]
    },
    {
        name: '사회/문화',
        keywords: [
            '사회', '문화', '트렌드', '세대', 'mz', '한국', '젠트리', '도시', '역사', '언론', '정치',
            '민주주의', '교육', '경제', '출산', '인구', '여행', '레트로', '예술', '종교', '환경', '빌런',
            '난민', '동물권', 'k-culture', '자치', '스포츠', '콘텐츠', '컨텐츠', '미디어', '음악', '영화',
            '드라마', '시대정신', '도시균형', '패션', '전시', '공정', '출산율', '인플레이션', '물가', '경기',
            '프라이버시', '개인정보', '법', '제도', '규정', '국가', '정부', '자본주의', '노동', '직업',
            '취업', '직장', '커리어', '은퇴', '복지', '불평등', '양극화', '계층', '빈부', '차별', '혐오',
            '인종', '다문화', '이민', '세계화', '민족', '젠더', '성평등', '페미', 'lgbtq', '퀴어', '성소수자',
            '결혼', '이혼', '저출산', '고령화', '노인', '청년', '입시', '수능', '대학', '사교육',
            '의료', '보건', '건강', '질병', '팬데믹', '코로나', '백신', '음주', '술', '음주문화',
            '음식', '식문화', '요리', '다이어트', '스포츠', '운동', '헬스', '마케팅', '소비', '소비문화',
            '브랜드', '명품', '패션', '뷰티', '한류', '케이팝', 'kpop', '방탄', '오징어게임', '기생충',
            '마을', '지역', '광역', '자치', '균형', '소멸', '밈', '바이럴', '인플루언서',
            'mbti', '사주', '점', '운세', '미신', '신비주의', '노출주의', '공공재', '개인정보보호',
            '표현의자유', '방종', '언론의역할', '다수결', '개인주의', '관성', '백래시', '대세감',
            '판교', '한교동', '어그로', '가스라이팅', '조종', '공동체의상실', '동방예의지국',
            '온고이지신', '정치적올바름', '감시사회', '인구소멸', '불평등의이점', 'esg', '출산율저하',
            'k드라마', '한국영화', '레트로퓨쳐', '덕업일치', '모를권리', '정보접근성'
        ]
    },
    {
        name: '관계/소통',
        keywords: [
            '관계', '소통', '커뮤니케이션', '공동체', '사랑', '우정', '친구', '가족', '연대', '대화',
            '언어', '친밀감', '이질성', '배려', '상냥함', '다정', '고립', '외로움', '형제자매', '육아',
            '꼰대', '어울림', '표현', '대면', '비대면', '손주', '조카', '군중', '귀여움', '오지랖',
            '신뢰', '배신', '갈등', '화해', '용서', '공존', '협력', '이야기', '설득', '위로', '상처',
            '연애', '데이트', '부부', '부모', '자녀', '부모님', '스승', '제자', '상사', '동료',
            '팀워크', '리더', '멘토', '코칭', '말', '농담', '유머', '재치', '매력', '선후배',
            '인간관계', '소외', '은둔', '모임', '집회', '광장', '아고라', '커뮤니티', '동호회',
            '토론', '토론의특성', '트랠리', 'trally', '가족관계', '이별', '그리움', '향수',
            '이웃', '마을공동체', '온라인커뮤니티', '댓글', '악플', '사이버불링', '팬심',
            '팬덤', '덕질', '연예인', '아이돌', '스타', '팬미팅', '포용', '배척', '타자화',
            '환대', '이방인', '낯선', '익숙함', '친숙함', '적응', '통합', '분리', '공감표현',
            '감정표현', '감정공유', '경청', '설명', '이해시키기', '말하기', '듣기', '글쓰기',
            '읽기', '독서', '책', '문자', '텍스트', '이모지', '카톡', '문자메시지', '편지',
            '엽서', '일기', '블로그', '인스타', '트위터', '페이스북', '틱톡',
            '남의이야기', '뒷담화', '가십', '소문', '소통부재', '단절', '분리',
            '귀여움에의강요', '무차별의인화', '다중정체성', '부계정', '좋아함을보존'
        ]
    },
    {
        name: '심리/인식',
        keywords: [
            '심리', '인식', '인지', '행동', '의식', '기억', '정체성', '자아', '자존감', '감정',
            '우울', '불안', '억울', '분노', '행복', '희망', '욕구', '동기', '동력', '편향', '착각',
            '두려움', '정서', '직관', '뇌', '인정욕구', '취향', '공포', '수치심', '호기심', '번아웃',
            '탐구심', '나르시즘', '죄책감', '질투', '욕심', '기분', '음모론', '최면', '사기',
            '안락함', '편리', '장난기', '본능', '만족감', '아웃풋', '세련됨', '기대', '실망',
            '즐거움', '즐김', '몰입', '과몰입', '중독', '집중', '성취', '열등감', '우월감',
            '자기효능', '습관', '루틴', '스트레스', '힐링', '트라우마', '자기합리화', '억압',
            '방어기제', '선입견', '고정관념', '확증편향', '인지부조화', '열광', '성장캐', '설정과다',
            '사기캐', '지능', '뇌과학', '신경', '도파민', '공포심', '각성', '깨달음', '성찰',
            '후회', '오글거림', '꿈dreams', '꿈goal', '드림', '비전', '나이듦', '노화', '노년',
            '양가감정', '공감능력', '공감', '심리적저항', '자기계발', '자기관리', '자기이해',
            '자기실현', '자기표현', '욕망', '충동', '쾌락', '보상', '동기부여', '의지', '끈기',
            '포기', '도전', '실패', '반성', '뉘우침', '연결성발견', '창의력', '상상력',
            '이해란', '순수한마음', '하고싶은걸', '극한상황', '능력치', '회복탄력성',
            '엉망으로일하는법', '사기의기술', '공감능력에대하여', '오글거림은무엇인가',
            '기억vs기록', '기억과기록', '희로애락', '본래마음', '스토리에빠지는이유',
            '우리가열광하는', '왜열광하는가', '생명이길어짐', '우울증초기', '능력의양극화'
        ]
    },
    {
        name: '철학/가치관',
        keywords: [
            '철학', '윤리', '도덕', '가치', '삶', '존재', '자유', '책임', '진실', '거짓', '선악',
            '정의', '영성', '본질', '숙명', '이성', '합리', '지성', '목적', '의미', '중립', '보편성',
            '지속가능', '회의주의', '재미', '창의', '영감', '지성인', '용기', '믿음', '이해', '해석',
            '관점', '패러다임', '세계관', '인생관', '신념', '원칙', '기준', '선택', '결정',
            '역설', '모순', '아이러니', '딜레마', '숙명론', '자유의지', '결정론', '실존', '허무',
            '죽음', '생명의의미', '불멸', '영원', '절대', '상대', '이상', '현실', '유토피아',
            '이기주의', '이타주의', '공익', '사익', '집단주의', '도덕상대주의', '도덕보편주의',
            '정직', '솔직', '위선', '이중성', '공정성', '공리주의', '의무론', '덕윤리',
            '난이도', '어려운길', '쉬운길', '방어', '공격', '효율성', '효율화', '균형', '조화',
            '하향제한', '우상향', '초심', '가늘고긴', '극과극', '고학력', '성공경향',
            '아웃풋과삶의', '해석의새기준', '악마는디테일', '경험은확증편향', '방어가최고',
            '기회의조건', '친구라는카테고리', '20대이후공부', '나이든이후', '축약의장단점',
            '의미부여와합리화', '합리화는필요한', '책임감의부재', '인내심으로', '효율성효율화',
            '온고이지신', '민주주의와자본주의', '두가지용기', '도전에드는용기', '변화의속도',
            '가속화', '지속가능성조건', '연결성', '암묵', '기대하고실망', '세련됨을느끼는',
            '좋아서할수있는', '해체와조합', '가치의기원', '가치제안', '선입견과직관',
            '창의력이란', '지성인의특징', '장난기의전망', '영감의정의', '영감의중요성',
            '이해란무엇인가', '재미란', '책임감', '삶의의미', '삶의태도트렌드',
            '욕심과능력', '객관성과합리화', '매우말이', '익숙함과낯섦', '쉬운길vs어려운길',
            '실패욕구', '백문이불여일견', '순수한마음증명', '항상양적발전', '보편적으로행복',
            '한국인종특', '회피에끝', '생명이길어짐', '정신vs육체', '초능력', '재미',
            '합리와비합리', '성인성장발달', '편가르기', '혼자보내는시간', '쉬는것의죄책감',
            '기대는응원', '조언의소유권', '성숙함의인플레이션', 'win-win', '뇌를이식받은',
            '오징어게임을보고', '믿음과불확실성', '모를권리', '즐김의폭력성', '실망시키기',
            '기대의가치', '꿈이한단어로', '초능력'
        ]
    }
];

// 키워드 점수 기반 분류 (가장 많이 매칭되는 카테고리 반환, 미매칭 시 철학/가치관 기본값)
function getTopicCategory(topic) {
    const text = ((topic.topic || '') + ' ' + (topic.keywords || '')).toLowerCase();
    let bestCat = '철학/가치관';
    let bestScore = 0;
    for (const cat of TOPIC_CATEGORIES) {
        const score = cat.keywords.filter(kw => text.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestCat = cat.name;
        }
    }
    return bestCat;
}

// 주제 로드 (DB 기반)
function loadTopics() {
    displayTopics();
}

// 주제 표시 (멀티 필터 적용)
function displayTopics() {
    const topicContent = document.getElementById('topicContent');
    const isLoggedIn = currentUser !== null;
    const { status, authors, categories } = topicFilters;

    // 필터 적용
    const filtered = topics.filter(t => {
        if (status === 'pending' && t.completed) return false;
        if (status === 'completed' && !t.completed) return false;
        if (authors.length > 0) {
            const primary = (t.author || '').split(/[-,+]/)[0].trim();
            const matches = authors.some(a => primary === a || (t.author || '').includes(a));
            if (!matches) return false;
        }
        if (categories.length > 0) {
            if (!categories.includes(getTopicCategory(t))) return false;
        }
        return true;
    });

    // 결과 수 업데이트
    const countEl = document.getElementById('topicFilterCount');
    if (countEl) countEl.textContent = `${filtered.length}개`;

    if (filtered.length === 0) {
        topicContent.innerHTML = '<p class="no-topics">조건에 맞는 주제가 없습니다.</p>';
        return;
    }

    topicContent.innerHTML = buildFlatList(filtered, isLoggedIn);
}

// 항상 flat list로 표시
function buildFlatList(list, isLoggedIn) {
    const { status } = topicFilters;
    let html = '';

    if (status === 'completed') {
        // 진행됨: 날짜 내림차순, 연도 구분
        list.sort((a, b) => {
            const da = a.date ? new Date(a.date) : new Date(0);
            const db = b.date ? new Date(b.date) : new Date(0);
            return db - da;
        });
        html += buildByYear(list, isLoggedIn);
    } else if (status === 'pending') {
        // 미진행만
        html += `<ul>`;
        list.forEach(t => { html += buildTopicItem(t, isLoggedIn, false); });
        html += `</ul>`;
    } else {
        // 전체: 미진행 먼저, 진행됨은 날짜 내림차순
        const pending = list.filter(t => !t.completed);
        const completed = list.filter(t => t.completed).sort((a, b) => {
            const da = a.date ? new Date(a.date) : new Date(0);
            const db = b.date ? new Date(b.date) : new Date(0);
            return db - da;
        });

        if (pending.length > 0) {
            html += `<h3 class="topic-section-heading">제안 주제 (미진행) <span class="topic-section-count">${pending.length}</span></h3><ul>`;
            pending.forEach(t => { html += buildTopicItem(t, isLoggedIn, false); });
            html += `</ul>`;
        }
        if (completed.length > 0) {
            html += `<h3 class="topic-section-heading">진행된 주제 <span class="topic-section-count">${completed.length}</span></h3>`;
            html += buildByYear(completed, isLoggedIn);
        }
    }
    return html;
}

// 연도별 구분 리스트
function buildByYear(list, isLoggedIn) {
    let html = '';
    let currentYear = null;
    list.forEach(t => {
        const year = t.date ? new Date(t.date).getFullYear() : null;
        if (year !== currentYear) {
            if (currentYear !== null) html += '</ul>';
            html += `<h4 class="topic-year-heading">${year || '날짜 미상'}</h4><ul>`;
            currentYear = year;
        }
        html += buildTopicItem(t, isLoggedIn, true);
    });
    if (currentYear !== null) html += '</ul>';
    return html;
}

// 개별 아이템 HTML
function buildTopicItem(t, isLoggedIn, showDate) {
    const catBadge = buildCategoryBadge(getTopicCategory(t));
    const authorBadge = `<span class="topic-author-badge">${(t.author || '').split(/[-,+]/)[0].trim()}</span>`;
    const dateStr = showDate && t.date ? ` <span class="topic-date">(${formatDate(t.date)})</span>` : '';
    // 카테고리명은 배지로 이미 표시되므로 키워드에서 제외
    const extraKw = (t.keywords || '').split(',').map(s => s.trim()).filter(s => s && !CATEGORY_NAMES.includes(s)).join(', ');
    const keywords = !showDate && extraKw ? ` <span class="topic-keywords">(${extraKw})</span>` : '';
    const itemClass = isLoggedIn ? 'topic-item clickable' : 'topic-item';
    const dblClick = isLoggedIn ? `ondblclick="editTopic('${t.id}')"` : '';
    return `<li class="${itemClass}" ${dblClick}>${catBadge}${t.topic}${keywords}${dateStr}${authorBadge}</li>`;
}

function buildCategoryBadge(category) {
    const icons = { '기술/미래': '⚙️', '사회/문화': '🌍', '관계/소통': '💬', '심리/인식': '🧠', '철학/가치관': '💡' };
    const icon = icons[category] || '';
    return `<span class="topic-cat-badge cat-${category.replace('/', '-')}">${icon} ${category}</span>`;
}

// ── 필터 제어 함수 ────────────────────────────────────────────────────

function setStatusFilter(value) {
    topicFilters.status = value;
    ['statusAll', 'statusPending', 'statusCompleted'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById('status' + value.charAt(0).toUpperCase() + value.slice(1)).classList.add('active');
    displayTopics();
}

function toggleAuthorFilter(author) {
    const idx = topicFilters.authors.indexOf(author);
    if (idx === -1) topicFilters.authors.push(author);
    else topicFilters.authors.splice(idx, 1);
    document.querySelectorAll('.author-pill').forEach(btn => {
        btn.classList.toggle('active', topicFilters.authors.includes(btn.dataset.author));
    });
    displayTopics();
}

function toggleCategoryFilter(category) {
    const idx = topicFilters.categories.indexOf(category);
    if (idx === -1) topicFilters.categories.push(category);
    else topicFilters.categories.splice(idx, 1);
    document.querySelectorAll('.category-pill').forEach(btn => {
        const cat = btn.dataset.category;
        btn.classList.toggle('active', topicFilters.categories.includes(cat));
    });
    displayTopics();
}

function resetTopicFilters() {
    topicFilters = { status: 'all', authors: [], categories: [] };
    document.querySelectorAll('.status-pill, .author-pill, .category-pill').forEach(btn => btn.classList.remove('active'));
    document.getElementById('statusAll').classList.add('active');
    displayTopics();
}

const CATEGORY_NAMES = ['기술/미래', '사회/문화', '관계/소통', '심리/인식', '철학/가치관'];

// 카테고리 선택 토글
function selectTopicCategory(cat) {
    const current = document.getElementById('topicCategory').value;
    const newVal = current === cat ? '' : cat;
    document.getElementById('topicCategory').value = newVal;
    document.querySelectorAll('.topic-cat-pick').forEach(b => {
        b.classList.toggle('selected', b.dataset.cat === newVal);
    });
}

function _initTopicCategoryUI() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    document.getElementById('topicCustomKwRow').classList.toggle('hidden', !isAdmin);
}

// 주제 폼 표시
function showTopicForm() {
    document.getElementById('topicFormContainer').classList.remove('hidden');
    document.getElementById('topicButtons').classList.add('hidden');
    document.getElementById('topicEditId').value = '';
    document.getElementById('topicAuthor').value = '';
    document.getElementById('topicTitle').value = '';
    document.getElementById('topicCategory').value = '';
    document.getElementById('topicKeywords').value = '';
    document.getElementById('topicDate').value = '';
    document.getElementById('topicCompleted').value = 'false';
    document.getElementById('topicDeleteBtn').style.display = 'none';
    document.querySelectorAll('.topic-cat-pick').forEach(b => b.classList.remove('selected'));
    _initTopicCategoryUI();
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
    document.getElementById('topicDate').value = parseToISODate(topic.date);
    document.getElementById('topicCompleted').value = topic.completed ? 'true' : 'false';
    document.getElementById('topicDeleteBtn').style.display = 'inline-block';

    // 기존 키워드에서 카테고리 분리
    const kw = topic.keywords || '';
    const selectedCat = CATEGORY_NAMES.find(c => kw.includes(c)) || '';
    document.getElementById('topicCategory').value = selectedCat;
    document.querySelectorAll('.topic-cat-pick').forEach(b => {
        b.classList.toggle('selected', b.dataset.cat === selectedCat);
    });

    _initTopicCategoryUI();
    // 관리자는 카테고리 제외 나머지 키워드도 표시
    const customKw = kw.split(',').map(s => s.trim()).filter(s => !CATEGORY_NAMES.includes(s)).join(', ');
    document.getElementById('topicKeywords').value = customKw;
}

// 주제 저장
async function saveTopic(event) {
    event.preventDefault();

    const editId = document.getElementById('topicEditId').value;
    const dateValue = document.getElementById('topicDate').value;
    const isAdmin = currentUser && currentUser.role === 'admin';
    const cat = document.getElementById('topicCategory').value;
    const customKw = isAdmin ? document.getElementById('topicKeywords').value.trim() : '';
    const keywordParts = [cat, customKw].filter(Boolean);

    const topic = {
        author: document.getElementById('topicAuthor').value,
        topic: document.getElementById('topicTitle').value,
        keywords: keywordParts.length > 0 ? keywordParts.join(', ') : null,
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

// 출석부 날짜 → 일정 주제 매칭
function findTopicForAttendanceDate(scheduleDate) {
    const yearObj = attendanceYears.find(y => y.id === currentYearId);
    if (!yearObj) return null;

    const year = yearObj.year;
    const parts = scheduleDate.split('/');
    if (parts.length < 2) return null;

    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);

    const matched = schedules.find(s => {
        if (!s.date) return false;
        const isoMatch = String(s.date).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            return parseInt(isoMatch[1]) === year &&
                   parseInt(isoMatch[2]) === month &&
                   parseInt(isoMatch[3]) === day;
        }
        return false;
    });

    return (matched && matched.topic) ? matched.topic : null;
}

// 툴팁 표시
function showAttendanceTooltip(event, cell) {
    const topic = cell.getAttribute('data-topic');
    if (!topic) return;

    const tooltip = document.getElementById('attendanceTooltip');
    tooltip.textContent = topic;
    tooltip.classList.remove('hidden');

    const rect = cell.getBoundingClientRect();
    let left = rect.right + 10;
    let top = event.clientY - 20;

    // 오른쪽 공간 부족 시 왼쪽에 표시
    if (left + 260 > window.innerWidth) {
        left = rect.left - 260;
    }
    if (top < 8) top = 8;
    if (top + 80 > window.innerHeight) top = window.innerHeight - 88;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// 툴팁 숨기기
function hideAttendanceTooltip() {
    document.getElementById('attendanceTooltip').classList.add('hidden');
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
                const topic = findTopicForAttendanceDate(schedule.schedule_date);
                const topicAttr = topic ? `data-topic="${topic.replace(/"/g, '&quot;')}"` : '';
                const topicClass = topic ? ' has-topic' : '';
                const topicEvents = topic
                    ? `onmouseenter="showAttendanceTooltip(event, this)" onmouseleave="hideAttendanceTooltip()"`
                    : '';
                tr.innerHTML = `<td class="schedule-cell${topicClass}" rowspan="3" ${topicAttr} ${topicEvents}>${schedule.schedule_date}</td>`;
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

// ============================================
// 갤러리 관련 함수
// ============================================

let currentModalItemId = null;

// 갤러리 로드
function loadGallery() {
    displayGallery();
}

// 갤러리 표시
function displayGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    const isLoggedIn = currentUser !== null;

    if (galleryItems.length === 0) {
        galleryGrid.innerHTML = '<p class="gallery-empty">등록된 사진이 없습니다.</p>';
        return;
    }

    galleryGrid.innerHTML = '';

    galleryItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.onclick = () => openImageModal(item);

        card.innerHTML = `
            <div class="gallery-card-image">
                <img src="${item.image_data}" alt="${item.title}" loading="lazy">
            </div>
            <div class="gallery-card-info">
                <h4>${item.title}</h4>
                <p class="gallery-card-meta">${item.uploader} · ${formatGalleryDate(item.created_at)}</p>
            </div>
        `;
        galleryGrid.appendChild(card);
    });
}

// 갤러리 날짜 포맷
function formatGalleryDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

// 갤러리 폼 표시
function showGalleryForm() {
    document.getElementById('galleryFormContainer').classList.remove('hidden');
    document.getElementById('galleryButtons').classList.add('hidden');
    document.getElementById('galleryEditId').value = '';
    document.getElementById('galleryTitle').value = '';
    document.getElementById('galleryDescription').value = '';
    document.getElementById('galleryImage').value = '';
    document.getElementById('galleryImagePreview').classList.add('hidden');
    document.getElementById('galleryImageInputRow').classList.remove('hidden');
}

// 갤러리 편집 취소
function cancelGalleryEdit() {
    document.getElementById('galleryFormContainer').classList.add('hidden');
    document.getElementById('galleryButtons').classList.remove('hidden');
    document.getElementById('galleryImagePreview').classList.add('hidden');
}

// 이미지 미리보기
function previewGalleryImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 이미지 파일 확인
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        event.target.value = '';
        return;
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // 이미지 리사이즈
        resizeImage(e.target.result, 1200, 1200, (resizedData) => {
            document.getElementById('galleryPreviewImg').src = resizedData;
            document.getElementById('galleryImagePreview').classList.remove('hidden');
        });
    };
    reader.readAsDataURL(file);
}

// 이미지 리사이즈
function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 리사이즈가 필요한지 확인
        if (width > maxWidth || height > maxHeight) {
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round(width * maxHeight / height);
                    height = maxHeight;
                }
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 품질 0.8로 압축
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
}

// 갤러리 아이템 저장
async function saveGalleryItem(event) {
    event.preventDefault();

    const editId = document.getElementById('galleryEditId').value;
    const title = document.getElementById('galleryTitle').value.trim();
    const description = document.getElementById('galleryDescription').value.trim();

    if (!title) {
        alert('제목을 입력하세요.');
        return;
    }

    try {
        if (editId) {
            // 수정 모드
            await updateGalleryInDB(editId, { title, description });
            alert('사진 정보가 수정되었습니다.');
        } else {
            // 추가 모드
            const previewImg = document.getElementById('galleryPreviewImg');
            if (!previewImg.src || previewImg.src === window.location.href) {
                alert('사진을 선택하세요.');
                return;
            }

            const item = {
                title: title,
                description: description || null,
                image_data: previewImg.src,
                uploader: currentUser.name
            };

            await addGalleryToDB(item);
            alert('사진이 추가되었습니다.');
        }

        await loadGalleryFromDB();
        displayGallery();
        cancelGalleryEdit();
    } catch (error) {
        console.error('갤러리 저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 이미지 모달 열기
function openImageModal(item) {
    currentModalItemId = item.id;
    const isLoggedIn = currentUser !== null;

    document.getElementById('modalImage').src = item.image_data;
    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalDescription').textContent = item.description || '';
    document.getElementById('modalUploader').textContent = item.uploader;
    document.getElementById('modalDate').textContent = formatGalleryDate(item.created_at);

    // 로그인 사용자는 수정/삭제 버튼 표시
    if (isLoggedIn) {
        document.getElementById('modalActions').classList.remove('hidden');
    } else {
        document.getElementById('modalActions').classList.add('hidden');
    }

    document.getElementById('imageModal').classList.remove('hidden');
}

// 이미지 모달 닫기
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    currentModalItemId = null;
}

// 모달에서 갤러리 수정
function editGalleryFromModal() {
    const item = galleryItems.find(i => i.id === currentModalItemId);
    if (!item) return;

    closeImageModal();

    document.getElementById('galleryFormContainer').classList.remove('hidden');
    document.getElementById('galleryButtons').classList.add('hidden');
    document.getElementById('galleryEditId').value = item.id;
    document.getElementById('galleryTitle').value = item.title;
    document.getElementById('galleryDescription').value = item.description || '';
    // 수정 시에는 이미지 변경 불가
    document.getElementById('galleryImageInputRow').classList.add('hidden');
    document.getElementById('galleryImagePreview').classList.add('hidden');
}

// 모달에서 갤러리 삭제
async function deleteGalleryFromModal() {
    if (!currentModalItemId) return;

    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    try {
        await deleteGalleryFromDB(currentModalItemId);
        alert('사진이 삭제되었습니다.');
        closeImageModal();
        await loadGalleryFromDB();
        displayGallery();
    } catch (error) {
        console.error('갤러리 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
    const imageModal = document.getElementById('imageModal');
    if (e.target === imageModal) {
        closeImageModal();
    }
});

// ============================================
// 요청사항 관련 함수
// ============================================

// 요청사항 로드
async function loadRequests() {
    await loadRequestsFromDB();
    displayRequests();
}

// 요청사항 표시
function displayRequests() {
    const tbody = document.getElementById('requestsTableBody');
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isLoggedIn = currentUser !== null;

    tbody.innerHTML = '';

    if (requestItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="requests-empty">등록된 요청사항이 없습니다.</td></tr>`;
        return;
    }

    requestItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.id = `request-row-${item.id}`;
        tr.className = item.is_resolved ? 'request-row resolved' : 'request-row';

        const checkbox = isAdmin
            ? `<input type="checkbox" class="resolved-checkbox" ${item.is_resolved ? 'checked' : ''}
                onchange="toggleRequestResolved('${item.id}', this.checked)">`
            : `<input type="checkbox" class="resolved-checkbox" ${item.is_resolved ? 'checked' : ''} disabled>`;

        const actionCell = isAdmin
            ? `<td class="req-action-cell">
                <button class="edit-btn" onclick="editRequest('${item.id}')">수정</button>
                <button class="delete-btn" onclick="deleteRequest('${item.id}')">삭제</button>
               </td>`
            : isLoggedIn
            ? `<td class="req-action-cell">
                <button class="edit-btn" onclick="editRequest('${item.id}')">수정</button>
               </td>`
            : '';

        tr.innerHTML = `
            <td class="req-name-cell">${item.name}</td>
            <td class="req-content-cell">${item.content}</td>
            <td class="req-status-cell">${checkbox}</td>
            ${actionCell}
        `;
        tbody.appendChild(tr);
    });
}

// 요청 추가 폼 표시
function showRequestForm() {
    document.getElementById('requestFormContainer').classList.remove('hidden');
    document.getElementById('requestButtons').classList.add('hidden');
    document.getElementById('requestName').value = '';
    document.getElementById('requestContent').value = '';
}

// 요청 추가 폼 취소
function cancelRequestForm() {
    document.getElementById('requestFormContainer').classList.add('hidden');
    document.getElementById('requestButtons').classList.remove('hidden');
}

// 요청 추가
async function addRequest(event) {
    event.preventDefault();
    const name = document.getElementById('requestName').value.trim();
    const content = document.getElementById('requestContent').value.trim();

    if (!name || !content) return;

    try {
        await addRequestToDB(name, content);
        cancelRequestForm();
        await loadRequests();
    } catch (error) {
        console.error('요청사항 추가 오류:', error);
        alert('요청사항 등록 중 오류가 발생했습니다.');
    }
}

// 조치반영여부 토글 (관리자 전용)
async function toggleRequestResolved(itemId, isResolved) {
    try {
        await updateRequestResolvedInDB(itemId, isResolved);
        // 로컬 데이터 업데이트 (리렌더링 없이)
        const item = requestItems.find(r => r.id === itemId);
        if (item) {
            item.is_resolved = isResolved;
            // 행 스타일만 갱신
            const checkboxes = document.querySelectorAll('.resolved-checkbox');
            displayRequests();
        }
    } catch (error) {
        console.error('조치반영 업데이트 오류:', error);
        alert('업데이트 중 오류가 발생했습니다.');
    }
}

// 요청사항 삭제 (관리자 전용)
async function deleteRequest(itemId) {
    if (!confirm('이 요청사항을 삭제하시겠습니까?')) return;

    try {
        await deleteRequestFromDB(itemId);
        await loadRequests();
    } catch (error) {
        console.error('요청사항 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 요청사항 인라인 수정
function editRequest(itemId) {
    const item = requestItems.find(r => r.id === itemId);
    if (!item) return;

    const tr = document.getElementById(`request-row-${itemId}`);
    if (!tr) return;

    const isAdmin = currentUser && currentUser.role === 'admin';
    const actionButtons = isAdmin
        ? `<button class="save-btn" onclick="saveRequest('${itemId}')">저장</button>
           <button class="cancel-btn" onclick="cancelEditRequest('${itemId}')">취소</button>
           <button class="delete-btn" onclick="deleteRequest('${itemId}')">삭제</button>`
        : `<button class="save-btn" onclick="saveRequest('${itemId}')">저장</button>
           <button class="cancel-btn" onclick="cancelEditRequest('${itemId}')">취소</button>`;

    tr.innerHTML = `
        <td class="req-name-cell"><input type="text" class="req-edit-input" id="edit-name-${itemId}" value="${item.name.replace(/"/g, '&quot;')}"></td>
        <td class="req-content-cell"><input type="text" class="req-edit-input" id="edit-content-${itemId}" value="${item.content.replace(/"/g, '&quot;')}"></td>
        <td class="req-status-cell"><input type="checkbox" class="resolved-checkbox" ${item.is_resolved ? 'checked' : ''} disabled></td>
        <td class="req-action-cell">${actionButtons}</td>
    `;
}

// 요청사항 수정 저장
async function saveRequest(itemId) {
    const name = document.getElementById(`edit-name-${itemId}`).value.trim();
    const content = document.getElementById(`edit-content-${itemId}`).value.trim();

    if (!name || !content) {
        alert('이름과 요청사항을 모두 입력해주세요.');
        return;
    }

    try {
        await updateRequestContentInDB(itemId, name, content);
        const item = requestItems.find(r => r.id === itemId);
        if (item) {
            item.name = name;
            item.content = content;
        }
        displayRequests();
    } catch (error) {
        console.error('요청사항 수정 오류:', error);
        alert('수정 중 오류가 발생했습니다.');
    }
}

// 요청사항 수정 취소
function cancelEditRequest(itemId) {
    displayRequests();
}

// 스티키 테이블 헤더 (CSS sticky가 overflow-x:auto 컨테이너 안에서 동작 안 하므로 JS로 처리)
function setupStickyHeaders() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const targets = [
        { tableId: 'scheduleTable',    containerId: 'tableContainer' },
        { tableId: 'attendanceTable',  containerId: 'attendanceTableContainer' },
        { tableId: 'requestsTable',    containerId: 'requestsTableWrapper' }
    ];

    function update() {
        const mainTop = mainContent.getBoundingClientRect().top;

        targets.forEach(({ tableId, containerId }) => {
            const table     = document.getElementById(tableId);
            const container = document.getElementById(containerId);
            if (!table || !container) return;

            const thead = table.querySelector('thead');
            if (!thead) return;

            const tableRect = table.getBoundingClientRect();
            const theadH    = thead.offsetHeight;

            if (tableRect.top < mainTop && tableRect.bottom > mainTop + theadH) {
                thead.style.transform = `translateY(${mainTop - tableRect.top}px)`;
                thead.style.zIndex    = '10';
                thead.style.position  = 'relative';
            } else {
                thead.style.transform = '';
                thead.style.zIndex    = '';
                thead.style.position  = '';
            }
        });
    }

    mainContent.addEventListener('scroll', update, { passive: true });
}
