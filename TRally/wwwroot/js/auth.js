// 로그인/회원가입 전환
function showSignup() {
    document.getElementById('loginFormContainer').classList.add('hidden');
    document.getElementById('signupFormContainer').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('signupFormContainer').classList.add('hidden');
    document.getElementById('loginFormContainer').classList.remove('hidden');
}

// 회원가입
async function signup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const email = document.getElementById('signupEmail').value;
    const intro = document.getElementById('signupIntro').value;

    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        // 아이디 중복 확인
        const exists = await checkUsernameExists(username);
        if (exists) {
            alert('이미 사용중인 아이디입니다.');
            return;
        }

        const newUser = { name, username, password, email, intro };
        const savedUser = await addPendingUser(newUser);

        // 관리자에게 이메일 발송
        await sendAdminNotification(savedUser);

        // 폼 초기화
        document.getElementById('signupName').value = '';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupPasswordConfirm').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupIntro').value = '';

        alert('가입 신청이 완료되었습니다.\n관리자 승인 후 로그인이 가능합니다.');
        showLogin();
    } catch (error) {
        console.error('회원가입 오류:', error);
        alert('회원가입 중 오류가 발생했습니다.');
    }
}

// 관리자 이메일 발송 (EmailJS)
async function sendAdminNotification(user) {
    try {
        const templateParams = {
            to_email: ADMIN_EMAIL,
            user_name: user.name,
            user_id: user.username,
            user_email: user.email,
            user_intro: user.intro,
            request_date: new Date().toLocaleString('ko-KR')
        };

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        console.log('관리자 알림 이메일 발송 완료');
    } catch (error) {
        console.error('이메일 발송 실패:', error);
    }
}

// 사용자 승인/거부 이메일
async function sendUserNotification(user, approved) {
    try {
        const templateParams = {
            to_email: user.email,
            user_name: user.name,
            status: approved ? '승인' : '거부',
            message: approved
                ? 'TRally 회원 가입이 승인되었습니다! 이제 로그인하실 수 있습니다.'
                : 'TRally 회원 가입이 승인되지 않았습니다.'
        };

        await emailjs.send(EMAILJS_SERVICE_ID, 'template_user_notify', templateParams);
        console.log('사용자 알림 이메일 발송 완료');
    } catch (error) {
        console.error('이메일 발송 실패:', error);
    }
}

// 로그인
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const user = await authenticateUser(username, password);

        if (user) {
            currentUser = user;
            document.getElementById('currentUser').textContent = user.name;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('mainPage').style.display = 'block';

            if (user.role === 'admin') {
                document.getElementById('adminMenu').classList.remove('hidden');
            }

            loadSchedules();
            loadTopics();
            if (user.role === 'admin') {
                await loadPendingUsersFromDB();
                loadPendingUsers();
                loadApprovedMembers();
            }
        } else {
            alert('아이디 또는 비밀번호가 올바르지 않거나 승인 대기 중입니다.');
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

// 로그아웃
function logout() {
    currentUser = null;
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('adminMenu').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// 회원 승인
async function approveUser(userId) {
    try {
        const user = pendingUsers.find(u => u.id === userId);
        await approveUserInDB(userId);

        await sendUserNotification(user, true);
        alert(`${user.name}님의 가입이 승인되었습니다.`);

        await loadPendingUsersFromDB();
        loadPendingUsers();
    } catch (error) {
        console.error('승인 오류:', error);
        alert('승인 중 오류가 발생했습니다.');
    }
}

// 회원 거부
async function rejectUser(userId) {
    const user = pendingUsers.find(u => u.id === userId);

    if (confirm(`${user.name}님의 가입을 거부하시겠습니까?`)) {
        try {
            await rejectUserInDB(userId);
            await sendUserNotification(user, false);

            alert('가입이 거부되었습니다.');
            await loadPendingUsersFromDB();
            loadPendingUsers();
        } catch (error) {
            console.error('거부 오류:', error);
            alert('거부 중 오류가 발생했습니다.');
        }
    }
}

// 회원 승인 해제
async function unapproveUser(userId) {
    const user = users.find(u => u.id === userId);

    if (confirm(`${user.name}님의 승인을 해제하시겠습니까?\n해당 회원은 로그인할 수 없게 됩니다.`)) {
        try {
            await unapproveUserInDB(userId);

            alert(`${user.name}님의 승인이 해제되었습니다.`);
            await loadUsersFromDB();
            await loadPendingUsersFromDB();
            loadPendingUsers();
            loadApprovedMembers();
        } catch (error) {
            console.error('승인 해제 오류:', error);
            alert('승인 해제 중 오류가 발생했습니다.');
        }
    }
}

// 회원 삭제
async function deleteMember(userId) {
    const user = users.find(u => u.id === userId);

    if (confirm(`${user.name}님을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        try {
            await deleteMemberFromDB(userId);

            alert(`${user.name}님이 삭제되었습니다.`);
            await loadUsersFromDB();
            loadApprovedMembers();
        } catch (error) {
            console.error('회원 삭제 오류:', error);
            alert('회원 삭제 중 오류가 발생했습니다.');
        }
    }
}
