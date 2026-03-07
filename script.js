// ==================== GLOBAL STATE ====================
let currentUser = null;
let token = localStorage.getItem('token') || null;
let pendingDeleteId = null;

// ==================== HELPER FUNCTIONS ====================
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/.netlify/functions/${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

function showView(viewId) {
    document.querySelectorAll('.active-view, .dashboard-view, #auth-view, #landing').forEach(el => el.classList.add('hidden'));
    if (viewId === 'landing') {
        document.getElementById('landing').classList.remove('hidden');
        document.getElementById('search-container').style.display = 'none';
    } else if (viewId === 'auth') {
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('search-container').style.display = 'none';
    } else {
        document.getElementById(viewId).classList.add('active');
        document.getElementById(viewId).classList.remove('hidden');
        document.getElementById('search-container').style.display = 'flex';
    }
}

function updateNav() {
    const nav = document.getElementById('main-nav');
    if (currentUser) {
        nav.innerHTML = `
            <a href="#" class="nav-dashboard">Dashboard</a>
            <a href="#" class="nav-vault">Vault</a>
            <a href="#" class="nav-referrals">Referrals</a>
            <a href="#" class="nav-marketplace">Marketplace</a>
            <a href="#" class="nav-notifications">Notifications</a>
            <a href="#" class="nav-chat">Chat</a>
            <a href="#" class="nav-settings">Settings</a>
            <a href="#" id="logout-btn" class="btn-logout">Logout</a>
        `;
    } else {
        nav.innerHTML = `
            <a href="#" id="show-login">Login</a>
            <a href="#" id="show-register-nav" class="btn-glow">Sign Up</a>
        `;
    }
}

// ==================== AUTH ====================
document.addEventListener('click', (e) => {
    if (e.target.id === 'show-login' || e.target.id === 'switch-to-login') {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        showView('auth');
    }
    if (e.target.id === 'show-register' || e.target.id === 'show-register-nav' || e.target.id === 'switch-to-register') {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        showView('auth');
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref) document.getElementById('reg-ref').value = ref;
    }
    if (e.target.id === 'home-link') {
        e.preventDefault();
        if (currentUser) showView('dashboard-view');
        else showView('landing');
    }
});

document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const data = await apiCall('auth-login', 'POST', { email, password });
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        updateNav();
        showView('dashboard-view');
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-username').value;
    const fullName = document.getElementById('reg-fullname').value;
    const password = document.getElementById('reg-password').value;
    const ref = document.getElementById('reg-ref').value;

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username can only contain letters, numbers, and underscore.');
        return;
    }

    try {
        const data = await apiCall('auth-register', 'POST', { email, username, fullName, password, referralCode: ref });
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        updateNav();
        showView('dashboard-view');
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'logout-btn') {
        e.preventDefault();
        token = null;
        localStorage.removeItem('token');
        currentUser = null;
        updateNav();
        showView('landing');
    }
});

