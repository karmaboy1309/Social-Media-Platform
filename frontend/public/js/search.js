// ══════════════════════════════════════════
// Vibe — Search Page JavaScript
// ══════════════════════════════════════════

const API_BASE = '/api';
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

    $('searchStatus').style.display = 'none';
    $('searchTabs').style.display = 'flex';
    document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.search-tab[data-target="usersSection"]').classList.add('active');
    $('usersSection').classList.add('active');
    $('postsSection').classList.remove('active');

    // Show skeletons
    $('usersResults').innerHTML = `
      <div class="search-user-card" style="border-color:transparent">
        <div class="skeleton-avatar shimmer" style="width:80px; height:80px; margin:0 auto 16px;"></div>
        <div class="skeleton-text shimmer" style="width:70%; margin:0 auto 8px;"></div>
        <div class="skeleton-text shimmer" style="width:40%; margin:0 auto;"></div>
      </div>
      <div class="search-user-card" style="border-color:transparent">
        <div class="skeleton-avatar shimmer" style="width:80px; height:80px; margin:0 auto 16px;"></div>
        <div class="skeleton-text shimmer" style="width:60%; margin:0 auto 8px;"></div>
        <div class="skeleton-text shimmer" style="width:50%; margin:0 auto;"></div>
      </div>
      <div class="search-user-card" style="border-color:transparent">
        <div class="skeleton-avatar shimmer" style="width:80px; height:80px; margin:0 auto 16px;"></div>
        <div class="skeleton-text shimmer" style="width:75%; margin:0 auto 8px;"></div>
        <div class="skeleton-text shimmer" style="width:45%; margin:0 auto;"></div>
      </div>
    `;
    $('postsResults').innerHTML = `
      <div class="post-card skeleton-card">
        <div class="post-header">
          <div class="skeleton-avatar shimmer"></div>
          <div class="skeleton-text-group">
            <div class="skeleton-text shimmer" style="width: 120px;"></div>
            <div class="skeleton-text shimmer" style="width: 80px; height: 10px; margin-top: 8px;"></div>
          </div>
        </div>
        <div class="skeleton-text shimmer" style="width: 100%; margin-bottom: 10px;"></div>
        <div class="skeleton-text shimmer" style="width: 85%; margin-bottom: 20px;"></div>
        <div class="skeleton-img shimmer"></div>
      </div>
    `;

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
      if (window.showToast) window.showToast('Unfollowed', 'info');
    } else {
      btn.classList.add('following', 'btn-outline');
      btn.classList.remove('btn-primary');
      btn.textContent = 'Following';
      if (!currentUser.following) currentUser.following = [];
      currentUser.following.push({ _id: userId });
      if (window.showToast) window.showToast('Following', 'success');
    }
  } catch (error) {
    if (window.showToast) window.showToast(error.message, 'error');
    else alert(error.message);
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
    
    let optionsMenu = '';
    if (currentUser && post.author._id === currentUser._id) {
      optionsMenu = `
        <div class="post-options-wrap">
          <button class="post-options-btn" onclick="event.stopPropagation(); togglePostOptions('${post._id}')">⋮</button>
          <div class="post-dropdown" id="post-dropdown-${post._id}">
            <button class="dropdown-item" onclick="event.stopPropagation(); startEditPost('${post._id}')">✏️ Edit Caption</button>
            <button class="dropdown-item danger" onclick="event.stopPropagation(); confirmDeletePost('${post._id}')">🗑️ Delete Post</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="post-card" id="post-${post._id}">
        <div class="post-header" style="cursor:pointer" onclick="window.location.href='profile.html?user=${post.author._id}'">
          <img src="${authorImg}" alt="Author" class="post-author-avatar" />
          <div class="post-author-info">
            <span class="post-author-name">${post.author.fullName || post.author.username}</span>
            <span class="post-author-handle">@${post.author.username}</span>
          </div>
          <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
          ${optionsMenu}
        </div>
        <div class="post-content">
          <p id="post-caption-${post._id}">${post.content}</p>
          <div class="edit-caption-wrap" id="edit-wrap-${post._id}">
            <textarea class="edit-caption-textarea" id="edit-input-${post._id}">${post.content}</textarea>
            <div class="edit-caption-actions">
              <button class="btn btn-ghost btn-sm" onclick="cancelEditPost('${post._id}')">Cancel</button>
              <button class="btn btn-primary btn-sm" onclick="submitEditPost('${post._id}')">Save</button>
            </div>
          </div>
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

window.deletePost = async (postId) => {
  try {
    await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
    const postEl = $(`post-${postId}`);
    postEl.style.opacity = '0';
    postEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      postEl.remove();
    }, 300);
    if (window.showToast) window.showToast('Post deleted', 'success');
  } catch (error) {
    if (window.showToast) window.showToast(error.message, 'error');
    else alert(error.message);
  }
};

window.togglePostOptions = (postId) => {
  document.querySelectorAll('.post-dropdown').forEach(d => {
    if (d.id !== `post-dropdown-${postId}`) d.classList.remove('show');
  });
  $(`post-dropdown-${postId}`)?.classList.toggle('show');
};

window.startEditPost = (postId) => {
  $(`post-dropdown-${postId}`)?.classList.remove('show');
  $(`post-caption-${postId}`).style.display = 'none';
  $(`edit-wrap-${postId}`).classList.add('active');
};

window.cancelEditPost = (postId) => {
  $(`post-caption-${postId}`).style.display = 'block';
  $(`edit-wrap-${postId}`).classList.remove('active');
  $(`edit-input-${postId}`).value = $(`post-caption-${postId}`).textContent;
};

window.submitEditPost = async (postId) => {
  const content = $(`edit-input-${postId}`).value.trim();
  if (!content) return alert('Caption cannot be empty');
  
  try {
    const data = await apiFetch(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
    $(`post-caption-${postId}`).textContent = data.post.content;
    cancelEditPost(postId);
    if (window.showToast) window.showToast('Caption updated', 'success');
  } catch (error) {
    if (window.showToast) window.showToast(error.message, 'error');
    else alert(error.message);
  }
};

window.confirmDeletePost = (postId) => {
  let modal = $('deleteConfirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'deleteConfirmModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 400px; text-align: center; padding: 30px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">🗑️</div>
        <h3 style="margin-bottom: 12px; font-size: 1.2rem;">Delete Post?</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">This action cannot be undone. Are you sure you want to permanently delete this post?</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-ghost" onclick="closeDeleteModal()">Cancel</button>
          <button class="btn btn-primary" style="background: #f43f5e;" id="confirmDeleteBtn">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  $(`post-dropdown-${postId}`)?.classList.remove('show');
  modal.classList.add('active');
  
  $('confirmDeleteBtn').onclick = () => {
    deletePost(postId);
    closeDeleteModal();
  };
};

window.closeDeleteModal = () => {
  $('deleteConfirmModal')?.classList.remove('active');
};

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.post-dropdown').forEach(d => d.classList.remove('show'));
});
