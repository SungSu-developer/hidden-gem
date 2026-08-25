const sortSelect = document.getElementById("sort");
const sidoSelect = document.getElementById("sidoSelect");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const writeBtn = document.getElementById("writeBtn");
const tabs = document.querySelectorAll(".tab");
const panels = {
  ai: document.getElementById("panel-ai"),
  domestic: document.getElementById("panel-domestic"),
  foreign: document.getElementById("panel-foreign"),
  courses: document.getElementById("panel-courses"),
  my: document.getElementById("panel-my"),
};

const writeDialog = document.getElementById("writeDialog");
const writeForm = document.getElementById("writeForm");
const writeError = document.getElementById("writeError");
const writeCancelBtn = document.getElementById("writeCancelBtn");
const writeImage = document.getElementById("writeImage");
const writeImagePreview = document.getElementById("writeImagePreview");
const writeTitle = document.getElementById("writeTitle");
const writeSubmit = document.getElementById("writeSubmit");
const editPostBtn = document.getElementById("editPostBtn");
const deletePostBtn = document.getElementById("deletePostBtn");
const detailDialog = document.getElementById("detailDialog");
const detailBody = document.getElementById("detailBody");
const detailClose = document.getElementById("detailClose");
const recommendBtn = document.getElementById("recommendBtn");
const replyList = document.getElementById("replyList");
const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");
const placeDialog = document.getElementById("placeDialog");
const placeBody = document.getElementById("placeBody");
const placeClose = document.getElementById("placeClose");

const authDialog = document.getElementById("authDialog");
const authForm = document.getElementById("authForm");
const authError = document.getElementById("authError");
const authLabel = document.getElementById("authLabel");
const authOpenBtn = document.getElementById("authOpenBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authCancelBtn = document.getElementById("authCancelBtn");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const authNickWrap = document.getElementById("authNickWrap");
const authMemberId = document.getElementById("authMemberId");
const authPassword = document.getElementById("authPassword");
const authNickname = document.getElementById("authNickname");

const DEFAULT_YM = "201201";
const DEFAULT_LIMIT = "30";
const AUTH_STORAGE_KEY = "hiddengem_user";
const LANG_STORAGE_KEY = "hiddengem_lang";
/** @type {'ko'|'en'} */
let uiLang = localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "ko";
const UI_I18N = {
  ko: {
    tabAi: "AI 추천",
    tabDomestic: "현지인 Pick",
    tabForeign: "외국인 Pick",
    tabCourses: "계획 공유",
    tabMy: "마이페이지",
    needLogin: "로그인이 필요합니다",
    loginJoin: "로그인",
    logout: "로그아웃",
    write: "글쓰기",
    region: "지역",
    nationwide: "전국",
    sort: "정렬",
    sortGem: "추천순",
    sortForeign: "외국인 많은 순",
    sortDomestic: "내국인 많은 순",
    myPosts: "내가 쓴 글",
    myLiked: "추천한 글",
    myCourses: "내 여행 계획",
    translating: "번역 중…",
    foreignVisitors: "외국인",
    domesticVisitors: "내국인",
  },
  en: {
    tabAi: "AI Picks",
    tabDomestic: "Local Tips",
    tabForeign: "Visitor Tips",
    tabCourses: "Shared Plans",
    tabMy: "My Page",
    needLogin: "Sign in required",
    loginJoin: "Sign in",
    logout: "Log out",
    write: "Write",
    region: "Region",
    nationwide: "All",
    sort: "Sort",
    sortGem: "Recommended",
    sortForeign: "Most foreign visitors",
    sortDomestic: "Most local visitors",
    myPosts: "My posts",
    myLiked: "Liked",
    myCourses: "My trips",
    translating: "Translating…",
    foreignVisitors: "Foreign",
    domesticVisitors: "Local",
  },
};

function t(key) {
  return (UI_I18N[uiLang] && UI_I18N[uiLang][key]) || UI_I18N.ko[key] || key;
}

function syncLangButtons() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === uiLang);
  });
}

function applyChromeI18n() {
  document.querySelectorAll(".tab").forEach((tab) => {
    const id = tab.dataset.tab;
    if (id === "ai") tab.textContent = t("tabAi");
    else if (id === "domestic") tab.textContent = t("tabDomestic");
    else if (id === "foreign") tab.textContent = t("tabForeign");
    else if (id === "courses") tab.textContent = t("tabCourses");
    else if (id === "my") tab.textContent = t("tabMy");
  });
  if (!currentUser) authLabel.textContent = t("needLogin");
  authOpenBtn.textContent = t("loginJoin");
  logoutBtn.textContent = t("logout");
  writeBtn.title = t("write");
  writeBtn.textContent = t("write");
  const regionLabel = document.querySelector('label[for="sidoSelect"]');
  const sortLabel = document.querySelector('label[for="sort"]');
  if (regionLabel) regionLabel.textContent = t("region");
  if (sortLabel) sortLabel.textContent = t("sort");
  const sort = document.getElementById("sort");
  if (sort) {
    const opts = sort.options;
    if (opts[0]) opts[0].textContent = t("sortGem");
    if (opts[1]) opts[1].textContent = t("sortForeign");
    if (opts[2]) opts[2].textContent = t("sortDomestic");
  }
  const firstSido = sidoSelect?.options?.[0];
  if (firstSido && !firstSido.value) firstSido.textContent = t("nationwide");
  document.querySelectorAll(".my-subtab").forEach((btn) => {
    if (btn.dataset.myView === "posts") btn.textContent = t("myPosts");
    if (btn.dataset.myView === "liked") btn.textContent = t("myLiked");
    if (btn.dataset.myView === "courses") btn.textContent = t("myCourses");
  });
}

async function translateBatch(texts, targetLang = "EN") {
  const list = (texts || []).map((x) => (x == null ? "" : String(x)));
  if (!list.length || list.every((x) => !x.trim())) {
    return list.slice();
  }
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: list, targetLang }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed");
  return data.translations || list;
}

function displayGemName(gem) {
  return uiLang === "en" && gem.resNmEn ? gem.resNmEn : gem.resNm;
}

function displayGemLocation(gem) {
  const raw = [gem.sido, gem.gungu].filter(Boolean).join(" ");
  return uiLang === "en" && gem.locationEn ? gem.locationEn : raw;
}

async function translateCurrentGems() {
  if (uiLang !== "en" || !currentGems.length) return;
  const need = currentGems.filter((g) => !g.resNmEn);
  if (!need.length) return;
  const texts = [];
  for (const g of need) {
    texts.push(g.resNm || "");
    texts.push([g.sido, g.gungu].filter(Boolean).join(" "));
  }
  const tr = await translateBatch(texts, "EN");
  for (let i = 0; i < need.length; i++) {
    need[i].resNmEn = tr[i * 2] || need[i].resNm;
    need[i].locationEn = tr[i * 2 + 1] || [need[i].sido, need[i].gungu].filter(Boolean).join(" ");
  }
}

async function translatePosts(posts) {
  if (uiLang !== "en" || !posts?.length) return;
  const need = posts.filter((p) => !p._en);
  if (!need.length) return;
  const texts = [];
  for (const p of need) {
    texts.push(p.content || "");
    texts.push(p.locationTitle || "");
    texts.push(p.address || "");
  }
  const tr = await translateBatch(texts, "EN");
  for (let i = 0; i < need.length; i++) {
    need[i]._en = {
      content: tr[i * 3] || need[i].content,
      locationTitle: tr[i * 3 + 1] || need[i].locationTitle,
      address: tr[i * 3 + 2] || need[i].address,
    };
  }
}

function postField(p, field) {
  if (uiLang === "en" && p._en && p._en[field] != null) return p._en[field];
  return p[field];
}

/** @type {{ memberId: string, nickname: string } | null} */
let currentUser = null;
/** @type {"login"|"register"} */
let authMode = "login";

/** @type {Array<object>} */
let currentGems = [];
/** AI 탭: 검색 전 풀 목록 (API 재호출 없이 명칭 필터) */
let aiGemsPool = [];
/** 지역별 AI 결과 메모리 캐시 (ym|sido → gems) */
const aiGemsByKey = new Map();
/** 지역별 진행 중 로드 */
const aiLoadPromises = new Map();
const AI_SESSION_CACHE_KEY = "hiddengem_ai_cache_v2";
/** @type {Array<object>} */
let boardPosts = [];
/** @type {object|null} */
let currentDetail = null;
let activeTab = "ai";
/** @type {Map<string, object>} */
const placeDetailCache = new Map();
/** @type {Map<string, Promise<object>>} */
const placeDetailInflight = new Map();
const PLACE_PREFETCH_CONCURRENCY = 2;
/** @type {{ sido: string[] } | null} */
let regionData = null;
/** 전국 시·도 (글쓰기·게시판 필터용). API 지역 목록이 있으면 그걸로 덮어씀 */
const DEFAULT_SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];
/** @type {string|null} data URL for pending write image */
let pendingImageDataUrl = null;
/** @type {number|null} 수정 중인 게시글 id */
let editingPostId = null;
/** 수정 시 기존 사진 URL (새 사진 없으면 유지) */
let existingImageUrl = "";
/** 수정 시 사진 제거 여부 */
let removeExistingImage = false;

function gemKey(gem) {
  return `${gem.resNm}|${gem.sido || ""}`;
}