// ==================== DASHBOARD ====================
async function loadDashboard() {
    if (!currentUser) return;
    try {
        const data = await apiCall('dashboard-stats', 'GET');
        document.getElementById('vault-count').innerText = data.vaultCount;
        document.getElementById('task-count').innerText = data.taskCount;
        document.getElementById('referral-signups').innerText = data.referralSignups;
        document.getElementById('points').innerText = data.points;

        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';
        data.tasks.slice(0,5).forEach(task => {
            const li = document.createElement('li');
            li.innerHTML = `<input type="checkbox" data-id="${task.id}"> ${task.title}`;
            taskList.appendChild(li);
        });

        const goalsList = document.getElementById('goals-list');
        goalsList.innerHTML = '';
        data.goals.slice(0,3).forEach(goal => {
            const progress = (goal.current / goal.target * 100) || 0;
            goalsList.innerHTML += `
                <div style="margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>${goal.title}</span>
                        <span>${goal.current || 0}/${goal.target || 100}</span>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px;">
                        <div style="height:100%; width:${progress}%; background:var(--electric-blue); border-radius:3px;"></div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

// ==================== TASKS ====================
document.getElementById('add-task-btn').addEventListener('click', async () => {
    const title = prompt('Task title:');
    if (title) {
        await apiCall('task-create', 'POST', { title });
        loadDashboard();
    }
});

document.getElementById('task-list').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
        const taskId = e.target.dataset.id;
        await apiCall('task-complete', 'POST', { taskId });
        loadDashboard();
    }
});

// ==================== VAULT ====================
function toggleTypeFields() {
    const type = document.getElementById('item-type').value;
    const fileGroup = document.getElementById('file-upload-group');
    const downloadGroup = document.getElementById('download-permission-group');
    if (type === 'website' || type === 'video' || type === 'folder') {
        fileGroup.style.display = 'block';
        if (type === 'video') downloadGroup.style.display = 'block';
        else downloadGroup.style.display = 'none';
    } else {
        fileGroup.style.display = 'none';
        downloadGroup.style.display = 'none';
    }
}

async function loadVault() {
    try {
        const items = await apiCall('vault-list', 'GET');
        const container = document.getElementById('vault-items');
        container.innerHTML = '';
        items.forEach(item => {
            let preview = '';
            if (item.type === 'website' && item.fileUrl) {
                preview = `<button class="btn preview-website" data-id="${item.id}">Preview Website</button>`;
            } else if (item.type === 'video' && item.fileUrl) {
                preview = `<video controls ${item.allowDownload ? '' : 'controlsList="nodownload"'}><source src="${item.fileUrl}" type="${item.fileType}"></video>`;
            } else if (item.type === 'folder' && item.children) {
                preview = renderFolderTree(JSON.parse(item.children));
            }
            container.innerHTML += `
                <div class="vault-item" data-id="${item.id}">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="visibility-badge ${item.visibility}">${item.visibility}</span>
                        <span>${item.type}</span>
                    </div>
                    <h4>${item.title}</h4>
                    <p>${item.description || ''}</p>
                    ${preview}
                    <div style="margin-top:1rem;">
                        <button class="btn edit-item">Edit</button>
                        <button class="btn delete-item">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

function renderFolderTree(children) {
    if (!children || children.length === 0) return '<p>Empty folder</p>';
    let html = '<div class="folder-tree">';
    children.forEach(child => {
        html += `<div class="file-item">`;
        if (child.type === 'folder') {
            html += `📁 ${child.name}`;
            if (child.children) html += renderFolderTree(child.children);
        } else {
            html += `📄 ${child.name} <button class="btn download-file" data-file='${JSON.stringify(child)}'>Download</button>`;
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-vault')) {
        e.preventDefault();
        showView('vault-view');
        loadVault();
    }
    if (e.target.id === 'new-vault-item') {
        document.getElementById('modal-title').innerText = 'New Vault Item';
        document.getElementById('item-id').value = '';
        document.getElementById('item-title').value = '';
        document.getElementById('item-description').value = '';
        document.getElementById('item-type').value = 'idea';
        document.getElementById('item-visibility').value = 'private';
        document.getElementById('item-content').value = '';
        document.getElementById('item-file').value = '';
        toggleTypeFields();
        document.getElementById('item-modal').classList.add('active');
    }
    if (e.target.classList.contains('edit-item')) {
        const itemDiv = e.target.closest('.vault-item');
        const itemId = itemDiv.dataset.id;
        // fetch item details and populate modal
        // (simplified: you can store item data in dataset or fetch again)
    }
    if (e.target.classList.contains('delete-item')) {
        const itemDiv = e.target.closest('.vault-item');
        pendingDeleteId = itemDiv.dataset.id;
        document.getElementById('password-modal').classList.add('active');
    }
});

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const type = document.getElementById('item-type').value;
    const fileInput = document.getElementById('item-file');
    const allowDownload = document.getElementById('allow-download')?.checked || false;

    let fileUrl = null;
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        const base64 = await new Promise(resolve => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
        const uploadData = await apiCall('upload', 'POST', { file: base64 });
        fileUrl = uploadData.url;
    }

    const itemData = {
        title: document.getElementById('item-title').value,
        description: document.getElementById('item-description').value,
        type,
        visibility: document.getElementById('item-visibility').value,
        content: document.getElementById('item-content').value,
        fileUrl,
        fileName: fileInput.files[0]?.name,
        fileType: fileInput.files[0]?.type,
        allowDownload
    };

    if (id) {
        await apiCall('vault-update', 'PUT', { id, ...itemData });
    } else {
        await apiCall('vault-create', 'POST', itemData);
    }
    document.getElementById('item-modal').classList.remove('active');
    loadVault();
});

document.getElementById('confirm-delete').addEventListener('click', async () => {
    const password = document.getElementById('delete-password').value;
    try {
        await apiCall('vault-delete', 'DELETE', { id: pendingDeleteId, password });
        document.getElementById('password-modal').classList.remove('active');
        loadVault();
    } catch (err) {
        alert(err.message);
    }
});

// ==================== REFERRALS ====================
async function loadReferrals() {
    if (!currentUser) return;
    try {
        const data = await apiCall('referral-stats', 'GET');
        document.getElementById('referral-link').value = `${window.location.origin}?ref=${currentUser.referralCode}`;
        document.getElementById('total-clicks').innerText = data.clicks;
        document.getElementById('total-signups').innerText = data.signups;
        document.getElementById('earned-points').innerText = data.points;

        const sorted = await apiCall('leaderboard', 'GET');
        let html = '<ol>';
        sorted.forEach(u => {
            html += `<li>${u.username} – ${u.points} points</li>`;
        });
        html += '</ol>';
        document.getElementById('leaderboard').innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-referrals')) {
        e.preventDefault();
        showView('referral-view');
        loadReferrals();
    }
    if (e.target.id === 'copy-link') {
        const link = document.getElementById('referral-link');
        link.select();
        document.execCommand('copy');
        alert('Link copied!');
    }
});

// ==================== MARKETPLACE & USER DIRECTORY ====================
async function loadMarketplace() {
    try {
        const publicItems = await apiCall('marketplace-items', 'GET');
        const container = document.getElementById('marketplace-items');
        container.innerHTML = '';
        publicItems.forEach(item => {
            container.innerHTML += `
                <div class="vault-item">
                    <h4>${item.title}</h4>
                    <p>${item.description || ''}</p>
                    <p><small>by ${item.owner}</small></p>
                    <button class="btn like-item" data-id="${item.id}">❤️ ${item.likes}</button>
                    <button class="btn collaborate-item" data-id="${item.id}">Collaborate</button>
                </div>
            `;
        });

        const users = await apiCall('users-list', 'GET');
        const userDiv = document.getElementById('user-directory');
        userDiv.innerHTML = '';
        users.forEach(u => {
            userDiv.innerHTML += `
                <div class="glass-panel" style="padding:1rem;">
                    <strong>${u.username}</strong><br>
                    <small>${u.bio || 'No bio'}</small><br>
                    <button class="btn chat-user" data-username="${u.username}">Chat</button>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-marketplace')) {
        e.preventDefault();
        showView('marketplace-view');
        loadMarketplace();
    }
    if (e.target.classList.contains('like-item')) {
        const itemId = e.target.dataset.id;
        apiCall('like-item', 'POST', { itemId }).then(() => {
            e.target.innerText = `❤️ ${parseInt(e.target.innerText.split(' ')[1])+1}`;
        });
    }
    if (e.target.classList.contains('collaborate-item')) {
        const itemId = e.target.dataset.id;
        apiCall('request-collaboration', 'POST', { itemId }).then(() => {
            alert('Collaboration request sent!');
        });
    }
    if (e.target.classList.contains('chat-user')) {
        const username = e.target.dataset.username;
        showView('chat-view');
        loadChat(username);
    }
});

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    try {
        const notifs = await apiCall('notifications', 'GET');
        const container = document.getElementById('notifications-list');
        container.innerHTML = '';
        notifs.forEach(n => {
            container.innerHTML += `<div class="notification">${n.message}</div>`;
        });
        if (notifs.length === 0) container.innerHTML = '<p>No new notifications.</p>';
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-notifications')) {
        e.preventDefault();
        showView('notifications-view');
        loadNotifications();
    }
});

// ==================== CHAT ====================
let currentChatPartner = null;
let chatInterval = null;

async function loadChat(partnerUsername) {
    currentChatPartner = partnerUsername;
    document.getElementById('chat-messages').innerHTML = '';
    const messages = await apiCall('chat-messages', 'POST', { partner: partnerUsername });
    messages.forEach(m => {
        addChatMessage(m);
    });
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(refreshChat, 3000);
}

function addChatMessage(m) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `<span class="sender">${m.sender}:</span> ${m.message}`;
    document.getElementById('chat-messages').appendChild(div);
}

async function refreshChat() {
    if (!currentChatPartner) return;
    const messages = await apiCall('chat-messages', 'POST', { partner: currentChatPartner, since: Date.now() - 3000 });
    messages.forEach(m => addChatMessage(m));
}

document.getElementById('chat-send').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    if (!input.value.trim() || !currentChatPartner) return;
    await apiCall('chat-send', 'POST', { to: currentChatPartner, message: input.value });
    input.value = '';
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-chat')) {
        e.preventDefault();
        showView('chat-view');
        // load online users
        apiCall('online-users', 'GET').then(users => {
            const container = document.getElementById('online-users');
            container.innerHTML = '';
            users.forEach(u => {
                container.innerHTML += `<span class="online-user chat-user" data-username="${u.username}">${u.username}</span>`;
            });
        });
    }
});

// ==================== SETTINGS ====================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-settings')) {
        e.preventDefault();
        showView('settings-view');
        document.getElementById('profile-fullname').value = currentUser.fullName || '';
        document.getElementById('profile-bio').value = currentUser.bio || '';
    }
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('profile-fullname').value;
    const bio = document.getElementById('profile-bio').value;
    await apiCall('update-profile', 'POST', { fullName, bio });
    currentUser.fullName = fullName;
    currentUser.bio = bio;
    alert('Profile updated');
});

// ==================== PAYMENTS ====================
function payWithPaystack(amount, plan) {
    const handler = PaystackPop.setup({
        key: 'pk_live_e9187cf2e8bd15a5e1dad8dc105e0f5e72b05594',
        email: currentUser.email,
        amount: amount * 100,
        currency: 'NGN',
        ref: 'mytrezuri_' + Date.now(),
        callback: async function() {
            alert('Payment successful! You are now premium.');
            await apiCall('upgrade-premium', 'POST', { plan });
            currentUser.role = 'premium';
        },
        onClose: () => alert('Payment cancelled')
    });
    handler.openIframe();
}

document.getElementById('pay-simple').addEventListener('click', () => payWithPaystack(1500, 'simple'));
document.getElementById('pay-premium').addEventListener('click', () => payWithPaystack(16500, 'premium'));

// ==================== SEARCH ====================
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value;
    const results = await apiCall('search', 'POST', { query });
    // Display results (simplified: alert)
    alert('Search results: ' + JSON.stringify(results));
});

// ==================== COOKIE BANNER & MODALS ====================
const cookieBanner = document.getElementById('cookie-banner');
const acceptBtn = document.getElementById('accept-cookies');
if (!localStorage.getItem('cookiesAccepted')) {
    setTimeout(() => cookieBanner.classList.add('show'), 1000);
}
acceptBtn.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    cookieBanner.classList.remove('show');
});

// Terms and Privacy modals
const termsModal = document.getElementById('terms-modal');
const privacyModal = document.getElementById('privacy-modal');
document.querySelectorAll('#show-terms, #footer-terms').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.classList.add('active');
    });
});
document.querySelectorAll('#show-privacy, #footer-privacy').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        privacyModal.classList.add('active');
    });
});
document.getElementById('close-terms').addEventListener('click', () => termsModal.classList.remove('active'));
document.getElementById('close-privacy').addEventListener('click', () => privacyModal.classList.remove('active'));
window.addEventListener('click', (e) => {
    if (e.target === termsModal) termsModal.classList.remove('active');
    if (e.target === privacyModal) privacyModal.classList.remove('active');
});

// ==================== INIT ====================
(async function init() {
    if (token) {
        try {
            const user = await apiCall('auth-me', 'GET');
            currentUser = user;
            updateNav();
            showView('dashboard-view');
            loadDashboard();
        } catch {
            token = null;
            localStorage.removeItem('token');
            showView('landing');
        }
    } else {
        showView('landing');
    }

    // Create particles
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (5 + Math.random() * 10) + 's';
        particle.style.animationDelay = Math.random() * 10 + 's';
        document.getElementById('particles').appendChild(particle);
    }
})();