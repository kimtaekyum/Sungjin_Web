import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const ALLOWED_TYPES = new Set(["notice", "result", "review", "blog"]);
const MAX_INLINE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const PREVIEW_MODE = false;
const CATEGORY_LABEL = {
  notice: "ê³µì??¬í•­",
  result: "?±ê³¼ ?¬ë?",
  review: "?„ê¸°",
  blog: "ë¸”ë¡œê·??Œì‹"
};

const FIREBASE_CONFIG_ERROR_MESSAGE =
  "Firebase ?¤ì •??ë¹„ì–´?ˆìŠµ?ˆë‹¤. Firebase ì½˜ì†” ???„ë¡œ?íŠ¸ ?¤ì • ????????SDK ?¤ì •?ì„œ firebaseConfigë¥?ë³µì‚¬??assets/js/firebase-config.js??ë¶™ì—¬?£ìœ¼?¸ìš”.";
const FIREBASE_CONFIG_IMPORT_ERROR_MESSAGE =
  "firebase-config.js?ì„œ firebaseConfig exportê°€ ?†ìŠµ?ˆë‹¤. assets/js/firebase-config.js??`export const firebaseConfig = { ... }` ?•íƒœë¡??¤ì •?˜ì„¸??";
const FIREBASE_REQUIRED_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
];
const FIREBASE_PLACEHOLDER_PATTERNS = [/^REPLACE_ME$/i, /^YOUR_/i, /^PASTE_/i, /YOUR_FIREBASE_API_KEY/i];
let firebaseConfig = null;
let invalidFirebaseKeys = [];
let firebaseConfigReady = PREVIEW_MODE;
let firebaseConfigLoadError = null;

let app = null;
let auth = null;
let db = null;
let storage = null;
let quillReadyPromise = null;
let quillEditor = null;
let imageCropper = null;
let pendingCropResolve = null;

const els = {
  authView: document.getElementById("authView"),
  dashboardView: document.getElementById("dashboardView"),
  globalStatus: document.getElementById("globalStatus"),
  authMessage: document.getElementById("authMessage"),
  loginForm: document.getElementById("loginForm"),
  loginBtn: document.getElementById("loginBtn"),
  password: document.getElementById("password"),
  passwordRevealBtn: document.getElementById("passwordRevealBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  tabs: [...document.querySelectorAll(".tab-btn")],
  tabPosts: document.getElementById("tab-posts"),
  tabHelp: document.getElementById("tab-help"),
  filterCategory: document.getElementById("filterCategory"),
  filterStatus: document.getElementById("filterStatus"),
  searchRow: document.querySelector(".toolbar-search"),
  searchTitle: document.getElementById("searchTitle"),
  postsTableWrap: document.getElementById("postsTableWrap"),
  postsTableBody: document.getElementById("postsTableBody"),
  blogSlotsSection: document.getElementById("blogSlotsSection"),
  blogSlotsGrid: document.getElementById("blogSlotsGrid"),
  blogSlotsMessage: document.getElementById("blogSlotsMessage"),
  postForm: document.getElementById("postForm"),
  formTitle: document.getElementById("formTitle"),
  postId: document.getElementById("postId"),
  title: document.getElementById("title"),
  postStatus: document.getElementById("postStatus"),
  titleHint: document.getElementById("titleHint"),
  editorCategoryText: document.getElementById("editorCategoryText"),
  editorCategoryHint: document.getElementById("editorCategoryHint"),
  coverImageFile: document.getElementById("coverImageFile"),
  coverImageProgress: document.getElementById("coverImageProgress"),
  coverImagePreview: document.getElementById("coverImagePreview"),
  resultCaseFields: document.getElementById("resultCaseFields"),
  resultDate: document.getElementById("resultDate"),
  resultSummary: document.getElementById("resultSummary"),
  resultImageFile: document.getElementById("resultImageFile"),
  resultImageProgress: document.getElementById("resultImageProgress"),
  resultImagePreview: document.getElementById("resultImagePreview"),
  reviewFields: document.getElementById("reviewFields"),
  reviewProfileFile: document.getElementById("reviewProfileFile"),
  reviewProfileProgress: document.getElementById("reviewProfileProgress"),
  reviewProfilePreview: document.getElementById("reviewProfilePreview"),
  reviewYear: document.getElementById("reviewYear"),
  reviewText: document.getElementById("reviewText"),
  reviewTextCount: document.getElementById("reviewTextCount"),
  imageCropModal: document.getElementById("imageCropModal"),
  cropImage: document.getElementById("cropImage"),
  cropApplyBtn: document.getElementById("cropApplyBtn"),
  standardContentFields: document.getElementById("standardContentFields"),
  contentEditor: document.getElementById("contentEditor"),
  content: document.getElementById("content"),
  attachmentFiles: document.getElementById("attachmentFiles"),
  attachmentProgress: document.getElementById("attachmentProgress"),
  attachmentList: document.getElementById("attachmentList"),
  formMessage: document.getElementById("formMessage"),
  cancelEditBtn: document.getElementById("cancelEditBtn")
};

const state = {
  user: null,
  isAdmin: false,
  posts: [],
  editingPost: null,
  draftPostId: null,
  coverImage: null,
  coverImageTempUrl: "",
  resultImage: null,
  reviewProfileImage: null,
  reviewProfileDraft: null,
  attachments: [],
  newAttachments: [],
  removedAttachmentPaths: []
};

bindEvents();
initRichEditor();
bootstrap();

async function bootstrap() {
  await initFirebaseClients();
  initAuthListener();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  if (els.loginBtn) {
    els.loginBtn.addEventListener("click", handleLogin);
  }
  if (els.passwordRevealBtn) {
    els.passwordRevealBtn.addEventListener("pointerdown", revealPasswordStart);
    els.passwordRevealBtn.addEventListener("pointerup", revealPasswordEnd);
    els.passwordRevealBtn.addEventListener("pointercancel", revealPasswordEnd);
    els.passwordRevealBtn.addEventListener("pointerleave", revealPasswordEnd);
    els.passwordRevealBtn.addEventListener("blur", revealPasswordEnd);
    els.passwordRevealBtn.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        revealPasswordStart();
      }
    });
    els.passwordRevealBtn.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") {
        revealPasswordEnd();
      }
    });
  }
  els.logoutBtn.addEventListener("click", handleLogout);
  els.cancelEditBtn.addEventListener("click", closeEditor);
  els.postForm.addEventListener("submit", savePost);
  els.coverImageFile.addEventListener("change", renderCoverImagePreview);
  els.resultImageFile.addEventListener("change", renderResultImagePreview);
  els.reviewProfileFile.addEventListener("change", handleReviewProfileSelect);
  els.reviewText.addEventListener("input", updateReviewTextCount);
  els.imageCropModal.addEventListener("click", handleCropModalClick);
  els.cropApplyBtn.addEventListener("click", applyImageCrop);
  els.attachmentFiles.addEventListener("change", handleAttachmentSelect);
  els.attachmentList.addEventListener("click", handleAttachmentRemove);
  els.postsTableBody.addEventListener("click", handleTableAction);
  els.blogSlotsGrid.addEventListener("click", handleBlogSlotAction);

  for (const btn of els.tabs) {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  }

  [els.filterCategory, els.filterStatus, els.searchTitle].forEach((el) => {
    el.addEventListener("input", renderPostsTable);
    el.addEventListener("change", renderPostsTable);
  });
}

