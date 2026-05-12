// ══════════════════════════════════════════
// Vibe — Feed Page JavaScript
// ══════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = 'index.html';

  try {
    const res = await apiFetch('/auth/me');
    currentUser = res.user;
    $('navUser').textContent = `@${currentUser.username}`;
    
    await loadFeed();
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

// ══════════ Load Feed ══════════
async function loadFeed() {
  try {
    const data = await apiFetch('/posts');
    renderPosts(data.posts);
  } catch (error) {
    console.error('Load feed error:', error);
    $('feedPosts').innerHTML = `
      <div class="empty-posts">
        <p class="form-message error">Failed to load posts</p>
      </div>`;
  }
}

// ══════════ Render Posts ══════════
function renderPosts(posts) {
  const container = $('feedPosts');
  
  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-posts">
        <span class="empty-icon">🌟</span>
        <p>No posts yet. Be the first to share your vibe!</p>
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
    
    const deleteBtn = (currentUser && post.author._id === currentUser._id)
      ? `<button class="post-action-btn delete-btn" onclick="deletePost('${post._id}')" title="Delete post">🗑️</button>`
      : '';

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
          <button class="post-action-btn" onclick="toggleComments('${post._id}')">
            <span>💬</span>
            <span>Comment</span>
          </button>
          ${deleteBtn}
        </div>
        <div class="comments-section" id="comments-section-${post._id}">
          <div class="comment-input-area">
            <input type="text" id="comment-input-${post._id}" placeholder="Write a comment..." onkeypress="if(event.key === 'Enter') submitComment('${post._id}')" />
            <button onclick="submitComment('${post._id}')">Post</button>
          </div>
          <div class="comments-list" id="comments-list-${post._id}"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════ Comments Functions ══════════
window.toggleComments = async (postId) => {
  const section = $(`comments-section-${postId}`);
  if (!section.classList.contains('active')) {
    section.classList.add('active');
    await loadComments(postId);
  } else {
    section.classList.remove('active');
  }
};

window.loadComments = async (postId) => {
  const list = $(`comments-list-${postId}`);
  list.innerHTML = '<p class="loading-text">Loading comments...</p>';
  try {
    const data = await apiFetch(`/comments/post/${postId}`);
    renderCommentsList(postId, data.comments);
  } catch (error) {
    list.innerHTML = '<p class="error-text">Failed to load comments</p>';
  }
};

window.renderCommentsList = (postId, comments) => {
  const list = $(`comments-list-${postId}`);
  if (!comments || comments.length === 0) {
    list.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    return;
  }
  
  list.innerHTML = comments.map(c => {
    const isOwner = currentUser && c.author._id === currentUser._id;
    return `
      <div class="comment-item" id="comment-${c._id}">
        <div class="comment-header">
          <strong>${c.author.fullName || c.author.username}</strong>
          <span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="comment-body">${c.content}</div>
        ${isOwner ? `<button class="comment-delete-btn" onclick="deleteComment('${c._id}', '${postId}')">Delete</button>` : ''}
      </div>
    `;
  }).join('');
};

window.submitComment = async (postId) => {
  if (!currentUser) return alert('Please log in to comment');
  
  const input = $(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) return;
  
  input.disabled = true;
  try {
    await apiFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({ postId, content })
    });
    input.value = '';
    await loadComments(postId);
  } catch (error) {
    alert(error.message);
  } finally {
    input.disabled = false;
    input.focus();
  }
};

window.deleteComment = async (commentId, postId) => {
  if (!confirm('Delete this comment?')) return;
  try {
    await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
    await loadComments(postId);
  } catch (error) {
    alert(error.message);
  }
};

// ══════════ Global Functions ══════════
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
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
    const postEl = $(`post-${postId}`);
    postEl.style.opacity = '0';
    setTimeout(() => {
      postEl.remove();
      if ($('feedPosts').children.length === 0) renderPosts([]);
    }, 300);
  } catch (error) {
    alert(error.message);
  }
};

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
}