function currentMemberId() {
  return currentUser?.memberId || "";
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.memberId) {
      return {
        memberId: String(parsed.memberId),
        nickname: String(parsed.nickname || parsed.memberId),
        profileImage: String(parsed.profileImage || ""),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  renderAuthBar();
  if (activeTab === "my") {
    loadMyPage();
  } else if (activeTab === "domestic" || activeTab === "foreign") {
    loadBoardPosts(activeTab);
  }
}

function renderAuthBar() {
  if (currentUser) {
    authLabel.textContent = `${currentUser.nickname || currentUser.memberId}님`;
    authOpenBtn.hidden = true;
    logoutBtn.hidden = false;
  } else {
    authLabel.textContent = "로그인이 필요합니다";
    authOpenBtn.hidden = false;
    logoutBtn.hidden = true;
  }
  renderMyHeader();
}

function renderMyHeader() {
  const avatar = document.getElementById("myAvatar");
  const nameEl = document.getElementById("myName");
  const subEl = document.getElementById("mySub");
  const resetBtn = document.getElementById("myAvatarReset");
  const statsEl = document.getElementById("myStats");
  if (!avatar || !nameEl || !subEl) return;
  if (currentUser) {
    const nick = currentUser.nickname || currentUser.memberId;
    fillAvatar(avatar, currentUser.profileImage, nick);
    avatar.classList.add("editable");
    nameEl.textContent = nick;
    subEl.textContent = `@${currentUser.memberId}`;
    if (resetBtn) resetBtn.hidden = !currentUser.profileImage;
    if (statsEl) statsEl.hidden = false;
  } else {
    fillAvatar(avatar, "", "?");
    avatar.classList.remove("editable");
    nameEl.textContent = "게스트";
    subEl.textContent = "로그인하면 내 글·추천·여행 계획을 볼 수 있어요";
    if (resetBtn) resetBtn.hidden = true;
    if (statsEl) statsEl.hidden = true;
  }
}

async function refreshMyProfileStats() {
  if (!currentMemberId()) return;
  try {
    const qs = new URLSearchParams({
      memberId: currentMemberId(),
      viewerId: currentMemberId(),
    });
    const res = await fetch(`/api/profile?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) return;
    const posts = document.getElementById("myStatPosts");
    const followers = document.getElementById("myStatFollowers");
    const following = document.getElementById("myStatFollowing");
    if (posts) posts.textContent = String(data.postCount ?? 0);
    if (followers) followers.textContent = String(data.followerCount ?? 0);
    if (following) following.textContent = String(data.followingCount ?? 0);
    if (currentUser && data.memberId) {
      currentUser.nickname = data.nickname || currentUser.nickname;
      currentUser.profileImage = data.profileImage || "";
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      renderMyHeader();
      const statsEl = document.getElementById("myStats");
      if (statsEl) statsEl.hidden = false;
    }
  } catch {
    /* ignore */
  }
}

function courseDateLabel(regDate, regAt) {
  const d = formatKoreanDate(regDate || "", regAt);
  return d || "";
}

function renderCourseList(courses, opts = {}) {
  const listId = opts.listId || "courseListMy";
  const el = document.getElementById(listId);
  if (!el) return;
  const selectedId = currentCourse?.courseId;
  const showAuthor = !!opts.showAuthor;
  const cards = (courses || [])
    .map((c) => {
      const cover = c.coverImage
        ? `<img class="course-thumb" src="${escapeHtml(c.coverImage)}" alt="" loading="lazy">`
        : `<div class="course-thumb course-thumb-fallback">${escapeHtml((c.title || "?").charAt(0))}</div>`;
      const selected = Number(c.courseId) === Number(selectedId) ? " is-selected" : "";
      const metaLeft = showAuthor
        ? `@${escapeHtml(c.memberId || "")}`
        : c.isPublic
          ? "공유 중"
          : "내 계획";
      return `<button type="button" class="course-card${selected}" data-course-id="${c.courseId}">
        ${cover}
        <div class="course-card-body">
          <div class="course-title-row">
            <h3>${escapeHtml(c.title || "")}</h3>
            <span class="spot-badge">${Number(c.spotCount) || 0}개 장소</span>
          </div>
          <p class="course-summary">${escapeHtml(c.summary || "")}</p>
          <div class="course-meta">
            <span>${metaLeft}</span>
            <span>${escapeHtml(courseDateLabel(c.regDate, c.regAt))}</span>
          </div>
        </div>
      </button>`;
    })
    .join("");
  const footer =
    opts.mode === "public"
      ? ""
      : `<button type="button" class="course-add" id="courseAddBtn">+ 새 계획 추가하기</button>`;
  el.innerHTML = cards + footer;
}

function courseDetailTargets(ctx) {
  if (ctx === "public") {
    return {
      layout: "publicCoursesLayout",
      nav: "courseDetailNavTitlePublic",
      moreWrap: "courseMoreWrapPublic",
      actions: "courseDetailActionsPublic",
      body: "courseDetailBodyPublic",
      saveBtn: "courseSaveBtnPublic",
      followBtn: "courseFollowBtnPublic",
    };
  }
  return {
    layout: "myCoursesLayout",
    nav: "courseDetailNavTitle",
    moreWrap: "courseMoreWrap",
    actions: "courseDetailActions",
    body: "courseDetailBody",
    saveBtn: "courseSaveBtn",
    followBtn: "courseFollowBtn",
  };
}

/** @type {'my'|'public'} */
let courseDetailCtx = "my";

function clearCourseDetailPane(ctx = courseDetailCtx) {
  if (ctx === courseDetailCtx) currentCourse = null;
  closeCourseMoreMenu();
  const ids = courseDetailTargets(ctx);
  document.getElementById(ids.layout)?.classList.remove("detail-open");
  const nav = document.getElementById(ids.nav);
  if (nav) nav.textContent = ctx === "public" ? "계획 공유" : "여행 계획";
  const moreWrap = document.getElementById(ids.moreWrap);
  if (moreWrap) moreWrap.hidden = true;
  const actions = document.getElementById(ids.actions);
  if (actions) actions.hidden = true;
  const body = document.getElementById(ids.body);
  if (body) {
    body.innerHTML = `<div class="course-detail-empty">${
      uiLang === "en"
        ? "Select a plan on the left"
        : ctx === "public"
          ? "왼쪽에서 계획을 선택하세요"
          : "왼쪽에서 여행 계획을 선택하세요"
    }</div>`;
  }
  document.querySelectorAll(`#${ctx === "public" ? "courseListPublic" : "courseListMy"} .course-card.is-selected`)
    .forEach((el) => el.classList.remove("is-selected"));
}

function goToAiForCourse() {
  switchTab("ai");
}

async function loadPublicCourses() {
  const statusElBoard = document.getElementById("boardStatusCourses");
  showStatus(statusElBoard, uiLang === "en" ? "Loading…" : "불러오는 중…", "info");
  try {
    const qs = new URLSearchParams({ public: "1", viewerId: currentMemberId() });
    const res = await fetch(`/api/courses?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "조회 실패");
    hideStatus(statusElBoard);
    renderCourseList(data.courses || [], { listId: "courseListPublic", mode: "public", showAuthor: true });
    if (!data.courses?.length) {
      document.getElementById("courseListPublic").innerHTML =
        `<p class="nearby-empty">아직 공유된 계획이 없습니다.</p>`;
    }
    if (courseDetailCtx === "public" && currentCourse?.courseId) {
      const still = (data.courses || []).some((c) => Number(c.courseId) === Number(currentCourse.courseId));
      if (!still) clearCourseDetailPane("public");
    } else if (courseDetailCtx !== "public" || !currentCourse) {
      clearCourseDetailPane("public");
    }
  } catch (e) {
    showStatus(statusElBoard, e.message || "오류", "error");
  }
}

async function loadMyCourses() {
  const statusElBoard = document.getElementById("boardStatusMy");
  const listEl = document.getElementById("boardListMy");
  const layout = document.getElementById("myCoursesLayout");
  listEl.hidden = true;
  if (layout) layout.hidden = false;
  showStatus(statusElBoard, uiLang === "en" ? "Loading…" : "불러오는 중…", "info");
  try {
    const qs = new URLSearchParams({
      memberId: currentMemberId(),
      viewerId: currentMemberId(),
    });
    const res = await fetch(`/api/courses?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "조회 실패");
    hideStatus(statusElBoard);
    renderCourseList(data.courses || [], { listId: "courseListMy", mode: "mine" });
    if (courseDetailCtx === "my" && currentCourse?.courseId) {
      const still = (data.courses || []).some((c) => Number(c.courseId) === Number(currentCourse.courseId));
      if (still) {
        document.querySelectorAll("#courseListMy .course-card[data-course-id]").forEach((el) => {
          el.classList.toggle(
            "is-selected",
            Number(el.dataset.courseId) === Number(currentCourse.courseId)
          );
        });
      } else {
        clearCourseDetailPane("my");
      }
    } else {
      clearCourseDetailPane("my");
    }
  } catch (e) {
    showStatus(statusElBoard, e.message || "오류", "error");
  }
}

async function loadMyPage() {
  const statusElBoard = document.getElementById("boardStatusMy");
  const listEl = document.getElementById("boardListMy");
  const layout = document.getElementById("myCoursesLayout");
  renderMyHeader();

  if (!currentMemberId()) {
    hideStatus(statusElBoard);
    listEl.hidden = false;
    if (layout) layout.hidden = true;
    listEl.innerHTML = `<li class="empty-state">${
      uiLang === "en"
        ? "Sign in to see your posts, likes, and trip plans."
        : "로그인하면 내가 쓴 글·추천·여행 계획을 볼 수 있습니다."
    }</li>`;
    return;
  }

  refreshMyProfileStats();

  if (myView === "courses") {
    await loadMyCourses();
    return;
  }

  listEl.hidden = false;
  if (layout) layout.hidden = true;
  clearCourseDetailPane();

  const qs = new URLSearchParams({ memberId: currentMemberId() });
  if (myView === "liked") {
    qs.set("likedBy", currentMemberId());
  } else {
    qs.set("author", currentMemberId());
  }

  showStatus(statusElBoard, uiLang === "en" ? "Loading…" : "불러오는 중…", "info");
  try {
    const res = await fetch(`/api/posts?${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "조회 실패");
    boardPosts = data.posts || [];
    if (uiLang === "en" && boardPosts.length) {
      showStatus(statusElBoard, t("translating"), "info");
      try {
        await translatePosts(boardPosts);
      } catch (err) {
        console.warn(err);
      }
    }
    hideStatus(statusElBoard);
    renderBoardList(listEl, boardPosts, {
      showCategory: true,
      emptyText:
        myView === "liked"
          ? uiLang === "en"
            ? "No liked posts yet. Tap ♥ on the feed."
            : "아직 추천한 글이 없습니다. 피드에서 ♥를 눌러 보세요."
          : uiLang === "en"
            ? "You have not written any posts yet."
            : "아직 작성한 글이 없습니다. 글쓰기로 남겨 보세요.",
    });
  } catch (e) {
    showStatus(statusElBoard, e.message || "오류", "error");
  }
}

function setMyView(view) {
  myView = view === "liked" ? "liked" : view === "courses" ? "courses" : "posts";
  document.querySelectorAll(".my-subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.myView === myView);
  });
  loadMyPage();
}

function fillAvatar(el, url, name) {
  const letter = String(name || "?").charAt(0);
  if (url) {
    el.innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
    const img = el.querySelector("img");
    if (img) {
      img.onerror = () => {
        el.textContent = letter;
      };
    }
  } else {
    el.textContent = letter;
  }
}

async function saveProfileImage(url) {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId: currentUser.memberId, profileImage: url || "" }),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "프로필 사진 저장 실패");
  saveUser({
    memberId: data.memberId,
    nickname: data.nickname || currentUser.nickname,
    profileImage: url ? data.profileImage || url : "",
  });
}

function requireLogin(message = "로그인이 필요합니다.") {
  if (currentUser?.memberId) return true;
  alert(message);
  openAuthDialog("login");
  return false;
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  authTitle.textContent = authMode === "register" ? "회원가입" : "로그인";
  authSubmit.textContent = authMode === "register" ? "가입하기" : "로그인";
  // 닉네임은 회원가입에만 표시 (CSS display가 hidden을 덮지 않도록)
  if (authMode === "register") {
    authNickWrap.removeAttribute("hidden");
  } else {
    authNickWrap.setAttribute("hidden", "");
    authNickname.value = "";
  }
  authPassword.autocomplete = authMode === "register" ? "new-password" : "current-password";
  authError.hidden = true;
  document.querySelectorAll(".auth-mode").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === authMode);
  });
}

function openAuthDialog(mode = "login") {
  setAuthMode(mode);
  authForm.reset();
  authError.hidden = true;
  authDialog.showModal();
}

function showStatus(el, message, type = "info") {
  el.hidden = false;
  el.className = `status ${type}`;
  el.textContent = message;
}

function hideStatus(el) {
  el.hidden = true;
}

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function formatDist(m) {
  if (m == null || Number.isNaN(Number(m))) return "";
  const n = Number(m);
  if (n >= 1000) return (n / 1000).toFixed(1) + "km";
  return Math.round(n) + "m";
}

function sortGems(gems, sortKey) {
  const sorted = [...gems];
  switch (sortKey) {
    case "foreign":
      sorted.sort((a, b) => b.foreignVisitors - a.foreignVisitors);
      break;
    case "domestic":
      sorted.sort((a, b) => b.domesticVisitors - a.domesticVisitors);
      break;
    default:
      sorted.sort((a, b) => b.gemScore - a.gemScore);
  }
  return sorted;
}

function thumbHtml(gem) {
  const letter = gem.resNm ? gem.resNm.charAt(0) : "?";
  if (gem.thumbnail) {
    return `<img src="${escapeHtml(gem.thumbnail)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.querySelector('.thumb-fallback')?.removeAttribute('hidden')" /><span class="thumb-letter thumb-fallback" hidden>${escapeHtml(letter)}</span>`;
  }
  return `<span class="thumb-letter">${escapeHtml(letter)}</span>`;
}

function visitorChipHtml(kind, count) {
  const isDomestic = kind === "domestic";
  const label = isDomestic ? t("domesticVisitors") : t("foreignVisitors");
  const src = isDomestic ? "/local.png" : "/foreigner.png";
  const icon = `<img class="visitor-chip-ico" src="${src}" alt="" width="11" height="10" decoding="async">`;
  return `<span class="visitor-chip visitor-chip--${isDomestic ? "domestic" : "foreign"}">${icon}<span class="visitor-chip-text">${escapeHtml(label)} ${formatNum(count)}</span></span>`;
}

function visitorStatsHtml(gem) {
  return `${visitorChipHtml("foreign", gem.foreignVisitors)}${visitorChipHtml("domestic", gem.domesticVisitors)}`;
}

function renderGems(gems) {
  if (!gems || gems.length === 0) {
    resultsEl.innerHTML = "";
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "추천 게시글이 없습니다.";
    resultsEl.appendChild(li);
    return;
  }

  const sorted = sortGems(gems, sortSelect.value);

  resultsEl.innerHTML = sorted
    .map((gem, index) => {
      const location = displayGemLocation(gem);
      const name = displayGemName(gem);
      const key = gemKey(gem);
      const rank = index + 1;
      return `
        <li class="post-item gem-item" data-key="${escapeHtml(key)}" role="button" tabindex="0">
          <span class="gem-rank" aria-label="${rank}위">${rank}</span>
          <div class="post-thumb" aria-hidden="true">
            ${thumbHtml(gem)}
          </div>
          <div class="post-body">
            <h2 class="post-title">${escapeHtml(name)}</h2>
            <p class="post-meta">
              <span class="post-meta-loc">${escapeHtml(location)}</span>
              <span class="post-meta-stats">${visitorStatsHtml(gem)}</span>
            </p>
          </div>
        </li>`;
    })
    .join("");
}

function applyThumbnails(thumbnails) {
  for (const gem of currentGems) {
    const url = thumbnails[gemKey(gem)];
    if (url) gem.thumbnail = url;
  }
  renderGems(currentGems);
}

async function loadThumbnails(gems) {
  if (!gems.length) return { thumbnails: {}, apiLimited: false };
  const body = gems.map((g) => `${g.resNm}\t${g.sido || ""}`).join("\n");
  try {
    const res = await fetch("/api/thumbnails", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body,
    });
    const data = await res.json();
    if (!res.ok) return { thumbnails: {}, apiLimited: !!data.apiLimited };
    const thumbnails = data.thumbnails || {};
    for (const gem of gems) {
      const url = thumbnails[gemKey(gem)];
      if (url) gem.thumbnail = url;
    }
    return { thumbnails, apiLimited: !!data.apiLimited };
  } catch {
    return { thumbnails: {}, apiLimited: false };
  }
}

async function fetchPlaceDetail(gem) {
  const key = gemKey(gem);
  if (placeDetailCache.has(key)) {
    return placeDetailCache.get(key);
  }
  if (placeDetailInflight.has(key)) {
    return placeDetailInflight.get(key);
  }
  const request = (async () => {
    const params = new URLSearchParams({
      resNm: gem.resNm || "",
      sido: gem.sido || "",
      gungu: gem.gungu || "",
    });
    const res = await fetch(`/api/place-detail?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "상세 조회 실패");
    placeDetailCache.set(key, data);
    return data;
  })().finally(() => {
    placeDetailInflight.delete(key);
  });
  placeDetailInflight.set(key, request);
  return request;
}

async function prefetchPlaceDetails(gems) {
  if (!gems.length) return;
  const queue = gems.filter((g) => !placeDetailCache.has(gemKey(g)));
  if (!queue.length) return;

  const worker = async () => {
    while (queue.length) {
      const gem = queue.shift();
      if (!gem) break;
      try {
        await fetchPlaceDetail(gem);
      } catch {
        /* 개별 실패는 클릭 시 재시도 */
      }
    }
  };

  const n = Math.min(PLACE_PREFETCH_CONCURRENCY, queue.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
}

function aiCacheKey(sido) {
  return `${DEFAULT_YM}|${sido || ""}`;
}

function readAiSessionStore() {
  try {
    const raw = sessionStorage.getItem(AI_SESSION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // v1 단일 키 형식 마이그레이션
    if (typeof parsed.key === "string" && Array.isArray(parsed.gems)) {
      return { [parsed.key]: parsed.gems };
    }
    return parsed;
  } catch {
    return {};
  }
}

function readAiSessionCache(key) {
  const all = readAiSessionStore();
  if (!Object.prototype.hasOwnProperty.call(all, key)) return null;
  return Array.isArray(all[key]) ? all[key] : null;
}

function writeAiSessionCache(key, gems) {
  try {
    const all = readAiSessionStore();
    all[key] = gems;
    sessionStorage.setItem(AI_SESSION_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota 등 무시 */
  }
}

function showAiEmpty(sido, searchEmpty) {
  resultsEl.innerHTML = "";
  const li = document.createElement("li");
  li.className = "empty-state";
  if (searchEmpty) {
    li.textContent = "검색 결과가 없습니다.";
  } else if (!aiGemsPool.length) {
    li.textContent = sido
      ? uiLang === "en"
        ? "No recommendations for this region."
        : "이 지역에 해당하는 추천 장소가 없습니다."
      : uiLang === "en"
        ? "No recommendations."
        : "추천 장소가 없습니다.";
  } else {
    li.textContent =
      uiLang === "en"
        ? "No places with both photo and details were found."
        : "사진과 상세 정보가 모두 있는 추천 장소가 없습니다.";
  }
  resultsEl.appendChild(li);
}

function applyCachedAiGems(gems) {
  aiGemsPool = gems.slice();
  applyGemSearchFilter();
  hideStatus(statusEl);
  renderGems(currentGems);
  if (!currentGems.length) {
    const q = document.getElementById("gemSearch")?.value?.trim();
    showAiEmpty(sidoSelect?.value || "", !!q);
  }
}

/** @param {{ force?: boolean }} [options] */
async function loadHiddenGems(options = {}) {
  const force = !!options.force;
  const sido = sidoSelect?.value || "";
  const key = aiCacheKey(sido);

  // 지역별로 따로 캐시 — 전국 ↔ 도/시 왕복해도 재계산 없음
  if (!force && aiGemsByKey.has(key)) {
    applyCachedAiGems(aiGemsByKey.get(key));
    return;
  }

  if (!force) {
    const cached = readAiSessionCache(key);
    if (cached) {
      aiGemsByKey.set(key, cached.slice());
      applyCachedAiGems(cached);
      if (cached.length) prefetchPlaceDetails(cached).catch(() => {});
      return;
    }
  }

  if (aiLoadPromises.has(key)) return aiLoadPromises.get(key);

  const loadPromise = (async () => {
    showStatus(
      statusEl,
      uiLang === "en" ? "Loading AI picks…" : "AI 추천 목록을 불러오는 중…",
      "info"
    );
    resultsEl.innerHTML = "";

    const params = new URLSearchParams({ ym: DEFAULT_YM, limit: "100" });
    if (sido) params.set("sido", sido);

    try {
      const res = await fetch(`/api/hidden-gems?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회 실패");

      let gems = data.gems || [];
      if (!gems.length) {
        currentGems = [];
        aiGemsPool = [];
        aiGemsByKey.set(key, []);
        writeAiSessionCache(key, []);
        hideStatus(statusEl);
        showAiEmpty(sido, false);
        return;
      }

      const needWork =
        gems.some((g) => !g.thumbnail) ||
        gems.some((g) => !placeDetailCache.has(gemKey(g)));
      if (needWork) {
        showStatus(
          statusEl,
          uiLang === "en" ? "Loading AI picks" : "AI 계산중",
          "info"
        );
      }
      await loadThumbnails(gems);
      await prefetchPlaceDetails(gems);

      // 로딩 중에 다른 지역으로 바뀌었으면 화면은 건드리지 않고 캐시만 저장
      const stillCurrent = aiCacheKey(sidoSelect?.value || "") === key;

      const showLimit = Number(DEFAULT_LIMIT) || 30;
      const enriched = gems.filter((g) => {
        if (!g.thumbnail) return false;
        const detail = placeDetailCache.get(gemKey(g));
        return !!(detail && detail.found === true);
      });

      if (enriched.length) {
        gems = enriched.length > showLimit ? enriched.slice(0, showLimit) : enriched;
      } else if (gems.length) {
        gems = gems.length > showLimit ? gems.slice(0, showLimit) : gems;
      } else {
        gems = [];
      }

      aiGemsByKey.set(key, gems.slice());
      writeAiSessionCache(key, gems);

      if (!stillCurrent) return;

      currentGems = gems;
      aiGemsPool = gems.slice();
      applyGemSearchFilter();
      if (uiLang === "en" && currentGems.length) {
        showStatus(statusEl, t("translating"), "info");
        try {
          await translateCurrentGems();
        } catch (err) {
          console.warn(err);
        }
      }
      hideStatus(statusEl);
      renderGems(currentGems);
      if (!currentGems.length) {
        const q = document.getElementById("gemSearch")?.value?.trim();
        showAiEmpty(sido, !!q);
      }
    } catch (e) {
      if (aiCacheKey(sidoSelect?.value || "") === key) {
        showStatus(statusEl, e.message || "오류가 발생했습니다.", "error");
      }
    }
  })().finally(() => {
    aiLoadPromises.delete(key);
  });

  aiLoadPromises.set(key, loadPromise);
  return loadPromise;
}

async function loadRegions() {
  try {
    const res = await fetch(`/api/regions?ym=${encodeURIComponent(DEFAULT_YM)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "지역 목록 실패");
    regionData = { sido: data.sido?.length ? data.sido : DEFAULT_SIDO_LIST.slice() };
  } catch {
    regionData = { sido: DEFAULT_SIDO_LIST.slice() };
  }
  fillSidoSelect(sidoSelect, { includeAll: true, allLabel: "전국" });
  fillSidoSelect(document.getElementById("sidoFilterDomestic"), { includeAll: true, allLabel: "전국" });
  fillSidoSelect(document.getElementById("sidoFilterForeign"), { includeAll: true, allLabel: "전국" });
  fillSidoSelect(document.getElementById("writeSido"), { includeAll: false, placeholder: "선택" });
}

function sidoOptions() {
  return regionData?.sido?.length ? regionData.sido : DEFAULT_SIDO_LIST;
}

function fillSidoSelect(selectEl, { includeAll = false, allLabel = "전국", placeholder = "선택", selected = "" } = {}) {
  if (!selectEl) return;
  const prev = selected || selectEl.value;
  const opts = [];
  if (includeAll) {
    opts.push(`<option value="">${escapeHtml(allLabel)}</option>`);
  } else {
    opts.push(`<option value="">${escapeHtml(placeholder)}</option>`);
  }
  for (const s of sidoOptions()) {
    opts.push(`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`);
  }
  selectEl.innerHTML = opts.join("");
  if (prev && [...selectEl.options].some((o) => o.value === prev)) {
    selectEl.value = prev;
  }
}

function applyGemSearchFilter() {
  const q = (document.getElementById("gemSearch")?.value || "").trim().toLowerCase();
  if (!q) {
    currentGems = aiGemsPool.slice();
    return;
  }
  currentGems = aiGemsPool.filter((g) => {
    const name = String(g.resNm || "").toLowerCase();
    const nameEn = String(g.resNmEn || "").toLowerCase();
    return name.includes(q) || nameEn.includes(q);
  });
}

function runGemSearch() {
  applyGemSearchFilter();
  renderGems(currentGems);
  if (!currentGems.length) {
    resultsEl.innerHTML = "";
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "검색 결과가 없습니다.";
    resultsEl.appendChild(li);
  }
}

async function openPlaceDetail(gem) {
  currentPlaceGem = gem;
  currentPlaceData = null;
  placeDialog.showModal();
  const key = gemKey(gem);
  const cached = placeDetailCache.get(key);

  if (cached) {
    currentPlaceData = cached;
    await maybeTranslatePlace(gem, cached);
    renderPlaceDetail(gem, cached);
    return;
  }

  placeBody.innerHTML = `<div class="place-loading">${uiLang === "en" ? "Loading…" : "관광 정보를 불러오는 중…"}</div>`;

  try {
    const data = await fetchPlaceDetail(gem);
    if (gemKey(gem) === key) {
      currentPlaceData = data;
      await maybeTranslatePlace(gem, data);
      renderPlaceDetail(gem, data);
    }
  } catch (e) {
    placeBody.innerHTML = `<div class="place-empty">${escapeHtml(e.message || "불러오지 못했습니다.")}</div>`;
  }
}

async function maybeTranslatePlace(gem, data) {
  if (uiLang !== "en" || !data || data._enReady) return;
  try {
    const texts = [];
    const slots = [];
    const push = (value, apply) => {
      texts.push(value == null ? "" : String(value));
      slots.push(apply);
    };
    push(data.title || gem.resNm, (v) => {
      data.titleEn = v;
    });
    push(data.addr || "", (v) => {
      data.addrEn = v;
    });
    push(data.overview || "", (v) => {
      data.overviewEn = v;
    });
    push(data.message || "", (v) => {
      data.messageEn = v;
    });
    for (const row of data.info || []) {
      push(row.label || "", (v) => {
        row.labelEn = v;
      });
      push(row.value || "", (v) => {
        row.valueEn = v;
      });
    }
    for (const n of [...(data.restaurants || []), ...(data.attractions || [])]) {
      push(n.title || "", (v) => {
        n.titleEn = v;
      });
      push(n.addr || "", (v) => {
        n.addrEn = v;
      });
    }
    const tr = await translateBatch(texts, "EN");
    slots.forEach((apply, i) => apply(tr[i] || texts[i]));
    data._enReady = true;
  } catch (err) {
    console.warn(err);
  }
}

function nearbyCardsHtml(list) {
  const filtered = (list || []).filter((p) => p && p.contentId && p.image && p.title);
  if (!filtered.length) {
    return `<p class="nearby-empty">${uiLang === "en" ? "No nearby places with photos." : "사진이 있는 주변 장소가 없습니다."}</p>`;
  }
  return `<div class="nearby-row">${filtered
    .map((p) => {
      const title = uiLang === "en" && p.titleEn ? p.titleEn : p.title;
      const addr = uiLang === "en" && p.addrEn ? p.addrEn : p.addr;
      return `
        <article class="nearby-card" role="button" tabindex="0"
          data-content-id="${escapeHtml(p.contentId)}"
          data-title="${escapeHtml(p.title || "")}"
          data-addr="${escapeHtml(p.addr || "")}"
          data-image="${escapeHtml(p.image || "")}">
          <div class="nearby-thumb"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" /></div>
          <div class="nearby-meta">
            <h4 class="nearby-title">${escapeHtml(title || "")}</h4>
            <p class="nearby-dist">${escapeHtml(formatDist(p.dist))}${addr ? " · " + escapeHtml(addr) : ""}</p>
          </div>
        </article>`;
    })
    .join("")}</div>`;
}

function bindNearbyCards() {
  placeBody.querySelectorAll(".nearby-card[data-content-id]").forEach((card) => {
    const open = () => {
      openNearbyPlace({
        contentId: card.dataset.contentId,
        title: card.dataset.title || "",
        addr: card.dataset.addr || "",
        image: card.dataset.image || "",
      });
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

async function openNearbyPlace(place) {
  if (!place?.contentId) return;
  const gem = {
    resNm: place.title || "장소",
    sido: "",
    gungu: "",
    foreignVisitors: 0,
    domesticVisitors: 0,
    thumbnail: place.image || "",
  };
  if (!placeDialog.open) placeDialog.showModal();
  placeBody.innerHTML = `<div class="place-loading">${uiLang === "en" ? "Loading…" : "불러오는 중…"}</div>`;
  try {
    const params = new URLSearchParams({
      contentId: place.contentId,
      resNm: place.title || "",
    });
    const res = await fetch(`/api/place-detail?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "상세 조회 실패");
    if (!data.found) {
      placeBody.innerHTML = `<div class="place-empty">${escapeHtml(
        data.message || (uiLang === "en" ? "Details not available." : "상세 정보가 없습니다.")
      )}</div>`;
      return;
    }
    placeDetailCache.set("cid:" + place.contentId, data);
    await maybeTranslatePlace(gem, data);
    renderPlaceDetail(gem, data);
  } catch (e) {
    placeBody.innerHTML = `<div class="place-empty">${escapeHtml(e.message || "불러오지 못했습니다.")}</div>`;
  }
}

function renderPlaceDetail(gem, data) {
  const location = displayGemLocation(gem);
  const title = displayGemName(gem);
  const letter = (title || "?").charAt(0);
  const heroImg = data.image || gem.thumbnail;
  const apiTitle =
    uiLang === "en"
      ? data.titleEn || data.title || ""
      : data.title || "";
  // 관광공사 명칭이 통계명과 다를 때만 보조로 표시 (오매칭 상호는 숨김)
  const showApiTitle =
    apiTitle &&
    apiTitle.replace(/\s+/g, "") !== String(gem.resNm || "").replace(/\s+/g, "") &&
    (String(apiTitle).includes(String(gem.resNm || "").slice(0, 4)) ||
      String(gem.resNm || "").includes(String(apiTitle).slice(0, 4)));

  if (!data.found) {
    placeBody.innerHTML = `
      <div class="place-hero"><div class="place-hero-fallback">${escapeHtml(letter)}</div></div>
      <div class="place-content">
        <div>
          <p class="place-kicker">${escapeHtml(location || (uiLang === "en" ? "Unknown" : "위치 미상"))}</p>
          <h2 class="place-title">${escapeHtml(displayGemName(gem))}</h2>
          <div class="place-stats">
            ${visitorStatsHtml(gem)}
          </div>
        </div>
        <p class="nearby-empty">${escapeHtml(
          (uiLang === "en" && data.messageEn) || data.message || (uiLang === "en" ? "Details not found." : "상세 정보를 찾지 못했습니다.")
        )}</p>
        ${transitSectionHtml(data)}
      </div>`;
    bindTransitSection(gem, data);
    return;
  }

  const infoList = (data.info || [])
    .map((row) => {
      const label = uiLang === "en" && row.labelEn ? row.labelEn : row.label;
      const value = uiLang === "en" && row.valueEn ? row.valueEn : row.value;
      return `
      <li class="place-info-item">
        <span class="place-info-label">${escapeHtml(label)}</span>
        <span class="place-info-value">${escapeHtml(value)}</span>
      </li>`;
    })
    .join("");

  const overview =
    uiLang === "en" && data.overviewEn ? data.overviewEn : data.overview || "";
  const showMore = overview.length > 220;
  const addr =
    uiLang === "en" && data.addrEn ? data.addrEn : data.addr || "";

  placeBody.innerHTML = `
    <div class="place-hero">
      ${
        heroImg
          ? `<img src="${escapeHtml(heroImg)}" alt="" data-fallback="${escapeHtml(letter)}" onerror="this.outerHTML='<div class=place-hero-fallback>'+this.dataset.fallback+'</div>'" />`
          : `<div class="place-hero-fallback">${escapeHtml(letter)}</div>`
      }
    </div>
    <div class="place-content">
      <header>
        <p class="place-kicker">${escapeHtml(addr || location || "")}</p>
        <h2 class="place-title">${escapeHtml(title)}</h2>
        ${
          showApiTitle
            ? `<p class="place-api-title">${escapeHtml(apiTitle)}</p>`
            : ""
        }
        <div class="place-stats">
          ${visitorStatsHtml(gem)}
        </div>
      </header>

      <section>
        <h3 class="place-section-title">${uiLang === "en" ? "About" : "소개"}</h3>
        ${
          overview
            ? `<p class="place-overview" id="placeOverview">${escapeHtml(overview)}</p>
               ${showMore ? `<button type="button" class="place-more" id="placeMoreBtn">${uiLang === "en" ? "More" : "더 보기"}</button>` : ""}`
            : `<p class="nearby-empty">${uiLang === "en" ? "No description." : "소개글이 없습니다."}</p>`
        }
      </section>

      <section>
        <h3 class="place-section-title">${uiLang === "en" ? "Visitor info" : "이용 정보"}</h3>
        ${
          infoList
            ? `<ul class="place-info-list">${infoList}</ul>`
            : `<p class="nearby-empty">${uiLang === "en" ? "No visitor info." : "이용 정보가 없습니다."}</p>`
        }
        ${
          data.homepage
            ? `<div class="place-links" style="margin-top:0.7rem">
                <a class="place-link" href="${escapeHtml(data.homepage)}" target="_blank" rel="noopener">${uiLang === "en" ? "Website" : "홈페이지"}</a>
              </div>`
            : ""
        }
      </section>

      ${transitSectionHtml(data)}

      <section>
        <h3 class="place-section-title">${uiLang === "en" ? "Nearby food" : "근처 맛집"}</h3>
        ${nearbyCardsHtml(data.restaurants)}
      </section>

      <section>
        <h3 class="place-section-title">${uiLang === "en" ? "Nearby spots" : "근처에 가볼 곳"}</h3>
        ${nearbyCardsHtml(data.attractions)}
      </section>
    </div>`;

  const moreBtn = document.getElementById("placeMoreBtn");
  const overviewEl = document.getElementById("placeOverview");
  if (moreBtn && overviewEl) {
    moreBtn.addEventListener("click", () => {
      const open = overviewEl.classList.toggle("expanded");
      moreBtn.textContent = open
        ? uiLang === "en"
          ? "Less"
          : "접기"
        : uiLang === "en"
          ? "More"
          : "더 보기";
    });
  }
  bindNearbyCards();
  bindTransitSection(gem, data);
}

function transitSectionHtml() {
  return `
      <section class="place-transit-section">
        <h3 class="place-section-title">${uiLang === "en" ? "Directions" : "길찾기"}</h3>
        <div class="place-transit-actions">
          <button type="button" class="btn-primary" id="transitGpsBtn">${
            uiLang === "en" ? "From my location" : "내 위치에서"
          }</button>
        </div>
        <p id="transitStatus" class="place-transit-status" hidden></p>
        <div id="transitResult" class="transit-result" hidden></div>
      </section>`;
}

let publicConfigPromise = null;
let kakaoMapsLoadPromise = null;

async function fetchPublicConfig() {
  if (!publicConfigPromise) {
    publicConfigPromise = (async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.odsayApiKey || data.kakaoJsKey || data.naverClientId) return data;
        }
      } catch {
        /* 예전 서버는 /api/config 없음 → 정적 파일로 폴백 */
      }
      const res2 = await fetch("/config.json");
      if (!res2.ok) throw new Error("config missing");
      return res2.json();
    })().catch((err) => {
      console.warn(err);
      publicConfigPromise = null;
      return { kakaoJsKey: "", odsayApiKey: "", naverClientId: "", configMissing: true };
    });
  }
  return publicConfigPromise;
}

function loadKakaoMapsSdk(appKey) {
  if (!appKey) {
    return Promise.reject(new Error("카카오맵 JS 키가 없습니다."));
  }
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao.maps.load(() => resolve()));
  }
  if (kakaoMapsLoadPromise) return kakaoMapsLoadPromise;
  kakaoMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("카카오맵 SDK 로드 실패"));
        return;
      }
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("카카오맵 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
  return kakaoMapsLoadPromise;
}

let naverMapsLoadPromise = null;

function loadNaverMapsSdk(clientId) {
  if (!clientId) {
    return Promise.reject(new Error("네이버 지도 Client ID가 없습니다."));
  }
  if (window.naver?.maps) return Promise.resolve();
  if (naverMapsLoadPromise) return naverMapsLoadPromise;
  naverMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => {
      if (!window.naver?.maps) {
        reject(new Error("네이버 지도 SDK 로드 실패"));
        return;
      }
      resolve();
    };
    script.onerror = () => {
      naverMapsLoadPromise = null;
      reject(new Error("네이버 지도 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return naverMapsLoadPromise;
}

async function fetchCourseRoute(spots) {
  const payload = {
    spots: (spots || []).map((s) => ({
      title: s.locationTitle || s.title || "",
      locationTitle: s.locationTitle || "",
      address: s.address || "",
      sido: s.sido || "",
      resNm: s.resNm || "",
    })),
  };
  const res = await fetch("/api/course-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "경로를 만들지 못했습니다.");
  return data;
}

function renderCourseNaverMap(container, route) {
  const found = (route.spots || []).filter((s) => s.found && Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (!found.length) {
    throw new Error(uiLang === "en" ? "Could not locate places on the map." : "지도에 표시할 좌표를 찾지 못했습니다.");
  }
  const center = new naver.maps.LatLng(found[0].lat, found[0].lng);
  const map = new naver.maps.Map(container, {
    center,
    zoom: 12,
    zoomControl: true,
    zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
  });
  const bounds = new naver.maps.LatLngBounds(center, center);
  found.forEach((s) => {
    const pos = new naver.maps.LatLng(s.lat, s.lng);
    bounds.extend(pos);
    new naver.maps.Marker({
      position: pos,
      map,
      title: s.title || `${s.seq}`,
      icon: {
        content: `<div class="course-map-pin"><span>${s.seq}</span></div>`,
        anchor: new naver.maps.Point(14, 14),
      },
    });
  });
  const pathPts = (route.path || [])
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map((p) => new naver.maps.LatLng(p[0], p[1]));
  if (pathPts.length >= 2) {
    new naver.maps.Polyline({
      map,
      path: pathPts,
      strokeColor: "#1a1a1a",
      strokeWeight: 4,
      strokeOpacity: 0.85,
      strokeStyle: "solid",
    });
    pathPts.forEach((p) => bounds.extend(p));
  } else if (found.length >= 2) {
    new naver.maps.Polyline({
      map,
      path: found.map((s) => new naver.maps.LatLng(s.lat, s.lng)),
      strokeColor: "#1a1a1a",
      strokeWeight: 3,
      strokeOpacity: 0.7,
      strokeStyle: "shortdash",
    });
  }
  if (found.length > 1 || pathPts.length > 1) {
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }
  return map;
}

async function openCourseMap() {
  if (!currentCourse?.spots?.length) {
    alert(uiLang === "en" ? "No places in this course." : "코스에 장소가 없습니다.");
    return;
  }
  const box = document.querySelector(
    courseDetailCtx === "public"
      ? "#courseDetailBodyPublic .course-map-box"
      : "#courseDetailBody .course-map-box"
  );
  const status = document.getElementById(
    courseDetailCtx === "public" ? "courseMapStatusPublic" : "courseMapStatus"
  );
  const canvas = document.getElementById(
    courseDetailCtx === "public" ? "courseMapCanvasPublic" : "courseMapCanvas"
  );
  const btn = document.getElementById(
    courseDetailCtx === "public" ? "courseMapBtnPublic" : "courseMapBtn"
  );
  if (!box || !canvas) return;
  if (status) {
    status.hidden = false;
    status.textContent = uiLang === "en" ? "Building route…" : "경로 연결 중…";
  }
  if (btn) btn.disabled = true;
  try {
    const cfg = await fetchPublicConfig();
    if (!cfg.naverClientId) {
      throw new Error(
        cfg.configMissing
          ? "서버를 재시작한 뒤 다시 시도해 주세요."
          : "네이버 지도 Client ID가 없습니다."
      );
    }
    const [route] = await Promise.all([
      fetchCourseRoute(currentCourse.spots),
      loadNaverMapsSdk(cfg.naverClientId),
    ]);
    canvas.hidden = false;
    canvas.innerHTML = "";
    renderCourseNaverMap(canvas, route);
    const missed = (route.spots || []).filter((s) => !s.found).map((s) => s.title || s.query);
    if (status) {
      if (missed.length) {
        status.textContent =
          (uiLang === "en" ? "Some places not found: " : "일부 장소를 찾지 못함: ") +
          missed.join(", ");
      } else {
        status.hidden = true;
        status.textContent = "";
      }
    }
    box.classList.add("is-open");
  } catch (err) {
    if (status) {
      status.hidden = false;
      status.textContent = err.message || "지도 오류";
    } else {
      alert(err.message || "지도 오류");
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentPositionGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(uiLang === "en" ? "Geolocation is not supported." : "이 브라우저는 위치 정보를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        let msg = uiLang === "en" ? "Could not get location." : "위치를 가져오지 못했습니다.";
        if (err?.code === 1) msg = uiLang === "en" ? "Location permission denied." : "위치 권한이 거부되었습니다.";
        else if (err?.code === 2) msg = uiLang === "en" ? "Location unavailable." : "위치를 확인할 수 없습니다.";
        else if (err?.code === 3) msg = uiLang === "en" ? "Location request timed out." : "위치 요청 시간이 초과되었습니다.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

function geocodePlaceWithKakao(query) {
  return new Promise((resolve, reject) => {
    if (!window.kakao?.maps?.services) {
      reject(new Error("geocoder unavailable"));
      return;
    }
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        return;
      }
      const places = new kakao.maps.services.Places();
      places.keywordSearch(query, (res2, st2) => {
        if (st2 === kakao.maps.services.Status.OK && res2[0]) {
          resolve({ lat: Number(res2[0].y), lng: Number(res2[0].x) });
        } else {
          reject(new Error(uiLang === "en" ? "Could not find destination." : "도착지 좌표를 찾지 못했습니다."));
        }
      });
    });
  });
}

async function resolveDestCoords(gem, data) {
  const lng = Number(data.mapx);
  const lat = Number(data.mapy);
  if (Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0) {
    return { lat, lng };
  }
  const cfg = await fetchPublicConfig();
  await loadKakaoMapsSdk(cfg.kakaoJsKey || "");
  const q = [gem.sido, gem.gungu, gem.resNm || data.title || data.addr]
    .filter(Boolean)
    .join(" ");
  if (!q.trim()) {
    throw new Error(uiLang === "en" ? "Destination coordinates unavailable." : "도착지 좌표가 없습니다.");
  }
  return geocodePlaceWithKakao(q.trim());
}

function bindTransitSection(gem, data) {
  const btn = document.getElementById("transitGpsBtn");
  const statusEl = document.getElementById("transitStatus");
  if (!btn || !statusEl) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = uiLang === "en" ? "Finding route…" : "경로 찾는 중…";
    try {
      const origin = await getCurrentPositionGps();
      const dest = await resolveDestCoords(gem, data);
      const cfg = await fetchPublicConfig();
      if (cfg.odsayApiKey) {
        const odsay = await searchOdsayTransit(origin, dest, cfg.odsayApiKey);
        renderOdsayTransit(odsay);
      } else if (cfg.configMissing) {
        statusEl.textContent = "서버를 재시작한 뒤 다시 시도해 주세요.";
      } else {
        statusEl.textContent = uiLang === "en" ? "No route." : "경로를 찾지 못했습니다.";
      }
    } catch (err) {
      statusEl.hidden = false;
      statusEl.textContent = err.message || (uiLang === "en" ? "Failed." : "실패했습니다.");
    } finally {
      btn.disabled = false;
    }
  });
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = `__odsay_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("ODsay 응답 시간 초과"));
    }, 12000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    const script = document.createElement("script");
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    script.onerror = () => {
      cleanup();
      reject(new Error("ODsay 호출 실패"));
    };
    document.head.appendChild(script);
  });
}

async function odsayCall(origin, dest, apiKey, extra = {}) {
  const params = new URLSearchParams({
    apiKey,
    SX: String(origin.lng),
    SY: String(origin.lat),
    EX: String(dest.lng),
    EY: String(dest.lat),
    lang: uiLang === "en" ? "1" : "0",
    SearchPathType: "0",
  });
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && v !== "") params.set(k, String(v));
  }
  const url = `https://api.odsay.com/v1/api/searchPubTransPathT?${params}`;
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch {
    /* CORS 시 JSONP */
  }
  return jsonp(url);
}

function odsayPoint(sp, which) {
  if (!sp) return null;
  const lng = Number(which === "start" ? sp.startX : sp.endX);
  const lat = Number(which === "start" ? sp.startY : sp.endY);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng === 0 || lat === 0) return null;
  return {
    lng,
    lat,
    name: which === "start" ? sp.startName : sp.endName,
  };
}

function odsayIsLongHaul(sp) {
  const t = Number(sp?.trafficType);
  return t === 4 || t === 5 || t === 6 || t === 7;
}

async function searchOdsayTransit(origin, dest, apiKey) {
  const data = await odsayCall(origin, dest, apiKey);
  const paths = data?.result?.path;
  if (!paths?.length) return data;

  const shown = paths.slice(0, 8);
  const cityCache = new Map();
  const cityLeg = async (from, to) => {
    const key = `${from.lng.toFixed(4)},${from.lat.toFixed(4)}>${to.lng.toFixed(4)},${to.lat.toFixed(4)}`;
    if (!cityCache.has(key)) {
      cityCache.set(
        key,
        odsayCall(from, to, apiKey, { SearchType: "0" }).catch(() => null)
      );
    }
    const res = await cityCache.get(key);
    return res?.result?.path?.[0] || null;
  };

  await Promise.all(
    shown.map(async (path) => {
      const rides = (path.subPath || []).filter((sp) => Number(sp.trafficType) !== 3);
      const hasLong = rides.some(odsayIsLongHaul);
      if (!hasLong) return;
      const first = rides[0];
      const last = rides[rides.length - 1];
      const board = odsayPoint(first, "start");
      const alight = odsayPoint(last, "end");
      const jobs = [];
      if (board && haversineKm(origin.lat, origin.lng, board.lat, board.lng) > 0.7) {
        jobs.push(
          cityLeg(origin, board).then((leg) => {
            if (leg) {
              path._firstMile = leg;
              path._boardName = board.name;
            } else {
              path._incomplete = true;
            }
          })
        );
      }
      if (alight && haversineKm(alight.lat, alight.lng, dest.lat, dest.lng) > 0.7) {
        jobs.push(
          cityLeg(alight, dest).then((leg) => {
            if (leg) {
              path._lastMile = leg;
              path._alightName = alight.name;
            } else {
              path._incomplete = true;
            }
          })
        );
      }
      await Promise.all(jobs);
    })
  );
  data.result.path = shown.filter((p) => !p._incomplete);
  return data;
}

function odsayBusTypeLabel(type) {
  const n = Number(type);
  const map = {
    1: "일반",
    2: "좌석",
    3: "마을",
    4: "직행좌석",
    5: "공항",
    6: "간선급행",
    10: "외곽",
    11: "간선",
    12: "지선",
    13: "순환",
    14: "광역",
    15: "급행",
    20: "농어촌",
    21: "제주",
    22: "경기광역",
    26: "급행간선",
  };
  return map[n] || "";
}

function odsayTrainName(sp) {
  const code = Number(sp.trainType ?? sp.trafficSubType);
  const map = {
    1: "KTX",
    2: "새마을",
    3: "무궁화",
    4: "누리로",
    5: "통근열차",
    6: "ITX",
    7: "ITX-청춘",
    8: "SRT",
  };
  return map[code] || "";
}

function odsayKind(sp) {
  const t = Number(sp.trafficType);
  if (t === 1) return { kind: uiLang === "en" ? "Subway" : "지하철", badge: "subway" };
  if (t === 2) return { kind: uiLang === "en" ? "Bus" : "버스", badge: "bus" };
  if (t === 3) return { kind: uiLang === "en" ? "Walk" : "도보", badge: "walk" };
  if (t === 4) {
    const train = odsayTrainName(sp);
    return { kind: train || (uiLang === "en" ? "Train" : "열차"), badge: "train" };
  }
  if (t === 5) return { kind: uiLang === "en" ? "Express bus" : "고속버스", badge: "bus" };
  if (t === 6) return { kind: uiLang === "en" ? "Intercity bus" : "시외버스", badge: "bus" };
  if (t === 7) return { kind: uiLang === "en" ? "Flight" : "항공", badge: "train" };
  return { kind: uiLang === "en" ? "Transit" : "이동", badge: "walk" };
}

function odsayRideTitle(sp) {
  const t = Number(sp.trafficType);
  const lanes = Array.isArray(sp.lane) ? sp.lane : sp.lane ? [sp.lane] : [];
  const first = lanes[0] || {};
  const no = String(first.busNo || first.busNoKor || "").trim();
  const nm = String(first.name || "").trim();
  if (t === 1) return uiLang === "en" ? "Subway" : "지하철";
  if (t === 2) {
    const kind = odsayBusTypeLabel(first.type);
    return !kind || kind === "일반" ? (uiLang === "en" ? "Bus" : "시내버스") : kind;
  }
  if (t === 4) return odsayTrainName(sp) || (uiLang === "en" ? "Train" : "열차");
  if (t === 5) return no ? `${uiLang === "en" ? "Express" : "고속버스"} ${no}` : uiLang === "en" ? "Express bus" : "고속버스";
  if (t === 6) return no ? `${uiLang === "en" ? "Intercity" : "시외버스"} ${no}` : uiLang === "en" ? "Intercity bus" : "시외버스";
  if (t === 7) return uiLang === "en" ? "Flight" : "항공";
  return odsayKind(sp).kind;
}

function odsayPillText(sp) {
  const t = Number(sp.trafficType);
  const lanes = Array.isArray(sp.lane) ? sp.lane : sp.lane ? [sp.lane] : [];
  const first = lanes[0] || {};
  const no = String(first.busNo || first.busNoKor || "").trim();
  if (no) return no;
  const nm = String(first.name || "").trim();
  if (t === 1 && nm) {
    const line = nm.match(/(\d+)\s*호선/);
    if (line) return line[1];
    return nm.replace(/^수도권\s*/, "").replace(/호선$/, "") || nm;
  }
  if (t === 4) return odsayTrainName(sp) || "열차";
  if (t === 5) return "고속";
  if (t === 6) return "시외";
  if (t === 7) return "항공";
  return odsayKind(sp).kind;
}

function odsayPillColor(sp) {
  const t = Number(sp.trafficType);
  if (t === 2 || t === 5 || t === 6) return "#3b82f6";
  if (t === 4 || t === 7) return "#db2777";
  if (t !== 1) return "#6b7280";
  const nm = String((Array.isArray(sp.lane) ? sp.lane[0] : sp.lane)?.name || "");
  const colors = [
    ["1호선", "#0052a4"],
    ["2호선", "#00a84d"],
    ["3호선", "#ef7c1c"],
    ["4호선", "#00a5de"],
    ["5호선", "#996cac"],
    ["6호선", "#cd7c2f"],
    ["7호선", "#747f00"],
    ["8호선", "#e6186c"],
    ["9호선", "#bdb092"],
    ["신분당", "#d31145"],
    ["경의", "#77c4a3"],
    ["수인", "#f5a200"],
    ["분당", "#f5a200"],
    ["경춘", "#0c8e72"],
    ["공항", "#0090d2"],
    ["신림", "#6789ca"],
    ["우이", "#b7c452"],
  ];
  const hit = colors.find(([k]) => nm.includes(k));
  return hit ? hit[1] : "#16a34a";
}

function odsayMidStops(sp) {
  const raw = sp.passStopList?.stations || (Array.isArray(sp.passStopList) ? sp.passStopList : []);
  const names = raw.map((s) => s.stationName || s.stationNm || s.name).filter(Boolean);
  if (names.length >= 3) return names.slice(1, -1);
  return [];
}

function odsayAllSubPaths(path) {
  return [
    ...(path._firstMile?.subPath || []),
    ...(path.subPath || []),
    ...(path._lastMile?.subPath || []),
  ];
}

function odsayPathTime(path) {
  const legs = odsayAllSubPaths(path).reduce((s, sp) => s + (Number(sp.sectionTime) || 0), 0);
  if (legs) return legs;
  return (
    (Number(path.info?.totalTime) || 0) +
    (Number(path._firstMile?.info?.totalTime) || 0) +
    (Number(path._lastMile?.info?.totalTime) || 0)
  );
}

function odsayPathHasLongHaul(path) {
  return odsayAllSubPaths(path).some(odsayIsLongHaul);
}

/** 시내 구간만 (KTX·시외는 ODsay 요금이 부정확해서 제외) */
function odsayCityPayment(path) {
  if (odsayPathHasLongHaul(path)) {
    return (
      (Number(path._firstMile?.info?.payment) || 0) +
      (Number(path._lastMile?.info?.payment) || 0)
    );
  }
  return (
    (Number(path.info?.payment) || 0) +
    (Number(path._firstMile?.info?.payment) || 0) +
    (Number(path._lastMile?.info?.payment) || 0)
  );
}

/** 경로 탭/요약 — 시간은 항상, 금액은 시내만 있을 때만 */
function odsayPathHeadline(path) {
  if (path._incomplete) return "";
  const time = odsayPathTime(path);
  if (!time) return "";
  if (odsayPathHasLongHaul(path)) return `${time}분`;
  const pay = odsayCityPayment(path);
  return pay ? `${time}분 · ${pay.toLocaleString("ko-KR")}원` : `${time}분`;
}

function odsayPathFareNote(path) {
  if (!odsayPathHasLongHaul(path)) return "";
  const city = odsayCityPayment(path);
  if (city) {
    return uiLang === "en"
      ? `Local transit ~${city.toLocaleString("ko-KR")}₩ · train/coach sold separately`
      : `시내 약 ${city.toLocaleString("ko-KR")}원 · KTX·시외는 별도 예매`;
  }
  return uiLang === "en"
    ? "Train and coach tickets sold separately"
    : "KTX·시외 요금은 별도 예매";
}

function odsayWalkHtml(sp) {
  const min = Number(sp.sectionTime) || 0;
  if (min <= 0) return "";
  return `<li class="transit-walk">${uiLang === "en" ? "Walk" : "도보"} ${min}분</li>`;
}

function odsayRideHtml(sp) {
  const min = Number(sp.sectionTime) || 0;
  const from = sp.startName || "";
  const to = sp.endName || "";
  const mids = odsayMidStops(sp);
  const color = odsayPillColor(sp);
  const stopWord = Number(sp.trafficType) === 1
    ? uiLang === "en" ? "stations" : "개 역"
    : uiLang === "en" ? "stops" : "개 정류장";
  const expandLabel = uiLang === "en"
    ? `${mids.length} ${stopWord}`
    : `${mids.length}${stopWord}`;
  return `<li class="transit-card">
    <div class="transit-card-head">
      <span class="transit-num" style="background:${color}">${escapeHtml(odsayPillText(sp))}</span>
      <span class="transit-mode">${escapeHtml(odsayRideTitle(sp))}</span>
      ${min ? `<span class="transit-min">${min}분</span>` : ""}
    </div>
    <div class="transit-io">
      <p class="transit-stop board">${escapeHtml(from || "—")}</p>
      ${
        mids.length
          ? `<button type="button" class="transit-stop-toggle" aria-expanded="false" data-label="${escapeHtml(expandLabel)}">${expandLabel} ▾</button>
      <ul class="transit-stop-list" hidden>${mids.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`
          : ""
      }
      <p class="transit-stop alight">${escapeHtml(to || "—")}</p>
    </div>
  </li>`;
}

function odsayLegHtml(sp) {
  return Number(sp.trafficType) === 3 ? odsayWalkHtml(sp) : odsayRideHtml(sp);
}

function odsayPathCard(path, idx, hidden) {
  const legs = odsayAllSubPaths(path).map(odsayLegHtml).filter(Boolean).join("");
  const note = odsayPathFareNote(path);
  return `<article class="transit-path" data-idx="${idx}"${hidden ? " hidden" : ""}>
    <ol class="transit-timeline">${legs}</ol>
    ${note ? `<p class="transit-fare-note">${escapeHtml(note)}</p>` : ""}
  </article>`;
}

function bindTransitToggles(listEl) {
  if (listEl.dataset.transitBound) return;
  listEl.dataset.transitBound = "1";
  listEl.addEventListener("click", (e) => {
    const alt = e.target.closest(".transit-alt");
    if (alt && listEl.contains(alt)) {
      const idx = alt.dataset.idx;
      listEl.querySelectorAll(".transit-alt").forEach((b) => b.classList.toggle("active", b === alt));
      listEl.querySelectorAll(".transit-path").forEach((p) => {
        p.hidden = p.dataset.idx !== idx;
      });
      return;
    }
    const tog = e.target.closest(".transit-stop-toggle");
    if (!tog || !listEl.contains(tog)) return;
    const list = tog.nextElementSibling;
    if (!list || !list.classList.contains("transit-stop-list")) return;
    const open = list.hidden;
    list.hidden = !open;
    tog.setAttribute("aria-expanded", String(open));
    const label = tog.dataset.label || "";
    tog.textContent = open ? `${label} ▴` : `${label} ▾`;
  });
}

function renderOdsayTransit(data) {
  const statusEl = document.getElementById("transitStatus");
  const listEl = document.getElementById("transitResult");
  if (!statusEl) return;
  const err = data?.error;
  if (err) {
    const first = Array.isArray(err) ? err[0] : err;
    statusEl.hidden = false;
    statusEl.textContent = first?.msg || first?.message || "경로를 찾지 못했습니다.";
    return;
  }
  const paths = (data?.result?.path || []).filter((p) => !p._incomplete);
  if (!paths.length) {
    statusEl.hidden = false;
    statusEl.textContent = uiLang === "en" ? "No route." : "경로를 찾지 못했습니다.";
    return;
  }
  statusEl.hidden = true;
  statusEl.textContent = "";
  if (!listEl) return;
  const shown = paths.slice(0, 3);
  const alts =
    shown.length > 1
      ? `<div class="transit-alts">${shown
          .map((p, i) => {
            const label = odsayPathHeadline(p);
            return `<button type="button" class="transit-alt${i === 0 ? " active" : ""}" data-idx="${i}">${label}</button>`;
          })
          .join("")}</div>`
      : odsayPathHeadline(shown[0])
        ? `<p class="transit-total">${odsayPathHeadline(shown[0])}</p>`
        : "";
  listEl.hidden = false;
  listEl.innerHTML =
    alts + shown.map((p, i) => odsayPathCard(p, i, i !== 0)).join("");
  bindTransitToggles(listEl);
}

let myView = "posts"; // posts | liked | courses
/** @type {object|null} */
let currentCourse = null;
/** @type {number|null} */
let editingCourseId = null;
/** @type {object|null} 현재 열린 AI 장소 */
let currentPlaceGem = null;
/** @type {object|null} 현재 열린 AI 장소 상세 */
let currentPlaceData = null;
/** @type {object|null} 담기 대기 중인 장소 (새 플리 만들 때) */
let pendingCourseSpot = null;

function boardThumb(post) {
  const letter = (post.locationTitle || post.nickname || "?").charAt(0);
  if (post.imageUrl) {
    return `<img src="${escapeHtml(post.imageUrl)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.querySelector('.thumb-fallback')?.removeAttribute('hidden')" /><span class="thumb-letter thumb-fallback" hidden>${escapeHtml(letter)}</span>`;
  }
  return `<span class="thumb-letter">${escapeHtml(letter)}</span>`;
}

function boardCategoryForTab(tabId) {
  return tabId === "foreign" ? "FOREIGN" : "DOMESTIC";
}

function parseServerDate(regDate, regAt) {
  if (typeof regAt === "number" && Number.isFinite(regAt)) return regAt;
  if (regAt != null && regAt !== "" && !Number.isNaN(Number(regAt))) return Number(regAt);
  if (!regDate) return NaN;
  let s = String(regDate).trim().replace(" ", "T").replace(/\.\d+$/, "");
  // DB DATETIME은 UTC 저장 — 오프셋 없으면 UTC(Z)로 해석
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    s += "Z";
  }
  return Date.parse(s);
}

function formatRelativeTime(regDate, regAt) {
  if (!regDate && (regAt == null || regAt === "")) return "";
  const t = parseServerDate(regDate, regAt);
  if (Number.isNaN(t)) return String(regDate || "").slice(0, 16);
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일`;
  return formatKoreanDate(regDate, regAt);
}

function formatKoreanDate(regDate, regAt) {
  const t = parseServerDate(regDate, regAt);
  if (Number.isNaN(t)) return String(regDate || "").slice(0, 16);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(t));
}

function categoryLabel(cat) {
  return cat === "FOREIGN" ? "외국인" : "내국인";
}

function threadCardHtml(p, { showCategory = false } = {}) {
  const name = p.nickname || p.memberId || "익명";
  const letter = String(name).charAt(0);
  const locationTitle = postField(p, "locationTitle");
  const address = postField(p, "address");
  const content = postField(p, "content");
    const place = locationTitle
    ? `<span class="thread-place">${escapeHtml(locationTitle)}${address ? ` · ${escapeHtml(address)}` : ""}</span>`
    : address
      ? `<span class="thread-place">${escapeHtml(address)}</span>`
      : "";
  const media = p.imageUrl
    ? `<div class="thread-media"><img src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" /></div>`
    : "";
  const cat = showCategory
    ? `<span class="thread-cat">${escapeHtml(categoryLabel(p.category))}</span>`
    : "";
  const avatarInner = p.profileImage
    ? `<img src="${escapeHtml(p.profileImage)}" alt="" data-letter="${escapeHtml(letter)}" onerror="this.parentNode.textContent=this.dataset.letter">`
    : escapeHtml(letter);
  const on = p.recommended ? "on" : "";
  return `
    <li class="thread-item" data-post-id="${p.postId}">
      <div class="thread-avatar" aria-hidden="true">${avatarInner}</div>
      <div class="thread-main">
        <div class="thread-head">
          <span class="thread-name">${escapeHtml(name)}</span>
          <span class="thread-handle">@${escapeHtml(p.memberId || "")}</span>
          <span class="thread-time">· ${escapeHtml(formatRelativeTime(p.regDate, p.regAt))}</span>
          ${cat}
        </div>
        ${place}
        <p class="thread-text">${escapeHtml(content || "")}</p>
        ${media}
        <div class="thread-actions">
          <button type="button" class="thread-action thread-rec ${on}" data-action="recommend" aria-label="recommend">
            ♥ ${Number(p.recommendCount) || 0}
          </button>
          <button type="button" class="thread-action" data-action="reply" aria-label="reply">
            💬 ${Number(p.replyCount) || 0}
          </button>
        </div>
      </div>
    </li>`;
}

function bindThreadFeed(listEl) {
  listEl.querySelectorAll(".thread-item").forEach((li) => {
    li.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      const postId = Number(li.dataset.postId);
      if (actionBtn?.dataset.action === "recommend") {
        e.preventDefault();
        e.stopPropagation();
        toggleRecommendFromFeed(postId, actionBtn);
        return;
      }
      openDetail(postId);
    });
  });
}

function renderBoardList(listEl, posts, opts = {}) {
  if (!posts.length) {
    listEl.innerHTML = `<li class="empty-state">${opts.emptyText || "아직 게시글이 없습니다. 글쓰기로 첫 글을 남겨 보세요."}</li>`;
    return;
  }

  const sortKey = opts.sortKey || "newest";
  const sorted = sortBoardPosts(posts, sortKey);

  // 마이 탭·추천/댓글순은 전체 순서가 보이도록 평탄 목록
  if (opts.flat || opts.showCategory || sortKey === "likes" || sortKey === "comments") {
    listEl.innerHTML = sorted.map((p) => threadCardHtml(p, opts)).join("");
    bindThreadFeed(listEl);
    return;
  }

  // 최신/오래된순: 도·시 그룹 유지, 그룹·글 모두 정렬
  const groups = groupPostsByAddress(sorted);
  const groupEntries = [...groups.entries()].map(([addr, items]) => [
    addr,
    sortBoardPosts(items, sortKey),
  ]);
  groupEntries.sort((a, b) => {
    const ta = postTimeMs(a[1][0] || {});
    const tb = postTimeMs(b[1][0] || {});
    return sortKey === "oldest" ? ta - tb : tb - ta;
  });

  const parts = [];
  for (const [addr, items] of groupEntries) {
    parts.push(`
      <li class="addr-group">
        <h3 class="addr-group-title">${escapeHtml(addr)}</h3>
        <ul class="addr-group-list">
          ${items.map((p) => threadCardHtml(p, opts)).join("")}
        </ul>
      </li>`);
  }
  listEl.innerHTML = parts.join("");
  bindThreadFeed(listEl);
}

function boardFilterEls(tabId) {
  const isForeign = tabId === "foreign";
  return {
    sidoSelect: document.getElementById(isForeign ? "sidoFilterForeign" : "sidoFilterDomestic"),
    searchInput: document.getElementById(isForeign ? "boardSearchForeign" : "boardSearchDomestic"),
    sortSelect: document.getElementById(isForeign ? "boardSortForeign" : "boardSortDomestic"),
  };
}

function postTimeMs(p) {
  const t = parseServerDate(p.regDate, p.regAt);
  return Number.isNaN(t) ? 0 : t;
}

function sortBoardPosts(posts, sortKey) {
  const list = (posts || []).slice();
  switch (sortKey) {
    case "oldest":
      list.sort((a, b) => postTimeMs(a) - postTimeMs(b) || (a.postId || 0) - (b.postId || 0));
      break;
    case "likes":
      list.sort(
        (a, b) =>
          (Number(b.recommendCount) || 0) - (Number(a.recommendCount) || 0) ||
          postTimeMs(b) - postTimeMs(a)
      );
      break;
    case "comments":
      list.sort(
        (a, b) =>
          (Number(b.replyCount) || 0) - (Number(a.replyCount) || 0) ||
          postTimeMs(b) - postTimeMs(a)
      );
      break;
    case "newest":
    default:
      list.sort((a, b) => postTimeMs(b) - postTimeMs(a) || (b.postId || 0) - (a.postId || 0));
  }
  return list;
}

function groupPostsByAddress(posts) {
  const groups = new Map();
  for (const p of posts) {
    const key = (p.address || "").trim() || "(지역 미지정)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return groups;
}

async function toggleRecommendFromFeed(postId, btn) {
  if (!requireLogin("추천은 로그인 후 이용할 수 있습니다.")) return;
  try {
    const res = await fetch(`/api/posts/${postId}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "추천 실패");
    btn.classList.toggle("on", !!data.recommended);
    btn.innerHTML = `♥ ${Number(data.recommendCount) || 0}`;
    const cached = boardPosts.find((p) => p.postId === postId);
    if (cached) {
      cached.recommended = !!data.recommended;
      cached.recommendCount = Number(data.recommendCount) || 0;
    }
    if (currentDetail?.postId === postId) {
      currentDetail.recommended = !!data.recommended;
      currentDetail.recommendCount = Number(data.recommendCount) || 0;
      renderDetail();
    }
  } catch (err) {
    alert(err.message || "추천 실패");
  }
}

function postMatchesSido(post, sido) {
  if (!sido) return true;
  const addr = String(post.address || "").trim();
  if (!addr) return false;
  if (addr === sido) return true;
  if (addr.startsWith(sido)) return true;
  // 예전 자유입력 주소: "제주특별자치도 제주시 …" / "충북 …" 등
  if (addr.includes(sido)) return true;
  const aliases = SIDO_ALIASES[sido];
  if (aliases) {
    return aliases.some((a) => addr === a || addr.startsWith(a) || addr.includes(a));
  }
  return false;
}

function postMatchesPlaceName(post, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  const title = String(post.locationTitle || "").toLowerCase();
  const titleEn = String(post._en?.locationTitle || "").toLowerCase();
  return title.includes(needle) || titleEn.includes(needle);
}

function filterBoardPosts(posts, sido, q) {
  return (posts || []).filter((p) => postMatchesSido(p, sido) && postMatchesPlaceName(p, q));
}

/** 시·도 표기 차이·옛 주소 호환 */
const SIDO_ALIASES = {
  강원특별자치도: ["강원도", "강원"],
  전북특별자치도: ["전라북도", "전북"],
  제주특별자치도: ["제주도", "제주"],
  세종특별자치시: ["세종시", "세종"],
  서울특별시: ["서울"],
  부산광역시: ["부산"],
  대구광역시: ["대구"],
  인천광역시: ["인천"],
  광주광역시: ["광주"],
  대전광역시: ["대전"],
  울산광역시: ["울산"],
  경기도: ["경기"],
  충청북도: ["충북"],
  충청남도: ["충남"],
  전라남도: ["전남"],
  경상북도: ["경북"],
  경상남도: ["경남"],
};

async function loadBoardPosts(tabId = activeTab) {
  const category = boardCategoryForTab(tabId);
  const statusId = category === "FOREIGN" ? "boardStatusForeign" : "boardStatusDomestic";
  const listId = category === "FOREIGN" ? "boardListForeign" : "boardListDomestic";
  const statusElBoard = document.getElementById(statusId);
  const listEl = document.getElementById(listId);
  const { sidoSelect: boardSido, searchInput, sortSelect } = boardFilterEls(tabId);

  showStatus(statusElBoard, "피드를 불러오는 중…", "info");
  const qs = new URLSearchParams({
    memberId: currentMemberId(),
    category,
  });
  const sido = boardSido?.value?.trim() || "";
  const q = searchInput?.value?.trim() || "";
  const sortKey = sortSelect?.value || "newest";
  if (sido) qs.set("sido", sido);
  if (q) qs.set("q", q);

  try {
    const res = await fetch(`/api/posts?${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "게시글 조회 실패");
    // 서버 필터 + 클라이언트 필터(구버전 서버/옛 주소 호환)
    boardPosts = filterBoardPosts(data.posts || [], sido, q);
    if (uiLang === "en" && boardPosts.length) {
      showStatus(statusElBoard, t("translating"), "info");
      try {
        await translatePosts(boardPosts);
      } catch (err) {
        console.warn(err);
      }
    }
    hideStatus(statusElBoard);
    const emptyText =
      q || sido
        ? "해당 장소·지역의 게시글이 없습니다."
        : undefined;
    renderBoardList(listEl, boardPosts, { emptyText, sortKey });
  } catch (e) {
    showStatus(statusElBoard, e.message || "오류", "error");
  }
}

async function openDetail(postId) {
  const qs = `?memberId=${encodeURIComponent(currentMemberId())}`;
  try {
    const res = await fetch(`/api/posts/${postId}${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "조회 실패");
    currentDetail = data;
    if (uiLang === "en") {
      try {
        await translatePosts([currentDetail]);
        const replies = currentDetail.replies || [];
        const need = replies.filter((r) => !r._enContent && r.content);
        if (need.length) {
          const tr = await translateBatch(
            need.map((r) => r.content || ""),
            "EN"
          );
          need.forEach((r, i) => {
            r._enContent = tr[i] || r.content;
          });
        }
      } catch (err) {
        console.warn(err);
      }
    }
    renderDetail();
    detailDialog.showModal();
  } catch (e) {
    alert(e.message || "게시글을 열 수 없습니다.");
  }
}

function renderDetail() {
  const p = currentDetail;
  if (!p) return;
  const img = p.imageUrl
    ? `<div class="detail-image"><img src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" /></div>`
    : "";
  detailBody.innerHTML = `
    ${img}
    <h2 class="detail-title">${escapeHtml(postField(p, "locationTitle") || (uiLang === "en" ? "Untitled place" : "장소 미정"))}</h2>
    <p class="detail-meta">${escapeHtml(p.nickname || p.memberId)} · ${escapeHtml(formatKoreanDate(p.regDate || "", p.regAt))}</p>
    <p class="detail-meta">${escapeHtml(postField(p, "address") || "")}</p>
    <p class="detail-content">${escapeHtml(postField(p, "content") || "")}</p>
    <p class="detail-meta">${uiLang === "en" ? "Likes" : "추천"} ${p.recommendCount} · ${uiLang === "en" ? "Comments" : "댓글"} ${(p.replies || []).length}</p>
  `;
  recommendBtn.textContent = p.recommended
    ? `${uiLang === "en" ? "Unlike" : "추천 취소"} (${p.recommendCount})`
    : `${uiLang === "en" ? "Like" : "추천"} (${p.recommendCount})`;
  recommendBtn.classList.toggle("on", !!p.recommended);

  const isOwner = !!(currentUser && p.memberId && currentUser.memberId === p.memberId);
  editPostBtn.hidden = !isOwner;
  deletePostBtn.hidden = !isOwner;

  const replies = p.replies || [];
  replyList.innerHTML = replies.length
    ? replies
        .map(
          (r) => `
      <li class="reply-item">
        <strong>${escapeHtml(r.nickname || r.memberId)}</strong>
        ${escapeHtml((uiLang === "en" && r._enContent) || r.content || "")}
      </li>`
        )
        .join("")
    : `<li class="reply-item">${uiLang === "en" ? "No comments yet." : "아직 댓글이 없습니다."}</li>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refreshActiveFeed() {
  if (activeTab === "domestic" || activeTab === "foreign") {
    return loadBoardPosts(activeTab);
  }
  if (activeTab === "my") {
    return loadMyPage();
  }
  return Promise.resolve();
}

function switchTab(tabId) {
  activeTab = tabId;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  Object.entries(panels).forEach(([id, panel]) => {
    if (!panel) return;
    const isActive = id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
  if (tabId === "domestic" || tabId === "foreign") {
    loadBoardPosts(tabId);
  } else if (tabId === "my") {
    loadMyPage();
  } else if (tabId === "courses") {
    loadPublicCourses();
  } else if (tabId === "ai") {
    const key = aiCacheKey(sidoSelect?.value || "");
    if (aiGemsByKey.has(key)) {
      applyCachedAiGems(aiGemsByKey.get(key));
    } else {
      loadHiddenGems();
    }
  }
}

function resetWriteForm() {
  writeForm.reset();
  pendingImageDataUrl = null;
  editingPostId = null;
  existingImageUrl = "";
  removeExistingImage = false;
  writeImagePreview.hidden = true;
  writeImagePreview.innerHTML = "";
  writeError.hidden = true;
  if (writeTitle) writeTitle.textContent = "글쓰기";
  if (writeSubmit) writeSubmit.textContent = "등록";
  fillSidoSelect(document.getElementById("writeSido"), { includeAll: false, placeholder: "선택" });
}

function openWriteForEdit(post) {
  resetWriteForm();
  editingPostId = post.postId;
  existingImageUrl = post.imageUrl || "";
  if (writeTitle) writeTitle.textContent = "글 수정";
  if (writeSubmit) writeSubmit.textContent = "수정 저장";
  document.getElementById("writeCategory").value = post.category === "FOREIGN" ? "FOREIGN" : "DOMESTIC";
  document.getElementById("writeLocation").value = post.locationTitle || "";
  const writeSido = document.getElementById("writeSido");
  fillSidoSelect(writeSido, { includeAll: false, placeholder: "선택", selected: post.address || "" });
  if (writeSido && post.address) writeSido.value = post.address;
  document.getElementById("writeContent").value = post.content || "";
  if (existingImageUrl) {
    writeImagePreview.hidden = false;
    writeImagePreview.innerHTML = `
      <img src="${escapeHtml(existingImageUrl)}" alt="미리보기" />
      <button type="button" id="clearWriteImageBtn" class="btn-ghost" style="margin-top:0.4rem">사진 제거</button>`;
    document.getElementById("clearWriteImageBtn")?.addEventListener("click", () => {
      existingImageUrl = "";
      removeExistingImage = true;
      pendingImageDataUrl = null;
      writeImage.value = "";
      writeImagePreview.hidden = true;
      writeImagePreview.innerHTML = "";
    });
  }
  writeDialog.showModal();
}

/** 선택한 이미지를 JPEG data URL로 리사이즈 (업로드 용량 절약) */
function fileToCompressedDataUrl(file, maxSide = 960, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("이미지 파일만 올릴 수 있습니다."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 열지 못했습니다."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const scale = maxSide / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function readJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("서버를 재시작한 뒤 다시 시도해 주세요.");
  }
}

async function uploadImageDataUrl(dataUrl) {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: dataUrl, contentType: "image/jpeg" }),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "사진 업로드 실패");
  return data.url;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

sortSelect.addEventListener("change", () => {
  if (currentGems.length) renderGems(currentGems);
});

sidoSelect.addEventListener("change", () => {
  const gemSearch = document.getElementById("gemSearch");
  if (gemSearch) gemSearch.value = "";
  loadHiddenGems();
});

function wireBoardFilters(tabId) {
  const { sidoSelect: boardSido, searchInput, sortSelect } = boardFilterEls(tabId);
  const btn = document.getElementById(
    tabId === "foreign" ? "boardSearchBtnForeign" : "boardSearchBtnDomestic"
  );
  boardSido?.addEventListener("change", () => loadBoardPosts(tabId));
  sortSelect?.addEventListener("change", () => {
    if (!boardPosts.length) {
      loadBoardPosts(tabId);
      return;
    }
    const listId = tabId === "foreign" ? "boardListForeign" : "boardListDomestic";
    const listEl = document.getElementById(listId);
    const sido = boardSido?.value?.trim() || "";
    const q = searchInput?.value?.trim() || "";
    renderBoardList(listEl, boardPosts, {
      sortKey: sortSelect.value || "newest",
      emptyText: q || sido ? "해당 장소·지역의 게시글이 없습니다." : undefined,
    });
  });
  btn?.addEventListener("click", () => loadBoardPosts(tabId));
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadBoardPosts(tabId);
    }
  });
}
wireBoardFilters("domestic");
wireBoardFilters("foreign");

const gemSearchInput = document.getElementById("gemSearch");
const gemSearchBtn = document.getElementById("gemSearchBtn");
gemSearchBtn?.addEventListener("click", () => runGemSearch());
gemSearchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runGemSearch();
  }
});

authOpenBtn.addEventListener("click", () => openAuthDialog("login"));
logoutBtn.addEventListener("click", () => {
  saveUser(null);
});
document.getElementById("myAvatar")?.addEventListener("click", () => {
  if (!currentUser) {
    openAuthDialog("login");
    return;
  }
  document.getElementById("myAvatarInput")?.click();
});
document.getElementById("myAvatarInput")?.addEventListener("change", async (e) => {
  const input = e.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !currentUser) return;
  try {
    // 파일 디스크가 아닌 DB에 저장 → 나갔다 와도 / 서버 달라도 유지
    const dataUrl = await fileToCompressedDataUrl(file, 384, 0.7);
    await saveProfileImage(dataUrl);
  } catch (err) {
    alert(err.message || "프로필 사진을 올리지 못했습니다.");
  }
});
document.getElementById("myAvatarReset")?.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    await saveProfileImage("");
  } catch (err) {
    alert(err.message || "기본 사진으로 바꾸지 못했습니다.");
  }
});
authCancelBtn.addEventListener("click", () => {
  authError.hidden = true;
  authDialog.close();
});
document.querySelectorAll(".auth-mode").forEach((btn) => {
  btn.addEventListener("click", () => setAuthMode(btn.dataset.mode));
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const memberId = authMemberId.value.trim();
  const password = authPassword.value;
  const nickname = authNickname.value.trim();
  if (!memberId || !password) {
    authError.hidden = false;
    authError.textContent = "아이디와 비밀번호를 입력하세요.";
    return;
  }
  try {
    const endpoint = authMode === "register" ? "/api/register" : "/api/login";
    const payload =
      authMode === "register"
        ? { memberId, password, nickname }
        : { memberId, password };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "실패");
    saveUser({
      memberId: data.memberId,
      nickname: data.nickname || data.memberId,
      profileImage: data.profileImage || "",
    });
    authDialog.close();
  } catch (err) {
    authError.hidden = false;
    authError.textContent = err.message || "실패";
  }
});

writeBtn.addEventListener("click", () => {
  if (!requireLogin("글쓰기는 로그인 후 이용할 수 있습니다.")) return;
  resetWriteForm();
  const cat = document.getElementById("writeCategory");
  if (cat) {
    cat.value = activeTab === "foreign" ? "FOREIGN" : "DOMESTIC";
  }
  writeDialog.showModal();
});

writeCancelBtn.addEventListener("click", () => {
  resetWriteForm();
  writeDialog.close();
});

writeImage.addEventListener("change", async () => {
  writeError.hidden = true;
  pendingImageDataUrl = null;
  removeExistingImage = false;
  writeImagePreview.hidden = true;
  writeImagePreview.innerHTML = "";
  const file = writeImage.files?.[0];
  if (!file) return;
  try {
    pendingImageDataUrl = await fileToCompressedDataUrl(file);
    writeImagePreview.hidden = false;
    writeImagePreview.innerHTML = `<img src="${pendingImageDataUrl}" alt="미리보기" />`;
  } catch (err) {
    writeImage.value = "";
    writeError.hidden = false;
    writeError.textContent = err.message || "사진을 불러오지 못했습니다.";
  }
});

writeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireLogin("글쓰기는 로그인 후 이용할 수 있습니다.")) return;
  writeError.hidden = true;
  const category = document.getElementById("writeCategory")?.value || "DOMESTIC";
  const content = document.getElementById("writeContent").value.trim();
  const locationTitle = document.getElementById("writeLocation").value.trim();
  const address = document.getElementById("writeSido")?.value?.trim() || "";
  if (!locationTitle) {
    writeError.hidden = false;
    writeError.textContent = "장소명을 입력하세요.";
    return;
  }
  if (!address) {
    writeError.hidden = false;
    writeError.textContent = "도/시를 선택하세요.";
    return;
  }
  if (!content) {
    writeError.hidden = false;
    writeError.textContent = "내용을 입력하세요.";
    return;
  }

  const submitBtn = document.getElementById("writeSubmit");
  submitBtn.disabled = true;
  try {
    const payload = {
      memberId: currentMemberId(),
      locationTitle,
      address,
      content,
      category,
    };

    if (editingPostId) {
      if (pendingImageDataUrl) {
        payload.imageUrl = await uploadImageDataUrl(pendingImageDataUrl);
      } else if (removeExistingImage) {
        payload.imageUrl = "";
      }
      // imageUrl 미포함 = 기존 사진 유지
      const res = await fetch(`/api/posts/${editingPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정 실패");
      const savedId = editingPostId;
      writeDialog.close();
      resetWriteForm();
      detailDialog.close();
      const targetTab = category === "FOREIGN" ? "foreign" : "domestic";
      if (activeTab !== targetTab) switchTab(targetTab);
      else await loadBoardPosts(targetTab);
      await openDetail(savedId);
    } else {
      let imageUrl = "";
      if (pendingImageDataUrl) {
        imageUrl = await uploadImageDataUrl(pendingImageDataUrl);
      }
      payload.imageUrl = imageUrl;
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      writeDialog.close();
      resetWriteForm();
      const targetTab = category === "FOREIGN" ? "foreign" : "domestic";
      if (activeTab !== targetTab) switchTab(targetTab);
      else await loadBoardPosts(targetTab);
      if (data.postId) openDetail(data.postId);
    }
  } catch (err) {
    writeError.hidden = false;
    writeError.textContent = err.message || "저장 실패";
  } finally {
    submitBtn.disabled = false;
  }
});

editPostBtn.addEventListener("click", () => {
  if (!currentDetail) return;
  if (!requireLogin("로그인이 필요합니다.")) return;
  if (currentUser.memberId !== currentDetail.memberId) {
    alert("본인 글만 수정할 수 있습니다.");
    return;
  }
  openWriteForEdit(currentDetail);
});

deletePostBtn.addEventListener("click", async () => {
  if (!currentDetail) return;
  if (!requireLogin("로그인이 필요합니다.")) return;
  if (currentUser.memberId !== currentDetail.memberId) {
    alert("본인 글만 삭제할 수 있습니다.");
    return;
  }
  if (!confirm("이 게시글을 삭제할까요?")) return;
  try {
    const res = await fetch(`/api/posts/${currentDetail.postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "삭제 실패");
    detailDialog.close();
    currentDetail = null;
    await refreshActiveFeed();
  } catch (err) {
    alert(err.message || "삭제 실패");
  }
});
detailClose.addEventListener("click", () => {
  endCourseTour();
  detailDialog.close();
});
placeClose.addEventListener("click", () => {
  endCourseTour();
  placeDialog.close();
});

document.querySelectorAll(".tour-nav").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (btn.dataset.tourDir === "prev") courseTourPrev();
    else courseTourNext();
  });
});

resultsEl.addEventListener("click", (e) => {
  const li = e.target.closest(".gem-item");
  if (!li) return;
  const gem = currentGems.find((g) => gemKey(g) === li.dataset.key);
  if (gem) openPlaceDetail(gem);
});

resultsEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const li = e.target.closest(".gem-item");
  if (!li) return;
  e.preventDefault();
  const gem = currentGems.find((g) => gemKey(g) === li.dataset.key);
  if (gem) openPlaceDetail(gem);
});

recommendBtn.addEventListener("click", async () => {
  if (!currentDetail) return;
  if (!requireLogin("추천은 로그인 후 이용할 수 있습니다.")) return;
  try {
    const res = await fetch(`/api/posts/${currentDetail.postId}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "추천 실패");
    await openDetail(currentDetail.postId);
    await refreshActiveFeed();
  } catch (err) {
    alert(err.message || "추천 실패");
  }
});

replyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentDetail) return;
  if (!requireLogin("댓글은 로그인 후 이용할 수 있습니다.")) return;
  const content = replyInput.value.trim();
  if (!content) return;
  try {
    const res = await fetch(`/api/posts/${currentDetail.postId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId(), content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "댓글 등록 실패");
    replyInput.value = "";
    await openDetail(currentDetail.postId);
    await refreshActiveFeed();
  } catch (err) {
    alert(err.message || "댓글 등록 실패");
  }
});

document.querySelectorAll(".my-subtab").forEach((btn) => {
  btn.addEventListener("click", () => setMyView(btn.dataset.myView));
});

document.getElementById("courseListMy")?.addEventListener("click", (e) => {
  const add = e.target.closest("#courseAddBtn");
  if (add) {
    openCourseEditor();
    return;
  }
  const card = e.target.closest(".course-card[data-course-id]");
  if (card) openCourseDetail(Number(card.dataset.courseId), "my");
});

document.getElementById("courseListPublic")?.addEventListener("click", (e) => {
  const card = e.target.closest(".course-card[data-course-id]");
  if (card) openCourseDetail(Number(card.dataset.courseId), "public");
});

document.getElementById("courseDetailBackPublic")?.addEventListener("click", () => {
  clearCourseDetailPane("public");
});

document.getElementById("courseGoAiFromDetailBtn")?.addEventListener("click", () => goToAiForCourse());

document.getElementById("coursePublishBtn")?.addEventListener("click", async () => {
  closeCourseMoreMenu();
  if (!requireLogin() || !currentCourse) return;
  if (currentCourse.memberId !== currentMemberId()) return;
  try {
    const next = !currentCourse.isPublic;
    const res = await fetch(`/api/courses/${currentCourse.courseId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId(), public: next }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "공유 실패");
    currentCourse.isPublic = !!data.isPublic;
    const pubBtn = document.getElementById("coursePublishBtn");
    if (pubBtn)       pubBtn.textContent = currentCourse.isPublic ? "공유 취소" : "계획 공유에 올리기";
    alert(
      currentCourse.isPublic
        ? "계획 공유에 올렸습니다."
        : "계획 공유를 취소했습니다."
    );
    if (activeTab === "courses") loadPublicCourses();
  } catch (err) {
    alert(err.message || "공유 실패");
  }
});

document.getElementById("myStats")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".my-stat");
  if (!btn || !currentMemberId()) return;
  const kind = btn.dataset.stat;
  if (kind === "followers" || kind === "following") openFollowList(kind);
});

document.getElementById("followDialogClose")?.addEventListener("click", () => {
  document.getElementById("followDialog")?.close();
});

document.getElementById("courseCancelBtn")?.addEventListener("click", () => {
  pendingCourseSpot = null;
  document.getElementById("courseDialog")?.close();
});

document.getElementById("courseForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const errEl = document.getElementById("courseError");
  const title = document.getElementById("courseTitle")?.value?.trim() || "";
  const summary = document.getElementById("courseSummary")?.value?.trim() || "";
  if (errEl) errEl.hidden = true;
  if (!title) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = "제목을 입력하세요.";
    }
    return;
  }
  try {
    const payload = {
      memberId: currentMemberId(),
      title,
      summary,
      coverImage: pendingCourseSpot?.imageUrl || "",
      postIds: [],
    };
    const url = editingCourseId ? `/api/courses/${editingCourseId}` : "/api/courses";
    const res = await fetch(url, {
      method: editingCourseId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "저장 실패");
    const newId = data.courseId || editingCourseId;
    const toAdd = pendingCourseSpot;
    const wasEdit = !!editingCourseId;
    pendingCourseSpot = null;
    editingCourseId = null;
    if (toAdd && newId && !wasEdit) {
      await addSpotToCourse(newId, toAdd);
    }
    document.getElementById("courseDialog")?.close();
    myView = "courses";
    document.querySelectorAll(".my-subtab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.myView === myView);
    });
    await loadMyCourses();
    if (newId) await openCourseDetail(newId);
  } catch (err) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = err.message || "저장 실패";
    }
  }
});