async function initFirebaseClients() {
  if (PREVIEW_MODE) {
    return;
  }
  try {
    const configModule = await import("../assets/js/firebase-config.js");
    firebaseConfig = configModule?.firebaseConfig || null;
    if (!firebaseConfig || typeof firebaseConfig !== "object") {
      firebaseConfigLoadError = FIREBASE_CONFIG_IMPORT_ERROR_MESSAGE;
      firebaseConfigReady = false;
      console.error("[admin] firebase-config import invalid: missing named export `firebaseConfig`.", {
        moduleKeys: Object.keys(configModule || {})
      });
      return;
    }

    invalidFirebaseKeys = getInvalidFirebaseConfigKeys(firebaseConfig);
    firebaseConfigReady = invalidFirebaseKeys.length === 0;
    if (!firebaseConfigReady) {
      firebaseConfigLoadError = FIREBASE_CONFIG_ERROR_MESSAGE;
      console.error("[admin] Firebase config is invalid.", {
        invalidKeys: invalidFirebaseKeys,
        config: firebaseConfig
      });
      return;
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    firebaseConfigLoadError = FIREBASE_CONFIG_IMPORT_ERROR_MESSAGE;
    firebaseConfigReady = false;
    console.error("[admin] firebase-config import failed", error);
  }
}

function initAuthListener() {
  if (PREVIEW_MODE) {
    state.user = { uid: "preview-admin", email: "preview@sungjin.local" };
    state.isAdmin = true;
    state.posts = getPreviewPosts();
    showDashboardView();
    setStatus(els.globalStatus, "ë¯¸ë¦¬ë³´ê¸° ëª¨ë“œ?…ë‹ˆ?? ?¤ì œ ?€???…ë¡œ?œëŠ” ?™ì‘?˜ì? ?ŠìŠµ?ˆë‹¤.");
    renderPostsTable();
    return;
  }
  if (!firebaseConfigReady || !auth || !db) {
    const configErrorMessage = firebaseConfigLoadError || FIREBASE_CONFIG_ERROR_MESSAGE;
    showAuthView();
    setStatus(els.authMessage, configErrorMessage, true);
    setStatus(els.globalStatus, configErrorMessage, true);
    if (els.loginBtn) {
      els.loginBtn.disabled = true;
      els.loginBtn.title = "Firebase ?¤ì • ??ë¡œê·¸??ê°€?¥í•©?ˆë‹¤.";
    }
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      state.user = null;
      state.isAdmin = false;
      state.posts = [];
      showAuthView();
      setStatus(els.globalStatus, "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??");
      return;
    }

    try {
      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);
      const isActiveAdmin = adminSnap.exists() && adminSnap.data().active === true;

      if (!isActiveAdmin) {
        await signOut(auth);
        setStatus(els.authMessage, "ê¶Œí•œ???†ìŠµ?ˆë‹¤. ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?˜ì„¸??", true);
        setStatus(els.globalStatus, "ê¶Œí•œ???†ëŠ” ê³„ì •?¼ë¡œ ë¡œê·¸???œë„?˜ì—ˆ?µë‹ˆ??", true);
        return;
      }

      state.user = user;
      state.isAdmin = true;
      showDashboardView();
      setStatus(els.globalStatus, `${user.email} ê³„ì •?¼ë¡œ ë¡œê·¸?¸í–ˆ?µë‹ˆ??`);
      await fetchPosts();
    } catch (error) {
      console.warn("[admin] auth/admin check failed", error);
      setStatus(els.authMessage, "?¸ì¦ ?•ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?˜ì„¸??", true);
      await signOut(auth);
    }
  });
}

async function handleLogin(event) {
  event?.preventDefault?.();
  revealPasswordEnd();
  if (!firebaseConfigReady || !auth) {
    const configErrorMessage = firebaseConfigLoadError || FIREBASE_CONFIG_ERROR_MESSAGE;
    setStatus(els.authMessage, configErrorMessage, true);
    setStatus(els.globalStatus, configErrorMessage, true);
    console.error("[admin] login blocked: firebase config invalid", {
      invalidKeys: invalidFirebaseKeys,
      config: firebaseConfig
    });
    return;
  }
  if (PREVIEW_MODE) {
    setStatus(els.authMessage, "ë¯¸ë¦¬ë³´ê¸° ëª¨ë“œ?ì„œ??ë¡œê·¸?¸ì´ ?„ìš”?˜ì? ?ŠìŠµ?ˆë‹¤.");
    return;
  }
  const formData = new FormData(els.loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setStatus(els.authMessage, "?´ë©”?¼ê³¼ ë¹„ë?ë²ˆí˜¸ë¥?ëª¨ë‘ ?…ë ¥?˜ì„¸??", true);
    return;
  }

  try {
    console.info("[admin] login attempt", {
      authEndpointKeyHint: maskApiKey(firebaseConfig.apiKey),
      configReady: firebaseConfigReady
    });
    setStatus(els.authMessage, "ë¡œê·¸??ì¤‘ì…?ˆë‹¤...");
    await signInWithEmailAndPassword(auth, email, password);
    els.loginForm.reset();
  } catch (error) {
    console.warn("[admin] login failed", error);
    setStatus(els.authMessage, "ë¡œê·¸?¸ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤. ê³„ì •???•ì¸?˜ì„¸??", true);
  }
}

async function handleLogout() {
  if (PREVIEW_MODE) {
    window.location.href = "./index.html";
    return;
  }
  try {
    await signOut(auth);
    setStatus(els.globalStatus, "ë¡œê·¸?„ì›ƒ?˜ì—ˆ?µë‹ˆ??");
  } catch (error) {
    console.warn("[admin] logout failed", error);
    setStatus(els.globalStatus, "ë¡œê·¸?„ì›ƒ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", true);
  }
}

function showAuthView() {
  els.authView.hidden = false;
  els.dashboardView.hidden = true;
  els.logoutBtn.hidden = true;
  closeEditor();
}

function showDashboardView() {
  els.authView.hidden = true;
  els.dashboardView.hidden = false;
  els.logoutBtn.hidden = false;
}

function setTab(tabName) {
  const isPosts = tabName === "posts";
  for (const btn of els.tabs) {
    btn.classList.toggle("is-active", btn.dataset.tab === tabName);
  }
  els.tabPosts.hidden = !isPosts;
  els.tabHelp.hidden = isPosts;
}

async function fetchPosts() {
  if (PREVIEW_MODE) {
    renderPostsTable();
    return;
  }
  if (!state.isAdmin) {
    return;
  }
  if (!db) {
    setStatus(els.globalStatus, FIREBASE_CONFIG_ERROR_MESSAGE, true);
    return;
  }

  try {
    const postQuery = query(collection(db, "posts"), orderBy("updatedAt", "desc"), limit(300));
    const snap = await getDocs(postQuery);
    state.posts = snap.docs.map((docSnap) => normalizePostData(docSnap.id, docSnap.data()));
    renderPostsTable();
  } catch (error) {
    console.warn("[admin] fetch posts failed", error);
    setStatus(els.globalStatus, "ê¸€ ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ?? ?¤íŠ¸?Œí¬ë¥??•ì¸?˜ì„¸??", true);
  }
}

