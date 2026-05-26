let currentUser = null;
let tokenClient = null;

// ─── テーマ ──────────────────────────────────────────────────────────────────

const THEME_KEY = 'mail2blog_theme';
const THEME_LABELS = { auto: '自動', light: 'ライト', dark: 'ダーク' };
const THEME_CYCLE  = { auto: 'light', light: 'dark', dark: 'auto' };

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'auto');

  // システム設定が変わったとき「自動」モード中は即反映
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem(THEME_KEY) || 'auto') === 'auto') applyTheme('auto');
  });

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', cycleTheme);
  });
}

function applyTheme(pref) {
  const effective = pref === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref;
  document.documentElement.dataset.theme = effective;
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = THEME_LABELS[pref] ?? THEME_LABELS.auto;
  });
}

function cycleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'auto';
  const next = THEME_CYCLE[current] ?? 'auto';
  if (next === 'auto') localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// ─── セッション永続化 ────────────────────────────────────────────────────────

const SESSION_KEY = 'mail2blog_session';

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { localStorage.removeItem(SESSION_KEY); return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── 下書き自動保存（ブログごと） ────────────────────────────────────────────

const DRAFT_KEY_PREFIX = 'mail2blog_draft_';
let saveTimer = null;
let activeBlogId = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 1500);
}

function saveDraft() {
  const blogId = document.getElementById('blog-select').value;
  const savedAt = new Date().toISOString();
  const draft = {
    title: document.getElementById('title').value,
    tags: document.getElementById('tags').value,
    content: document.getElementById('content').value,
    savedAt,
  };
  localStorage.setItem(DRAFT_KEY_PREFIX + blogId, JSON.stringify(draft));
  showSaveIndicator(savedAt, false);
}

function saveDraftForBlog(blogId) {
  const title = document.getElementById('title').value;
  const tags = document.getElementById('tags').value;
  const content = document.getElementById('content').value;
  if (!title && !tags && !content) return;
  const draft = { title, tags, content, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY_PREFIX + blogId, JSON.stringify(draft));
}

function loadDraft() {
  activeBlogId = document.getElementById('blog-select').value;
  loadDraftForBlog(activeBlogId);
}

function loadDraftForBlog(blogId) {
  document.getElementById('title').value = '';
  document.getElementById('tags').value = '';
  const ta = document.getElementById('content');
  ta.value = '';
  ta.style.height = '';
  document.getElementById('save-indicator').hidden = true;

  const raw = localStorage.getItem(DRAFT_KEY_PREFIX + blogId);
  if (!raw) return;

  let draft;
  try { draft = JSON.parse(raw); } catch { localStorage.removeItem(DRAFT_KEY_PREFIX + blogId); return; }

  if (draft.title)   document.getElementById('title').value = draft.title;
  if (draft.tags)    document.getElementById('tags').value  = draft.tags;
  if (draft.content) {
    ta.value = draft.content;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  if (draft.title || draft.content) {
    showSaveIndicator(draft.savedAt, true);
  }
}

function clearDraft() {
  clearTimeout(saveTimer);
  const blogId = document.getElementById('blog-select').value;
  localStorage.removeItem(DRAFT_KEY_PREFIX + blogId);
  document.getElementById('save-indicator').hidden = true;
}

function showSaveIndicator(isoString, restored) {
  const time = new Date(isoString).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('save-indicator');
  el.textContent = restored ? `下書きを復元しました（${time}）` : `自動保存 ${time}`;
  el.className = restored ? 'restored' : '';
  el.hidden = false;
  if (restored) {
    setTimeout(() => {
      el.textContent = `自動保存 ${time}`;
      el.className = '';
    }, 4000);
  }
}

// ─── 初期化 ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  validateConfig();
  populateBlogSelect();
  setupEventListeners();

  const saved = loadSession();
  if (saved) {
    currentUser = saved;
    showPostView();
  }
});

function initGSI() {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: true,
  });

  // Gmail 送信用アクセストークン取得クライアント
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    callback: '', // リクエスト毎に設定
  });

  google.accounts.id.renderButton(document.getElementById('google-signin-btn'), {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    locale: 'ja',
    width: 280,
  });

  google.accounts.id.prompt();
}