document.getElementById("addToCourseClose")?.addEventListener("click", () => {
  document.getElementById("addToCourseDialog")?.close();
});

document.getElementById("addToCourseNew")?.addEventListener("click", () => {
  if (!pendingCourseSpot) return;
  document.getElementById("addToCourseDialog")?.close();
  openCourseEditor(null, { keepPending: true });
});

document.getElementById("addToCourseList")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-course-id]");
  if (!btn || !pendingCourseSpot) return;
  const courseId = Number(btn.dataset.courseId);
  try {
    await addSpotToCourse(courseId, pendingCourseSpot);
    pendingCourseSpot = null;
    document.getElementById("addToCourseDialog")?.close();
    alert(uiLang === "en" ? "Added to your trip plan." : "여행 계획에 담았습니다.");
    if (activeTab === "my" && myView === "courses") loadMyCourses();
  } catch (err) {
    alert(err.message || "담기 실패");
  }
});

document.getElementById("addPlaceToCourseBtn")?.addEventListener("click", () => {
  if (!requireLogin()) return;
  if (!currentPlaceGem) {
    alert("장소를 먼저 열어 주세요.");
    return;
  }
  openAddToCoursePicker(spotPayloadFromPlace(currentPlaceGem, currentPlaceData));
});

document.getElementById("addPostToCourseBtn")?.addEventListener("click", () => {
  if (!requireLogin()) return;
  if (!currentDetail) return;
  openAddToCoursePicker(spotPayloadFromPost(currentDetail));
});