function renderPostsTable() {
  const category = els.filterCategory.value;
  const status = els.filterStatus.value;
  const keyword = els.searchTitle.value.trim().toLowerCase();
  updateBlogManagementView(category);
  if (category === "blog") {
    renderBlogSlots();
    return;
  }

  const filtered = state.posts.filter((post) => {
    const type = getPostType(post);
    const categoryOk = category === "all" || type === category;
    const statusOk = status === "all" || String(post.status || "") === status;
    const title = String(post.title || "").toLowerCase();
    const keywordOk = !keyword || title.includes(keyword);
    return categoryOk && statusOk && keywordOk;
  });

  if (!filtered.length) {
    els.postsTableBody.innerHTML = "<tr><td colspan='5'>ì¡°ê±´??ë§ëŠ” ê¸€???†ìŠµ?ˆë‹¤.</td></tr>";
    return;
  }

  els.postsTableBody.innerHTML = filtered
    .map((post) => {
      const type = getPostType(post);
      const postStatus = String(post.status || "draft");
      const dateText = formatDate(post.publishedAt || post.updatedAt || post.createdAt);
      const actions =
        type === "blog"
          ? `<button class="btn btn-secondary" type="button" data-action="delete" data-id="${post.id}">?? œ</button>`
          : `
              <button class="btn btn-secondary" type="button" data-action="edit" data-id="${post.id}">?˜ì •</button>
              <button class="btn btn-secondary" type="button" data-action="delete" data-id="${post.id}">?? œ</button>
            `;
      return `
        <tr>
          <td>${escapeHtml(post.title || "(?œëª© ?†ìŒ)")}</td>
          <td>${escapeHtml(getCategoryLabel(type))}</td>
          <td>${escapeHtml(getStatusLabel(postStatus))}</td>
          <td>${escapeHtml(dateText)}</td>
          <td>
            <div class="row-actions">
              ${actions}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}
function handleTableAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) {
    return;
  }

  const post = state.posts.find((item) => item.id === id);
  if (!post) {
    return;
  }

  if (action === "edit") {
    if (els.filterCategory.value !== getPostType(post)) {
      els.filterCategory.value = getPostType(post);
      renderPostsTable();
    }
    openEditor(post);
  } else if (action === "delete") {
    deletePost(post);
  }
}

function openEditor(post = null) {
  if (state.reviewProfileDraft?.url && state.reviewProfileDraft.url.startsWith("blob:")) {
    URL.revokeObjectURL(state.reviewProfileDraft.url);
  }
  if (state.coverImageTempUrl && state.coverImageTempUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.coverImageTempUrl);
  }
  state.editingPost = post;
  state.draftPostId = null;
  state.coverImage = post?.coverImage || post?.featuredImage || post?.resultImage || post?.reviewProfileImage || null;
  state.coverImageTempUrl = "";
  state.resultImage = post?.resultImage || post?.featuredImage || null;
  state.reviewProfileImage = post?.reviewProfileImage || post?.featuredImage || null;
  state.reviewProfileDraft = null;
  state.attachments = Array.isArray(post?.attachments) ? [...post.attachments] : [];
  state.newAttachments = [];
  state.removedAttachmentPaths = [];
  els.postForm.hidden = false;
  els.formTitle.textContent = post ? "ê¸€ ?˜ì •" : "ê¸€ ?‘ì„±";
  els.postId.value = post?.id || "";
  els.title.value = post?.title || "";
  els.postStatus.value = post ? (post.status === "draft" ? "draft" : "published") : "draft";
  if (getPostType(post) && els.filterCategory.value !== getPostType(post)) {
    els.filterCategory.value = getPostType(post);
  }
  els.coverImageFile.value = "";
  els.resultDate.value = normalizeDateInput(post?.resultDate || post?.publishedAt || post?.updatedAt || post?.createdAt);
  els.resultSummary.value = post?.resultSummary || "";
  els.resultImageFile.value = "";
  els.reviewYear.value = post?.reviewYear || normalizeDateInput(post?.publishedAt || post?.updatedAt || post?.createdAt).slice(0, 4);
  els.reviewText.value = post?.reviewText || "";
  els.reviewProfileFile.value = "";
  setEditorContent(post?.contentHtml || post?.content || "");
  els.attachmentFiles.value = "";
  resetProgress(els.attachmentProgress);
  resetProgress(els.coverImageProgress);
  resetProgress(els.resultImageProgress);
  resetProgress(els.reviewProfileProgress);
  renderCoverImagePreview();
  renderResultImagePreview();
  renderReviewProfilePreview();
  updateReviewTextCount();
  renderAttachmentList();
  syncEditorModeByCategory(els.filterCategory.value);
  renderPostsTable();
  setStatus(els.formMessage, "");
  els.title.focus();
}
function closeEditor() {
  if (state.reviewProfileDraft?.url && state.reviewProfileDraft.url.startsWith("blob:")) {
    URL.revokeObjectURL(state.reviewProfileDraft.url);
  }
  if (state.coverImageTempUrl && state.coverImageTempUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.coverImageTempUrl);
  }
  state.editingPost = null;
  state.draftPostId = null;
  state.coverImage = null;
  state.coverImageTempUrl = "";
  state.resultImage = null;
  state.reviewProfileImage = null;
  state.reviewProfileDraft = null;
  state.attachments = [];
  state.newAttachments = [];
  state.removedAttachmentPaths = [];
  els.postForm.hidden = false;
  els.postForm.reset();
  els.formTitle.textContent = "ê¸€ ?‘ì„±";
  els.postId.value = "";
  els.postStatus.value = "draft";
  els.coverImageFile.value = "";
  els.coverImagePreview.innerHTML = "";
  els.resultDate.value = "";
  els.resultSummary.value = "";
  els.resultImageFile.value = "";
  els.resultImagePreview.innerHTML = "";
  els.reviewYear.value = "";
  els.reviewText.value = "";
  els.reviewProfileFile.value = "";
  els.reviewProfilePreview.style.backgroundImage = "";
  els.reviewProfilePreview.textContent = "?¬ì§„";
  setEditorContent("");
  els.attachmentList.innerHTML = "";
  els.attachmentFiles.value = "";
  resetProgress(els.attachmentProgress);
  resetProgress(els.coverImageProgress);
  resetProgress(els.resultImageProgress);
  resetProgress(els.reviewProfileProgress);
  updateReviewTextCount();
  syncEditorModeByCategory(els.filterCategory.value);
  setStatus(els.formMessage, "");
}
function syncEditorModeByCategory(category) {
  const isResult = category === "result";
  const isReview = category === "review";
  els.editorCategoryText.textContent = `?‘ì„± ì¹´í…Œê³ ë¦¬: ${getCategoryLabel(category)}`;
  els.resultCaseFields.hidden = !isResult;
  els.reviewFields.hidden = !isReview;
  els.standardContentFields.hidden = isResult || isReview;
  els.title.maxLength = isResult ? 30 : 120;
  els.titleHint.hidden = !isResult;
  els.content.required = !(isResult || isReview);
  els.resultDate.required = isResult;
  els.resultSummary.required = isResult;
  els.reviewYear.required = isReview;
  els.reviewText.required = isReview;
}

function getActiveEditorCategory() {
  const category = els.filterCategory.value;
  if (category === "notice" || category === "result" || category === "review") {
    return category;
  }
  return "";
}

function normalizeDateInput(value) {
  if (!value) {
    return "";
  }
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderCoverImagePreview() {
  const selected = els.coverImageFile.files?.[0] || null;
  if (selected) {
    if (!selected.type.startsWith("image/")) {
      setStatus(els.formMessage, "?€???´ë?ì§€???´ë?ì§€ ?Œì¼ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.", true);
      els.coverImageFile.value = "";
      return;
    }
    if (selected.size > MAX_INLINE_IMAGE_SIZE) {
      setStatus(els.formMessage, "?€???´ë?ì§€??5MB ?´í•˜ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.", true);
      els.coverImageFile.value = "";
      return;
    }
  }

  if (state.coverImageTempUrl && state.coverImageTempUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.coverImageTempUrl);
    state.coverImageTempUrl = "";
  }
  if (selected) {
    state.coverImageTempUrl = URL.createObjectURL(selected);
  }

  const html = [];
  if (state.coverImage?.url) {
    html.push(`
      <div class="preview-item">
        <img src="${state.coverImage.url}" alt="ê¸°ì¡´ ?€???´ë?ì§€">
      </div>
    `);
  }
  if (state.coverImageTempUrl) {
    html.push(`
      <div class="preview-item">
        <img src="${state.coverImageTempUrl}" alt="???€???´ë?ì§€ ë¯¸ë¦¬ë³´ê¸°">
      </div>
    `);
  }
  els.coverImagePreview.innerHTML = html.join("");
}
function renderResultImagePreview() {
  const selected = els.resultImageFile.files?.[0] || null;
  if (selected) {
    if (!selected.type.startsWith("image/")) {
      setStatus(els.formMessage, "?±ê³¼ ?¬ë? ?¬ì§„?€ ?´ë?ì§€ ?Œì¼ë§?ê°€?¥í•©?ˆë‹¤.", true);
      els.resultImageFile.value = "";
      return;
    }
    if (selected.size > MAX_INLINE_IMAGE_SIZE) {
      setStatus(els.formMessage, "?±ê³¼ ?¬ë? ?¬ì§„?€ 5MB ?´í•˜ë§?ê°€?¥í•©?ˆë‹¤.", true);
      els.resultImageFile.value = "";
      return;
    }
  }
  const html = [];
  if (state.resultImage?.url) {
    html.push(`
      <div class="preview-item">
        <img src="${state.resultImage.url}" alt="ê¸°ì¡´ ?±ê³¼ ?¬ë? ?¬ì§„">
      </div>
    `);
  }
  if (selected) {
    const tempUrl = URL.createObjectURL(selected);
    html.push(`
      <div class="preview-item">
        <img src="${tempUrl}" alt="???±ê³¼ ?¬ë? ?¬ì§„ ë¯¸ë¦¬ë³´ê¸°">
      </div>
    `);
  }
  els.resultImagePreview.innerHTML = html.join("");
}

function renderReviewProfilePreview() {
  let previewUrl = "";
  if (state.reviewProfileDraft?.url) {
    previewUrl = state.reviewProfileDraft.url;
  } else if (state.reviewProfileImage?.url) {
    previewUrl = state.reviewProfileImage.url;
  }

  if (previewUrl) {
    els.reviewProfilePreview.style.backgroundImage = `url("${previewUrl}")`;
    els.reviewProfilePreview.textContent = "";
  } else {
    els.reviewProfilePreview.style.backgroundImage = "";
    els.reviewProfilePreview.textContent = "?¬ì§„";
  }
}

async function handleReviewProfileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    setStatus(els.formMessage, "?„ê¸° ?„ë¡œ?„ì? ?´ë?ì§€ ?Œì¼ë§?ê°€?¥í•©?ˆë‹¤.", true);
    els.reviewProfileFile.value = "";
    return;
  }
  if (file.size > MAX_INLINE_IMAGE_SIZE) {
    setStatus(els.formMessage, "?„ê¸° ?„ë¡œ???´ë?ì§€??5MB ?´í•˜ë§?ê°€?¥í•©?ˆë‹¤.", true);
    els.reviewProfileFile.value = "";
    return;
  }

  try {
    const cropped = await openImageCropModal(file, { aspectRatio: 1, circle: true });
    if (!cropped) {
      return;
    }
    if (state.reviewProfileDraft?.url && state.reviewProfileDraft.url.startsWith("blob:")) {
      URL.revokeObjectURL(state.reviewProfileDraft.url);
    }
    const previewUrl = URL.createObjectURL(cropped.blob);
    state.reviewProfileDraft = {
      file: cropped.blob,
      name: cropped.name,
      url: previewUrl,
    };
    renderReviewProfilePreview();
    setStatus(els.formMessage, "?„ë¡œ???¬ì§„ ?ì—­???ìš©?˜ì—ˆ?µë‹ˆ??");
  } catch (error) {
    console.warn("[admin] review profile crop failed", error);
    setStatus(els.formMessage, "?„ë¡œ???¬ì§„ ?ìš©???¤íŒ¨?ˆìŠµ?ˆë‹¤.", true);
  } finally {
    els.reviewProfileFile.value = "";
  }
}

function handleCropModalClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.dataset.action === "crop-cancel") {
    closeImageCropModal(null);
  }
}

function openImageCropModal(file, options = {}) {
  return new Promise((resolve, reject) => {
    pendingCropResolve = { resolve, reject, options };

    if (imageCropper) {
      imageCropper.destroy();
      imageCropper = null;
    }

    const objectUrl = URL.createObjectURL(file);
    els.cropImage.onload = () => {
      if (options.circle) {
        els.imageCropModal.classList.add("is-circle");
      } else {
        els.imageCropModal.classList.remove("is-circle");
      }

      imageCropper = new window.Cropper(els.cropImage, {
        viewMode: 1,
        dragMode: "move",
        aspectRatio: options.aspectRatio || NaN,
        autoCropArea: 1,
        responsive: true,
        background: false,
      });
    };
    els.cropImage.src = objectUrl;
    els.imageCropModal.hidden = false;
    els.imageCropModal.setAttribute("aria-hidden", "false");
  });
}

function closeImageCropModal(result) {
  if (imageCropper) {
    imageCropper.destroy();
    imageCropper = null;
  }
  els.imageCropModal.hidden = true;
  els.imageCropModal.setAttribute("aria-hidden", "true");
  els.imageCropModal.classList.remove("is-circle");
  if (els.cropImage.src.startsWith("blob:")) {
    URL.revokeObjectURL(els.cropImage.src);
  }
  els.cropImage.removeAttribute("src");

  if (pendingCropResolve) {
    pendingCropResolve.resolve(result);
    pendingCropResolve = null;
  }
}

function applyImageCrop() {
  if (!imageCropper) {
    closeImageCropModal(null);
    return;
  }

  const canvas = imageCropper.getCroppedCanvas({
    width: 420,
    height: 420,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  if (!canvas) {
    closeImageCropModal(null);
    return;
  }

  canvas.toBlob((blob) => {
    if (!blob) {
      closeImageCropModal(null);
      return;
    }
    closeImageCropModal({
      blob,
      name: `review-profile-${Date.now()}.jpg`,
    });
  }, "image/jpeg", 0.92);
}

function updateReviewTextCount() {
  const value = String(els.reviewText.value || "");
  els.reviewTextCount.textContent = `${value.length} / 40`;
}

function updateBlogManagementView(category) {
  const isBlogOnly = category === "blog";
  const canWrite = category === "notice" || category === "result" || category === "review";
  els.blogSlotsSection.hidden = !isBlogOnly;
  els.postsTableWrap.hidden = isBlogOnly;
  els.postForm.hidden = !canWrite;
  els.searchRow.hidden = isBlogOnly;
  els.editorCategoryHint.hidden = canWrite;
  syncEditorModeByCategory(category);
  if (!canWrite) {
    setStatus(els.formMessage, "");
  }
}

function sortByTimeDesc(posts) {
  return [...posts].sort((a, b) => {
    const aDate = resolvePostDate(a);
    const bDate = resolvePostDate(b);
    return bDate - aDate;
  });
}

function resolvePostDate(post) {
  const timestamp = post?.publishedAt || post?.updatedAt || post?.createdAt;
  if (!timestamp) {
    return 0;
  }
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getBlogPostsForSlots() {
  const publishedBlogs = state.posts.filter((post) => getPostType(post) === "blog" && post.status === "published");
  const sorted = sortByTimeDesc(publishedBlogs);
  const slots = new Array(5).fill(null);

  sorted.forEach((post) => {
    const slotNo = Number(post.homeBlogSlot);
    if (slotNo >= 1 && slotNo <= 5 && !slots[slotNo - 1]) {
      slots[slotNo - 1] = post;
    }
  });

  sorted.forEach((post) => {
    if (slots.includes(post)) {
      return;
    }
    const emptyIndex = slots.findIndex((item) => item === null);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = post;
    }
  });

  return slots;
}

function renderBlogSlots() {
  const slots = getBlogPostsForSlots();
  const html = slots
    .map((post, idx) => {
      const slotNo = idx + 1;
      if (post) {
        return `
          <article class="blog-slot-card" data-slot="${slotNo}">
            <span class="blog-slot-label">?¬ë¡¯ ${slotNo}</span>
            <p class="blog-slot-title">${escapeHtml(post.title || "(?œëª© ?†ìŒ)")}</p>
            <a class="blog-slot-link" href="${escapeHtml(post.blogLink || "#")}" target="_blank" rel="noopener">${escapeHtml(post.blogLink || "-")}</a>
            <div class="blog-slot-actions">
              <button type="button" class="btn btn-secondary" data-action="blog-delete" data-id="${post.id}" data-slot="${slotNo}">?? œ ??ë¹„ìš°ê¸?/button>
            </div>
          </article>
        `;
      }
      return `
        <article class="blog-slot-card is-empty" data-slot="${slotNo}">
          <span class="blog-slot-label">?¬ë¡¯ ${slotNo} (ë¹„ì–´ ?ˆìŒ)</span>
          <div class="blog-slot-inputs">
            <input type="text" class="slot-title" placeholder="ë¸”ë¡œê·?ê¸€ ?œëª©" maxlength="120">
            <input type="url" class="slot-link" placeholder="https://blog.naver.com/...">
          </div>
          <div class="blog-slot-actions">
            <button type="button" class="btn btn-primary" data-action="blog-add" data-slot="${slotNo}">?±ë¡</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.blogSlotsGrid.innerHTML = html;
  setStatus(els.blogSlotsMessage, "?¬ë¡¯??ì°?ê²½ìš° ?? œ ??ë¹??¬ë¡¯???¤ì‹œ ?±ë¡?˜ì„¸??");
}

async function handleBlogSlotAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  if (action === "blog-delete") {
    const id = target.dataset.id;
    if (!id) {
      return;
    }
    const post = state.posts.find((item) => item.id === id);
    if (!post) {
      return;
    }
    await deletePost(post);
    if (els.filterCategory.value === "blog") {
      renderBlogSlots();
    }
    return;
  }

  if (action !== "blog-add") {
    return;
  }

  const slotNo = Number(target.dataset.slot);
  const card = target.closest(".blog-slot-card");
  if (!card || Number.isNaN(slotNo) || slotNo < 1 || slotNo > 5) {
    return;
  }

  const titleInput = card.querySelector(".slot-title");
  const linkInput = card.querySelector(".slot-link");
  const title = String(titleInput?.value || "").trim();
  const blogLink = String(linkInput?.value || "").trim();

  if (!title) {
    setStatus(els.blogSlotsMessage, `?¬ë¡¯ ${slotNo}: ?œëª©???…ë ¥?˜ì„¸??`, true);
    return;
  }
  if (!isValidUrl(blogLink)) {
    setStatus(els.blogSlotsMessage, `?¬ë¡¯ ${slotNo}: URL ?•ì‹???•ì¸?˜ì„¸??`, true);
    return;
  }
  if (getBlogPostsForSlots()[slotNo - 1]) {
    setStatus(els.blogSlotsMessage, `?¬ë¡¯ ${slotNo}???´ë? ?¬ìš© ì¤‘ì…?ˆë‹¤. ?? œ ???¤ì‹œ ?±ë¡?˜ì„¸??`, true);
    return;
  }

  try {
    target.disabled = true;
    setStatus(els.blogSlotsMessage, `?¬ë¡¯ ${slotNo} ?€??ì¤‘ì…?ˆë‹¤...`);
    await createBlogPostForSlot(slotNo, title, blogLink);
    setStatus(els.blogSlotsMessage, `?¬ë¡¯ ${slotNo}???±ë¡?˜ì—ˆ?µë‹ˆ??`);
    await fetchPosts();
  } catch (error) {
    console.warn("[admin] blog slot save failed", error);
    setStatus(els.blogSlotsMessage, "?¬ë¡¯ ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?˜ì„¸??", true);
  } finally {
    target.disabled = false;
  }
}

async function createBlogPostForSlot(slotNo, title, blogLink) {
  if (PREVIEW_MODE) {
    const now = new Date();
    const post = {
      id: `preview-blog-${Date.now()}`,
      title,
      type: "blog",
      category: "blog",
      status: "published",
      excerpt: "",
      contentHtml: "",
      content: "",
      blogLink,
      homeBlogSlot: slotNo,
      coverImage: null,
      featuredImage: null,
      gallery: [],
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      authorUid: "preview-admin"
    };
    state.posts = [post, ...state.posts];
    return;
  }
  if (!state.isAdmin || !state.user) {
    throw new Error("ê´€ë¦¬ì ?¸ì¦???„ìš”?©ë‹ˆ??");
  }

  const postRef = doc(collection(db, "posts"));
  const payload = {
    title,
    type: "blog",
    category: "blog",
    status: "published",
    excerpt: "",
    contentHtml: "",
    content: "",
    blogLink,
    homeBlogSlot: slotNo,
    coverImage: null,
    featuredImage: null,
    gallery: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
    authorUid: state.user.uid
  };
  await setDoc(postRef, payload);
}

function sanitizeHtml(value) {
  const html = value || "";
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }
  return html;
}

