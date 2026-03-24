// ===========================
//   HistoriColloc — app.js
//   Firebase Realtime Database
// ===========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, set, get, remove, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ===========================
//   CONFIG FIREBASE
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyCuahBvI3wCaPEiN5s1TvcHSfbywrCXy_c",
  authDomain: "historicolloc-d239c.firebaseapp.com",
  databaseURL: "https://historicolloc-d239c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "historicolloc-d239c",
  storageBucket: "historicolloc-d239c.firebasestorage.app",
  messagingSenderId: "1049282879774",
  appId: "1:1049282879774:web:acadedf3a669a5b89f690f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===========================
//   STATE
// ===========================
let currentUser = null;
let cards = {};
let notes = {};
let currentImages = [];
let currentTimeline = [];
let editingId = null;
let readingId = null;
let activeTag = 'all';
let selectedAvatar = '🦁';
let selectedAvatarIsImage = false;
let lastSeenNotesCount = parseInt(localStorage.getItem('hc_seen_notes') || '0');

const AVATARS = ['🦁','🐺','🦊','🐻','🦅','🦋','🌙','⭐','🔥','💎','📚','✏️','🗺️','⚔️','🏛️'];

// ===========================
//   DOM
// ===========================
const cardsGrid      = document.getElementById('cardsGrid');
const emptyState     = document.getElementById('emptyState');
const btnNewCard     = document.getElementById('btnNewCard');
const searchInput    = document.getElementById('searchInput');
const tagsFilter     = document.getElementById('tagsFilter');
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const modalClose     = document.getElementById('modalClose');
const btnCancel      = document.getElementById('btnCancel');
const btnSave        = document.getElementById('btnSave');
const cardTitle      = document.getElementById('cardTitle');
const cardAuthor     = document.getElementById('cardAuthor');
const cardTags       = document.getElementById('cardTags');
const cardContent    = document.getElementById('cardContent');
const imagePreviews  = document.getElementById('imagePreviews');
const imageInput     = document.getElementById('imageInput');
const imageDropZone  = document.getElementById('imageDropZone');
const timelineEvents = document.getElementById('timelineEvents');
const newEventYear   = document.getElementById('newEventYear');
const newEventLabel  = document.getElementById('newEventLabel');
const btnAddEvent    = document.getElementById('btnAddEvent');
const readModalOverlay = document.getElementById('readModalOverlay');
const readTitle      = document.getElementById('readTitle');
const readMeta       = document.getElementById('readMeta');
const readModalBody  = document.getElementById('readModalBody');
const readModalClose = document.getElementById('readModalClose');
const btnDeleteCard  = document.getElementById('btnDeleteCard');
const btnEditCard    = document.getElementById('btnEditCard');
const readClose2     = document.getElementById('readClose2');
const btnProfile     = document.getElementById('btnProfile');
const headerAvatar   = document.getElementById('headerAvatar');
const headerName     = document.getElementById('headerName');
const profileModalOverlay = document.getElementById('profileModalOverlay');
const profileModalTitle   = document.getElementById('profileModalTitle');
const profileModalClose   = document.getElementById('profileModalClose');
const profileFormScreen   = document.getElementById('profileFormScreen');
const profileConnectedScreen = document.getElementById('profileConnectedScreen');
const profileModalFooter  = document.getElementById('profileModalFooter');
const profileBigAvatar    = document.getElementById('profileBigAvatar');
const profileConnectedName = document.getElementById('profileConnectedName');
const tabLogin       = document.getElementById('tabLogin');
const tabRegister    = document.getElementById('tabRegister');
const loginForm      = document.getElementById('loginForm');
const registerForm   = document.getElementById('registerForm');
const loginEmail     = document.getElementById('loginEmail');
const loginPassword  = document.getElementById('loginPassword');
const loginHint      = document.getElementById('loginHint');
const registerName   = document.getElementById('registerName');
const registerEmail  = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerHint   = document.getElementById('registerHint');
const avatarPicker   = document.getElementById('avatarPicker');
const avatarPreview  = document.getElementById('avatarPreview');
const avatarImageInput = document.getElementById('avatarImageInput');
const btnProfileCancel = document.getElementById('btnProfileCancel');
const btnProfileAction = document.getElementById('btnProfileAction');
const notesToggle    = document.getElementById('notesToggle');
const notesPanel     = document.getElementById('notesPanel');
const notesClose     = document.getElementById('notesClose');
const notesOverlay   = document.getElementById('notesOverlay');
const notesList      = document.getElementById('notesList');
const notesBadge     = document.getElementById('notesBadge');
const noteText       = document.getElementById('noteText');
const btnSaveNote    = document.getElementById('btnSaveNote');
const notesResizeBar = document.getElementById('notesResizeBar');
const notesShrink    = document.getElementById('notesShrink');
const notesExpand    = document.getElementById('notesExpand');

