const sortSelect = document.getElementById("sort");
const sidoSelect = document.getElementById("sidoSelect");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
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
/** 0 = 제한 없음(점수·사진·상세 통과분 전부) */
const DEFAULT_LIMIT = "0";
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
  document.querySelectorAll(".board-write-btn").forEach((btn) => {
    btn.title = t("write");
    btn.textContent = t("write");
  });
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
    publicCoursesCache = data.courses || [];
    renderPublicCoursesFiltered();
    if (courseDetailCtx === "public" && currentCourse?.courseId) {
      const still = publicCoursesCache.some((c) => Number(c.courseId) === Number(currentCourse.courseId));
      if (!still) clearCourseDetailPane("public");
    } else if (courseDetailCtx !== "public" || !currentCourse) {
      clearCourseDetailPane("public");
    }
  } catch (e) {
    showStatus(statusElBoard, e.message || "오류", "error");
  }
}

let publicCoursesCache = [];

function sortPublicCourses(list, sortKey) {
  const sorted = (list || []).slice();
  const byTime = (a, b) => (Number(b.regAt) || 0) - (Number(a.regAt) || 0)
    || (Number(b.courseId) || 0) - (Number(a.courseId) || 0);
  switch (sortKey) {
    case "oldest":
      sorted.sort((a, b) => -byTime(a, b));
      break;
    case "likes":
      sorted.sort((a, b) => (Number(b.likeCount) || 0) - (Number(a.likeCount) || 0) || byTime(a, b));
      break;
    case "saves":
      sorted.sort((a, b) => (Number(b.saveCount) || 0) - (Number(a.saveCount) || 0) || byTime(a, b));
      break;
    case "spots":
      sorted.sort((a, b) => (Number(b.spotCount) || 0) - (Number(a.spotCount) || 0) || byTime(a, b));
      break;
    case "newest":
    default:
      sorted.sort(byTime);
      break;
  }
  return sorted;
}