function initRichEditor() {
  if (quillReadyPromise || typeof window.Quill === "undefined") {
    return quillReadyPromise;
  }

  quillReadyPromise = Promise.resolve().then(() => {
    quillEditor = new window.Quill("#contentEditor", {
      theme: "snow",
      placeholder: "ë³¸ë¬¸???…ë ¥?˜ì„¸??",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
      },
    });

    const toolbar = quillEditor.getModule("toolbar");
    if (toolbar) {
      toolbar.addHandler("image", () => {
        handleQuillImageInsert();
      });
    }

    quillEditor.on("text-change", () => {
      els.content.value = sanitizeHtml(quillEditor.root.innerHTML);
    });
  });

  return quillReadyPromise;
}

function getEditorContent() {
  if (quillEditor) {
    return sanitizeHtml(quillEditor.root.innerHTML);
  }
  return sanitizeHtml(els.content.value || "");
}

function setEditorContent(html) {
  const safeHtml = sanitizeHtml(html || "");
  if (quillEditor) {
    quillEditor.root.innerHTML = safeHtml;
  } else {
    els.contentEditor.innerHTML = safeHtml;
  }
  els.content.value = safeHtml;
}

function handleQuillImageInsert() {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.click();

  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus(els.formMessage, "?´ë?ì§€ ?Œì¼ë§??½ì…?????ˆìŠµ?ˆë‹¤.", true);
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_SIZE) {
      setStatus(els.formMessage, "ë³¸ë¬¸ ?´ë?ì§€??5MB ?´í•˜ë§?ê°€?¥í•©?ˆë‹¤.", true);
      return;
    }

    try {
      let imageUrl = "";
      if (PREVIEW_MODE) {
        imageUrl = URL.createObjectURL(file);
      } else {
        const postId = ensureEditorPostId();
        const path = `posts/${postId}/inline/${buildSafeFilename(file.name || "inline-image.png")}`;
        const uploaded = await uploadAttachmentFile(file, path, (percent) => showProgress(els.attachmentProgress, percent));
        imageUrl = uploaded.url;
      }

      if (!quillEditor) {
        return;
      }
      const range = quillEditor.getSelection(true);
      const index = range ? range.index : quillEditor.getLength();
      quillEditor.insertEmbed(index, "image", imageUrl, "user");
      quillEditor.setSelection(index + 1, 0, "silent");
      els.content.value = sanitizeHtml(quillEditor.root.innerHTML);
      setStatus(els.formMessage, "ë³¸ë¬¸???´ë?ì§€ê°€ ?½ì…?˜ì—ˆ?µë‹ˆ??");
    } catch (error) {
      console.warn("[admin] quill image insert failed", error);
      const message = isStorageUploadError(error)
        ? buildStorageUploadErrorMessage(error)
        : "ÀÌ¹ÌÁö »ğÀÔ¿¡ ½ÇÆĞÇß½À´Ï´Ù.";
      setStatus(els.formMessage, message, true);
    } finally {
      resetProgress(els.attachmentProgress);
    }
  });
}