// ===========================
//   AUTH STATE
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Récupère le profil étendu (avatar etc.) depuis la DB
    const snap = await get(ref(db, `users/${user.uid}`));
    const profile = snap.val() || {};
    currentUser = {
      uid: user.uid,
      name: profile.name || user.displayName || 'Anonyme',
      avatar: profile.avatar || '🦁',
      avatarIsImage: profile.avatarIsImage || false,
    };
    updateHeaderProfile();
    closeProfileModal();
    listenToCards();
    listenToNotes();
  } else {
    currentUser = null;
    updateHeaderProfile();
    openProfileModal();
  }
});

// ===========================
//   HEADER PROFILE
// ===========================
function updateHeaderProfile() {
  if (currentUser) {
    if (currentUser.avatarIsImage) {
      headerAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="avatar"/>`;
    } else {
      headerAvatar.textContent = currentUser.avatar;
    }
    headerName.textContent = currentUser.name;
  } else {
    headerAvatar.textContent = '?';
    headerName.textContent = 'Se connecter';
  }
}

// ===========================
//   PROFILE MODAL
// ===========================
let activeTab = 'login';

function openProfileModal() {
  profileFormScreen.style.display = 'block';
  profileConnectedScreen.style.display = 'none';
  profileModalFooter.innerHTML = `
    <button class="btn-ghost" id="btnProfileCancel2">Annuler</button>
    <button class="btn-primary" id="btnProfileAction2">Se connecter</button>
  `;
  document.getElementById('btnProfileCancel2').addEventListener('click', closeProfileModal);
  document.getElementById('btnProfileAction2').addEventListener('click', handleProfileAction);
  showTab('login');
  profileModalOverlay.classList.add('open');
}

function openConnectedModal() {
  profileFormScreen.style.display = 'none';
  profileConnectedScreen.style.display = 'block';
  profileModalTitle.textContent = 'Mon profil';
  if (currentUser.avatarIsImage) {
    profileBigAvatar.innerHTML = `<img src="${currentUser.avatar}" alt=""/>`;
  } else {
    profileBigAvatar.textContent = currentUser.avatar;
  }
  profileConnectedName.textContent = currentUser.name;
  profileModalFooter.innerHTML = `
    <button class="btn-ghost" id="btnLogout" style="color:var(--red-accent)">Se déconnecter</button>
    <button class="btn-primary" id="btnCloseProfile">Fermer</button>
  `;
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await signOut(auth);
    closeProfileModal();
  });
  document.getElementById('btnCloseProfile').addEventListener('click', closeProfileModal);
  profileModalOverlay.classList.add('open');
}

function closeProfileModal() {
  // Ne ferme pas si l'utilisateur n'est pas connecté
  if (!currentUser) return;
  profileModalOverlay.classList.remove('open');
}

function showTab(tab) {
  activeTab = tab;
  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    profileModalTitle.textContent = 'Connexion';
    document.getElementById('btnProfileAction2').textContent = 'Se connecter';
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
    profileModalTitle.textContent = 'Créer un compte';
    document.getElementById('btnProfileAction2').textContent = 'Créer le compte';
    buildAvatarPicker();
  }
}

tabLogin.addEventListener('click', () => showTab('login'));
tabRegister.addEventListener('click', () => showTab('register'));

async function handleProfileAction() {
  if (activeTab === 'login') {
    await handleLogin();
  } else {
    await handleRegister();
  }
}

async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  if (!email || !password) { showHint(loginHint, 'Remplis tous les champs.'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginHint.textContent = '';
  } catch (e) {
    showHint(loginHint, 'Email ou mot de passe incorrect.');
  }
}

async function handleRegister() {
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value.trim();
  if (!name || !email || !password) { showHint(registerHint, 'Remplis tous les champs.'); return; }
  if (password.length < 6) { showHint(registerHint, 'Mot de passe trop court (6 caractères min).'); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Sauvegarde profil étendu en DB
    await set(ref(db, `users/${cred.user.uid}`), {
      name,
      avatar: selectedAvatar,
      avatarIsImage: selectedAvatarIsImage,
    });
    registerHint.textContent = '';
  } catch (e) {
    showHint(registerHint, e.message.includes('email-already') ? 'Cet email est déjà utilisé.' : 'Erreur : ' + e.message);
  }
}

function showHint(el, msg) {
  el.textContent = msg;
  el.className = 'profile-hint error';
}

// Avatar picker
function buildAvatarPicker() {
  avatarPicker.innerHTML = AVATARS.map(a => `
    <div class="avatar-option ${!selectedAvatarIsImage && a === selectedAvatar ? 'selected' : ''}" data-avatar="${a}">${a}</div>
  `).join('');
  avatarPicker.querySelectorAll('.avatar-option').forEach(el => {
    el.addEventListener('click', () => {
      selectedAvatar = el.dataset.avatar;
      selectedAvatarIsImage = false;
      avatarPreview.textContent = selectedAvatar;
      avatarPicker.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

avatarImageInput.addEventListener('change', () => {
  const file = avatarImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    selectedAvatar = e.target.result;
    selectedAvatarIsImage = true;
    avatarPreview.innerHTML = `<img src="${selectedAvatar}" alt="avatar"/>`;
    avatarPicker.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
  };
  reader.readAsDataURL(file);
});

btnProfile.addEventListener('click', () => {
  if (currentUser) openConnectedModal();
  else openProfileModal();
});
profileModalClose.addEventListener('click', () => {
  if (currentUser) profileModalOverlay.classList.remove('open');
});
profileModalOverlay.addEventListener('click', e => {
  if (e.target === profileModalOverlay && currentUser) profileModalOverlay.classList.remove('open');
});

// ===========================
//   FIREBASE: CARDS
// ===========================
function listenToCards() {
  onValue(ref(db, 'cards'), snap => {
    cards = snap.val() || {};
    renderTagsFilter();
    renderAll();
  });
}

function listenToNotes() {
  onValue(ref(db, 'notes'), snap => {
    notes = snap.val() || {};
    const total = Object.keys(notes).length;
    const unread = total - lastSeenNotesCount;
    if (unread > 0 && !notesPanel.classList.contains('open')) {
      notesBadge.textContent = unread > 9 ? '9+' : unread;
      notesBadge.style.display = 'flex';
    }
    if (notesPanel.classList.contains('open')) renderNotes();
  });
}

// ===========================
//   RENDER CARDS
// ===========================
function renderAll() {
  const query = searchInput.value.trim().toLowerCase();
  const list = Object.entries(cards).map(([id, c]) => ({ id, ...c }));
  const filtered = list.filter(c => {
    const matchTag = activeTag === 'all' || (c.tags || []).includes(activeTag);
    const matchSearch = !query
      || (c.title||'').toLowerCase().includes(query)
      || (c.author||'').toLowerCase().includes(query)
      || (c.contentText||'').toLowerCase().includes(query)
      || (c.tags||[]).some(t => t.toLowerCase().includes(query));
    return matchTag && matchSearch;
  });
  filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  cardsGrid.innerHTML = '';
  if (filtered.length === 0) { cardsGrid.appendChild(emptyState); return; }
  filtered.forEach((card, i) => cardsGrid.appendChild(buildCardElement(card, i)));
}

function buildCardElement(card, i) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.animationDelay = `${i * 0.05}s`;
  const thumb = card.images && card.images[0] ? `<img class="card-thumb" src="${card.images[0]}" alt=""/>` : '';
  const tags = (card.tags||[]).length ? `<div class="card-tags">${card.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>` : '';
  const timelineHint = card.timeline && card.timeline.length ? `<p class="card-has-timeline">📅 Frise : ${card.timeline.length} événement${card.timeline.length > 1 ? 's' : ''}</p>` : '';
  const excerpt = card.contentText ? `<p class="card-excerpt">${card.contentText}</p>` : '';
  const dateStr = new Date(card.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  el.innerHTML = `
    ${thumb}
    <div class="card-header">
      <h3 class="card-title">${escHtml(card.title)}</h3>
      <div class="card-meta"><span>✒ ${escHtml(card.author)}</span><span>${dateStr}</span></div>
    </div>
    ${excerpt}${tags}${timelineHint}
  `;
  el.addEventListener('click', () => openReadModal(card.id));
  return el;
}

function renderTagsFilter() {
  const list = Object.values(cards);
  const allTags = [...new Set(list.flatMap(c => c.tags || []))].sort();
  const existing = [...tagsFilter.querySelectorAll('[data-tag]')].map(el => el.dataset.tag);
  existing.forEach(t => { if (t !== 'all' && !allTags.includes(t)) tagsFilter.querySelector(`[data-tag="${t}"]`)?.remove(); });
  allTags.forEach(t => {
    if (!tagsFilter.querySelector(`[data-tag="${t}"]`)) {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.dataset.tag = t;
      pill.textContent = t;
      pill.addEventListener('click', () => setActiveTag(t));
      tagsFilter.appendChild(pill);
    }
  });
}

function setActiveTag(tag) {
  activeTag = tag;
  tagsFilter.querySelectorAll('.tag-pill').forEach(p => p.classList.toggle('active', p.dataset.tag === tag));
  renderAll();
}


// ===========================
//   BROUILLON
// ===========================
const DRAFT_KEY = 'hc_draft';

function saveDraft() {
  const draft = {
    title: cardTitle.value,
    tags: cardTags.value,
    content: cardContent.innerHTML,
    images: currentImages,
    timeline: currentTimeline,
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null; }
  catch { return null; }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}


// ===========================
//   CREATE / EDIT MODAL
// ===========================
function openCreateModal() {
  if (!currentUser) { alert('Connecte-toi pour créer une fiche.'); openProfileModal(); return; }
  editingId = null;
  modalTitle.textContent = 'Nouvelle fiche';
  cardAuthor.value = currentUser.name;
  newEventYear.value = '';
  newEventLabel.value = '';

  const draft = loadDraft();
  if (draft) {
    cardTitle.value = draft.title || '';
    cardTags.value = draft.tags || '';
    cardContent.innerHTML = draft.content || '';
    currentImages = draft.images || [];
    currentTimeline = draft.timeline || [];
    // Petite notification
    modalTitle.textContent = 'Nouvelle fiche — brouillon restauré ✎';
  } else {
    cardTitle.value = '';
    cardTags.value = '';
    cardContent.innerHTML = '';
    currentImages = [];
    currentTimeline = [];
  }

  renderImagePreviews();
  renderTimelineBuilder();
  imagePreviews.innerHTML = currentImages.length ? imagePreviews.innerHTML : '';
  modalOverlay.classList.add('open');
  cardTitle.focus();
}

function openEditModal(id) {
  if (!currentUser) return;
  const card = cards[id];
  if (!card) return;
  editingId = id;
  currentImages = [...(card.images || [])];
  currentTimeline = [...(card.timeline || [])];
  modalTitle.textContent = 'Modifier la fiche';
  cardTitle.value = card.title;
  cardAuthor.value = card.author;
  cardTags.value = (card.tags || []).join(', ');
  cardContent.innerHTML = card.content || '';
  renderImagePreviews();
  renderTimelineBuilder();
  closeReadModal();
  modalOverlay.classList.add('open');
}

function closeModal() {
  // Sauvegarde brouillon seulement si c'est une nouvelle fiche (pas une édition)
  if (!editingId) saveDraft();
  modalOverlay.classList.remove('open');
}

async function saveCard() {
  if (!currentUser) return;
  const title = cardTitle.value.trim();
  if (!title) { alert('Le titre est obligatoire.'); return; }
  const tags = cardTags.value.split(',').map(t => t.trim()).filter(Boolean);
  const content = cardContent.innerHTML;
  const contentText = cardContent.innerText.trim();
  const data = {
    title,
    author: currentUser.name,
    authorUid: currentUser.uid,
    tags,
    content,
    contentText,
    images: currentImages,
    timeline: currentTimeline,
    createdAt: editingId ? (cards[editingId]?.createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now(),
  };
  if (editingId) {
    await update(ref(db, `cards/${editingId}`), data);
  } else {
    await push(ref(db, 'cards'), data);
  }
  clearDraft();
  closeModal();
}

// ===========================
//   READ MODAL
// ===========================
function openReadModal(id) {
  const card = cards[id];
  if (!card) return;
  readingId = id;
  readTitle.textContent = card.title;
  const dateStr = new Date(card.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  readMeta.textContent = `Par ${card.author} — ${dateStr}` + ((card.tags||[]).length ? ` — ${card.tags.join(', ')}` : '');
  let html = '';
  if (card.content) html += `<div class="read-content">${card.content}</div>`;
  if (card.images && card.images.length) html += `<div class="read-images">${card.images.map(src => `<img src="${src}" alt=""/>`).join('')}</div>`;
  if (card.timeline && card.timeline.length) {
    const sorted = [...card.timeline].sort((a, b) => new Date(a.year) - new Date(b.year));
    html += `<div class="timeline-read"><p class="timeline-read-label">📅 Frise chronologique</p>${sorted.map(e => `
      <div class="timeline-read-event">
        <span class="trg-year">${formatDate(e.year)}</span>
        <span class="trg-label">${escHtml(e.label)}</span>
      </div>`).join('')}</div>`;
  }
  readModalBody.innerHTML = html || '<p style="color:var(--ink-muted);font-style:italic">Aucun contenu.</p>';

  // Affiche boutons modifier/supprimer seulement si c'est l'auteur
  const isAuthor = currentUser && card.authorUid === currentUser.uid;
  btnDeleteCard.style.display = isAuthor ? '' : 'none';
  btnEditCard.style.display = isAuthor ? '' : 'none';

  readModalOverlay.classList.add('open');
}

function closeReadModal() { readModalOverlay.classList.remove('open'); readingId = null; }

async function deleteCard(id) {
  if (!confirm('Supprimer cette fiche définitivement ?')) return;
  await remove(ref(db, `cards/${id}`));
  closeReadModal();
}

// ===========================
//   IMAGES
// ===========================
function handleImageFiles(files) {
  [...files].forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => { currentImages.push(e.target.result); renderImagePreviews(); };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  imagePreviews.innerHTML = currentImages.map((src, i) => `
    <div class="img-preview-wrap">
      <img src="${src}" alt=""/>
      <button class="img-remove" data-idx="${i}">✕</button>
    </div>`).join('');
  imagePreviews.querySelectorAll('.img-remove').forEach(btn => {
    btn.addEventListener('click', () => { currentImages.splice(Number(btn.dataset.idx), 1); renderImagePreviews(); });
  });
}

// ===========================
//   TIMELINE
// ===========================
function addTimelineEvent() {
  const date = newEventYear.value;
  const label = newEventLabel.value.trim();
  if (!date || !label) { alert('Remplis la date et l\'événement.'); return; }
  currentTimeline.push({ year: date, label });
  currentTimeline.sort((a, b) => new Date(a.year) - new Date(b.year));
  newEventYear.value = '';
  newEventLabel.value = '';
  renderTimelineBuilder();
}

function renderTimelineBuilder() {
  timelineEvents.innerHTML = currentTimeline.map((e, i) => `
    <div class="timeline-event-item">
      <span class="event-year">${formatDate(e.year)}</span>
      <span class="event-label">${escHtml(e.label)}</span>
      <button class="event-remove" data-idx="${i}">✕</button>
    </div>`).join('');
  timelineEvents.querySelectorAll('.event-remove').forEach(btn => {
    btn.addEventListener('click', () => { currentTimeline.splice(Number(btn.dataset.idx), 1); renderTimelineBuilder(); });
  });
}

// ===========================
//   NOTES
// ===========================
function openNotesPanel() {
  notesPanel.classList.add('open');
  notesOverlay.classList.add('open');
  const total = Object.keys(notes).length;
  lastSeenNotesCount = total;
  localStorage.setItem('hc_seen_notes', total);
  notesBadge.style.display = 'none';
  renderNotes();
}

function closeNotesPanel() {
  notesPanel.classList.remove('open');
  notesOverlay.classList.remove('open');
}

function renderNotes() {
  const list = Object.entries(notes).map(([id, n]) => ({ id, ...n }));
  if (list.length === 0) {
    notesList.innerHTML = '<p class="notes-empty">Aucune note pour l\'instant.</p>';
    return;
  }
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  notesList.innerHTML = list.map(n => {
    const dateStr = new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const avatarHtml = n.avatarIsImage
      ? `<div class="note-author-avatar"><img src="${n.avatar}" alt=""/></div>`
      : `<div class="note-author-avatar">${n.avatar || '?'}</div>`;
    const canDelete = currentUser && n.authorUid === currentUser.uid;
    return `
      <div class="note-item">
        <div class="note-item-header">
          <span class="note-author">${avatarHtml} ${escHtml(n.author)}</span>
          <span style="display:flex;align-items:center;gap:0.3rem">
            <span class="note-date">${dateStr}</span>
            ${canDelete ? `<button class="note-delete" data-id="${n.id}">✕</button>` : ''}
          </span>
        </div>
        <p class="note-text">${escHtml(n.text)}</p>
      </div>`;
  }).join('');
  notesList.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette note ?')) return;
      await remove(ref(db, `notes/${btn.dataset.id}`));
    });
  });
}

async function saveNote() {
  if (!currentUser) { alert('Connecte-toi pour publier une note.'); return; }
  const text = noteText.value.trim();
  if (!text) return;
  await push(ref(db, 'notes'), {
    author: currentUser.name,
    authorUid: currentUser.uid,
    avatar: currentUser.avatar,
    avatarIsImage: currentUser.avatarIsImage,
    text,
    createdAt: Date.now(),
  });
  noteText.value = '';
}

// ===========================
//   NOTES RESIZE
// ===========================
const SIZES = [280, 360, 480, 620];
let currentSizeIdx = parseInt(localStorage.getItem('hc_notes_width') || '1');
notesPanel.style.width = SIZES[currentSizeIdx] + 'px';

notesShrink.addEventListener('click', () => {
  currentSizeIdx = Math.max(0, currentSizeIdx - 1);
  notesPanel.style.width = SIZES[currentSizeIdx] + 'px';
  localStorage.setItem('hc_notes_width', currentSizeIdx);
});
notesExpand.addEventListener('click', () => {
  currentSizeIdx = Math.min(SIZES.length - 1, currentSizeIdx + 1);
  notesPanel.style.width = SIZES[currentSizeIdx] + 'px';
  localStorage.setItem('hc_notes_width', currentSizeIdx);
});

let isDragging = false, dragStartX = 0, dragStartW = 0;
notesResizeBar.addEventListener('mousedown', e => {
  isDragging = true; dragStartX = e.clientX; dragStartW = notesPanel.offsetWidth;
  notesResizeBar.classList.add('dragging');
  document.body.style.userSelect = 'none'; document.body.style.cursor = 'ew-resize';
});
document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const newW = Math.min(Math.max(dragStartW + (dragStartX - e.clientX), 260), window.innerWidth * 0.9);
  notesPanel.style.width = newW + 'px';
});
document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false; notesResizeBar.classList.remove('dragging');
  document.body.style.userSelect = ''; document.body.style.cursor = '';
});

// ===========================
//   EDITOR TOOLBAR
// ===========================
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
    cardContent.focus();
  });
});
document.getElementById('btnInsertTitle').addEventListener('mousedown', e => {
  e.preventDefault();
  document.execCommand('formatBlock', false, 'h3');
  cardContent.focus();
});

// ===========================
//   EVENT LISTENERS
// ===========================
btnNewCard.addEventListener('click', openCreateModal);
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
btnSave.addEventListener('click', saveCard);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

readModalClose.addEventListener('click', closeReadModal);
readClose2.addEventListener('click', closeReadModal);
btnDeleteCard.addEventListener('click', () => deleteCard(readingId));
btnEditCard.addEventListener('click', () => openEditModal(readingId));
readModalOverlay.addEventListener('click', e => { if (e.target === readModalOverlay) closeReadModal(); });

notesToggle.addEventListener('click', openNotesPanel);
notesClose.addEventListener('click', closeNotesPanel);
notesOverlay.addEventListener('click', closeNotesPanel);
btnSaveNote.addEventListener('click', saveNote);
noteText.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) saveNote(); });

imageInput.addEventListener('change', () => handleImageFiles(imageInput.files));
imageDropZone.addEventListener('dragover', e => { e.preventDefault(); imageDropZone.classList.add('drag-over'); });
imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('drag-over'));
imageDropZone.addEventListener('drop', e => { e.preventDefault(); imageDropZone.classList.remove('drag-over'); handleImageFiles(e.dataTransfer.files); });

btnAddEvent.addEventListener('click', addTimelineEvent);
newEventLabel.addEventListener('keydown', e => { if (e.key === 'Enter') addTimelineEvent(); });

tagsFilter.querySelectorAll('.tag-pill').forEach(p => p.addEventListener('click', () => setActiveTag(p.dataset.tag)));
searchInput.addEventListener('input', renderAll);

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeReadModal(); } });

// ===========================
//   UTILS
// ===========================
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!String(dateStr).includes('-')) return String(dateStr);
  const [y, m, d] = String(dateStr).split('-');
  if (!m) return y;
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return d ? `${parseInt(d)} ${months[parseInt(m)-1]} ${y}` : `${months[parseInt(m)-1]} ${y}`;
}