function spotPayloadFromPlace(gem, data) {
  const title =
    (uiLang === "en" ? data?.titleEn || data?.title : data?.title) ||
    displayGemName(gem) ||
    gem.resNm ||
    "장소";
  const address =
    (uiLang === "en" ? data?.addrEn || data?.addr : data?.addr) ||
    displayGemLocation(gem) ||
    "";
  return {
    title: String(title),
    address: String(address),
    imageUrl: data?.image || gem.thumbnail || "",
    note: "",
    resNm: gem.resNm || "",
    sido: gem.sido || "",
  };
}

function spotPayloadFromPost(post) {
  return {
    postId: post.postId,
    title: post.locationTitle || post.content?.slice(0, 40) || `게시글 #${post.postId}`,
    address: post.address || "",
    imageUrl: post.imageUrl || "",
    note: (post.content || "").slice(0, 200),
    resNm: "",
    sido: "",
  };
}

async function openAddToCoursePicker(spot) {
  if (!requireLogin()) return;
  pendingCourseSpot = spot;
  const dlg = document.getElementById("addToCourseDialog");
  const target = document.getElementById("addToCourseTarget");
  const list = document.getElementById("addToCourseList");
  if (target) {
    target.textContent =
      (uiLang === "en" ? "Add: " : "담을 장소: ") + (spot.title || "");
  }
  if (list) list.innerHTML = `<li class="empty-state">${uiLang === "en" ? "Loading…" : "불러오는 중…"}</li>`;
  dlg?.showModal();
  try {
    const qs = new URLSearchParams({
      memberId: currentMemberId(),
      viewerId: currentMemberId(),
    });
    const res = await fetch(`/api/courses?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "조회 실패");
    const courses = data.courses || [];
    if (!courses.length) {
      list.innerHTML = `<li class="empty-state">${
        uiLang === "en"
          ? "No trip plans yet. Create one below."
          : "아직 여행 계획이 없습니다. 아래에서 새로 만드세요."
      }</li>`;
      return;
    }
    list.innerHTML = courses
      .map(
        (c) => `<li><button type="button" data-course-id="${c.courseId}">
          <strong>${escapeHtml(c.title || "")}</strong>
          <span>${Number(c.spotCount) || 0}${uiLang === "en" ? " spots" : "개 장소"}</span>
        </button></li>`
      )
      .join("");
  } catch (err) {
    if (list) {
      list.innerHTML = `<li class="empty-state">${escapeHtml(err.message || "오류")}</li>`;
    }
  }
}

async function addSpotToCourse(courseId, spot) {
  const body = {
    memberId: currentMemberId(),
    title: spot.title || "",
    address: spot.address || "",
    imageUrl: spot.imageUrl || "",
    note: spot.note || "",
    resNm: spot.resNm || "",
    sido: spot.sido || "",
  };
  if (spot.postId) body.postId = spot.postId;
  const res = await fetch(`/api/courses/${courseId}/spots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "담기 실패");
  return data;
}

document.getElementById("courseDetailBack")?.addEventListener("click", () => {
  clearCourseDetailPane();
});

function closeCourseMoreMenu() {
  const menu = document.getElementById("courseMoreMenu");
  const btn = document.getElementById("courseDetailMore");
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function toggleCourseMoreMenu() {
  const menu = document.getElementById("courseMoreMenu");
  const btn = document.getElementById("courseDetailMore");
  if (!menu || !btn) return;
  const open = menu.hidden;
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}

document.getElementById("courseDetailMore")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!currentCourse || currentCourse.memberId !== currentMemberId()) return;
  toggleCourseMoreMenu();
});