function handleAttachmentSelect() {
  const files = [...(els.attachmentFiles.files || [])];
  if (!files.length) {
    return;
  }

  try {
    files.forEach(validateAttachmentFile);
    const mapped = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      file,
    }));
    state.newAttachments = [...state.newAttachments, ...mapped];
    renderAttachmentList();
    setStatus(els.formMessage, "ì²¨ë??Œì¼??ì¶”ê??˜ì—ˆ?µë‹ˆ??");
  } catch (error) {
    setStatus(els.formMessage, error.message, true);
  } finally {
    els.attachmentFiles.value = "";
  }
}

function handleAttachmentRemove(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.type === "existing") {
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    const removed = state.attachments.splice(index, 1)[0];
    if (removed?.path) {
      state.removedAttachmentPaths.push(removed.path);
    }
    renderAttachmentList();
    return;
  }

  if (target.dataset.type === "new") {
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    state.newAttachments.splice(index, 1);
    renderAttachmentList();
  }
}

function renderAttachmentList() {
  const existingHtml = state.attachments
    .map((item, idx) => {
      const name = item.name || item.path || `ì²¨ë??Œì¼ ${idx + 1}`;
      return `
        <div class="attachment-item">
          <span>${escapeHtml(name)}</span>
          <button type="button" data-type="existing" data-index="${idx}">?? œ</button>
        </div>
      `;
    })
    .join("");

  const newHtml = state.newAttachments
    .map((item, idx) => {
      const name = `${item.name} (?…ë¡œ???ˆì •)`;
      return `
        <div class="attachment-item">
          <span>${escapeHtml(name)}</span>
          <button type="button" data-type="new" data-index="${idx}">ì·¨ì†Œ</button>
        </div>
      `;
    })
    .join("");

  const html = existingHtml + newHtml;
  els.attachmentList.innerHTML = html || "<p class='status'>ì²¨ë??Œì¼ ?†ìŒ</p>";
}

