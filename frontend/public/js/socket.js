// ══════════════════════════════════════════
// Vibe — Socket.IO Real-Time Client
// ══════════════════════════════════════════

let socket;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return; // Only connect if authenticated

  // Connect to Socket.IO server
  socket = io();

  socket.on('connect', async () => {
    let userId;
    if (window.currentUser && window.currentUser._id) {
      userId = window.currentUser._id;
    } else {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          userId = data.user._id;
        }
      } catch (err) {}
    }
    
    if (userId) {
      socket.emit('register', userId);
    }
  });

  // ── Listen for Notifications ──
  socket.on('new_notification', (data) => {
    if (window.showToast) {
      window.showToast(data.message, 'info');
    }
    // E.g. flash a notification bell if we have one
  });

  // ── Listen for Live Like Updates ──
  socket.on('like_update', (data) => {
    const likeCountEl = document.getElementById(`like-count-${data.postId}`);
    if (likeCountEl) {
      likeCountEl.textContent = data.likesCount;
      // Add a brief highlight animation to the count
      likeCountEl.style.color = '#f43f5e';
      setTimeout(() => likeCountEl.style.color = '', 500);
    }
  });

  // ── Listen for Live Comment Updates ──
  socket.on('new_comment', (data) => {
    const list = document.getElementById(`comments-list-${data.postId}`);
    if (!list) return;

    const c = data.comment;
    // Don't duplicate if the author is the current user (they already appended locally, though our current logic re-fetches)
    if (document.getElementById(`comment-${c._id}`)) return;

    const html = `
      <div class="comment-item new-comment-flash" id="comment-${c._id}">
        <div class="comment-header">
          <strong>${c.author.fullName || c.author.username}</strong>
          <span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="comment-body">${c.content}</div>
      </div>
    `;

    if (list.querySelector('.no-comments')) {
      list.innerHTML = html;
    } else {
      list.insertAdjacentHTML('afterbegin', html);
    }
  });

  // ── Listen for Comment Deletions ──
  socket.on('delete_comment', (data) => {
    const commentEl = document.getElementById(`comment-${data.commentId}`);
    if (commentEl) commentEl.remove();

    const list = document.getElementById(`comments-list-${data.postId}`);
    if (list && list.children.length === 0) {
      list.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    }
  });
});
