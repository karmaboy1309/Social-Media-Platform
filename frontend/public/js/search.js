// ══════════════════════════════════════════
// Vibe — Search Page JavaScript
// ══════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let searchTimeout = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = 'index.html';

  try {
    const res = await apiFetch('/auth/me');
    currentUser = res.user;
    $('navUser').textContent = `@${currentUser.username}`;
  } catch {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  }

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

// ══════════ Event Listeners ══════════
function setupEventListeners() {
  $('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  $('mobileToggle')?.addEventListener('click', () => {
    $('navbar').classList.toggle('menu-open');
    $('navLinks').classList.toggle('active');
    document.querySelector('.nav-actions')?.classList.toggle('active');
  });

  // Search Input with Debounce
  $('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      $('searchTabs').style.display = 'none';
      $('searchStatus').style.display = 'block';
      $('searchStatus').textContent = 'Type to start searching...';
      $('usersSection').classList.remove('active');
      $('postsSection').classList.remove('active');
      return;
    }

    $('searchStatus').style.display = 'block';
    $('searchStatus').textContent = 'Searching...';
    $('searchTabs').style.display = 'none';
    $('usersSection').classList.remove('active');
    $('postsSection').classList.remove('active');

    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 500); // 500ms debounce
  });

  // Tabs
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.results-section').forEach(s => s.classList.remove('active'));
      
      tab.classList.add('active');
      $(tab.dataset.target).classList.add('active');
    });
  });
}

// ══════════ Perform Search ══════════
async function performSearch(query) {
  try {
    const data = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
    
    $('searchStatus').style.display = 'none';
    $('searchTabs').style.display = 'flex';
    
    // Default to users tab active
    document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.results-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.search-tab[data-target="usersSection"]').classList.add('active');
    $('usersSection').classList.add('active');

    $('usersCount').textContent = data.users.length;
    $('postsCount').textContent = data.posts.length;

    renderUsers(data.users);
    renderPosts(data.posts);
  } catch (error) {
    console.error('Search error:', error);
    $('searchStatus').style.display = 'block';
    $('searchStatus').innerHTML = '<span style="color:#f43f5e">Failed to load results</span>';
  }
}

// ══════════ Render Users ══════════
function renderUsers(users) {
  const container = $('usersResults');
  
  if (!users || users.length === 0) {
    container.innerHTML = `<div class="search-status" style="grid-column: 1/-1">No users found</div>`;
    return;
  }

  container.innerHTML = users.map(u => {
    const name = u.fullName || u.username;
    const img = u.profileImage && u.profileImage !== 'default-avatar.png'
      ? `${API_BASE.replace('/api', '')}/uploads/${u.profileImage}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff&size=88&bold=true`;

    let followBtnHtml = '';
    if (currentUser && currentUser._id !== u._id) {
      const isFollowing = currentUser.following && currentUser.following.some(f => (f._id || f) === u._id);
      followBtnHtml = `
        <button class="btn ${isFollowing ? 'btn-outline following' : 'btn-primary'} btn-sm"
          style="margin-top:16px; padding: 6px 16px; font-size: 0.85rem;"
          onclick="event.stopPropagation(); handleSearchFollow('${u._id}', this)">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
      `;
    }

    return `
      <div class="search-user-card" onclick="window.location.href='profile.html?user=${u._id}'">
        <img src="${img}" alt="${name}" class="search-user-avatar" />
        <div class="search-user-name">${name}</div>
        <div class="search-user-handle">@${u.username}</div>
        ${followBtnHtml}
      </div>
    `;
  }).join('');
}

// ══════════ Follow Logic ══════════
window.handleSearchFollow = async (userId, btn) => {
  if (!currentUser) return;
  const isFollowing = btn.classList.contains('following');
  const action = isFollowing ? 'unfollow' : 'follow';
  
  try {
    btn.disabled = true;
    await apiFetch(`/users/${userId}/${action}`, { method: 'PUT' });
    
    if (isFollowing) {
      btn.classList.remove('following', 'btn-outline');
      btn.classList.add('btn-primary');
      btn.textContent = 'Follow';
      if (currentUser.following) {
        currentUser.following = currentUser.following.filter(f => (f._id || f) !== userId);
      }
    } else {
      btn.classList.add('following', 'btn-outline');
      btn.classList.remove('btn-primary');
      btn.textContent = 'Following';
      if (!currentUser.following) currentUser.following = [];
      currentUser.following.push({ _id: userId });
    }
  } catch (error) {
    alert(error.message);
  } finally {
    btn.disabled = false;
  }
};

// ══════════ Render Posts ══════════
function renderPosts(posts) {
  const container = $('postsResults');
  
  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-posts">
        <span class="empty-icon">📝</span>
        <p>No posts found matching your search.</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(post => {
    const authorImg = post.author.profileImage === 'default-avatar.png' 
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.fullName || post.author.username)}&background=6c5ce7&color=fff&size=88&bold=true`
      : `${API_BASE.replace('/api', '')}/uploads/${post.author.profileImage}`;

    const postImg = post.image 
      ? `<img src="${API_BASE.replace('/api', '')}/uploads/${post.image}" alt="Post image" class="post-image" />` 
      : '';

    const isLiked = currentUser && post.likes.some(id => id === currentUser._id);
    const likeIcon = isLiked ? '❤️' : '🤍';
    
    return `
      <div class="post-card" id="post-${post._id}">
        <div class="post-header" style="cursor:pointer" onclick="window.location.href='profile.html?user=${post.author._id}'">
          <img src="${authorImg}" alt="Author" class="post-author-avatar" />
          <div class="post-author-info">
            <span class="post-author-name">${post.author.fullName || post.author.username}</span>
            <span class="post-author-handle">@${post.author.username}</span>
          </div>
          <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="post-content">
          <p>${post.content}</p>
          ${postImg}
        </div>
        <div class="post-actions-bar">
          <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">
            <span id="like-icon-${post._id}">${likeIcon}</span>
            <span id="like-count-${post._id}">${post.likes.length}</span>
          </button>
          <button class="post-action-btn" onclick="window.location.href='feed.html'">
            <span>💬</span>
            <span>Comment</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleLike = async (postId) => {
  try {
    const data = await apiFetch(`/posts/${postId}/like`, { method: 'PUT' });
    $(`like-count-${postId}`).textContent = data.likesCount;
    $(`like-icon-${postId}`).textContent = data.liked ? '❤️' : '🤍';
    const btn = $(`like-icon-${postId}`).parentElement;
    if (data.liked) btn.classList.add('liked');
    else btn.classList.remove('liked');
  } catch (error) {
    console.error('Like error:', error);
  }
};