async function savePost(event) {
  event.preventDefault();
  const category = getActiveEditorCategory();
  if (!category) {
    setStatus(els.formMessage, "?ë‹¨ ì¹´í…Œê³ ë¦¬?ì„œ ê³µì??¬í•­/?±ê³¼ ?¬ë?/?„ê¸°ë¥?? íƒ?˜ì„¸??", true);
    return;
  }

  const isResult = category === "result";
  const isReview = category === "review";
  const title = els.title.value.trim();
  const status = els.postStatus.value === "draft" ? "draft" : "published";
  const plainContent =
    category === "result"
      ? els.resultSummary.value.trim()
      : category === "review"
        ? els.reviewText.value.trim()
        : getEditorContent().trim();
  const contentHtml =
    category === "result" || category === "review"
      ? buildContentHtmlFromPlain(plainContent)
      : plainContent;
  const excerpt = buildExcerpt(isResult ? els.resultSummary.value.trim() : isReview ? els.reviewText.value.trim() : contentHtml);

  if (!title) {
    setStatus(els.formMessage, "?œëª©?€ ?„ìˆ˜?…ë‹ˆ??", true);
    return;
  }
  if (!ALLOWED_TYPES.has(category)) {
    setStatus(els.formMessage, "?ˆìš©?˜ì? ?Šì? ?€?…ì…?ˆë‹¤.", true);
    return;
  }
  if (isResult) {
    if (title.length > 30) {
      setStatus(els.formMessage, "?±ê³¼ ?¬ë? ?œëª©?€ 30???´ë‚´?¬ì•¼ ?©ë‹ˆ??", true);
      return;
    }
    if (!els.resultDate.value) {
      setStatus(els.formMessage, "?±ê³¼ ?¬ë? ? ì§œë¥??…ë ¥?˜ì„¸??", true);
      return;
    }
    if (!els.resultSummary.value.trim()) {
      setStatus(els.formMessage, "?±ê³¼ ?¬ë? ?´ìš©???…ë ¥?˜ì„¸??", true);
      return;
    }
  }
  if (isReview) {
    if (!els.reviewYear.value) {
      setStatus(els.formMessage, "?„ê¸° ?°ë„ë¥?? íƒ?˜ì„¸??", true);
      return;
    }
    if (!els.reviewText.value.trim()) {
      setStatus(els.formMessage, "?„ê¸° ?´ìš©???…ë ¥?˜ì„¸??", true);
      return;
    }
    if (els.reviewText.value.trim().length > 40) {
      setStatus(els.formMessage, "?„ê¸° ?´ìš©?€ 40???´ë‚´?¬ì•¼ ?©ë‹ˆ??", true);
      return;
    }
  }
  if (!toPlainText(contentHtml)) {
    setStatus(els.formMessage, "ë³¸ë¬¸?€ ?„ìˆ˜?…ë‹ˆ??", true);
    return;
  }

  const coverImageFile = els.coverImageFile.files?.[0] || null;
  const resultImageFile = category === "result" ? (els.resultImageFile.files?.[0] || null) : null;
  const reviewProfileFile = category === "review" ? (state.reviewProfileDraft?.file || null) : null;
  const newFiles = category === "result" || category === "review" ? [] : state.newAttachments.map((item) => item.file);

  if (PREVIEW_MODE) {
    const now = new Date();
    const id = state.editingPost?.id || `preview-${Date.now()}`;
    const prev = state.posts.find((item) => item.id === id) || null;
    const previewCover = coverImageFile
      ? {
          url: URL.createObjectURL(coverImageFile),
          path: "",
          name: coverImageFile.name,
          type: coverImageFile.type,
          size: coverImageFile.size
        }
      : state.coverImage || null;

    const post = normalizePostData(id, {
      title,
      type: category,
      category,
      status,
      contentHtml,
      content: contentHtml,
      excerpt,
      coverImage: previewCover,
      featuredImage: previewCover,
      resultDate: category === "result" ? els.resultDate.value : null,
      resultSummary: category === "result" ? els.resultSummary.value.trim() : null,
      resultImage:
        category === "result"
          ? (resultImageFile
            ? { url: URL.createObjectURL(resultImageFile), path: "", name: resultImageFile.name, type: resultImageFile.type, size: resultImageFile.size }
            : state.resultImage || null)
          : null,
      reviewYear: category === "review" ? els.reviewYear.value : null,
      reviewText: category === "review" ? els.reviewText.value.trim() : null,
      reviewProfileImage:
        category === "review"
          ? (state.reviewProfileDraft
            ? { url: state.reviewProfileDraft.url, path: "", name: state.reviewProfileDraft.name, type: "image/jpeg", size: state.reviewProfileDraft.file.size || 0 }
            : state.reviewProfileImage || null)
          : null,
      blogLink: null,
      attachments:
        category === "result" || category === "review"
          ? []
          : [...state.attachments, ...state.newAttachments.map((item) => ({ name: item.name, type: item.type, size: item.size, url: "", path: "" }))],
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      publishedAt: status === "published" ? (prev?.publishedAt || now) : null,
      authorUid: "preview-admin"
    });

    state.posts = [post, ...state.posts.filter((item) => item.id !== id)];
    setStatus(els.formMessage, "ë¯¸ë¦¬ë³´ê¸° ëª¨ë“œ: ë¡œì»¬?ì„œë§??€?¥ë˜?ˆìŠµ?ˆë‹¤.");
    closeEditor();
    renderPostsTable();
    return;
  }

  if (!state.isAdmin || !state.user) {
    setStatus(els.formMessage, "ê´€ë¦¬ì ?¸ì¦???„ìš”?©ë‹ˆ??", true);
    return;
  }

  const isEdit = Boolean(state.editingPost?.id);
  const postId = isEdit ? state.editingPost.id : ensureEditorPostId();
  const postRef = doc(db, "posts", postId);
  let saveStage = "start";

  try {
    setStatus(els.formMessage, "?€??ì¤‘ì…?ˆë‹¤...");

    let uploadedCover = state.coverImage || null;
    saveStage = "storage_cover";
    if (coverImageFile) {
      const coverPath = `posts/${postId}/cover/${buildSafeFilename(coverImageFile.name)}`;
      uploadedCover = await uploadAttachmentFile(coverImageFile, coverPath, (percent) => showProgress(els.coverImageProgress, percent));
      if (state.coverImage?.path && state.coverImage.path !== uploadedCover.path) {
        await safeDeleteFile(state.coverImage.path);
      }
    }

    let uploadedResultImage = state.resultImage || null;
    saveStage = "storage_result";
    if (resultImageFile) {
      const path = `posts/${postId}/result/${buildSafeFilename(resultImageFile.name)}`;
      uploadedResultImage = await uploadAttachmentFile(resultImageFile, path, (percent) => showProgress(els.resultImageProgress, percent));
      if (state.resultImage?.path && state.resultImage.path !== uploadedResultImage.path) {
        await safeDeleteFile(state.resultImage.path);
      }
    }

    let uploadedReviewProfile = state.reviewProfileImage || null;
    saveStage = "storage_review";
    if (reviewProfileFile) {
      const path = `posts/${postId}/review/${buildSafeFilename(reviewProfileFile.name)}`;
      uploadedReviewProfile = await uploadAttachmentFile(reviewProfileFile, path, (percent) => showProgress(els.reviewProfileProgress, percent));
      if (state.reviewProfileImage?.path && state.reviewProfileImage.path !== uploadedReviewProfile.path) {
        await safeDeleteFile(state.reviewProfileImage.path);
      }
    }

    let uploadedAttachments = [];
    saveStage = "storage_attachments";
    if (newFiles.length > 0) {
      uploadedAttachments = await uploadAttachmentFiles(postId, newFiles);
    }
    if (state.removedAttachmentPaths.length > 0) {
      await Promise.all(state.removedAttachmentPaths.map((path) => safeDeleteFile(path)));
    }

    const payload = normalizeSavePayload(category, {
      title,
      status,
      contentHtml,
      content: contentHtml,
      excerpt,
      coverImage: uploadedCover,
      featuredImage: uploadedCover,
      resultDate: category === "result" ? els.resultDate.value : null,
      resultSummary: category === "result" ? els.resultSummary.value.trim() : null,
      resultImage: category === "result" ? uploadedResultImage : null,
      reviewYear: category === "review" ? els.reviewYear.value : null,
      reviewText: category === "review" ? els.reviewText.value.trim() : null,
      reviewProfileImage: category === "review" ? uploadedReviewProfile : null,
      blogLink: null,
      attachments: category === "result" || category === "review" ? [] : [...state.attachments, ...uploadedAttachments],
      updatedAt: serverTimestamp(),
      authorUid: state.user.uid
    });

    if (!isEdit) {
      payload.createdAt = serverTimestamp();
    }

    if (status === "published") {
      payload.publishedAt = state.editingPost?.publishedAt || serverTimestamp();
    } else {
      payload.publishedAt = null;
    }

    saveStage = "firestore_write";
    if (isEdit) {
      await updateDoc(postRef, payload);
    } else {
      await setDoc(postRef, payload);
    }

    setStatus(els.formMessage, "?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
    closeEditor();
    await fetchPosts();
  } catch (error) {
    console.warn("[admin] save post failed", { stage: saveStage, code: error?.code || "unknown", error: error });
    const message = isStorageUploadError(error)
      ? buildStorageUploadErrorMessage(error)
      : "ÀúÀå¿¡ ½ÇÆĞÇß½À´Ï´Ù. ³×Æ®¿öÅ© »óÅÂ¸¦ È®ÀÎÇÏ¼¼¿ä.";
    setStatus(els.formMessage, message, true);
  } finally {
    resetProgress(els.attachmentProgress);
    resetProgress(els.coverImageProgress);
    resetProgress(els.resultImageProgress);
    resetProgress(els.reviewProfileProgress);
  }
}
async function uploadAttachmentFiles(postId, files) {
  showProgress(els.attachmentProgress, 0);
  const progresses = new Array(files.length).fill(0);
  const uploads = files.map((file, index) => {
    const storagePath = `posts/${postId}/attachments/${buildSafeFilename(file.name)}`;
    return uploadAttachmentFile(file, storagePath, (percent) => {
      progresses[index] = percent;
      const avg = progresses.reduce((sum, value) => sum + value, 0) / progresses.length;
      showProgress(els.attachmentProgress, avg);
    });
  });
  const uploaded = await Promise.all(uploads);
  resetProgress(els.attachmentProgress);
  return uploaded;
}

function uploadAttachmentFile(file, storagePath, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snap) => {
        const percent = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
        onProgress(percent);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            path: storagePath,
            name: file.name,
            type: file.type || "",
            size: file.size || 0
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

async function deletePost(post) {
  if (PREVIEW_MODE) {
    const okPreview = window.confirm(`'${post.title || "?œëª© ?†ìŒ"}' ê¸€???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ? (ë¯¸ë¦¬ë³´ê¸° ëª¨ë“œ)`);
    if (!okPreview) {
      return;
    }
    state.posts = state.posts.filter((item) => item.id !== post.id);
    setStatus(els.globalStatus, "ë¯¸ë¦¬ë³´ê¸° ëª¨ë“œ: ë¡œì»¬ ëª©ë¡?ì„œ ?? œ?˜ì—ˆ?µë‹ˆ??");
    renderPostsTable();
    return;
  }
  if (!state.isAdmin) {
    return;
  }
  const ok = window.confirm(`'${post.title || "?œëª© ?†ìŒ"}' ê¸€???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?`);
  if (!ok) {
    return;
  }

  try {
    const paths = new Set();
    if (post.coverImage?.path) {
      paths.add(post.coverImage.path);
    }
    if (post.featuredImage?.path) {
      paths.add(post.featuredImage.path);
    }
    if (post.resultImage?.path) {
      paths.add(post.resultImage.path);
    }
    if (post.reviewProfileImage?.path) {
      paths.add(post.reviewProfileImage.path);
    }
    if (Array.isArray(post.gallery)) {
      post.gallery.forEach((item) => item?.path && paths.add(item.path));
    }
    if (Array.isArray(post.attachments)) {
      post.attachments.forEach((item) => item?.path && paths.add(item.path));
    }
    await Promise.all([...paths].map((path) => safeDeleteFile(path)));
    await deleteDoc(doc(db, "posts", post.id));
    setStatus(els.globalStatus, "ê¸€???? œ?˜ì—ˆ?µë‹ˆ??");
    await fetchPosts();
  } catch (error) {
    console.warn("[admin] delete post failed", error);
    setStatus(els.globalStatus, "ê¸€ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.", true);
  }
}

async function safeDeleteFile(path) {
  if (!path) {
    return;
  }
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn("[admin] failed to delete storage file", { path, error });
  }
}

function validateAttachmentFile(file) {
  if (!file) {
    return;
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("ì²¨ë??Œì¼?€ ê°?20MB ?´í•˜ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.");
  }
}

function buildSafeFilename(name) {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${safe}`;
}

function showProgress(progressEl, value) {
  progressEl.hidden = false;
  progressEl.value = Math.max(0, Math.min(100, value));
}

function resetProgress(progressEl) {
  progressEl.hidden = true;
  progressEl.value = 0;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "-";
  }
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function revealPasswordStart() {
  if (!els.password || !els.passwordRevealBtn) {
    return;
  }
  els.password.type = "text";
  els.passwordRevealBtn.classList.add("is-active");
  els.passwordRevealBtn.setAttribute("aria-pressed", "true");
}

function revealPasswordEnd() {
  if (!els.password || !els.passwordRevealBtn) {
    return;
  }
  els.password.type = "password";
  els.passwordRevealBtn.classList.remove("is-active");
  els.passwordRevealBtn.setAttribute("aria-pressed", "false");
}

function getInvalidFirebaseConfigKeys(config) {
  return FIREBASE_REQUIRED_KEYS.filter((key) => {
    const value = String(config?.[key] ?? "").trim();
    return !value || FIREBASE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
  });
}

function maskApiKey(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) {
    return "(empty)";
  }
  if (key.length <= 10) {
    return `${key.slice(0, 2)}***`;
  }
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCategoryLabel(value) {
  return CATEGORY_LABEL[value] || value || "-";
}

function isStorageUploadError(error) {
  const code = String(error?.code || "");
  return code.startsWith("storage/");
}

function buildStorageUploadErrorMessage(error) {
  const code = String(error?.code || "unknown");
  return `Storage ê¶Œí•œ/ê²½ë¡œ ë¬¸ì œ (${code})`;
}

function getStatusLabel(value) {
  return value === "published" ? "ë°œí–‰" : "?„ì‹œ?€??;
}

function getPostType(post) {
  return String(post?.type || post?.category || "");
}

function toPlainText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildExcerpt(value) {
  const text = toPlainText(value);
  if (!text) {
    return "";
  }
  return text.length > 140 ? `${text.slice(0, 140).trim()}...` : text;
}

function buildContentHtmlFromPlain(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

function normalizePostData(id, data) {
  const source = data || {};
  const type = String(source.type || source.category || "");
  const contentHtml = String(source.contentHtml || source.content || "");
  const coverImage = source.coverImage || source.featuredImage || source.resultImage || source.reviewProfileImage || null;
  return {
    id,
    ...source,
    type,
    category: type,
    contentHtml,
    content: contentHtml,
    excerpt: source.excerpt || buildExcerpt(contentHtml),
    coverImage,
    featuredImage: coverImage
  };
}

function normalizeSavePayload(type, payload) {
  const normalizedType = String(type || payload?.type || payload?.category || "");
  const normalizedStatus = payload?.status === "published" ? "published" : "draft";
  return {
    ...payload,
    type: normalizedType,
    category: normalizedType,
    status: normalizedStatus,
    updatedAt: payload?.updatedAt || serverTimestamp()
  };
}

function ensureEditorPostId() {
  if (state.editingPost?.id) {
    return state.editingPost.id;
  }
  if (state.draftPostId) {
    return state.draftPostId;
  }
  if (PREVIEW_MODE) {
    state.draftPostId = `preview-${Date.now()}`;
  } else {
    state.draftPostId = doc(collection(db, "posts")).id;
  }
  if (els.postId) {
    els.postId.value = state.draftPostId;
  }
  return state.draftPostId;
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getPreviewPosts() {
  const now = new Date();
  return [
    {
      id: "preview-1",
      title: "2026 ë´„í•™ê¸?ê°œê°• ?ˆë‚´",
      category: "notice",
      status: "published",
      excerpt: "ë°˜í¸???¼ì •ê³?ê°œê°•???ˆë‚´",
      content: "ë¯¸ë¦¬ë³´ê¸°??ê³µì? ë³¸ë¬¸?…ë‹ˆ??",
      featuredImage: null,
      gallery: [],
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      authorUid: "preview-admin"
    },
    {
      id: "preview-2",
      title: "ì¤‘ë“± ?´ì‹  ?¥ìƒ ?¬ë?",
      category: "result",
      status: "published",
      resultDate: normalizeDateInput(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
      resultSummary: "ì¤‘ê°„ê³ ì‚¬ ?˜í•™ 68?ì—??92?ìœ¼ë¡??¥ìƒ???¬ë??…ë‹ˆ??",
      resultImage: {
        url: "https://via.placeholder.com/960x640?text=Result+Image",
        path: "",
        name: "preview-result.jpg",
        type: "image/jpeg",
        size: 0
      },
      content: "ì¤‘ê°„ê³ ì‚¬ ?˜í•™ 68?ì—??92?ìœ¼ë¡??¥ìƒ???¬ë??…ë‹ˆ??",
      featuredImage: {
        url: "https://via.placeholder.com/960x640?text=Result+Image",
        path: "",
        name: "preview-result.jpg",
        type: "image/jpeg",
        size: 0
      },
      gallery: [],
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
      publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
      authorUid: "preview-admin"
    },
    {
      id: "preview-3",
      title: "?™ë?ëª??„ê¸°",
      category: "review",
      status: "published",
      reviewYear: "2026",
      reviewText: "?„ì´ ?™ìŠµ ?µê????ˆì •?˜ê³  ?±ì ??ê¾¸ì????¬ë?´ìš”.",
      reviewProfileImage: {
        url: "https://via.placeholder.com/200x200?text=Profile",
        path: "",
        name: "preview-review.jpg",
        type: "image/jpeg",
        size: 0
      },
      content: "?„ì´ ?™ìŠµ ?µê????ˆì •?˜ê³  ?±ì ??ê¾¸ì????¬ë?´ìš”.",
      featuredImage: {
        url: "https://via.placeholder.com/200x200?text=Profile",
        path: "",
        name: "preview-review.jpg",
        type: "image/jpeg",
        size: 0
      },
      gallery: [],
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      authorUid: "preview-admin"
    }
  ];
}





