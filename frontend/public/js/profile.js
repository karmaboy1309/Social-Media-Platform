// ══════════════════════════════════════════
// Vibe — Profile Page JavaScript
// ══════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

// ── State ──
let currentUser = null;   // Logged-in user
let profileUser = null;   // User whose profile we're viewing
let isOwnProfile = false;

// ── DOM References ──
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  // Get profile user ID from URL (?user=xxx) or default to logged-in user
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get('user');

  // Load logged-in user
  if (token) {
    try {
      const res = await apiFetch('/auth/me');
      currentUser = res.user;
      $('navUser').textContent = `@${currentUser.username}`;
    } catch {
      localStorage.removeItem('token');
    }
  }

  // Determine whose profile to load
  const targetId = profileId || (currentUser ? currentUser._id : null);

  if (!targetId) {
    // No user to show — redirect to landing
    window.location.href = 'index.html';
    return;
  }

  await loadProfile(targetId);
  setupEventListeners();
});

// ══════════ API Helper ══════════
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ══════════ Load Profile ══════════
async function loadProfile(userId) {
  try {
    const data = await apiFetch(`/users/${userId}`);
    profileUser = data.user;
    isOwnProfile = currentUser && currentUser._id === profileUser._id;

    renderProfile();
  } catch (error) {
    $('profileFullName').textContent = 'User Not Found';
    $('profileUsername').textContent = '';
    console.error('Load profile error:', error);
  }
}

// ══════════ Render Profile ══════════
function renderProfile() {
  const u = profileUser;

  // Avatar
  const avatarSrc = u.profileImage === 'default-avatar.png'
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.username)}&background=6c5ce7&color=fff&size=200&bold=true`
    : `${API_BASE.replace('/api', '')}/uploads/${u.profileImage}`;
  $('profileAvatar').src = avatarSrc;

  // Info
  $('profileFullName').textContent = u.fullName || u.username;
  $('profileUsername').textContent = `@${u.username}`;
  $('profileBio').textContent = u.bio || '';
  $('profileJoined').textContent = `Joined ${new Date(u.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  // Verified badge
  if (u.isVerified) $('verifiedBadge').style.display = 'inline-flex';

  // Stats
  $('postCount').textContent = formatNumber(u.postCount || 0);
  $('followersCount').textContent = formatNumber(u.followersCount || 0);
  $('followingCount').textContent = formatNumber(u.followingCount || 0);

  // Page title
  document.title = `${u.fullName || u.username} (@${u.username}) — Vibe`;

  // Show edit or follow button
  if (isOwnProfile) {
    $('editProfileBtn').style.display = 'inline-flex';
    $('followBtn').style.display = 'none';
    document.querySelector('.profile-container').classList.add('is-own-profile');
  } else if (currentUser) {
    $('editProfileBtn').style.display = 'none';
    $('followBtn').style.display = 'inline-flex';
    updateFollowButton();
  }
}

// ══════════ Follow Button State ══════════
function updateFollowButton() {
  const btn = $('followBtn');
  const isFollowing = profileUser.followers.some(
    (f) => (f._id || f) === currentUser._id
  );

  if (isFollowing) {
    btn.textContent = 'Following';
    btn.classList.add('following');
  } else {
    btn.textContent = 'Follow';
    btn.classList.remove('following');
  }
}

// ══════════ Event Listeners ══════════
function setupEventListeners() {
  // ── Edit Profile Modal ──
  $('editProfileBtn')?.addEventListener('click', openEditModal);
  $('modalClose')?.addEventListener('click', closeEditModal);
  $('cancelEdit')?.addEventListener('click', closeEditModal);
  $('editModal')?.addEventListener('click', (e) => {
    if (e.target === $('editModal')) closeEditModal();
  });

  // ── Character counters ──
  $('editFullName')?.addEventListener('input', () => {
    $('nameCharCount').textContent = $('editFullName').value.length;
  });
  $('editUsername')?.addEventListener('input', () => {
    $('usernameCharCount').textContent = $('editUsername').value.length;
  });
  $('editBio')?.addEventListener('input', () => {
    $('bioCharCount').textContent = $('editBio').value.length;
  });

  // ── Save Profile ──
  $('editProfileForm')?.addEventListener('submit', handleSaveProfile);

  // ── Avatar Upload ──
  $('avatarUploadBtn')?.addEventListener('click', () => {
    $('avatarInput').click();
  });
  $('avatarInput')?.addEventListener('change', handleAvatarUpload);

  // ── Follow / Unfollow ──
  $('followBtn')?.addEventListener('click', handleFollow);

  // ── Followers / Following List Modal ──
  $('followersStatBtn')?.addEventListener('click', () => openListModal('Followers', profileUser.followers));
  $('followingStatBtn')?.addEventListener('click', () => openListModal('Following', profileUser.following));
  $('listModalClose')?.addEventListener('click', closeListModal);
  $('listModal')?.addEventListener('click', (e) => {
    if (e.target === $('listModal')) closeListModal();
  });

  // ── Logout ──
  $('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  // ── Mobile menu ──
  $('mobileToggle')?.addEventListener('click', () => {
    $('navbar').classList.toggle('menu-open');
    $('navLinks').classList.toggle('active');
    document.querySelector('.nav-actions')?.classList.toggle('active');
  });

  // ── Escape key closes modals ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeListModal();
    }
  });
}