function renderPublicCoursesFiltered() {
  const q = (document.getElementById("courseSearchPublic")?.value || "").trim().toLowerCase();
  const sortKey = document.getElementById("courseSortPublic")?.value || "newest";
  let list = publicCoursesCache.slice();
  if (q) {
    list = list.filter((c) => {
      const hay = [
        c.title,
        c.summary,
        c.nickname,
        c.memberId,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }
  list = sortPublicCourses(list, sortKey);
  const el = document.getElementById("courseListPublic");
  if (!publicCoursesCache.length) {
    if (el) el.innerHTML = `<p class="nearby-empty">아직 공유된 계획이 없습니다.</p>`;
    return;
  }
  if (!list.length) {
    if (el) el.innerHTML = `<p class="nearby-empty">검색 결과가 없습니다.</p>`;
    return;
  }
  renderCourseList(list, { listId: "courseListPublic", mode: "public", showAuthor: true });
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

function goToMyCourses() {
  myView = "courses";
  document.querySelectorAll(".my-subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.myView === "courses");
  });
  switchTab("my");
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

function gemHasRank(gem) {
  return Number(gem.foreignVisitors) > 0 && Number(gem.domesticVisitors) > 0;
}

/** 순위(-) 구간: 외국인 0이면 내국인 많은 순, 그다음 외국인만 있는 곳, 둘 다 0은 맨 뒤 */
function compareUnrankedGems(a, b, sortKey) {
  const ad = Number(a.domesticVisitors) || 0;
  const af = Number(a.foreignVisitors) || 0;
  const bd = Number(b.domesticVisitors) || 0;
  const bf = Number(b.foreignVisitors) || 0;

  if (sortKey === "foreign") return bf - af;
  if (sortKey === "domestic") return bd - ad;

  const tier = (d, f) => {
    if (f <= 0 && d > 0) return 0; // 외국인 0 · 내국인 있음 → 우선
    if (d <= 0 && f > 0) return 1; // 내국인 0 · 외국인 있음
    if (d <= 0 && f <= 0) return 2; // 둘 다 0
    return 0; // 한쪽만 0이 아닌 비정상 케이스도 앞쪽
  };
  const ta = tier(ad, af);
  const tb = tier(bd, bf);
  if (ta !== tb) return ta - tb;

  if (ta === 0) {
    if (bd !== ad) return bd - ad; // 내국인 많은 순
    return bf - af;
  }
  if (ta === 1) {
    if (bf !== af) return bf - af;
    return bd - ad;
  }
  return (Number(b.gemScore) || 0) - (Number(a.gemScore) || 0);
}

function sortGems(gems, sortKey) {
  const sorted = [...gems];
  const byVisitorsOrScore = (a, b) => {
    switch (sortKey) {
      case "foreign":
        return b.foreignVisitors - a.foreignVisitors;
      case "domestic":
        return b.domesticVisitors - a.domesticVisitors;
      default:
        return b.gemScore - a.gemScore;
    }
  };
  // 숫자 순위 먼저, 그다음 (-) 구간은 가볼 만한 순
  sorted.sort((a, b) => {
    const ar = gemHasRank(a) ? 0 : 1;
    const br = gemHasRank(b) ? 0 : 1;
    if (ar !== br) return ar - br;
    if (ar === 1) return compareUnrankedGems(a, b, sortKey);
    return byVisitorsOrScore(a, b);
  });
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

function weatherIconSvg(icon, size) {
  const kind = String(icon || "cloudy");
  const s = size || 56;
  const common = `class="weather-icon" viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true"`;
  if (kind === "clear") {
    return `<svg ${common}><circle cx="32" cy="32" r="12" fill="#f5b942"/><g stroke="#f5b942" stroke-width="3" stroke-linecap="round"><path d="M32 8v6M32 50v6M8 32h6M50 32h6M14 14l4.2 4.2M45.8 45.8L50 50M14 50l4.2-4.2M45.8 18.2L50 14"/></g></svg>`;
  }
  if (kind === "rain") {
    return `<svg ${common}><ellipse cx="34" cy="26" rx="16" ry="11" fill="#9ca3af"/><ellipse cx="22" cy="28" rx="11" ry="8" fill="#b0b7c3"/><g stroke="#4b8fd9" stroke-width="2.5" stroke-linecap="round"><path d="M22 40v8M32 42v8M42 40v8"/></g></svg>`;
  }
  if (kind === "snow") {
    return `<svg ${common}><ellipse cx="34" cy="26" rx="16" ry="11" fill="#9ca3af"/><ellipse cx="22" cy="28" rx="11" ry="8" fill="#b0b7c3"/><g fill="#7eb6e8"><circle cx="22" cy="44" r="2.2"/><circle cx="32" cy="48" r="2.2"/><circle cx="42" cy="44" r="2.2"/></g></svg>`;
  }
  if (kind === "sleet") {
    return `<svg ${common}><ellipse cx="34" cy="26" rx="16" ry="11" fill="#9ca3af"/><ellipse cx="22" cy="28" rx="11" ry="8" fill="#b0b7c3"/><g stroke="#4b8fd9" stroke-width="2.2" stroke-linecap="round"><path d="M24 40v6"/><path d="M40 40v6"/></g><circle cx="32" cy="48" r="2.2" fill="#7eb6e8"/></svg>`;
  }
  if (kind === "overcast") {
    return `<svg ${common}><ellipse cx="30" cy="34" rx="18" ry="12" fill="#8b93a1"/><ellipse cx="42" cy="30" rx="12" ry="9" fill="#9aa3b2"/><ellipse cx="20" cy="30" rx="11" ry="8" fill="#a3abb8"/></svg>`;
  }
  return `<svg ${common}><circle cx="42" cy="20" r="9" fill="#f5b942"/><ellipse cx="28" cy="36" rx="16" ry="11" fill="#c5cad3"/><ellipse cx="40" cy="34" rx="12" ry="9" fill="#d1d5db"/></svg>`;
}

/** 전국 지도 마커 위치 (Highcharts KR map viewBox) — 겹침 줄인 배치 */
const WEATHER_MAP_POS = {
  서울특별시: { x: 238, y: 118, short: "서울" },
  인천광역시: { x: 155, y: 150, short: "인천" },
  경기도: { x: 278, y: 175, short: "경기" },
  강원특별자치도: { x: 400, y: 120, short: "강원" },
  충청북도: { x: 345, y: 245, short: "충북" },
  세종특별자치시: { x: 235, y: 248, short: "세종" },
  대전광역시: { x: 292, y: 305, short: "대전" },
  충청남도: { x: 175, y: 275, short: "충남" },
  경상북도: { x: 430, y: 285, short: "경북" },
  전북특별자치도: { x: 230, y: 385, short: "전북" },
  대구광역시: { x: 415, y: 360, short: "대구" },
  울산광역시: { x: 490, y: 400, short: "울산" },
  광주광역시: { x: 195, y: 450, short: "광주" },
  전라남도: { x: 200, y: 520, short: "전남" },
  경상남도: { x: 375, y: 460, short: "경남" },
  부산광역시: { x: 470, y: 455, short: "부산" },
  제주특별자치도: { x: 186, y: 677, short: "제주" },
};

function koreaMapOutlineSvg() {
  // Highcharts KR admin1 silhouette (CC-BY-SA / open mapdata)
  return `<g class="kr-land-group">
<path class="kr-land" d="M156.1,176.5 152.1,179.1 150.2,176.7 148.8,177 150.6,171.7 156.1,176.5 M189.2,176.2 187.2,177.5 184.8,176.5 184.9,173.2 187.6,171.1 190,171.4 191.4,173.7 189.2,176.2 M199.3,171.5 202.8,174.2 203.3,177.7 197.9,181.7 195.4,182 197.7,176.7 197.4,173.2 195.9,171 199.3,171.5 M109.7,120.1 109.1,120.4 108.5,116.9 111.1,117.8 109.7,120.1 M179.5,121.8 177.4,121.9 170.6,116.2 172.6,111.9 175.1,110.3 176.9,115.7 180.5,119.2 179.5,121.8 M170.5,101.6 172.4,102.8 176.3,103.2 176.5,106.6 174.6,108.1 168.1,107.2 164.9,108.1 164.5,106.6 167.4,101.5 170.5,101.6 M9.5,95.8 6.5,96.5 5.7,93.7 9.2,90.9 10.9,92.3 9.5,95.8 M184.3,122.8 179.7,113.9 179.9,105.3 183.9,100.8 185.8,100.4 190.5,105 193.7,106.7 195.5,110.1 194.6,113.7 195.9,117.4 195.8,123.1 197.2,125.8 195.8,126.6 194.6,129.3 192.1,129.9 190.3,128.2 188.9,129 183.5,129.2 179.4,125.3 182.6,124.6 184.3,122.8 M3.9,74.3 9.7,72.5 12.5,73.7 13.3,77.1 6.6,77.1 9.4,79.8 7.2,81.4 3,80.6 0,77.7 1.3,73.2 3.9,74.3 M238.5,221 242.6,218.1 243.4,215 242,213.1 246.8,211.2 247.1,209.7 240.8,211.4 239.9,212.6 240.1,216.7 236.9,218.3 233.4,217.7 229.4,215.3 225.8,211.5 224.5,208.1 230.7,207.5 229.4,205.7 233.5,206.8 230.8,199.5 231.6,196.1 229.5,196.8 228.1,203.2 222.1,203.5 217.4,201.9 217.3,195.2 220.1,191.1 223.5,189.7 229,189 229.2,185.3 225.5,187.8 223.2,186.9 222.7,184.3 218.2,186.9 214.4,190.8 212.2,191.9 210.5,190 212.7,186.7 208.7,187 209,183.9 212.8,182.2 213.8,180.1 210.1,179.8 208,175 213.4,174.2 217.7,176 219.3,175.3 219.2,178.1 221.8,179.4 222.9,175.4 224.7,172.8 230.1,173.7 229,171.9 225.2,170.1 219.2,169.5 215.9,168.5 211.5,165 211.3,163.4 214.8,159.2 220.2,156.8 222.8,150.8 220.2,148.1 219.2,142.5 213.3,136.5 203.3,136.6 199,128.9 197.7,120.5 196.5,109.7 198.3,107.7 203.9,109.9 208.6,108.7 210.5,111.2 209.7,120.8 212.8,123.5 219.2,125.5 211.5,119 213.9,111.7 212.6,107.7 213.4,99.4 210.8,100.6 210.3,89.4 211,86.3 216.8,84.4 221,81.2 230.1,68.1 237.6,61.4 241.3,52.9 242.6,51.3 249.7,55.7 254.3,63.7 255.5,63.5 260.1,68 263.8,69.8 265.2,67.8 265.3,63.5 266.4,61.4 267.6,64.4 272,65.5 275.7,61.7 278,62.3 276.1,66.3 276.2,68.8 279.4,71.3 283.2,72.3 287.5,70.8 291.4,71.4 293,75.1 293.4,81.2 294.6,84.6 297.2,86.6 301.9,86.7 303.3,90.5 307.2,91.9 309.5,95.6 308.9,100.9 300.3,107.1 299.9,113 301.1,117.7 298.1,121.2 299.2,122.8 302,121.9 301.4,127.1 300.1,131.4 302.4,133.4 308,133 318.9,139.2 327.4,141 330.1,144.3 323.5,152.1 323.3,157.9 316.7,171.4 311.9,182.6 306.1,192.9 302.9,196.7 296.6,207.9 294,209.7 291.4,208.5 287.5,213.9 283.2,216.8 282.1,220.6 274.2,223.8 269.5,225 264.6,224.3 260.6,220.8 256.1,218.7 247.4,222.3 238.5,221 M256.2,137.6 257.2,133.9 257.2,130.8 255.6,123.7 253.9,120.6 250.2,120.3 247,121 244.8,123.2 240.9,129.2 236.3,129.5 235.4,133.7 230.7,135.8 227.4,133.7 224.6,133.5 222.9,136.8 227.3,142.8 227.7,146.5 232.8,148.8 235.7,152.9 240.1,153.2 249,150.6 250.2,153.4 259,149.7 261.8,145.7 261,142.4 264,140.6 263.6,136.8 256.2,137.6Z"/>
<path class="kr-land" d="M165.6,386.6 165.4,388.3 160.3,392.4 160.2,389.1 162.3,387 165.6,386.6 M332.6,339.1 336.8,346.5 336.2,354.8 332.3,358.8 331.2,361.5 325.9,364.3 320.8,365.5 318.8,369.8 314.1,374.3 312.5,381.6 309.4,387.5 307.2,395.5 305.7,398.5 305.5,401.7 308.2,402.9 309.9,409 309.7,412.4 312.2,415.9 311.5,419.4 307,424.6 306.1,431.3 303.8,433.5 297.8,428.6 291,426.1 287.2,428.1 284,431.4 273.3,432.2 269.4,432.1 265.9,429.7 258.6,430.6 255.5,432.3 251.6,431.7 249.1,428.9 249.4,424.6 246.6,419.7 247.6,416 245.5,412.7 242.5,412.8 240.6,415.1 239.5,418.6 236.3,418.6 231.4,411.8 228.3,409.1 224.5,408.1 222.6,410.1 219.1,409.7 216.4,412.1 216.4,415.5 214,417.9 214.2,420.6 211.9,423.7 205.2,426.8 195.1,429.2 192.5,428.2 194.2,416.5 191.2,415.6 178.5,418.8 176.6,415.7 177.5,412.7 182.5,402.3 185,398.9 188.5,397.8 195.8,397 198.9,393.7 201,393.2 204.8,397.7 206.2,398.3 204,391.2 202.4,390.2 187.3,392.3 182.1,388.9 182.7,384.1 185.2,382.8 189.5,378.6 196.6,374.8 199.7,370.7 200.3,366.8 203.7,364.6 211.3,364.9 215.2,367.2 216.3,369.2 217.4,365.2 208,358.6 210.1,355.7 217,356 219.2,355.4 220.6,352.7 222.6,352.1 219.4,349.9 211.5,352.8 198.8,351.9 198.6,346.6 194.5,344.6 189.8,345.2 189.5,341.2 213,339.4 219.2,335.4 226.3,332.1 226.6,330.3 220.4,332 225.2,326.3 236.3,324.7 247.2,321.5 251.1,322.4 250,328.1 252.2,331.6 264.1,329 269.4,327.4 272.6,323.5 275.9,326.5 280.5,335.1 285.4,337.3 285.6,341.1 291.7,342 300.2,340.5 305.4,335.9 307.2,337.9 308.8,336.8 312.1,339.7 319.4,343.1 326.8,339.4 329.8,341.7 332.6,339.1Z"/>
<path class="kr-land" d="M372.8,517.9 375.2,517 374.3,519.2 369,520.6 367.8,517.7 369.4,515.2 372.8,517.9 M384.5,493.2 389.7,492.6 391,495.4 390.6,498.8 387.4,501 385.2,497.2 383.4,496.6 384.6,494.8 379.4,492.8 381.5,491.5 384.5,493.2 M369.7,496.1 365.9,494.1 368.3,491.1 371.7,494.2 369.7,496.1 M432.9,471.2 429.7,464.1 431.2,462.5 434.1,464.3 432.9,471.2 M479.5,429.5 477.4,435.9 478.1,438.4 475.2,444.4 472.1,449.2 463.5,439.5 462.8,436.6 460.8,435.4 455.5,436.3 452.1,439.5 450.9,447.2 446.9,453.2 446.4,452.7 442.2,459.8 440.7,459.9 440,454.7 438.3,459.9 428.6,459.7 427.5,456 426.6,459.6 423,459 421.9,456.8 419,457.9 419,452.3 417.6,452.2 416.8,455.4 412.3,451 410.2,451.8 410.2,446.4 408.5,442.6 405.9,445.8 408,453.4 411.1,458.6 410.8,461.5 413.7,462.5 408.6,463 406.1,459 400.4,456.9 395.2,457.5 395.5,460.6 385.7,463.9 383.8,469.4 394.5,463.8 396.3,463.7 397.5,469.1 395.2,471.6 389,472.5 391.1,474.8 390.3,484.5 392.2,485.1 393.3,482.8 394.7,484.5 390.5,490.6 384.9,491.1 385,489.1 388.5,488.1 380.4,486.7 378.7,483.5 382.3,481.9 379.9,477 376.3,482.1 373.9,482.3 371.6,479.2 368,478.2 366.3,480.4 366.1,484.3 358.9,484.1 357,483 356.6,479.9 350.9,479.4 349.5,477.8 350.1,475 349.9,465.4 351.6,459.3 346.8,465.3 344.3,465.5 346.2,470.1 342,470.9 339.2,472.6 336.3,467.3 334.7,474.8 332.5,476.7 327.4,476.2 325.9,476.9 323.3,475.2 321.7,468.7 315.1,461.4 313.1,456.3 308.1,451.8 306.7,449.2 306.4,442.3 305.4,439 303.2,436.4 303.8,433.5 306.1,431.3 307,424.6 311.5,419.4 312.2,415.9 309.7,412.4 309.9,409 308.2,402.9 305.5,401.7 305.7,398.5 307.2,395.5 309.4,387.5 312.5,381.6 314.1,374.3 318.8,369.8 320.8,365.5 325.9,364.3 331.2,361.5 332.3,358.8 336.2,354.8 337,357.7 341.1,360.5 341.6,362.6 346.5,363.5 349.5,365.9 355.6,366.1 358.3,367.1 365,376 368,378.6 366.6,384.6 368.2,390.6 381,391.1 386.6,394.5 389.5,395.2 395.2,392.3 398.1,392.8 400.8,389.2 403.2,387.3 404.1,394.5 406.7,397.7 410.1,399.9 417.9,398.7 424.6,401.5 428.6,401.7 432.1,399 435.1,398.2 437.7,395.4 441.6,393.8 448.8,396.3 451.7,395.3 452.2,400.5 449.5,405.8 451.2,409 457.7,410 460.5,412.1 465,417.3 473,422.1 473.7,425.7 476,428.1 479.5,429.5 M344.3,481.2 346.5,482.2 345.4,486.9 347.9,483.9 350.3,485.5 351.1,489.2 352.7,491.4 346.8,490.3 344.1,491.1 341,489.9 340.1,488.1 344.3,481.2 M344.8,507.7 341.1,508.8 338.9,501 335.7,501 333.7,507 329.7,505.9 328.6,500.9 325.8,491.3 325.7,486.7 329.3,483.2 329.8,480.4 333.6,477.6 337.4,481 336.3,484.3 333.9,486.8 334.8,490 338.6,492.6 339.8,494.9 347,493.1 351.4,494 351.9,495.5 350.6,499.8 350.8,504.1 349.3,505.2 350.2,507.8 348.1,509.4 344.8,507.7 M417.3,495.3 416.6,498.1 414.2,501.9 418.1,504.6 416.4,506.1 408.6,508.5 406.3,508.6 410,506 407.9,504.1 408.5,500.6 405.2,502.3 403.8,498.6 407.2,497.4 408.6,491.7 406,492.2 400.5,495.2 396.5,489.8 396.2,487.3 398.3,484.5 401.4,482.8 406.5,482.1 411,484.5 413,483.7 409.9,480.5 409.3,476.2 410.7,476.4 418.2,472.2 416.9,469.8 419.2,466.1 421,466.9 421.5,469.2 420.8,474 421.4,476.3 422.5,478.8 420.3,486.5 423.9,485.2 423.9,489 422.5,491.5 421,490.9 423.2,497.5 420.5,497.2 417.3,495.3Z"/>
<path class="kr-land" d="M163.7,602.1 161.9,603.5 160.9,605 159.4,602.3 163.7,602.1 M266.9,590.6 267,593.7 269.8,597.9 266.8,596.8 265,592.8 266.9,590.6 M33.8,585.6 32.3,585.5 29,582.8 30.2,579.7 32.3,581.4 33.8,585.6 M188.6,575.2 191.4,575 193.8,576.8 190.1,576.6 185.2,580.5 182,578.8 183,575 186.6,573.7 188.6,575.2 M199,581.8 196.2,580.6 197.1,571.7 199.8,572.6 198.8,575.7 200.6,578.3 199,581.8 M209.6,573.7 208.1,572.9 209.9,570 210.5,571.7 209.6,573.7 M226.6,576.2 223,578.2 219,575.1 220.3,571.5 224.5,570.6 227.2,573.9 226.6,576.2 M191,573.9 188.8,573.8 186.7,571.7 188,566.6 193.6,568.8 194.1,570.6 191,573.9 M263.5,570.4 259.4,571.1 260.3,568.3 263.3,566.1 263.5,570.4 M133.5,562.6 134.7,564.3 133.7,566.2 132.3,564.7 133.5,562.6 M131.5,554.6 137.5,555.7 137.5,558.1 133.2,559.2 130.3,557.1 131.5,554.6 M233.9,558.2 230.9,556.9 231.3,554.9 235.4,554.1 236.6,556.6 233.9,558.2 M127.7,551.1 132.1,551.5 134.3,554 127.7,552.9 127.7,551.1 M218.9,552.3 224.2,553.5 222.4,557.3 218.5,558.3 216.3,555.4 212.9,555.9 209.6,553.9 214.5,553.7 218.9,552.3 M240.7,551.7 244.1,551.6 246.1,554.5 243.7,554.8 239.8,557.5 241,555.2 238.3,552.9 234.8,551.8 238.9,548.8 240.7,551.7 M230.1,545.5 229.4,549.4 225.7,551.7 223.6,550.7 223.3,547.9 221.6,549.7 221.5,545.6 228.5,546.7 230.1,545.5 M264.9,549.1 263,548.7 262.7,546.5 263.7,546.1 264.9,549.1 M220.8,546 217.9,546.2 213.5,548.5 211.6,551.5 210.8,548.2 209.3,547.3 212.5,542.2 218.3,540.8 218.3,543.4 220.8,546 M240.6,538.6 242.8,539.8 243.9,543 242.7,545.7 241.9,543.1 240.4,543.7 238.7,539.5 240.6,538.6 M322.3,546.2 320.5,543.4 322.1,539.7 323.3,541.1 322.3,546.2 M288.3,538.8 290.8,538 293.6,542.6 289,545.2 284.6,540.1 285.3,537.5 288.3,538.8 M134.8,532.6 135.9,533 132.7,535.7 132.1,533.3 133.9,531 134.8,532.6 M287,531.9 289.8,533.8 289.2,536 285,536.8 283.7,534.6 285.4,534.3 283,531.8 284.6,528.8 287,531.9 M319.8,536 315.8,534.2 312.1,530 316.5,527.9 320.9,534 319.8,536 M308,524.6 310.7,524.7 306.5,527.4 304.6,525.5 306.9,523.2 308,524.6 M296.4,519.1 297.1,520.5 294.6,521.7 292.9,518.9 296.4,519.1 M113.9,514.3 113.3,516.6 109.8,517.5 107.9,514.1 113.9,514.3 M133,521.6 131.2,521.3 130.9,516.8 132.3,513.2 135.5,519.8 133,521.6 M126.7,513.7 126.6,515 123.4,512.6 125.8,511.9 126.7,513.7 M146.1,510.6 148,509.8 150.7,513.3 142.8,516.2 143.1,512.6 141.7,511.5 145.4,508.7 146.1,510.6 M68.8,503.2 71.5,504.4 65.7,511.7 64.3,507.7 66.5,503.5 68.8,503.2 M44.2,499.7 45.3,499.7 44.5,503.3 42.1,506.5 44.2,499.7 M129.3,507.5 126.8,510.1 121.8,507.9 120.5,505.9 127.5,501.1 129.6,504 129.3,507.5 M142.4,495.9 148.3,499.4 148.6,503.4 146.6,504.7 144.4,501.9 141.5,502.6 137.2,495.7 142.4,495.9 M146.6,496.7 145.4,497 139.7,493.5 145.9,491 147.9,493.1 146.6,496.7 M145.4,481.7 145.2,487.7 142.6,488.9 142.3,491.5 140,490.8 136.9,486.3 140.1,484.4 142.1,485 142.3,482.7 145.4,481.7 M314.3,482.9 316.7,483.7 314.3,486.3 311.4,485.2 314.3,482.9 M139.8,477.4 138.8,482.6 135.9,484.1 133.5,482.8 128.6,483.4 133.3,477.4 135.9,477.8 137.9,475.1 139.8,477.4 M156.6,477.3 154.4,477.5 154.1,475.2 157.4,475 156.6,477.3 M160,470.5 162.5,474.6 160.4,474.7 158.5,470.6 160,470.5 M158.3,469.5 156.7,469.5 157.7,465.7 159.5,467.6 158.3,469.5 M148.8,466.2 149.5,469 146.1,470.5 144,472.9 145.4,467.6 146.8,466.5 141.8,466.6 141,465.6 145,462.9 146.9,463.4 148.8,466.2 M146.2,458.6 149.4,459.3 149.2,463.1 144.5,459.8 146.2,458.6 M135.9,420.5 133.4,422.6 132.6,421 134.4,418.6 135.9,420.5 M202.3,545.2 205.9,547.9 208.3,555.4 211,559.7 207.8,558.8 206.7,559.9 202.1,558.3 202.9,555.7 199.4,555.3 197.5,553.5 197.2,548.8 198.6,546 202.3,545.2 M262.3,538.3 260.5,542.7 258.5,543.5 252.3,543.9 248.6,541.5 249.3,539.2 247.9,537.9 251.1,536.3 258,535.3 261.2,536.2 262.3,538.3 M161.2,544.2 150.8,549.5 145,550.1 143.5,548.6 145.3,546.3 141.7,543.4 141.6,546.2 139.4,543.5 140.9,539.2 144.1,535.7 147,535.6 149.8,530.8 157.6,528.5 157.5,524.9 154.8,522.6 157.3,521.5 161.7,524.4 162.7,526.5 166.4,525.5 169.5,531.9 168.6,537.5 166.5,542 164.5,544.1 161.7,541.4 161.2,544.2 M139.6,523.2 135,526.5 132.6,526.3 134.6,523.9 132.3,523.3 135.9,522.5 137.7,520.3 135.6,515 136.5,514.5 139.7,517.2 139.6,523.2 M324.1,517.6 323.8,521.4 321.9,524.2 319.5,523.6 315.7,519.7 316,515.8 318.5,513.7 319.7,509.7 318.3,506.9 322,506.8 321.5,510.9 324.1,517.6 M128.6,492.8 130.6,494.1 130.5,496.8 123.9,497 122.1,501.4 119.5,501.7 118,497.7 119.2,495 128.6,492.8 M162.1,477.2 167.2,480.1 164.4,482.1 164.3,484 168.6,485.1 168.7,487.8 166.5,489.7 166.2,487.2 162.8,485.3 156.6,486.6 154.8,485.2 159.2,483.7 162.1,480.3 162.1,477.2 M147.9,453.9 151.2,453 154.1,452.8 156.5,454.5 154.3,456.4 157.5,458.2 158.6,463.3 156.6,462.8 156.1,459.6 150.6,458.1 147.9,453.9 M146.4,455.4 143,458.3 142.1,459.5 136.8,457.9 138.4,452.6 141.6,451.3 143,448.7 147.2,447 148.8,447.5 144.7,450.4 146.4,455.4 M323.3,475.2 316.8,474.8 314.1,470.8 314.3,474.1 312,478.5 305.7,482.6 302.1,477 299.3,478 298.7,482.8 303.2,490.6 307.2,493.9 311.9,490 317.9,490.3 319.9,489.2 319.8,491.8 317,503.7 316.1,505.2 312.3,506.4 307,504.3 305,508.6 303.5,508.6 304.9,512.1 305.1,519 302.3,516.5 297.8,515.1 296.1,510.3 299.4,502.3 292.8,487.5 293.5,484.9 292.3,483.4 289.1,489.8 284.5,491.4 277.8,491.4 277.4,493 282.4,495.8 275.5,498.5 276,501 278,500.2 280.1,508 286.5,513 288.7,516.3 285,516.3 289.5,518.1 290.4,522.3 288.3,524.1 284.8,524.3 278.5,520.7 273.2,523.7 274.6,526.8 277,527.8 281.2,526.8 283.4,528.7 278.2,533.3 276.3,535.9 274.4,534.9 271.2,537.2 272.9,541 269.9,541 265.6,535.1 264.2,532 260.2,527.5 254.7,529.9 255.4,531.8 250.5,530.1 250.2,525.2 253.4,523.1 257.7,516.6 259.4,515.9 258.6,520.1 257,523.9 262.8,522.8 264.4,520.6 264.5,516.8 262.3,511.5 266.1,507.1 267.9,508.5 267.5,510.8 269,513.7 271.9,513.5 275,508.1 272.3,502.5 267.8,505 263.4,499.1 259.5,507 256.5,509.4 252.5,508.6 247.2,513.4 239.6,517.9 237.5,518.6 237.1,522.6 234.8,526.2 235.6,527.9 229.5,533.5 229.6,539 225.7,538.3 224.4,542.1 224.9,543.6 220.6,541 215.5,539.1 214.8,536.6 215.6,525.9 213.7,521.2 211.3,522.5 210,525.2 211,529.6 207.7,530.6 210.5,535.4 204.7,539 206.6,541.2 202.6,540.8 201.7,543.6 197.7,544.9 196,546.7 193.2,555.4 192.9,558.1 190.3,557.5 185.3,559 183.9,557.2 184.8,552.6 179.7,551.5 180.8,547.5 183.7,544.5 183.6,541.9 179.6,540.6 180.6,535.8 178.6,535.5 179.2,532.4 181.4,530.8 186.9,530.4 184,527.6 186.8,525.2 185.5,523.2 183.4,525 181.2,524.1 178.9,526.6 173.7,526.5 170.8,527.3 169.7,524 166.1,520.6 163.2,522.2 160.7,519.9 163.4,516 158.3,512.8 158.3,509.1 160.5,502.1 160.8,499 163.9,499.4 167.7,505.9 166.3,508.5 168.8,517.5 178.9,520.9 179.8,518.6 175.8,517.9 173.4,514.9 173.9,511.9 170.6,514.1 169.8,508.4 170.1,504.3 177.5,505.2 177.9,509.7 186.6,516.1 185,512.5 186.3,512.3 190.8,514.9 193.8,515 188.9,510.9 184,503.7 179.4,502.1 176.3,502.2 174.1,500.8 171.4,501.4 168.6,499.3 171.7,496.8 174.9,497.4 179,495.7 183.9,499.4 187,500.1 186.8,495.4 190.8,493.2 198.1,495 197.4,493.3 201.1,492.5 199.5,490.6 191.5,490.5 191.7,486.1 193.2,483.9 192.4,480.6 189.3,480.8 187.9,483.4 188.5,487 184.7,495.4 181.9,494.7 183.5,492 182.1,491.2 178.6,492.8 175.9,492.1 174.7,493.9 170.9,494.5 169.5,492.5 173.8,487 173.9,483.2 175.7,481.1 174.3,480 172.6,475.3 173,473.2 177.2,469.4 174.5,468.6 170.1,470.8 170.7,474.8 167.2,476.3 164.1,474.6 165.5,473.8 162.7,470.1 167.8,470.3 167.6,467.5 170.6,464.6 169.9,461.9 167,457.5 163.2,455 163.9,458 161.6,459.7 161.2,456.3 158.5,452.6 159.8,448.6 166.1,450.7 167.8,446.3 168.5,447.8 167.8,454.2 169.5,456.7 174.8,458.9 174.3,461.8 176.1,464.3 179,458.3 179.3,454 175.3,451.4 174.3,448.4 170.1,442.3 171.6,439.3 170.3,435.7 164.5,436.3 165.7,434.9 171.8,434 169.6,433 172.6,429 172,426.4 173.4,422.4 175.8,418.9 177.9,421.6 180.7,422.2 178.5,418.8 191.2,415.6 194.2,416.5 192.5,428.2 195.1,429.2 205.2,426.8 211.9,423.7 214.2,420.6 214,417.9 216.4,415.5 216.4,412.1 219.1,409.7 222.6,410.1 224.5,408.1 228.3,409.1 231.4,411.8 236.3,418.6 239.5,418.6 240.6,415.1 242.5,412.8 245.5,412.7 247.6,416 246.6,419.7 249.4,424.6 249.1,428.9 251.6,431.7 255.5,432.3 258.6,430.6 265.9,429.7 269.4,432.1 273.3,432.2 284,431.4 287.2,428.1 291,426.1 297.8,428.6 303.8,433.5 303.2,436.4 305.4,439 306.4,442.3 306.7,449.2 308.1,451.8 313.1,456.3 315.1,461.4 321.7,468.7 323.3,475.2 M221.9,444 227.7,447.6 234.2,448.8 238.5,443.3 236.5,437.3 231,435.2 225.3,436.5 221.5,435.4 219.2,437.5 221.9,444Z"/>
<path class="kr-land" d="M461.2,462.8 460.3,463.9 455.9,460.1 457.8,457.9 460.5,460.6 461.2,462.8 M472.1,449.2 471.5,450.3 463.7,451 464.1,457.4 461.7,458.5 457.7,454.8 454.9,457.7 452.3,463.3 450.6,460.6 450.9,464.5 449.3,463.4 447.2,464.8 445.5,461 446.9,453.2 450.9,447.2 452.1,439.5 455.5,436.3 460.8,435.4 462.8,436.6 463.5,439.5 472.1,449.2Z"/>
<path class="kr-land" d="M336.2,354.8 336.8,346.5 332.6,339.1 337.8,337 340.4,330.6 342.3,327.9 341.9,320.5 344.5,318.3 349.3,319 348.1,312.2 345.7,310.5 340.4,311.7 335.4,308.2 332.9,307.3 328.6,308.3 328.1,302.1 332,297.2 330.2,292.8 331.4,282.6 334.4,277.9 329.4,270.4 325.2,269.7 324.1,266.6 327.2,265.7 331.1,261 331.9,256.9 338.9,253.1 341.2,249.7 345.2,251.5 352.6,252.7 349.1,247.2 352.5,239.6 356.2,240.6 359.7,237.2 364.6,239.4 367.6,239.7 368.9,235.5 371.4,232.5 376.9,237.4 378.5,240.6 382.1,241.8 390.9,238.2 392.5,233.1 390.4,230.6 395.2,222.5 400.6,217.5 402.8,216.8 410.6,209.8 414.5,208.1 419.7,210.6 425.5,211.5 426.5,205.7 425.7,202.5 430.5,198.9 433.3,199.2 434.8,201.7 438.6,203.1 438.6,207.6 444.6,204.1 446.8,205.8 453.4,206.1 457.2,207.8 462.8,205.6 469.5,208.4 470.6,211.4 468.1,213.2 465.1,212.1 461.4,214.1 460.6,217.4 461.1,221.5 463.2,224.8 466.6,226.4 468.5,231.5 473.1,233.8 480.7,234.4 480.3,237.3 482,239.1 479.5,245.9 481.1,255.5 479.9,258.6 487.2,261.3 490.5,259.8 495.1,260.6 495.7,265.9 497.1,271.3 497.7,276.6 497.1,287.7 496.5,290.1 493.2,294 491.5,298.8 491.1,314.5 493.4,318.9 494.8,326.7 496.2,328 495,331.2 491.1,333.5 491,335.3 496.5,341.2 498.6,341.5 501.4,339.4 508,332.1 509.3,329.9 511,331.2 512.8,338.4 507.4,348.5 506,360.8 503.3,368.5 503.5,373.3 500.7,381.7 497.8,387.9 499.5,391.1 491,389.2 481.2,391 478.1,389.5 476.8,384.3 469.4,381.9 461.3,384.1 457.7,386.8 459.4,390.3 451.7,395.3 448.8,396.3 441.6,393.8 437.7,395.4 435.1,398.2 432.1,399 428.6,401.7 424.6,401.5 417.9,398.7 410.1,399.9 406.7,397.7 404.1,394.5 403.2,387.3 400.8,389.2 398.1,392.8 395.2,392.3 389.5,395.2 386.6,394.5 381,391.1 368.2,390.6 366.6,384.6 368,378.6 365,376 358.3,367.1 355.6,366.1 349.5,365.9 346.5,363.5 341.6,362.6 341.1,360.5 337,357.7 336.2,354.8 M421.7,360.2 425.2,358.6 425.5,352.3 423.5,350.1 424.1,344.9 422.8,342.6 418.5,339.5 406.3,340.7 401.3,344.8 401.9,350.7 399,355.2 400.8,355.7 400.2,358.3 396.9,358.5 395.5,360.5 396.1,363 399.2,365.1 400.5,367.5 404.6,370.7 408.5,366.2 418,368.2 420.3,366.8 421.7,360.2 M649.3,142.8 647,149 642.5,149.5 638.1,146 637.5,143.4 640.2,140.1 647.5,138.2 649.4,139.5 649.3,142.8Z"/>
<path class="kr-land" d="M278.3,277.1 275.9,276.9 264.2,279.8 257,281.6 247.5,279.6 250.1,275.4 250.2,255.7 252.8,249 267.5,255.2 265.4,259.7 265.5,261.8 263.6,269.5 271.4,268.1 279.3,268.8 278.3,277.1Z"/>
<path class="kr-land" d="M264.2,279.8 275.9,276.9 278.3,277.1 280.6,281.8 280.1,284.1 283.3,285 286.7,284.3 287.9,282.6 290.5,285.1 291.6,290.9 288.1,301.7 279.1,307.7 273.9,309 271.9,301.9 271.5,292.5 269.7,288.7 264.2,279.8Z"/>
<path class="kr-land" d="M499.5,391.1 500.4,392.6 499.1,403.7 496.3,408.3 494.7,409.2 493.4,403.9 490.5,401.3 489.6,403.8 491.9,405.2 492,410.4 488.8,411.8 489.6,417.6 487.7,420.8 489.2,424.5 485,426.5 482,429.4 479.5,429.5 476,428.1 473.7,425.7 473,422.1 465,417.3 460.5,412.1 457.7,410 451.2,409 449.5,405.8 452.2,400.5 451.7,395.3 459.4,390.3 457.7,386.8 461.3,384.1 469.4,381.9 476.8,384.3 478.1,389.5 481.2,391 491,389.2 499.5,391.1Z"/>
<path class="kr-land" d="M177.4,146.6 184,142.9 189.6,142.7 191.7,141.7 192.6,138.8 199,141 200.3,142.6 201,144.2 193,147.2 190.8,149.5 186.3,152.8 183.9,152.6 181.8,149.5 180.1,150.5 177.4,146.6 M214.8,159.2 214.5,158.3 209.1,157.5 206.5,160.6 203.9,158.6 206.5,154.3 202.1,150.8 202.1,146.6 203.2,144.8 207.1,143.6 203.4,143.4 202.7,139.7 203.3,136.6 213.3,136.5 219.2,142.5 220.2,148.1 222.8,150.8 220.2,156.8 214.8,159.2Z"/>
<path class="kr-land" d="M242.6,51.3 248.9,46.1 255.5,42.1 262.5,39.5 269,38.9 272.3,39.4 285,38.5 294.6,41.5 303.7,39.6 323.5,38.2 328.2,42.3 335,41 345.7,41.7 352.7,41.2 359.7,38.8 366.3,34.6 371.8,29 376.2,22.1 377.5,18.1 378,13.5 377,6.8 380.5,3 386.2,0 393.9,15.4 397.2,25.8 406.1,43.6 413.1,62.4 417.9,69 419.3,72.8 443,106.9 457.5,122.9 458.5,131.5 462.1,133.5 466.2,145.5 470.5,150.1 475.2,159.3 478.1,162.8 480.2,168.8 485.2,174.3 486.8,178.8 488.3,188.6 490.3,194.1 495.6,201.4 496,203 493.9,207.3 495.5,224.2 496.5,229.5 500.1,240.5 500.4,245.8 499.3,250.8 495.1,260.6 490.5,259.8 487.2,261.3 479.9,258.6 481.1,255.5 479.5,245.9 482,239.1 480.3,237.3 480.7,234.4 473.1,233.8 468.5,231.5 466.6,226.4 463.2,224.8 461.1,221.5 460.6,217.4 461.4,214.1 465.1,212.1 468.1,213.2 470.6,211.4 469.5,208.4 462.8,205.6 457.2,207.8 453.4,206.1 446.8,205.8 444.6,204.1 438.6,207.6 438.6,203.1 434.8,201.7 433.3,199.2 430.5,198.9 425.7,202.5 426.5,205.7 425.5,211.5 419.7,210.6 414.5,208.1 410.3,205.8 405,204.9 399.7,201.2 390.6,202.6 387.9,198.7 387,195.7 382.1,196.3 377.9,197.7 374.5,195.5 376.3,192.8 379.2,190.7 380.5,188 372.7,186.5 366.9,184.3 362.5,187.2 359.9,186.6 354.4,190.1 351,190.9 349.7,186.3 345.8,182.1 340.5,183.9 338.5,186.3 339,192.5 335.4,195.5 330.5,194.3 327.3,195 328.3,188.7 317.2,190.1 306.1,192.9 311.9,182.6 316.7,171.4 323.3,157.9 323.5,152.1 330.1,144.3 327.4,141 318.9,139.2 308,133 302.4,133.4 300.1,131.4 301.4,127.1 302,121.9 299.2,122.8 298.1,121.2 301.1,117.7 299.9,113 300.3,107.1 308.9,100.9 309.5,95.6 307.2,91.9 303.3,90.5 301.9,86.7 297.2,86.6 294.6,84.6 293.4,81.2 293,75.1 291.4,71.4 287.5,70.8 283.2,72.3 279.4,71.3 276.2,68.8 276.1,66.3 278,62.3 275.7,61.7 272,65.5 267.6,64.4 266.4,61.4 265.3,63.5 265.2,67.8 263.8,69.8 260.1,68 255.5,63.5 254.3,63.7 249.7,55.7 242.6,51.3Z"/>
<path class="kr-land" d="M171.5,272.6 170.8,265 169.9,261.4 172.7,258.5 174.7,257.9 176.3,261 174.9,262.5 176.6,267.4 176.4,269.7 179,273.1 176.8,273.8 179,274.8 179.7,280 181.5,284.3 174.4,283.6 172.6,278.1 174.6,275.5 170.9,275.7 171.5,272.6 M267.5,255.2 252.8,249 250.2,255.7 250.1,275.4 247.5,279.6 257,281.6 264.2,279.8 269.7,288.7 271.5,292.5 271.9,301.9 273.9,309 279.1,307.7 288.1,301.7 291.6,290.9 294.8,287.8 297.6,289 290.9,300.8 289.5,305.7 289.5,313 293,312.4 299.2,315.5 300.3,319.4 300.1,323.9 300.9,328.3 305.4,335.9 300.2,340.5 291.7,342 285.6,341.1 285.4,337.3 280.5,335.1 275.9,326.5 272.6,323.5 269.4,327.4 264.1,329 252.2,331.6 250,328.1 251.1,322.4 247.2,321.5 236.3,324.7 225.2,326.3 220.4,332 218.2,332.6 214.2,335.7 207.6,337.9 206,337 204.8,333.3 201.4,327.9 202.8,326.8 199.5,324.8 197.2,320.6 190.9,317.5 188.8,317.8 187.7,321 187.5,316.6 194.4,313.9 198.8,315.4 196.4,311.7 193.1,310.8 191.7,309 195.4,300.3 195.9,297.9 189.8,295.5 191.5,294.1 196.1,293.1 196.5,290.1 191.4,289.4 188.7,286.6 190.1,285.8 188.6,282.8 192.7,281.2 194.8,278.4 201.2,276.3 195.1,276.1 191.2,280.2 188.6,279.2 187.2,272.8 190.5,268.8 186,267.2 184.9,259.9 190.6,259.1 191.5,256.1 187.8,253 190.4,250.4 189.5,248.6 187,248 187.4,244.3 189.8,243.9 187.7,240.3 183.6,243.3 184.1,248.5 183.6,254.4 181.4,258.5 175.5,255.4 176.9,245.9 175.7,245.2 176.2,241.9 173.4,240.8 171.3,246.1 168.9,246.1 172.3,253.3 171.2,255.4 172.9,257.7 169.9,258.8 167.8,261.2 167.2,257.6 168.8,254.5 165.8,249.4 166.8,246.8 166.1,243.3 161.3,247.7 157,249 154.6,248.3 154.3,244.7 159.8,244.2 158.8,240.1 154.2,237.6 153.2,242.4 151.3,245 151,237.5 154.1,233.3 155.2,230.5 157.1,235 160,235.2 157.9,231.5 160.8,232.5 162.9,230.7 158.6,229.7 160.3,225.3 158,223.3 158.2,221.5 162.6,219.2 162.1,223.3 166.1,223.7 167.5,222.1 168.3,212 170.6,211.4 170.3,215.9 171.9,222.3 169.5,225.6 170.2,229.2 167.3,231.3 168.2,234.3 172.1,232.5 175,234.6 172.3,227 173.4,225.7 176.1,228.6 176.6,227.2 180.3,225.9 177.4,224 181.5,220.3 181.2,215.3 177.6,214.8 175.3,213 177,212.5 177,209.3 173.5,208.8 176.5,207 179.7,208.2 179.4,206.3 185,207 185.7,208.7 183.5,212.3 184.1,214.5 187.3,213 188.3,216.8 186.8,219 186.6,224.8 188.5,228.1 192.5,214.4 195.5,217.4 197.5,221 199,221 196.6,215.2 190,207.9 191.3,206.8 195.8,211.2 198.1,210.7 197.5,209 194.1,207.5 192,205.5 191,200.5 192.8,200.5 203.8,208.5 204.8,210.3 203.2,213.2 204.4,216.1 204.1,219.4 206,216.6 205.7,213.4 207.8,209.5 213,209 217.5,210.6 221.4,214.1 221.5,216.8 219.7,222.5 224.1,219 225.2,222 224.7,230.3 226.4,236 224.3,237.6 226.5,240.4 228.8,233.9 228,230.7 232.3,231.7 227.8,225.4 236.5,222.5 238.5,221 247.4,222.3 256.1,218.7 260.6,220.8 264.6,224.3 269.5,225 275.9,233.7 275.8,236.5 277.5,240 275.6,246.3 273.7,246.5 267.5,255.2Z"/>
<path class="kr-land" d="M219.5,679.1 215.7,687.2 209.2,687.6 204.9,690.8 193.9,692.6 190.1,695.6 185.5,696.5 180.7,695.9 175.2,696.8 170.6,695.4 160.3,695.2 157,696.6 155,700 151.5,699.4 149.1,695.4 145.8,694.1 142.7,690.7 141.7,686.6 143.8,681.4 146.9,677 150.7,674.9 154.1,669.4 157.1,668.7 158.5,665.8 174.8,661.3 177.7,659 188.3,658.1 195.5,655.2 197.3,655.7 211.2,654.2 214.5,654.8 217.4,658 222.6,660.2 224.1,661.9 226.1,667.3 228.5,667.4 226.1,669 226.8,671.7 223.2,676.2 219.5,679.1Z"/>
<path class="kr-land" d="M269.5,225 274.2,223.8 282.1,220.6 283.2,216.8 287.5,213.9 291.4,208.5 294,209.7 296.6,207.9 302.9,196.7 306.1,192.9 317.2,190.1 328.3,188.7 327.3,195 330.5,194.3 335.4,195.5 339,192.5 338.5,186.3 340.5,183.9 345.8,182.1 349.7,186.3 351,190.9 354.4,190.1 359.9,186.6 362.5,187.2 366.9,184.3 372.7,186.5 380.5,188 379.2,190.7 376.3,192.8 374.5,195.5 377.9,197.7 382.1,196.3 387,195.7 387.9,198.7 390.6,202.6 399.7,201.2 405,204.9 410.3,205.8 414.5,208.1 410.6,209.8 402.8,216.8 400.6,217.5 395.2,222.5 390.4,230.6 392.5,233.1 390.9,238.2 382.1,241.8 378.5,240.6 376.9,237.4 371.4,232.5 368.9,235.5 367.6,239.7 364.6,239.4 359.7,237.2 356.2,240.6 352.5,239.6 349.1,247.2 352.6,252.7 345.2,251.5 341.2,249.7 338.9,253.1 331.9,256.9 331.1,261 327.2,265.7 324.1,266.6 325.2,269.7 329.4,270.4 334.4,277.9 331.4,282.6 330.2,292.8 332,297.2 328.1,302.1 328.6,308.3 332.9,307.3 335.4,308.2 340.4,311.7 345.7,310.5 348.1,312.2 349.3,319 344.5,318.3 341.9,320.5 342.3,327.9 340.4,330.6 337.8,337 332.6,339.1 329.8,341.7 326.8,339.4 319.4,343.1 312.1,339.7 308.8,336.8 307.2,337.9 305.4,335.9 300.9,328.3 300.1,323.9 300.3,319.4 299.2,315.5 293,312.4 289.5,313 289.5,305.7 290.9,300.8 297.6,289 294.8,287.8 291.6,290.9 290.5,285.1 287.9,282.6 286.7,284.3 283.3,285 280.1,284.1 280.6,281.8 278.3,277.1 279.3,268.8 271.4,268.1 263.6,269.5 265.5,261.8 265.4,259.7 267.5,255.2 273.7,246.5 275.6,246.3 277.5,240 275.8,236.5 275.9,233.7 269.5,225Z"/>
<path class="kr-land" d="M256.2,137.6 263.6,136.8 264,140.6 261,142.4 261.8,145.7 259,149.7 250.2,153.4 249,150.6 240.1,153.2 235.7,152.9 232.8,148.8 227.7,146.5 227.3,142.8 222.9,136.8 224.6,133.5 227.4,133.7 230.7,135.8 235.4,133.7 236.3,129.5 240.9,129.2 244.8,123.2 247,121 250.2,120.3 253.9,120.6 255.6,123.7 257.2,130.8 257.2,133.9 256.2,137.6Z"/>
<path class="kr-land" d="M421.7,360.2 420.3,366.8 418,368.2 408.5,366.2 404.6,370.7 400.5,367.5 399.2,365.1 396.1,363 395.5,360.5 396.9,358.5 400.2,358.3 400.8,355.7 399,355.2 401.9,350.7 401.3,344.8 406.3,340.7 418.5,339.5 422.8,342.6 424.1,344.9 423.5,350.1 425.5,352.3 425.2,358.6 421.7,360.2Z"/>
<path class="kr-land" d="M221.9,444 219.2,437.5 221.5,435.4 225.3,436.5 231,435.2 236.5,437.3 238.5,443.3 234.2,448.8 227.7,447.6 221.9,444Z"/>
</g>`;
}

/** 카드용 날씨 아이콘 (로컬 좌표 0~40 × 0~36) */
function weatherMapGlyph(icon) {
  const kind = String(icon || "cloudy");
  if (kind === "clear") {
    return `<g><circle cx="20" cy="18" r="11" fill="#f5b942"/><circle cx="20" cy="18" r="6" fill="#ffd666"/></g>`;
  }
  if (kind === "rain") {
    return `<g><ellipse cx="20" cy="14" rx="14" ry="9" fill="#9ca3af"/><path d="M12 26v10M20 28v10M28 26v10" stroke="#4b8fd9" stroke-width="3.2" stroke-linecap="round"/></g>`;
  }
  if (kind === "snow") {
    return `<g><ellipse cx="20" cy="14" rx="14" ry="9" fill="#9ca3af"/><circle cx="12" cy="30" r="3" fill="#7eb6e8"/><circle cx="20" cy="33" r="3" fill="#7eb6e8"/><circle cx="28" cy="30" r="3" fill="#7eb6e8"/></g>`;
  }
  if (kind === "sleet") {
    return `<g><ellipse cx="20" cy="14" rx="14" ry="9" fill="#9ca3af"/><path d="M14 26v8M26 26v8" stroke="#4b8fd9" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="33" r="2.8" fill="#7eb6e8"/></g>`;
  }
  if (kind === "overcast") {
    return `<g><ellipse cx="20" cy="20" rx="16" ry="11" fill="#8b93a1"/></g>`;
  }
  // cloudy
  return `<g><circle cx="28" cy="12" r="8" fill="#f5b942"/><ellipse cx="16" cy="22" rx="14" ry="9" fill="#c5cad3"/></g>`;
}

function renderNationwideWeatherMap(regions) {
  const bySido = {};
  for (const r of regions || []) {
    if (r?.sido) bySido[r.sido] = r;
  }
  const markers = Object.entries(WEATHER_MAP_POS)
    .map(([sido, pos]) => {
      const w = bySido[sido] || {};
      const tempRaw = w.temp !== "" && w.temp != null ? String(w.temp) : "";
      const temp = tempRaw ? `${tempRaw}°` : "—";
      return `
        <g class="kr-marker-wrap" transform="translate(${pos.x},${pos.y})">
          <g class="kr-marker" data-sido="${escapeHtml(sido)}" role="button" tabindex="0">
            <text class="kr-label" x="0" y="-58" text-anchor="middle" font-size="18">${escapeHtml(pos.short)}</text>
            <rect class="kr-card" x="-32" y="-48" width="64" height="78" rx="14" ry="14"/>
            <g transform="translate(-20,-42)">${weatherMapGlyph(w.icon || "cloudy")}</g>
            <text class="kr-temp" x="0" y="20" text-anchor="middle" font-size="20">${escapeHtml(temp)}</text>
          </g>
        </g>`;
    })
    .join("");

  return `
    <div class="weather-map-wrap">
      <svg class="weather-map" viewBox="-5 -5 710 730" role="img" aria-label="${uiLang === "en" ? "Korea weather map" : "전국 날씨 지도"}">
        <rect class="kr-sea" x="-5" y="-5" width="710" height="730"/>
        ${koreaMapOutlineSvg()}
        ${markers}
      </svg>
    </div>`;
}

function bindWeatherMapClicks(root) {
  root.querySelectorAll(".kr-marker").forEach((node) => {
    node.addEventListener("mouseenter", () => {
      const wrap = node.closest(".kr-marker-wrap");
      wrap?.parentNode?.appendChild(wrap);
    });
    const go = () => {
      const sido = node.getAttribute("data-sido") || "";
      if (!sidoSelect || !sido) return;
      if (![...sidoSelect.options].some((o) => o.value === sido)) return;
      sidoSelect.value = sido;
      sidoSelect.dispatchEvent(new Event("change"));
    };
    node.addEventListener("click", go);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
}

async function loadAiWeather() {
  const el = document.getElementById("weatherBody");
  const titleEl = document.querySelector("#weatherCard .ai-side-title");
  if (!el) return;
  const sido = sidoSelect?.value || "";
  if (titleEl) titleEl.textContent = sido ? (uiLang === "en" ? "Weather" : "날씨") : (uiLang === "en" ? "Nationwide" : "전국 날씨");
  el.innerHTML = `<p class="weather-empty">${uiLang === "en" ? "Loading weather…" : "날씨 불러오는 중…"}</p>`;
  try {
    if (!sido) {
      const res = await fetch("/api/weather?all=1");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        el.innerHTML = `<p class="weather-empty">${escapeHtml(
          uiLang === "en" ? "Weather unavailable." : data.message || "날씨를 불러오지 못했습니다."
        )}</p>`;
        return;
      }
      el.innerHTML = renderNationwideWeatherMap(data.regions || []);
      bindWeatherMapClicks(el);
      return;
    }

    const qs = new URLSearchParams({ sido });
    const res = await fetch(`/api/weather?${qs}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      el.innerHTML = `<p class="weather-empty">${escapeHtml(
        uiLang === "en" ? "Weather unavailable." : data.message || "날씨를 불러오지 못했습니다."
      )}</p>`;
      return;
    }
    const place = data.sido || sido;
    const temp = data.temp !== "" && data.temp != null ? `${data.temp}°` : "—";
    const sky = data.sky || "";
    const bits = [];
    if (data.humidity) bits.push(`${uiLang === "en" ? "Humidity" : "습도"} ${data.humidity}%`);
    if (data.wind) bits.push(`${uiLang === "en" ? "Wind" : "바람"} ${data.wind}m/s`);
    if (data.rain1h && data.rain1h !== "0" && data.rain1h !== "강수없음") {
      bits.push(`${uiLang === "en" ? "Rain" : "강수"} ${data.rain1h}`);
    }
    el.innerHTML = `
      <div class="weather-place">${escapeHtml(place)}</div>
      <div class="weather-row">
        ${weatherIconSvg(data.icon)}
        <div class="weather-main">
          <div class="weather-temp">${escapeHtml(temp)}</div>
          <div class="weather-sky">${escapeHtml(sky)}</div>
        </div>
      </div>
      ${bits.length ? `<p class="weather-meta">${escapeHtml(bits.join(" · "))}</p>` : ""}`;
  } catch {
    el.innerHTML = `<p class="weather-empty">${uiLang === "en" ? "Weather unavailable." : "날씨를 불러오지 못했습니다."}</p>`;
  }
}

function aiPopularCardHtml(post, catLabel) {
  if (!post) {
    return `<p class="ai-popular-empty">${uiLang === "en" ? "No posts yet." : "아직 게시글이 없습니다."}</p>`;
  }
  const title = postField(post, "locationTitle") || postField(post, "content")?.slice(0, 40) || `게시글 #${post.postId}`;
  const place = [postField(post, "address"), post.detailAddress].filter(Boolean).join(" · ");
  const letter = String(title).charAt(0) || "?";
  const thumb = post.imageUrl
    ? `<img src="${escapeHtml(post.imageUrl)}" alt="" loading="lazy">`
    : escapeHtml(letter);
  return `
    <button type="button" class="ai-popular-card" data-post-id="${Number(post.postId) || 0}">
      <div class="ai-popular-thumb">${thumb}</div>
      <div class="ai-popular-body">
        <p class="ai-popular-title">${escapeHtml(title)}</p>
        <p class="ai-popular-meta">${escapeHtml(catLabel)}${place ? ` · ${escapeHtml(place)}` : ""} · ♥ ${Number(post.recommendCount) || 0}</p>
      </div>
    </button>`;
}

async function fetchTopPost(category) {
  const qs = new URLSearchParams({ category });
  const mid = currentUser?.memberId;
  if (mid) qs.set("viewerId", String(mid));
  const res = await fetch(`/api/posts?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "posts failed");
  const sorted = sortBoardPosts(data.posts || [], "likes");
  return sorted[0] || null;
}

async function loadAiPopularPosts() {
  const domesticEl = document.getElementById("aiPopularDomestic");
  const foreignEl = document.getElementById("aiPopularForeign");
  if (!domesticEl || !foreignEl) return;
  const loading = uiLang === "en" ? "Loading…" : "불러오는 중…";
  domesticEl.innerHTML = `<p class="ai-popular-empty">${loading}</p>`;
  foreignEl.innerHTML = `<p class="ai-popular-empty">${loading}</p>`;
  try {
    const [dom, forPost] = await Promise.all([
      fetchTopPost("DOMESTIC").catch(() => null),
      fetchTopPost("FOREIGN").catch(() => null),
    ]);
    domesticEl.innerHTML = aiPopularCardHtml(dom, uiLang === "en" ? "Local" : "내국인");
    foreignEl.innerHTML = aiPopularCardHtml(forPost, uiLang === "en" ? "Foreign" : "외국인");
    domesticEl.querySelector(".ai-popular-card")?.addEventListener("click", () => {
      const id = Number(domesticEl.querySelector(".ai-popular-card")?.dataset.postId);
      if (id) openDetail(id);
    });
    foreignEl.querySelector(".ai-popular-card")?.addEventListener("click", () => {
      const id = Number(foreignEl.querySelector(".ai-popular-card")?.dataset.postId);
      if (id) openDetail(id);
    });
  } catch {
    const msg = uiLang === "en" ? "Could not load posts." : "게시글을 불러오지 못했습니다.";
    domesticEl.innerHTML = `<p class="ai-popular-empty">${msg}</p>`;
    foreignEl.innerHTML = `<p class="ai-popular-empty">${msg}</p>`;
  }
}

function refreshAiSidebar() {
  loadAiWeather();
  loadAiPopularPosts();
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
  let ranked = 0;

  resultsEl.innerHTML = sorted
    .map((gem) => {
      const location = displayGemLocation(gem);
      const name = displayGemName(gem);
      const key = gemKey(gem);
      const canRank = gemHasRank(gem);
      const rank = canRank ? ++ranked : null;
      const rankHtml = canRank
        ? `<span class="gem-rank" aria-label="${rank}위">${rank}</span>`
        : `<span class="gem-rank gem-rank--na" aria-label="순위 없음">-</span>`;
      return `
        <li class="post-item gem-item" data-key="${escapeHtml(key)}" role="button" tabindex="0">
          ${rankHtml}
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

/** 서버가 목록에 실어 준 thumbnail/detail 을 로컬 캐시에 반영 */
function hydrateGemsFromServerPayload(gems) {
  for (const g of gems || []) {
    const key = gemKey(g);
    if (g.detail && typeof g.detail === "object") {
      placeDetailCache.set(key, g.detail);
      if (g.detail.found && g.detail.image && !g.thumbnail) {
        g.thumbnail = g.detail.image;
      }
      if (g.detail.contentId) {
        placeDetailCache.set("cid:" + g.detail.contentId, g.detail);
      }
    }
  }
}

function gemsReadyForDisplay(gems) {
  return (gems || []).filter((g) => {
    if (!g.thumbnail) return false;
    const detail = placeDetailCache.get(gemKey(g));
    return !!(detail && detail.found === true);
  });
}

/** 표시 개수(need)만큼 상세가 모이면 중단 */
async function prefetchPlaceDetailsUntil(gems, need) {
  if (!gems?.length || need <= 0) return;
  const queue = gems.filter((g) => !placeDetailCache.has(gemKey(g)));
  if (!queue.length) return;

  const worker = async () => {
    while (queue.length) {
      if (gemsReadyForDisplay(gems).length >= need) {
        queue.length = 0;
        break;
      }
      const gem = queue.shift();
      if (!gem) break;
      try {
        await fetchPlaceDetail(gem);
      } catch {
        /* ignore */
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
    all[key] = (gems || []).map(slimGemForSession);
    sessionStorage.setItem(AI_SESSION_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota 등 — 상세 JSON 없이 한 번 더 시도 */
    try {
      const all = readAiSessionStore();
      all[key] = (gems || []).map((g) => {
        const slim = slimGemForSession(g);
        delete slim.detail;
        return slim;
      });
      sessionStorage.setItem(AI_SESSION_CACHE_KEY, JSON.stringify(all));
    } catch {
      /* 무시 */
    }
  }
}

/** sessionStorage 용량 절약 — 전체 detail JSON 대신 표시에 필요한 필드만 */
function slimGemForSession(g) {
  const copy = {
    resNm: g.resNm,
    sido: g.sido,
    gungu: g.gungu,
    addrCd: g.addrCd,
    domesticVisitors: g.domesticVisitors,
    foreignVisitors: g.foreignVisitors,
    foreignShare: g.foreignShare,
    domesticRank: g.domesticRank,
    foreignRank: g.foreignRank,
    gemScore: g.gemScore,
    thumbnail: g.thumbnail || "",
    resNmEn: g.resNmEn,
  };
  const detail = placeDetailCache.get(gemKey(g)) || g.detail;
  if (detail && detail.found) {
    copy.detail = {
      found: true,
      image: detail.image || "",
      addr: detail.addr || detail.address || "",
      contentId: detail.contentId || "",
      title: detail.title || "",
    };
  }
  return copy;
}

function publishAiGemsForKey(key, gems) {
  const ready = (gems || []).slice();
  aiGemsByKey.set(key, ready);
  writeAiSessionCache(key, ready);
  if (aiCacheKey(sidoSelect?.value || "") !== key) return;
  currentGems = ready;
  aiGemsPool = ready.slice();
  applyGemSearchFilter();
  renderGems(currentGems);
  if (!currentGems.length) {
    const q = document.getElementById("gemSearch")?.value?.trim();
    showAiEmpty(sidoSelect?.value || "", !!q);
  }
}

async function enrichGemsInBackground(gems, key) {
  const needThumbs = gems.filter((g) => !g.thumbnail);
  if (needThumbs.length) {
    await loadThumbnails(needThumbs);
    const ready = gemsReadyForDisplay(gems);
    if (ready.length) publishAiGemsForKey(key, ready);
  }

  const queue = gems.filter((g) => !placeDetailCache.has(gemKey(g)));
  if (!queue.length) return;

  const worker = async () => {
    while (queue.length) {
      const gem = queue.shift();
      if (!gem) break;
      try {
        await fetchPlaceDetail(gem);
      } catch {
        /* 개별 실패는 무시 */
      }
      const ready = gemsReadyForDisplay(gems);
      if (ready.length) publishAiGemsForKey(key, ready);
    }
  };

  const n = Math.min(PLACE_PREFETCH_CONCURRENCY, queue.length);
  await Promise.all(Array.from({ length: n }, () => worker()));

  const ready = gemsReadyForDisplay(gems);
  if (ready.length) publishAiGemsForKey(key, ready);
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
  hydrateGemsFromServerPayload(gems);
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
    if (cached?.length) {
      aiGemsByKey.set(key, cached.slice());
      applyCachedAiGems(cached);
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

    const params = new URLSearchParams({ ym: DEFAULT_YM, limit: DEFAULT_LIMIT });
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

      // 서버가 캐시에서 붙여 준 사진·상세를 브라우저 캐시에 바로 반영
      hydrateGemsFromServerPayload(gems);

      let ready = gemsReadyForDisplay(gems);
      const needThumbs = gems.filter((g) => !g.thumbnail);
      const needDetails = gems.filter((g) => !placeDetailCache.has(gemKey(g)));
      const needWork = needThumbs.length > 0 || needDetails.length > 0;

      if (ready.length) {
        publishAiGemsForKey(key, ready);
        hideStatus(statusEl);
      }

      if (needWork) {
        if (!ready.length) {
          showStatus(
            statusEl,
            uiLang === "en" ? "Loading AI picks" : "AI 계산중",
            "info"
          );
        }
        await enrichGemsInBackground(gems, key);
      }

      ready = gemsReadyForDisplay(gems);
      const stillCurrent = aiCacheKey(sidoSelect?.value || "") === key;
      if (!stillCurrent) {
        if (ready.length) publishAiGemsForKey(key, ready);
        return;
      }

      if (uiLang === "en" && ready.length) {
        showStatus(statusEl, t("translating"), "info");
        try {
          await translateCurrentGems();
        } catch (err) {
          console.warn(err);
        }
      }
      hideStatus(statusEl);
      if (ready.length) {
        publishAiGemsForKey(key, ready);
      } else {
        currentGems = [];
        aiGemsPool = [];
        aiGemsByKey.set(key, []);
        writeAiSessionCache(key, []);
        showAiEmpty(sido, false);
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
    const sido = String(g.sido || "").toLowerCase();
    const gungu = String(g.gungu || "").toLowerCase();
    const detail = placeDetailCache.get(gemKey(g));
    const addr = String(detail?.addr || detail?.address || "").toLowerCase();
    return (
      name.includes(q) ||
      nameEn.includes(q) ||
      sido.includes(q) ||
      gungu.includes(q) ||
      addr.includes(q)
    );
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
        <div id="transitOriginManual" class="transit-origin-manual" hidden>
          <label for="transitOriginInput" class="sr-only">${
            uiLang === "en" ? "Departure address" : "출발지 주소"
          }</label>
          <input id="transitOriginInput" type="text" placeholder="${
            uiLang === "en" ? "Enter departure address" : "출발지 주소 입력 (예: 서울역)"
          }" autocomplete="street-address">
          <button type="button" class="btn-ghost" id="transitOriginSearchBtn">${
            uiLang === "en" ? "Search route" : "경로 검색"
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

async function getGeolocationPermissionState() {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state || "unknown"; // granted | denied | prompt
  } catch {
    return "unknown";
  }
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
        const denied = err?.code === 1;
        let msg = uiLang === "en" ? "Could not get location." : "위치를 가져오지 못했습니다.";
        if (denied) {
          msg =
            uiLang === "en"
              ? "Location permission is blocked. Allow location for this site in browser settings, or enter a departure address below."
              : "위치 권한이 차단되어 있습니다. 브라우저 사이트 설정에서 위치를 허용한 뒤 다시 누르거나, 아래에 출발지 주소를 입력해 주세요.";
        } else if (err?.code === 2) {
          msg = uiLang === "en" ? "Location unavailable." : "위치를 확인할 수 없습니다.";
        } else if (err?.code === 3) {
          msg = uiLang === "en" ? "Location request timed out." : "위치 요청 시간이 초과되었습니다.";
        }
        const e = new Error(msg);
        e.code = err?.code;
        e.permissionDenied = denied;
        reject(e);
      },
      // maximumAge:0 → 캐시된 실패/옛 좌표에 막히지 않고 매번 새로 요청
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function showTransitOriginManual(show) {
  const box = document.getElementById("transitOriginManual");
  if (box) box.hidden = !show;
}

async function runTransitFromOrigin(origin, gem, data, statusEl) {
  const dest = await resolveDestCoords(gem, data);
  const cfg = await fetchPublicConfig();
  if (cfg.odsayApiKey) {
    const odsay = await searchOdsayTransit(origin, dest, cfg.odsayApiKey);
    renderOdsayTransit(odsay);
    statusEl.hidden = true;
  } else if (cfg.configMissing) {
    statusEl.textContent = "서버를 재시작한 뒤 다시 시도해 주세요.";
  } else {
    statusEl.textContent = uiLang === "en" ? "No route." : "경로를 찾지 못했습니다.";
  }
}

function bindTransitSection(gem, data) {
  const btn = document.getElementById("transitGpsBtn");
  const statusEl = document.getElementById("transitStatus");
  const originInput = document.getElementById("transitOriginInput");
  const originSearchBtn = document.getElementById("transitOriginSearchBtn");
  if (!btn || !statusEl) return;

  const setBusy = (busy) => {
    btn.disabled = busy;
    if (originSearchBtn) originSearchBtn.disabled = busy;
  };

  btn.addEventListener("click", async () => {
    setBusy(true);
    statusEl.hidden = false;
    statusEl.textContent = uiLang === "en" ? "Finding route…" : "경로 찾는 중…";
    try {
      const perm = await getGeolocationPermissionState();
      if (perm === "denied") {
        showTransitOriginManual(true);
        statusEl.textContent =
          uiLang === "en"
            ? "Location is blocked for this site. Allow it in browser settings (lock icon → Site settings), then try again — or enter a departure address below."
            : "이 사이트 위치 권한이 차단되어 있습니다. 주소창 자물쇠 → 사이트 설정에서 위치를 ‘허용’으로 바꾼 뒤 다시 누르거나, 아래에 출발지 주소를 입력해 주세요.";
        return;
      }
      const origin = await getCurrentPositionGps();
      showTransitOriginManual(false);
      await runTransitFromOrigin(origin, gem, data, statusEl);
    } catch (err) {
      statusEl.hidden = false;
      statusEl.textContent = err.message || (uiLang === "en" ? "Failed." : "실패했습니다.");
      if (err.permissionDenied || err.code === 1) {
        showTransitOriginManual(true);
      }
    } finally {
      setBusy(false);
    }
  });

  const runManualOrigin = async () => {
    const q = originInput?.value?.trim() || "";
    if (!q) {
      statusEl.hidden = false;
      statusEl.textContent =
        uiLang === "en" ? "Enter a departure address." : "출발지 주소를 입력해 주세요.";
      return;
    }
    setBusy(true);
    statusEl.hidden = false;
    statusEl.textContent = uiLang === "en" ? "Finding route…" : "경로 찾는 중…";
    try {
      const cfg = await fetchPublicConfig();
      await loadKakaoMapsSdk(cfg.kakaoJsKey || "");
      const origin = await geocodePlaceWithKakao(q);
      await runTransitFromOrigin(origin, gem, data, statusEl);
    } catch (err) {
      statusEl.hidden = false;
      statusEl.textContent = err.message || (uiLang === "en" ? "Failed." : "실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  originSearchBtn?.addEventListener("click", () => runManualOrigin());
  originInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runManualOrigin();
    }
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
  const detailAddress = p.detailAddress || "";
  const addrLine = [address, detailAddress].filter(Boolean).join(" · ");
  const content = postField(p, "content");
  const title = locationTitle
    ? `<h2 class="thread-title">${escapeHtml(locationTitle)}</h2>`
    : "";
  const place = addrLine
    ? `<p class="thread-place">${escapeHtml(addrLine)}</p>`
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
        ${title}
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
  const address = String(post.address || "").toLowerCase();
  const content = String(post.content || "").toLowerCase();
  return (
    title.includes(needle) ||
    titleEn.includes(needle) ||
    address.includes(needle) ||
    content.includes(needle)
  );
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
    <p class="detail-meta">${escapeHtml(
      [postField(p, "address"), p.detailAddress].filter(Boolean).join(" · ") || ""
    )}</p>
    ${
      p.detailAddress
        ? ""
        : `<p class="detail-meta muted">${
            uiLang === "en"
              ? "No detailed address — map/directions unavailable."
              : "세부주소 없음 · 지도·길찾기 불가"
          }</p>`
    }
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
    refreshAiSidebar();
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
  const detailEl = document.getElementById("writeDetailAddress");
  if (detailEl) detailEl.value = post.detailAddress || "";
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
  refreshAiSidebar();
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

function openWriteDialog(category) {
  if (!requireLogin("글쓰기는 로그인 후 이용할 수 있습니다.")) return;
  resetWriteForm();
  const cat = document.getElementById("writeCategory");
  if (cat) {
    cat.value = category === "FOREIGN" ? "FOREIGN" : "DOMESTIC";
  }
  writeDialog.showModal();
}

document.querySelectorAll(".board-write-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    openWriteDialog(btn.dataset.writeCategory || "DOMESTIC");
  });
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
  const detailAddress = document.getElementById("writeDetailAddress")?.value?.trim() || "";
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
      detailAddress,
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
    address: [post.address, post.detailAddress].filter(Boolean).join(" ").trim(),
    imageUrl: post.imageUrl || "",
    note: (post.content || "").slice(0, 200),
    resNm: "",
    sido: post.address || "",
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
  if (spotDeleteMode) {
    e.preventDefault();
    const seq = Number(spot.dataset.seq);
    if (!seq) return;
    if (selectedSpotSeqs.has(seq)) selectedSpotSeqs.delete(seq);
    else selectedSpotSeqs.add(seq);
    updateSpotDeleteSelectionUi();
    return;
  }
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

document.getElementById("courseSortPublic")?.addEventListener("change", () => {
  renderPublicCoursesFiltered();
});
document.getElementById("courseSearchBtnPublic")?.addEventListener("click", () => {
  renderPublicCoursesFiltered();
});
document.getElementById("goMyCoursesBtn")?.addEventListener("click", () => goToMyCourses());
document.getElementById("courseSearchPublic")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    renderPublicCoursesFiltered();
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
    const canEditSpots =
      courseDetailCtx === "my" && data.memberId === currentMemberId();
    spotDeleteMode = false;
    selectedSpotSeqs = new Set();
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
        return `<button type="button" class="course-spot" data-seq="${seq}" ${postAttr} ${gemAttr}>
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
    const spotsHeader = canEditSpots
      ? `<div class="course-spots-head">
          <h4>방문하는 장소 리스트</h4>
          <div class="course-spots-head-actions" id="courseSpotsHeadActions">
            <button type="button" class="btn-ghost course-spots-delete-btn" id="courseSpotsDeleteBtn">삭제</button>
          </div>
        </div>`
      : `<div class="course-spots-head"><h4>방문하는 장소 리스트</h4></div>`;
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
      <div class="course-spots" id="courseSpotsBlock">
        ${spotsHeader}
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
    document.getElementById("courseSpotsDeleteBtn")?.addEventListener("click", () => enterSpotDeleteMode());
  } catch (err) {
    alert(err.message || "코스를 열 수 없습니다.");
  }
}

let spotDeleteMode = false;
/** @type {Set<number>} */
let selectedSpotSeqs = new Set();

function updateSpotDeleteSelectionUi() {
  const block = document.getElementById("courseSpotsBlock");
  if (!block) return;
  block.classList.toggle("is-deleting", spotDeleteMode);
  block.querySelectorAll(".course-spot[data-seq]").forEach((el) => {
    const seq = Number(el.dataset.seq);
    el.classList.toggle("is-marked-delete", spotDeleteMode && selectedSpotSeqs.has(seq));
  });
  const confirmBtn = document.getElementById("courseSpotsDeleteConfirm");
  if (confirmBtn) {
    const n = selectedSpotSeqs.size;
    confirmBtn.textContent = n ? `확인 (${n})` : "확인";
    confirmBtn.disabled = n === 0;
  }
}

function enterSpotDeleteMode() {
  if (!currentCourse?.spots?.length) {
    alert("삭제할 장소가 없습니다.");
    return;
  }
  spotDeleteMode = true;
  selectedSpotSeqs = new Set();
  const actions = document.getElementById("courseSpotsHeadActions");
  if (actions) {
    actions.innerHTML = `
      <button type="button" class="btn-ghost" id="courseSpotsDeleteCancel">취소</button>
      <button type="button" class="btn-primary course-spots-delete-confirm" id="courseSpotsDeleteConfirm" disabled>확인</button>`;
    document.getElementById("courseSpotsDeleteCancel")?.addEventListener("click", () => exitSpotDeleteMode());
    document.getElementById("courseSpotsDeleteConfirm")?.addEventListener("click", () => confirmSpotDelete());
  }
  updateSpotDeleteSelectionUi();
}

function exitSpotDeleteMode() {
  spotDeleteMode = false;
  selectedSpotSeqs = new Set();
  const actions = document.getElementById("courseSpotsHeadActions");
  if (actions) {
    actions.innerHTML = `<button type="button" class="btn-ghost course-spots-delete-btn" id="courseSpotsDeleteBtn">삭제</button>`;
    document.getElementById("courseSpotsDeleteBtn")?.addEventListener("click", () => enterSpotDeleteMode());
  }
  updateSpotDeleteSelectionUi();
}

async function confirmSpotDelete() {
  if (!requireLogin() || !currentCourse?.courseId) return;
  const seqs = [...selectedSpotSeqs].sort((a, b) => a - b);
  if (!seqs.length) {
    alert("삭제할 장소를 선택하세요.");
    return;
  }
  if (!confirm(`선택한 ${seqs.length}개 장소를 삭제할까요?`)) return;
  const courseId = currentCourse.courseId;
  const confirmBtn = document.getElementById("courseSpotsDeleteConfirm");
  if (confirmBtn) confirmBtn.disabled = true;
  try {
    const res = await fetch(`/api/courses/${courseId}/spots`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMemberId(), seqs }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "삭제 실패");
    spotDeleteMode = false;
    selectedSpotSeqs = new Set();
    await loadMyCourses();
    await openCourseDetail(courseId, "my");
  } catch (err) {
    alert(err.message || "삭제 실패");
    if (confirmBtn) confirmBtn.disabled = selectedSpotSeqs.size === 0;
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
loadRegions().then(() => {
  refreshAiSidebar();
  loadHiddenGems();
});