if (typeof google !== 'undefined') {
  initGSI();
} else {
  window.onGoogleLibraryLoad = initGSI;
}

// ─── 認証 ───────────────────────────────────────────────────────────────────

function handleCredentialResponse(response) {
  const payload = decodeJwt(response.credential);
  currentUser = { name: payload.name, email: payload.email };
  saveSession(currentUser);
  showPostView();
}

function handleLogout() {
  google.accounts.id.disableAutoSelect();
  clearSession();
  currentUser = null;
  showLoginView();
  clearBanner();
}

function decodeJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  ));
}

// ─── フォーム ────────────────────────────────────────────────────────────────

function populateBlogSelect() {
  const select = document.getElementById('blog-select');
  select.innerHTML = '';
  CONFIG.BLOGS.forEach(blog => {
    const opt = document.createElement('option');
    opt.value = blog.id;
    opt.textContent = blog.name;
    select.appendChild(opt);
  });
}

function setupEventListeners() {
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('post-form').addEventListener('submit', handleSubmit);

  const blogSelect = document.getElementById('blog-select');
  blogSelect.addEventListener('change', () => {
    if (activeBlogId && activeBlogId !== blogSelect.value) {
      saveDraftForBlog(activeBlogId);
    }
    activeBlogId = blogSelect.value;
    loadDraftForBlog(activeBlogId);
  });

  ['title', 'tags', 'content'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleSave);
  });

  const ta = document.getElementById('content');
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });
}

async function handleSubmit(e) {
  e.preventDefault();

  const blogId = document.getElementById('blog-select').value;
  const blog = CONFIG.BLOGS.find(b => b.id === blogId);
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = '送信中...';
  clearBanner();

  try {
    await sendViaGmailAPI(currentUser.email, `[${blogId}] ${title}`, content);
    clearDraft();
    showBanner('success', `「${title}」を ${blog.name} に投稿しました`);
    document.getElementById('post-form').reset();
    populateBlogSelect();
    activeBlogId = document.getElementById('blog-select').value;
    document.getElementById('content').style.height = '';
  } catch (err) {
    console.error('Gmail API error:', err);
    showBanner('error', `送信に失敗しました: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'メールで投稿する ✉';
  }
}

// ─── Gmail API ───────────────────────────────────────────────────────────────

function getGmailAccessToken() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
      } else {
        resolve(response.access_token);
      }
    };
    // prompt: '' = 初回は同意画面、以降はサイレント
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function sendViaGmailAPI(to, subject, body) {
  const accessToken = await getGmailAccessToken();
  const raw = buildRawEmail(to, subject, body);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

function buildRawEmail(to, subject, body) {
  const encodedSubject = `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
  const formattedBody = body.replace(/(?<!\n)\n(?!\n)/g, '  \n');
  const email = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    formattedBody,
  ].join('\r\n');

  return utf8ToBase64Url(email);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function utf8ToBase64Url(str) {
  return utf8ToBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── UI 切り替え ─────────────────────────────────────────────────────────────

function showLoginView() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('post-view').hidden = true;
}

function showPostView() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('post-view').hidden = false;
  document.getElementById('user-name').textContent = currentUser.name;
  loadDraft();
  document.getElementById('title').focus();
}

function showBanner(type, message) {
  const el = document.getElementById('banner');
  el.className = `banner ${type}`;
  el.textContent = message;
  el.hidden = false;
  if (type === 'success') setTimeout(clearBanner, 6000);
}

function clearBanner() {
  document.getElementById('banner').hidden = true;
}

// ─── 設定チェック ────────────────────────────────────────────────────────────

function validateConfig() {
  if (CONFIG.GOOGLE_CLIENT_ID.includes('YOUR_')) {
    const warning = document.getElementById('config-warning');
    warning.textContent = '⚠ config.js の GOOGLE_CLIENT_ID が未設定です';
    warning.hidden = false;
  }
}