// ══════════ Edit Modal ══════════
function openEditModal() {
  $('editFullName').value = profileUser.fullName || '';
  $('editUsername').value = profileUser.username || '';
  $('editBio').value = profileUser.bio || '';
  $('nameCharCount').textContent = (profileUser.fullName || '').length;
  $('usernameCharCount').textContent = (profileUser.username || '').length;
  $('bioCharCount').textContent = (profileUser.bio || '').length;
  $('formMessage').textContent = '';
  $('editModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  $('editModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ══════════ Save Profile ══════════
async function handleSaveProfile(e) {
  e.preventDefault();
  const btn = $('saveProfileBtn');
  const msg = $('formMessage');

  const body = {
    fullName: $('editFullName').value.trim(),
    username: $('editUsername').value.trim(),
    bio: $('editBio').value.trim(),
  };

  btn.disabled = true;
  btn.textContent = 'Saving...';
  msg.textContent = '';
  msg.className = 'form-message';

  try {
    const data = await apiFetch(`/users/${profileUser._id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    profileUser = data.user;
    currentUser = data.user;
    renderProfile();

    msg.textContent = '✓ Profile updated!';
    msg.classList.add('success');

    setTimeout(closeEditModal, 1200);
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ══════════ Avatar Upload ══════════
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5MB');
    return;
  }

  const formData = new FormData();
  formData.append('profileImage', file);

  try {
    const data = await apiFetch(`/users/${profileUser._id}/avatar`, {
      method: 'PUT',
      body: formData,
    });

    profileUser = data.user;
    renderProfile();
  } catch (error) {
    alert(error.message);
  }
}

// ══════════ Follow / Unfollow ══════════
async function handleFollow() {
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  const isFollowing = profileUser.followers.some(
    (f) => (f._id || f) === currentUser._id
  );

  const action = isFollowing ? 'unfollow' : 'follow';

  try {
    await apiFetch(`/users/${profileUser._id}/${action}`, { method: 'PUT' });

    // Update local state
    if (isFollowing) {
      profileUser.followers = profileUser.followers.filter(
        (f) => (f._id || f) !== currentUser._id
      );
    } else {
      profileUser.followers.push({ _id: currentUser._id, username: currentUser.username });
    }

    // Re-count
    profileUser.followersCount = profileUser.followers.length;
    renderProfile();
    updateFollowButton();
  } catch (error) {
    alert(error.message);
  }
}

// ══════════ Followers / Following List Modal ══════════
function openListModal(title, users) {
  $('listModalTitle').textContent = title;
  const list = $('modalUserList');

  if (!users || users.length === 0) {
    list.innerHTML = '<p class="empty-list">No users to show</p>';
  } else {
    list.innerHTML = users
      .map((u) => {
        const name = u.fullName || u.username || 'User';
        const handle = u.username || '';
        const img = u.profileImage && u.profileImage !== 'default-avatar.png'
          ? `${API_BASE.replace('/api', '')}/uploads/${u.profileImage}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff&size=88&bold=true`;

        return `
          <div class="user-list-item" onclick="window.location.href='profile.html?user=${u._id}'">
            <img src="${img}" alt="${name}" class="user-list-avatar" />
            <div class="user-list-info">
              <div class="user-list-name">${name}</div>
              <div class="user-list-handle">@${handle}</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  $('listModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeListModal() {
  $('listModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ══════════ Utilities ══════════
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