document.getElementById("courseEditBtn")?.addEventListener("click", () => {
  closeCourseMoreMenu();
  if (!currentCourse || currentCourse.memberId !== currentMemberId()) return;
  openCourseEditor(currentCourse);
});

document.getElementById("courseDeleteBtn")?.addEventListener("click", async () => {
  closeCourseMoreMenu();
  if (!currentCourse || currentCourse.memberId !== currentMemberId()) return;
  if (!confirm("이 여행 계획을 삭제할까요?")) return;
  try {
    const res = await fetch(`/api/courses/${currentCourse.courseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId() }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "삭제 실패");
    clearCourseDetailPane();
    loadMyPage();
  } catch (err) {
    alert(err.message || "삭제 실패");
  }
});

document.getElementById("courseDetailPane")?.addEventListener("click", (e) => {
  if (!e.target.closest(".course-more-wrap")) closeCourseMoreMenu();
});

document.getElementById("courseFollowBtn")?.addEventListener("click", () => startCourseTour());
document.getElementById("courseFollowBtnPublic")?.addEventListener("click", () => startCourseTour());

document.getElementById("courseSaveBtnPublic")?.addEventListener("click", () => {
  if (!requireLogin() || !currentCourse) return;
  if (currentCourse.memberId === currentMemberId()) {
    alert("내가 만든 계획입니다. 내 여행 계획에서 확인하세요.");
    return;
  }
  const err = document.getElementById("saveCourseError");
  if (err) err.hidden = true;
  document.getElementById("saveCourseTitle").value = currentCourse.title || "";
  document.getElementById("saveCourseSummary").value = currentCourse.summary || "";
  document.getElementById("saveCourseDialog")?.showModal();
});

document.getElementById("saveCourseCancelBtn")?.addEventListener("click", () => {
  document.getElementById("saveCourseDialog")?.close();
});

document.getElementById("saveCourseForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireLogin() || !currentCourse) return;
  const title = document.getElementById("saveCourseTitle")?.value?.trim() || "";
  const summary = document.getElementById("saveCourseSummary")?.value?.trim() || "";
  const errEl = document.getElementById("saveCourseError");
  const submitBtn = document.getElementById("saveCourseSubmit");
  if (!title) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = "제목을 입력하세요.";
    }
    return;
  }
  if (errEl) errEl.hidden = true;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await fetch(`/api/courses/${currentCourse.courseId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: currentMemberId(),
        title,
        summary,
      }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "저장 실패");
    const newCourseId = Number(data.courseId) || 0;
    currentCourse.saved = true;
    currentCourse.myCourseId = newCourseId || currentCourse.myCourseId;
    if (data.saveCount != null) currentCourse.saveCount = data.saveCount;
    document.getElementById("saveCourseDialog")?.close();
    myView = "courses";
    document.querySelectorAll(".my-subtab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.myView === myView);
    });
    switchTab("my");
    await loadMyCourses();
    if (newCourseId) {
      await openCourseDetail(newCourseId, "my");
    }
  } catch (err) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = err.message || "저장 실패";
    } else {
      alert(err.message || "저장 실패");
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

document.getElementById("courseDetailBodyPublic")?.addEventListener("click", (e) => {
  const spot = e.target.closest(".course-spot");
  if (!spot) return;
  if (spot.dataset.postId) {
    openDetail(Number(spot.dataset.postId));
    return;
  }
  if (spot.dataset.resNm) {
    const gem = currentGems.find(
      (g) => g.resNm === spot.dataset.resNm && (!spot.dataset.sido || g.sido === spot.dataset.sido)
    ) || {
      resNm: spot.dataset.resNm,
      sido: spot.dataset.sido || "",
      thumbnail: "",
    };
    openPlaceDetail(gem);
  }
});

document.getElementById("courseDetailBody")?.addEventListener("click", (e) => {
  const spot = e.target.closest(".course-spot");
  if (!spot) return;
  if (spot.dataset.postId) {
    openDetail(Number(spot.dataset.postId));
    return;
  }
  if (spot.dataset.resNm) {
    const gem = currentGems.find(
      (g) => g.resNm === spot.dataset.resNm && (!spot.dataset.sido || g.sido === spot.dataset.sido)
    ) || {
      resNm: spot.dataset.resNm,
      sido: spot.dataset.sido || "",
      thumbnail: "",
    };
    openPlaceDetail(gem);
  }
});

async function openFollowList(type) {
  const dlg = document.getElementById("followDialog");
  const title = document.getElementById("followDialogTitle");
  const list = document.getElementById("followDialogList");
  if (!dlg || !list) return;
  title.textContent = type === "following" ? "팔로잉" : "팔로워";
  list.innerHTML = `<li class="empty-state">불러오는 중…</li>`;
  dlg.showModal();
  try {
    const qs = new URLSearchParams({ memberId: currentMemberId(), type });
    const res = await fetch(`/api/follow/list?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "조회 실패");
    const members = data.members || [];
    if (!members.length) {
      list.innerHTML = `<li class="empty-state">${type === "following" ? "아직 팔로잉이 없습니다." : "아직 팔로워가 없습니다."}</li>`;
      return;
    }
    list.innerHTML = members
      .map((m) => {
        const letter = (m.nickname || m.memberId || "?").charAt(0);
        const av = m.profileImage
          ? `<img src="${escapeHtml(m.profileImage)}" alt="">`
          : escapeHtml(letter);
        return `<li><span class="av">${av}</span><div><strong>${escapeHtml(m.nickname || m.memberId)}</strong><div class="muted">@${escapeHtml(m.memberId)}</div></div></li>`;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<li class="empty-state">${escapeHtml(err.message || "오류")}</li>`;
  }
}

async function openCourseEditor(course, opts = {}) {
  if (!requireLogin()) return;
  if (!opts.keepPending) pendingCourseSpot = null;
  editingCourseId = course?.courseId || null;
  document.getElementById("courseFormTitle").textContent = editingCourseId
    ? "여행 계획 수정"
    : "새 여행 계획";
  document.getElementById("courseSubmit").textContent = editingCourseId ? "저장" : "만들기";
  document.getElementById("courseTitle").value = course?.title || "";
  document.getElementById("courseSummary").value = course?.summary || "";
  document.getElementById("courseError").hidden = true;
  document.getElementById("courseDialog").showModal();
}

async function openCourseDetail(courseId, ctx = "my") {
  try {
    courseDetailCtx = ctx === "public" ? "public" : "my";
    const qs = new URLSearchParams({ memberId: currentMemberId() });
    const res = await fetch(`/api/courses/${courseId}?${qs}`);
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "조회 실패");
    currentCourse = data;
    const ids = courseDetailTargets(courseDetailCtx);

    const layout = document.getElementById(ids.layout);
    if (layout) {
      layout.hidden = false;
      layout.classList.add("detail-open");
    }

    const nav = document.getElementById(ids.nav);
    if (nav) nav.textContent = data.title || (courseDetailCtx === "public" ? "계획 공유" : "여행 계획");
    const moreWrap = document.getElementById(ids.moreWrap);
    if (moreWrap) moreWrap.hidden = data.memberId !== currentMemberId();
    closeCourseMoreMenu();
    const pubBtn = document.getElementById("coursePublishBtn");
    if (pubBtn) {
      pubBtn.textContent = data.isPublic ? "공유 취소" : "계획 공유에 올리기";
    }
    const actions = document.getElementById(ids.actions);
    if (actions) actions.hidden = false;
    const saveBtn = document.getElementById(ids.saveBtn);
    if (saveBtn) {
      const isMine = data.memberId === currentMemberId();
      const alreadyMine = !!(data.myCourseId || data.saved);
      saveBtn.hidden = isMine;
      if (alreadyMine) {
        saveBtn.textContent = "내 계획에 저장됨";
        saveBtn.disabled = true;
      } else {
        saveBtn.textContent = "계획 저장";
        saveBtn.disabled = false;
      }
    }

    const listSel = courseDetailCtx === "public" ? "#courseListPublic" : "#courseListMy";
    document.querySelectorAll(`${listSel} .course-card[data-course-id]`).forEach((el) => {
      el.classList.toggle("is-selected", Number(el.dataset.courseId) === Number(courseId));
    });

    const cover = data.coverImage
      ? `style="background-image:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.45)),url('${escapeHtml(data.coverImage)}')"`
      : "";
    const letter = (data.nickname || data.memberId || "?").charAt(0);
    const av = data.profileImage
      ? `<img src="${escapeHtml(data.profileImage)}" alt="">`
      : escapeHtml(letter);
    const spots = (data.spots || [])
      .map((s, i) => {
        const seq = s.seq || i + 1;
        const title = s.locationTitle || "장소";
        const thumb = s.imageUrl
          ? `<img class="course-spot-thumb" src="${escapeHtml(s.imageUrl)}" alt="">`
          : `<div class="course-spot-thumb course-thumb-fallback">${escapeHtml(title.charAt(0))}</div>`;
        const addr = (s.address || "").split(/\s+/).slice(0, 2).join(" ") || "";
        const postAttr = s.postId ? `data-post-id="${s.postId}"` : "";
        const gemAttr =
          !s.postId && s.resNm
            ? `data-res-nm="${escapeHtml(s.resNm)}" data-sido="${escapeHtml(s.sido || "")}"`
            : "";
        const author = s.memberId
          ? `@${escapeHtml(s.memberId)}`
          : uiLang === "en"
            ? "AI pick"
            : "AI 추천";
        return `<button type="button" class="course-spot" ${postAttr} ${gemAttr}>
          <div class="course-spot-left"><span class="course-seq">${seq}</span>${thumb}</div>
          <div class="course-spot-body">
            <div class="course-spot-title-row">
              <strong>${escapeHtml(title)}</strong>
              ${addr ? `<span class="loc-tag">${escapeHtml(addr)}</span>` : ""}
            </div>
            <p class="course-spot-note">${escapeHtml(s.content || "")}</p>
            <div class="course-spot-meta">
              <span>${author}</span>
              <span>♥ ${Number(s.recommendCount) || 0}</span>
            </div>
          </div>
        </button>`;
      })
      .join("");
    const mapId = courseDetailCtx === "public" ? "courseMapBtnPublic" : "courseMapBtn";
    const statusId = courseDetailCtx === "public" ? "courseMapStatusPublic" : "courseMapStatus";
    const canvasId = courseDetailCtx === "public" ? "courseMapCanvasPublic" : "courseMapCanvas";
    const likeId = courseDetailCtx === "public" ? "courseLikeBtnPublic" : "courseLikeBtn";
    const likedOn = !!data.liked;
    document.getElementById(ids.body).innerHTML = `
      <div class="course-hero" ${cover}>
        <span class="course-hero-pill">${data.isPublic ? "SHARED COURSE" : "LOCAL COURSE"}</span>
        <h3>${escapeHtml(data.title || "")}</h3>
        <p>${escapeHtml(data.summary || "")}</p>
        <div class="course-hero-author"><span class="course-hero-avatar">${av}</span>
          ${escapeHtml(data.nickname || data.memberId)} · @${escapeHtml(data.memberId || "")}</div>
      </div>
      <div class="course-stats-bar">
        <span>${Number(data.spotCount) || 0} 스팟</span>
        <button type="button" class="course-like-btn${likedOn ? " is-on" : ""}" id="${likeId}" aria-pressed="${likedOn}">
          ♥ 좋아요 <strong id="${likeId}Count">${Number(data.likeCount) || 0}</strong>
        </button>
        <span>저장 ${Number(data.saveCount) || 0}</span>
        <span class="muted">${escapeHtml(courseDateLabel(data.regDate, data.regAt))} 생성</span>
      </div>
      <div class="course-spots">
        <h4>방문하는 장소 리스트</h4>
        ${spots || `<p class="nearby-empty">장소가 없습니다. AI 추천에서 담아 보세요.</p>`}
      </div>
      <div class="course-map-box">
        <p class="course-map-label">지도로 코스 동선 확인</p>
        <button type="button" id="${mapId}">코스 지도 보기</button>
        <p id="${statusId}" class="course-map-status" hidden></p>
        <div id="${canvasId}" class="course-map-canvas" hidden></div>
      </div>`;
    document.getElementById(mapId)?.addEventListener("click", () => openCourseMap());
    document.getElementById(likeId)?.addEventListener("click", () => toggleCourseLike());
  } catch (err) {
    alert(err.message || "코스를 열 수 없습니다.");
  }
}

async function toggleCourseLike() {
  if (!requireLogin() || !currentCourse?.courseId) return;
  const likeId = courseDetailCtx === "public" ? "courseLikeBtnPublic" : "courseLikeBtn";
  const btn = document.getElementById(likeId);
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`/api/courses/${currentCourse.courseId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId() }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "좋아요 실패");
    currentCourse.liked = !!data.liked;
    if (data.likeCount != null) currentCourse.likeCount = data.likeCount;
    if (btn) {
      btn.classList.toggle("is-on", !!data.liked);
      btn.setAttribute("aria-pressed", String(!!data.liked));
      const countEl = document.getElementById(`${likeId}Count`);
      if (countEl) countEl.textContent = String(Number(data.likeCount) || 0);
    }
  } catch (err) {
    alert(err.message || "좋아요 실패");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** 계획 따라가기 투어 — 상세 좌우 화살표 */
let courseTour = null; // { spots, index, courseId }

function updateCourseTourNav() {
  const active = !!courseTour?.spots?.length;
  const index = courseTour?.index ?? 0;
  const total = courseTour?.spots?.length ?? 0;
  document.querySelectorAll(".tour-nav-prev").forEach((btn) => {
    btn.hidden = !active;
    btn.disabled = !active || index <= 0;
  });
  document.querySelectorAll(".tour-nav-next").forEach((btn) => {
    btn.hidden = !active;
    btn.disabled = !active || index >= total - 1;
  });
  document.querySelectorAll(".tour-nav-badge").forEach((badge) => {
    badge.hidden = !active;
    if (active) badge.textContent = `${index + 1}/${total}`;
  });
}

function openCourseTourSpot(index) {
  if (!courseTour?.spots?.length) return;
  const i = Math.max(0, Math.min(index, courseTour.spots.length - 1));
  courseTour.index = i;
  updateCourseTourNav();
  const spot = courseTour.spots[i];
  if (spot?.postId) {
    placeDialog?.close?.();
    openDetail(Number(spot.postId));
    updateCourseTourNav();
    return;
  }
  detailDialog?.close?.();
  const gem = currentGems.find(
    (g) => g.resNm === spot.resNm && (!spot.sido || g.sido === spot.sido)
  ) || {
    resNm: spot.resNm || spot.locationTitle || "",
    sido: spot.sido || spot.address || "",
    thumbnail: spot.imageUrl || "",
  };
  openPlaceDetail(gem);
  updateCourseTourNav();
}

function startCourseTour(course = currentCourse) {
  if (!course?.spots?.length) {
    alert("따라갈 장소가 없습니다. AI 추천에서 장소를 담아 주세요.");
    return;
  }
  courseTour = {
    courseId: course.courseId,
    spots: course.spots.slice(),
    index: 0,
  };
  openCourseTourSpot(0);
}

function endCourseTour() {
  courseTour = null;
  updateCourseTourNav();
}

function courseTourNext() {
  if (!courseTour) return;
  if (courseTour.index >= courseTour.spots.length - 1) return;
  openCourseTourSpot(courseTour.index + 1);
}

function courseTourPrev() {
  if (!courseTour || courseTour.index <= 0) return;
  openCourseTourSpot(courseTour.index - 1);
}

async function setUiLang(lang) {
  uiLang = lang === "en" ? "en" : "ko";
  localStorage.setItem(LANG_STORAGE_KEY, uiLang);
  syncLangButtons();
  applyChromeI18n();
  renderAuthBar();
  try {
    if (activeTab === "ai") {
      if (uiLang === "en" && currentGems.length) {
        showStatus(statusEl, t("translating"), "info");
        await translateCurrentGems();
        hideStatus(statusEl);
      }
      renderGems(currentGems);
    } else if (activeTab === "domestic" || activeTab === "foreign") {
      await loadBoardPosts(activeTab);
    } else if (activeTab === "courses") {
      await loadPublicCourses();
    } else if (activeTab === "my") {
      await loadMyPage();
    }
  } catch (err) {
    alert(err.message || (uiLang === "en" ? "Translation failed" : "번역 실패"));
  }
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => setUiLang(btn.dataset.lang));
});

currentUser = loadStoredUser();
renderAuthBar();
if (currentUser?.memberId) {
  fetch(`/api/profile?memberId=${encodeURIComponent(currentUser.memberId)}`)
    .then(async (res) => {
      if (!res.ok) return null;
      return readJsonResponse(res);
    })
    .then((data) => {
      if (!data?.memberId) return;
      saveUser({
        memberId: data.memberId,
        nickname: data.nickname || currentUser.nickname,
        profileImage: data.profileImage || "",
      });
    })
    .catch(() => {});
}
syncLangButtons();
applyChromeI18n();
{
  const authModeParam = new URLSearchParams(location.search).get("auth");
  if (authModeParam === "register" || authModeParam === "login") {
    openAuthDialog(authModeParam);
    history.replaceState({}, "", location.pathname);
  }
}
loadRegions().then(() => loadHiddenGems());
