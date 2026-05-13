// ══════════════════════════════════════════
// Vibe — Create Post / Upload JavaScript
// ══════════════════════════════════════════

const API_BASE = '/api';
const UPLOADS_URL = '/uploads';
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

let currentUser = null;
let selectedFile = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Load current user
  try {
    const data = await apiFetch('/auth/me');
    currentUser = data.user;
    renderAuthor();
    $('navUser').textContent = `@${currentUser.username}`;
  } catch {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
    return;
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

// ══════════ Render Author Info ══════════
function renderAuthor() {
  const u = currentUser;
  const avatarSrc = u.profileImage === 'default-avatar.png'
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.username)}&background=6c5ce7&color=fff&size=88&bold=true`
    : `${UPLOADS_URL}/${u.profileImage}`;

  $('authorAvatar').src = avatarSrc;
  $('authorName').textContent = u.fullName || u.username;
  $('authorHandle').textContent = `@${u.username}`;
}

// ══════════ Event Listeners ══════════
function setupEventListeners() {
  const textarea = $('postContent');
  const dropZone = $('dropZone');
  const imageInput = $('imageInput');

  // ── Character counter ──
  textarea.addEventListener('input', () => {
    $('charCount').textContent = textarea.value.length;
    updatePublishBtn();
  });

  // ── Click drop zone or "Photo" button to open file picker ──
  dropZone.addEventListener('click', () => imageInput.click());
  $('addImageBtn').addEventListener('click', () => imageInput.click());

  // ── File input change ──
  imageInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
  });

  // ── Drag & Drop ──
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  });

  // ── Remove image ──
  $('removeImage').addEventListener('click', removeSelectedImage);

  // ── Form submit ──
  $('postForm').addEventListener('submit', handlePublish);

  // ── Logout ──
  $('logoutBtn').addEventListener('click', (e) => {
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
}

// ══════════ File Selection & Validation ══════════
function handleFileSelect(file) {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    if (window.showToast) window.showToast('Only image files (JPEG, PNG, GIF, WebP) are allowed', 'error');
    else showMessage('Only image files (JPEG, PNG, GIF, WebP) are allowed', 'error');
    return;
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    if (window.showToast) window.showToast('Image must be under 5MB', 'error');
    else showMessage('Image must be under 5MB', 'error');
    return;
  }

  selectedFile = file;
  showImagePreview(file);
  updatePublishBtn();
}

// ══════════ Image Preview ══════════
function showImagePreview(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    $('previewImg').src = e.target.result;
    $('previewInfo').textContent = `${file.name} — ${formatFileSize(file.size)}`;
    $('dropZone').style.display = 'none';
    $('imagePreview').style.display = 'block';
  };

  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  selectedFile = null;
  $('imageInput').value = '';
  $('previewImg').src = '';
  $('imagePreview').style.display = 'none';
  $('dropZone').style.display = '';
  updatePublishBtn();
}

// ══════════ Publish Post ══════════
async function handlePublish(e) {
  e.preventDefault();

  const content = $('postContent').value.trim();
  if (!content) {
    if (window.showToast) window.showToast('Please write something for your post', 'error');
    else showMessage('Please write something for your post', 'error');
    return;
  }

  const btn = $('publishBtn');
  btn.disabled = true;
  btn.textContent = 'Publishing...';
  showMessage('');

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    const data = await apiFetch('/posts', {
      method: 'POST',
      body: formData,
    });

    if (window.showToast) window.showToast('Post published successfully!', 'success');
    else showMessage('✓ Post published successfully!', 'success');

    // Reset form
    $('postContent').value = '';
    $('charCount').textContent = '0';
    removeSelectedImage();

    // Redirect to feed after short delay
    setTimeout(() => {
      window.location.href = 'feed.html';
    }, 1500);

  } catch (error) {
    if (window.showToast) window.showToast(error.message, 'error');
    else showMessage(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publish Post';
    updatePublishBtn();
  }
}

// ══════════ Helpers ══════════
function updatePublishBtn() {
  const hasContent = $('postContent').value.trim().length > 0;
  $('publishBtn').disabled = !hasContent;
}

function showMessage(text, type = '') {
  const msg = $('formMessage');
  msg.textContent = text;
  msg.className = `form-message ${type}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
