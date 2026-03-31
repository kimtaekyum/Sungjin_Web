(function () {
  let initialized = false;
  let revealObserver;
  let revealInstantMode = false;
  let visibilityListenerBound = false;
  const KAKAO_OPENCHAT_URL = "https://open.kakao.com/o/REPLACE_ME";

  function initNavToggle() {
    const navToggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!navToggle || !nav || navToggle.dataset.bound === "true") {
      return;
    }

    navToggle.dataset.bound = "true";

    navToggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 860) {
          nav.classList.remove("open");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.setAttribute("aria-label", "메뉴 열기");
        }
      });
    });
  }

  function markActiveMenu() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".site-nav a").forEach(function (link) {
      const href = (link.getAttribute("href") || "").toLowerCase();
      link.removeAttribute("aria-current");
      if (href === page) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function setupMobileCtaBar() {
    if (document.querySelector(".mobile-cta-bar")) {
      return;
    }

    const mobileCta = document.createElement("div");
    mobileCta.className = "mobile-cta-bar";
    mobileCta.innerHTML =
      '<a href="tel:02-2693-6123" aria-label="전화하기">전화하기</a>' +
      '<a href="https://blog.naver.com/sja6123" target="_blank" rel="noopener" aria-label="블로그 바로가기">블로그</a>' +
      '<a href="contact.html" aria-label="상담 문의 페이지로 이동">상담 문의</a>';
    document.body.appendChild(mobileCta);
  }

  function parseCsvLine(line) {
    const result = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }

    result.push(cell.trim());
    return result;
  }

  function parseCsv(text) {
    const lines = text
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });

    if (lines.length < 2) {
      return [];
    }

    const headers = parseCsvLine(lines[0]).map(function (h) {
      return h.replace(/^"|"$/g, "").trim().toLowerCase();
    });

    return lines.slice(1).map(function (line) {
      const values = parseCsvLine(line).map(function (v) {
        return v.replace(/^"|"$/g, "").trim();
      });
      const row = {};
      headers.forEach(function (key, idx) {
        row[key] = values[idx] || "";
      });
      return row;
    });
  }

  function normalizePosts(rawPosts) {
    return rawPosts
      .map(function (post) {
        return {
          title: post.title || "",
          date: post.date || "",
          link: post.link || "#",
        };
      })
      .filter(function (post) {
        return post.title.length > 0;
      });
  }

  function renderBlogPosts(blogList, posts) {
    blogList.innerHTML = "";

    posts.slice(0, 5).forEach(function (post) {
      const li = document.createElement("li");
      li.setAttribute("data-reveal", "up");
      const a = document.createElement("a");
      a.href = post.link || "#";
      a.textContent = post.title || "제목을 입력해주세요.";
      a.target = "_blank";
      a.rel = "noopener";

      const span = document.createElement("span");
      span.className = "date";
      span.textContent = post.date || "YYYY-MM-DD";

      li.appendChild(a);
      li.appendChild(span);
      blogList.appendChild(li);
    });

    refreshScrollReveal();
  }

  function toDateValue(value) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value.toDate === "function") {
      return value.toDate();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDateISO(value) {
    const date = toDateValue(value);
    if (!date) {
      return "";
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function normalizePostType(raw) {
    const parts = String(raw || "").trim().split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }

  async function loadBlogPostsFromFirestore(blogList) {
    const firebaseModules = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      import("./firebase-config.js"),
    ]);

    const firebaseApp = firebaseModules[0];
    const firestoreMod = firebaseModules[1];
    const firebaseLocal = firebaseModules[2];

    var appName = "sungjin-main-blog";
    var app = firebaseApp.getApps().find(function (item) {
      return item.name === appName;
    });
    if (!app) {
      app = firebaseApp.initializeApp(firebaseLocal.firebaseConfig, appName);
    }
    const db = firestoreMod.getFirestore(app);
    const postQuery = firestoreMod.query(
      firestoreMod.collection(db, "posts"),
      firestoreMod.where("status", "==", "published"),
      firestoreMod.where("type", "==", "blog"),
      firestoreMod.orderBy("updatedAt", "desc"),
      firestoreMod.limit(50)
    );
    const snap = await firestoreMod.getDocs(postQuery);

    const posts = snap.docs
      .map(function (docSnap) {
        const data = docSnap.data() || {};
        return {
          type: data.type || "",
          category: data.category || "",
          title: data.title || "",
          dateObj: toDateValue(data.publishedAt) || toDateValue(data.updatedAt) || toDateValue(data.createdAt),
          link: data.blogLink || data.link || "#",
          status: data.status || "",
        };
      })
      .filter(function (post) {
        const docType = normalizePostType(post?.type || post?.category || "");
        return post.title && post.link && post.status === "published" && docType === "blog";
      })
      .sort(function (a, b) {
        const at = a.dateObj ? a.dateObj.getTime() : 0;
        const bt = b.dateObj ? b.dateObj.getTime() : 0;
        return bt - at;
      })
      .slice(0, 5)
      .map(function (post) {
        return {
          title: post.title,
          date: formatDateISO(post.dateObj),
          link: post.link,
        };
      });

    if (!posts.length) {
      throw new Error("Firestore blog data empty");
    }
    renderBlogPosts(blogList, posts);
  }

  function loadBlogPostsFromCSV() {
    const blogList = document.getElementById("blog-post-list");
    if (!blogList) {
      return;
    }

    const fallbackPosts = [
      { title: "2026 봄학기 학습 로드맵 안내", date: "2026-02-15", link: "https://blog.naver.com/sja6123" },
      { title: "중등 내신 대비 공부법 정리", date: "2026-02-08", link: "https://blog.naver.com/sja6123" },
      { title: "고등 수학 오답노트 관리법", date: "2026-01-30", link: "https://blog.naver.com/sja6123" },
      { title: "성진학원 1:1 첨삭 시스템 소개", date: "2026-01-24", link: "https://blog.naver.com/sja6123" },
      { title: "대입 정시 전략 상담 안내", date: "2025-12-27", link: "https://blog.naver.com/sja6123/224121520328" },
    ];

    loadBlogPostsFromFirestore(blogList).catch(function () {
      fetch("assets/data/blog_posts.csv")
        .then(function (res) {
          if (!res.ok) {
            throw new Error("CSV 로딩 실패");
          }
          return res.text();
        })
        .then(function (csvText) {
          const posts = normalizePosts(parseCsv(csvText));
          if (!posts.length) {
            throw new Error("CSV 데이터 비어 있음");
          }
          renderBlogPosts(blogList, posts);
        })
        .catch(function () {
          fetch("assets/data/blog_posts.json")
            .then(function (res) {
              if (!res.ok) {
                throw new Error("JSON 로딩 실패");
              }
              return res.json();
            })
            .then(function (posts) {
              const normalized = normalizePosts(posts);
              if (!normalized.length) {
                throw new Error("JSON 데이터 비어 있음");
              }
              renderBlogPosts(blogList, normalized);
            })
            .catch(function () {
              renderBlogPosts(blogList, fallbackPosts);
            });
        });
    });
  }

  const WP_BASE = "/blog";
  const WP_API = WP_BASE + "/wp-json/wp/v2";

  function decodeEntities(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html || "";
    return txt.value;
  }

  function stripHtml(html) {
    if (!html) {
      return "";
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function trimText(text, maxLen) {
    if (!text || text.length <= maxLen) {
      return text || "";
    }
    return text.slice(0, maxLen).trim() + "...";
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function getFeaturedImage(post) {
    const media = post && post._embedded && post._embedded["wp:featuredmedia"];
    const first = media && media[0];
    if (!first) {
      return "";
    }
    const sizes = (first.media_details && first.media_details.sizes) || {};
    return (
      (sizes.medium && sizes.medium.source_url) ||
      (sizes.thumbnail && sizes.thumbnail.source_url) ||
      first.source_url ||
      ""
    );
  }

  async function getCategoryIdBySlug(slug) {
    const res = await fetch(WP_API + "/categories?slug=" + encodeURIComponent(slug));
    if (!res.ok) {
      throw new Error("category fetch failed");
    }
    const data = await res.json();
    if (!Array.isArray(data) || !data.length || !data[0].id) {
      throw new Error("category not found");
    }
    return data[0].id;
  }

  async function getPostsByCategorySlug(slug, perPage) {
    const catId = await getCategoryIdBySlug(slug);
    const url =
      WP_API +
      "/posts?categories=" +
      encodeURIComponent(catId) +
      "&per_page=" +
      encodeURIComponent(perPage) +
      "&_embed=1&orderby=date&order=desc";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("post fetch failed");
    }
    return res.json();
  }

  function renderWpList(container, posts, options) {
    const type = (options && options.type) || "notice";
    container.innerHTML = "";

    if (!Array.isArray(posts) || posts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "wp-empty";
      empty.textContent = "등록된 글이 없습니다.";
      container.appendChild(empty);
      refreshScrollReveal();
      return;
    }

    const fragment = document.createDocumentFragment();

    posts.forEach(function (post) {
      const title = decodeEntities((post.title && post.title.rendered) || "제목 없음");
      const excerpt = trimText(stripHtml(post.excerpt && post.excerpt.rendered), 120);
      const dateText = formatDate(post.date);
      const link = post.link || WP_BASE;
      const imageUrl = getFeaturedImage(post);

      if (type === "result") {
        const card = document.createElement("article");
        card.className = "case-card";
        card.setAttribute("data-reveal", "up");

        const media = document.createElement("div");
        media.className = "media-box";
        if (imageUrl) {
          media.style.backgroundImage = 'url("' + imageUrl + '")';
        } else {
          media.classList.add("wp-placeholder");
          media.innerHTML = '<span class="media-badge">이미지 없음</span>';
        }

        const body = document.createElement("div");
        body.className = "card-body";

        const h3 = document.createElement("h3");
        h3.textContent = title;

        const meta = document.createElement("p");
        meta.className = "case-meta";
        meta.textContent = dateText;

        const p = document.createElement("p");
        p.textContent = excerpt || "자세한 내용은 글에서 확인해주세요.";

        const more = document.createElement("a");
        more.className = "wp-post-link";
        more.href = link;
        more.textContent = "자세히 보기";

        body.appendChild(h3);
        body.appendChild(meta);
        body.appendChild(p);
        body.appendChild(more);
        card.appendChild(media);
        card.appendChild(body);
        fragment.appendChild(card);
        return;
      }

      if (type === "review" || type === "home-review") {
        const card = document.createElement("article");
        card.className = "testimonial-card";
        card.setAttribute("data-reveal", "up");

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        if (imageUrl) {
          avatar.style.backgroundImage = 'url("' + imageUrl + '")';
        } else {
          avatar.classList.add("wp-placeholder");
        }

        const badge = document.createElement("span");
        badge.className = "type-badge";
        badge.textContent = "후기";

        const metaRow = document.createElement("div");
        metaRow.className = "review-meta";
        const reviewYear = (dateText || "").slice(0, 4);
        if (reviewYear) {
          const year = document.createElement("span");
          year.className = "review-year";
          year.textContent = reviewYear;
          metaRow.appendChild(badge);
          metaRow.appendChild(year);
        } else {
          metaRow.appendChild(badge);
        }

        const quote = document.createElement("p");
        quote.className = "quote";
        quote.textContent = excerpt || "자세한 내용은 글에서 확인해주세요.";

        const linkEl = document.createElement("a");
        linkEl.className = "wp-post-link";
        linkEl.href = link;
        linkEl.textContent = title;

        card.appendChild(avatar);
        card.appendChild(metaRow);
        card.appendChild(quote);
        card.appendChild(linkEl);
        fragment.appendChild(card);
        return;
      }

      const item = document.createElement("a");
      item.className = "notice-item";
      item.href = link;
      item.setAttribute("data-reveal", "up");

      const t = document.createElement("span");
      t.textContent = title;
      const d = document.createElement("span");
      d.className = "notice-date";
      d.textContent = dateText;

      item.appendChild(t);
      item.appendChild(d);
      fragment.appendChild(item);
    });

    container.appendChild(fragment);
    const existingError = container.querySelector(".wp-error--inline");
    if (existingError) {
      existingError.remove();
    }
    refreshScrollReveal();
  }

  async function loadWpPostsInto(container, slug, perPage, type) {
    try {
      const posts = await getPostsByCategorySlug(slug, perPage);
      renderWpList(container, posts, { type: type });
    } catch (err) {
      console.warn("WP post load failed:", slug, err);
    }
  }

  function resolveFirestoreType(post) {
    return normalizePostType((post && (post.type || post.category)) || "");
  }

  function resolveFirestoreCoverUrl(post) {
    return (
      (post && post.coverImage && post.coverImage.url) ||
      (post && post.featuredImage && post.featuredImage.url) ||
      (post && post.resultImage && post.resultImage.url) ||
      (post && post.reviewProfileImage && post.reviewProfileImage.url) ||
      ""
    );
  }

  function resolveFirestoreDate(post) {
    return (
      toDateValue(post && post.updatedAt) ||
      toDateValue(post && post.publishedAt) ||
      toDateValue(post && post.createdAt)
    );
  }

  function resolveFirestorePostLink(post, type) {
    const value = (post && (post.link || post.blogLink)) || "";
    if (value && /^https?:\/\//i.test(value)) {
      return value;
    }
    if (type === "notice") {
      return "/blog/category/notice/";
    }
    if (type === "result") {
      return "/blog/category/result/";
    }
    if (type === "review") {
      return "/blog/category/review/";
    }
    return "/blog/";
  }

  function normalizeFirestorePost(docSnap) {
    const data = docSnap.data() || {};
    const contentHtml = data.contentHtml || data.content || "";
    return {
      id: docSnap.id,
      type: resolveFirestoreType(data),
      status: data.status || "",
      title: data.title || "",
      contentHtml: contentHtml,
      excerpt: data.excerpt || trimText(stripHtml(contentHtml), 120),
      coverUrl: resolveFirestoreCoverUrl(data),
      link: data.link || data.blogLink || "",
      reviewYear: data.reviewYear || "",
      dateObj: resolveFirestoreDate(data),
    };
  }

  function buildPostQueryMeta(slug, limitCount) {
    const normalizedSlug = normalizePostType(slug);
    return {
      slug: normalizedSlug,
      status: "published",
      orderBy: "updatedAt desc",
      limit: limitCount,
      filter: 'status == "published" && (type == slug || category == slug)'
    };
  }

  async function getFirestorePublishedPosts(slug, perPage) {
    const normalizedSlug = normalizePostType(slug);
    const firebaseModules = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      import("./firebase-config.js"),
    ]);
    const firebaseApp = firebaseModules[0];
    const firestoreMod = firebaseModules[1];
    const firebaseLocal = firebaseModules[2];

    var appName = "sungjin-main-posts";
    var app = firebaseApp.getApps().find(function (item) {
      return item.name === appName;
    });
    if (!app) {
      app = firebaseApp.initializeApp(firebaseLocal.firebaseConfig, appName);
    }
    const db = firestoreMod.getFirestore(app);

    try {
      const typeQuery = firestoreMod.query(
        firestoreMod.collection(db, "posts"),
        firestoreMod.where("status", "==", "published"),
        firestoreMod.where("type", "==", normalizedSlug),
        firestoreMod.orderBy("updatedAt", "desc"),
        firestoreMod.limit(Math.max(50, perPage))
      );
      const typeSnap = await firestoreMod.getDocs(typeQuery);
      const typePosts = typeSnap.docs.map(normalizeFirestorePost).slice(0, perPage);
      if (typePosts.length > 0) {
        return typePosts;
      }

      // Fallback: older docs might only have `category`.
      // This requires a composite index on (category, status, updatedAt desc).
      const categoryQuery = firestoreMod.query(
        firestoreMod.collection(db, "posts"),
        firestoreMod.where("status", "==", "published"),
        firestoreMod.where("category", "==", normalizedSlug),
        firestoreMod.orderBy("updatedAt", "desc"),
        firestoreMod.limit(Math.max(50, perPage))
      );
      const categorySnap = await firestoreMod.getDocs(categoryQuery);
      return categorySnap.docs.map(normalizeFirestorePost).slice(0, perPage);
    } catch (error) {
      error.queryMeta = buildPostQueryMeta(normalizedSlug, Math.max(50, perPage));
      throw error;
    }
  }

  function clearFirestoreInlineError(container) {
    if (!container) {
      return;
    }
    const err = container.querySelector(".firestore-inline-error");
    if (err) {
      err.remove();
    }
  }

  function showFirestoreInlineError(container, message) {
    if (!container) {
      return;
    }
    clearFirestoreInlineError(container);
    const p = document.createElement("p");
    p.className = "wp-empty firestore-inline-error";
    p.setAttribute("role", "status");
    p.setAttribute("aria-live", "polite");
    p.textContent = message;
    container.insertBefore(p, container.firstChild);
  }

  function renderFirestoreList(container, posts, type) {
    if (!container || !Array.isArray(posts) || !posts.length) {
      throw new Error("empty firestore posts");
    }

    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    posts.forEach(function (post) {
      const title = post.title || "?쒕ぉ ?놁쓬";
      const excerpt = post.excerpt || "?먯꽭???댁슜? ?붾낫湲곗뿉???뺤씤?섏꽭??";
      const dateText = formatDateISO(post.dateObj);
      const link = resolveFirestorePostLink(post, type);
      const imageUrl = post.coverUrl;

      if (type === "result") {
        const card = document.createElement("article");
        card.className = "case-card";
        card.setAttribute("data-reveal", "up");

        const media = document.createElement("div");
        media.className = "media-box";
        if (imageUrl) {
          media.style.backgroundImage = 'url("' + imageUrl + '")';
        } else {
          media.innerHTML = '<span class="media-badge">?대?吏 異붽? ?덉젙</span>';
        }

        const body = document.createElement("div");
        body.className = "card-body";

        const h3 = document.createElement("h3");
        h3.textContent = title;
        const meta = document.createElement("p");
        meta.className = "case-meta";
        meta.textContent = dateText;
        const p = document.createElement("p");
        p.textContent = excerpt;
        const more = document.createElement("a");
        more.className = "wp-post-link";
        more.href = link;
        more.textContent = "?먯꽭??蹂닿린";

        body.appendChild(h3);
        body.appendChild(meta);
        body.appendChild(p);
        body.appendChild(more);
        card.appendChild(media);
        card.appendChild(body);
        fragment.appendChild(card);
        return;
      }

      if (type === "review") {
        const card = document.createElement("article");
        card.className = "testimonial-card";
        card.setAttribute("data-reveal", "up");

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        if (imageUrl) {
          avatar.style.backgroundImage = 'url("' + imageUrl + '")';
        }

        const metaRow = document.createElement("div");
        metaRow.className = "review-meta";
        const badge = document.createElement("span");
        badge.className = "type-badge";
        badge.textContent = "?꾧린";
        const year = document.createElement("span");
        year.className = "review-year";
        year.textContent = post.reviewYear || (dateText || "").slice(0, 4);
        metaRow.appendChild(badge);
        metaRow.appendChild(year);

        const quote = document.createElement("p");
        quote.className = "quote";
        quote.textContent = excerpt;
        const linkEl = document.createElement("a");
        linkEl.className = "wp-post-link";
        linkEl.href = link;
        linkEl.textContent = "?먯꽭??蹂닿린";

        card.appendChild(avatar);
        card.appendChild(metaRow);
        card.appendChild(quote);
        card.appendChild(linkEl);
        fragment.appendChild(card);
        return;
      }

      const item = document.createElement("a");
      item.className = "notice-item";
      item.href = link;
      item.setAttribute("data-reveal", "up");

      const t = document.createElement("span");
      t.textContent = title;
      const d = document.createElement("span");
      d.className = "notice-date";
      d.textContent = dateText;
      item.appendChild(t);
      item.appendChild(d);
      fragment.appendChild(item);
    });

    container.appendChild(fragment);
    clearFirestoreInlineError(container);
    refreshScrollReveal();
  }

  function loadFirestorePostsInto(container, slug, perPage) {
    const normalizedSlug = normalizePostType(slug);
    getFirestorePublishedPosts(normalizedSlug, perPage)
      .then(function (posts) {
        renderFirestoreList(container, posts, normalizedSlug);
      })
      .catch(function (error) {
        const queryMeta = error?.queryMeta || buildPostQueryMeta(normalizedSlug, 50);
        const isIndexPending = error?.code === "failed-precondition";
        const code = String(error?.code || "unknown");
        const message = String(error?.message || "");
        console.warn(
          "[main] Firestore list load failed",
          "type=" + normalizedSlug,
          "code=" + code,
          message ? "message=" + message : "",
          {
            slug: normalizedSlug,
            type: normalizedSlug,
            status: "published",
            updatedAt: "desc",
            query: queryMeta,
            url: window.location.href,
          },
          error
        );
        showFirestoreInlineError(container, isIndexPending ? "불러오지 못했습니다. 인덱스 생성 중일 수 있습니다." : "불러오지 못했습니다");
      });
  }

  function getContainerPostType(listEl, fallbackType) {
    return normalizePostType((listEl && listEl.dataset && listEl.dataset.postType) || fallbackType || "");
  }

  function initWpPostLists() {
    try {
      const noticeList = document.getElementById("wp-notice-list");
      const resultList = document.getElementById("wp-result-list");
      const reviewList = document.getElementById("wp-review-list");
      const homeNotice = document.getElementById("wp-home-notice");
      const homeReview = document.getElementById("wp-home-review");

      if (noticeList) {
        const type = getContainerPostType(noticeList, "notice");
        loadFirestorePostsInto(noticeList, type, 8);
      }
      if (resultList) {
        const type = getContainerPostType(resultList, "result");
        loadFirestorePostsInto(resultList, type, 6);
      }
      if (reviewList) {
        const type = getContainerPostType(reviewList, "review");
        loadFirestorePostsInto(reviewList, type, 6);
      }
      if (homeNotice) {
        const type = getContainerPostType(homeNotice, "notice");
        loadFirestorePostsInto(homeNotice, type, 3);
      }
      if (homeReview) {
        const type = getContainerPostType(homeReview, "review");
        loadFirestorePostsInto(homeReview, type, 4);
      }
    } catch (err) {
      console.warn("WP post list init failed", err);
    }
  }

  function initMediaSlots() {
    document.querySelectorAll("[data-bg]").forEach(function (el) {
      const url = el.getAttribute("data-bg");
      if (!url) {
        return;
      }

      const img = new Image();
      img.onload = function () {
        el.classList.add("is-filled");
        el.style.backgroundImage = 'url("' + url + '")';
      };
      img.src = url;
    });
  }

  function setupHeroSlider() {
    const slider = document.querySelector(".hero-slider");
    if (!slider || slider.dataset.bound === "true") {
      return;
    }
    slider.dataset.bound = "true";

    const slides = slider.querySelectorAll(".hero-slide");
    const dots = slider.querySelectorAll(".hero-dots .dot");
    const prevBtn = slider.querySelector(".hero-btn--prev");
    const nextBtn = slider.querySelector(".hero-btn--next");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const interval = 5000;
    const total = slides.length;

    if (!total) {
      return;
    }

    let current = 0;
    let timerId = null;

    function goTo(index) {
      current = (index + total) % total;

      slides.forEach(function (slide, slideIndex) {
        slide.classList.toggle("is-active", slideIndex === current);
      });

      dots.forEach(function (dot, dotIndex) {
        const isActive = dotIndex === current;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
        dot.tabIndex = isActive ? 0 : -1;
      });
    }

    function stopAutoplay() {
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    function startAutoplay() {
      if (reducedMotionQuery.matches || document.hidden || total < 2) {
        return;
      }
      stopAutoplay();
      timerId = window.setInterval(function () {
        goTo(current + 1);
      }, interval);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(current - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(current + 1);
      });
    }

    dots.forEach(function (dot, idx) {
      dot.addEventListener("click", function () {
        goTo(idx);
      });
    });

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!slider.contains(document.activeElement)) {
          startAutoplay();
        }
      }, 0);
    });

    if (!visibilityListenerBound) {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stopAutoplay();
        } else {
          startAutoplay();
        }
      });
      visibilityListenerBound = true;
    }

    goTo(0);
    startAutoplay();
  }

  function initGalleryLightbox() {
    const lightbox = document.getElementById("sjLightbox");
    const media = document.getElementById("sjLightboxMedia");
    const caption = document.getElementById("sjLightboxCaption");
    const items = Array.from(document.querySelectorAll(".sj-gallery-item[data-full]"));

    if (!lightbox || !media || !caption || !items.length) {
      return;
    }

    if (lightbox.dataset.bound === "true") {
      return;
    }
    lightbox.dataset.bound = "true";

    const closeBtn = lightbox.querySelector(".sj-lightbox__close");
    const prevBtn = lightbox.querySelector("[data-prev]");
    const nextBtn = lightbox.querySelector("[data-next]");
    const closeEls = lightbox.querySelectorAll("[data-close]");
    let activeIndex = 0;

    function render(index) {
      activeIndex = (index + items.length) % items.length;
      const current = items[activeIndex];
      const src = current.getAttribute("data-full") || "";
      const text = current.getAttribute("data-caption") || "";
      media.style.setProperty("--lb-media", 'url("' + src + '")');
      caption.textContent = text;
    }

    function open(index) {
      render(index);
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-lightbox-open");
      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function close() {
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-lightbox-open");
    }

    function isOpen() {
      return lightbox.getAttribute("aria-hidden") === "false";
    }

    items.forEach(function (item, idx) {
      item.addEventListener("click", function () {
        open(idx);
      });
    });

    closeEls.forEach(function (el) {
      el.addEventListener("click", close);
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        render(activeIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        render(activeIndex + 1);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!isOpen()) {
        return;
      }
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        render(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        render(activeIndex + 1);
      }
    });
  }

  function initLightbox() {
    const items = Array.from(document.querySelectorAll("[data-lightbox]"));
    if (!items.length) {
      return;
    }

    let lightbox = document.getElementById("sjLightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "sj-lightbox";
      lightbox.id = "sjLightbox";
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.innerHTML =
        '<div class="sj-lightbox__backdrop" data-close></div>' +
        '<div class="sj-lightbox__dialog" role="dialog" aria-modal="true" aria-label="사진 크게 보기">' +
        '<button class="sj-lightbox__close" type="button" data-close aria-label="닫기">×</button>' +
        '<button class="sj-lightbox__nav sj-lightbox__nav--prev" type="button" data-prev aria-label="이전">‹</button>' +
        '<div class="sj-lightbox__media" id="sjLightboxMedia"></div>' +
        '<button class="sj-lightbox__nav sj-lightbox__nav--next" type="button" data-next aria-label="다음">›</button>' +
        '<div class="sj-lightbox__caption" id="sjLightboxCaption"></div>' +
        "</div>";
      document.body.appendChild(lightbox);
    }

    if (lightbox.dataset.lightboxBound === "true") {
      return;
    }
    lightbox.dataset.lightboxBound = "true";

    const media = lightbox.querySelector("#sjLightboxMedia");
    const caption = lightbox.querySelector("#sjLightboxCaption");
    const closeBtn = lightbox.querySelector(".sj-lightbox__close");
    const prevBtn = lightbox.querySelector("[data-prev]");
    const nextBtn = lightbox.querySelector("[data-next]");
    const closeEls = lightbox.querySelectorAll("[data-close]");

    if (!media || !caption) {
      return;
    }

    let activeIndex = 0;

    function render(index) {
      activeIndex = (index + items.length) % items.length;
      const current = items[activeIndex];
      const src = current.getAttribute("data-lightbox") || "";
      const text = current.getAttribute("data-caption") || "";
      media.style.setProperty("--lb-media", 'url("' + src + '")');
      caption.textContent = text;
    }

    function open(index) {
      render(index);
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-lightbox-open");
      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function close() {
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-lightbox-open");
    }

    function isOpen() {
      return lightbox.getAttribute("aria-hidden") === "false";
    }

    items.forEach(function (item, idx) {
      item.addEventListener("click", function () {
        open(idx);
      });
    });

    closeEls.forEach(function (el) {
      el.addEventListener("click", close);
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        render(activeIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        render(activeIndex + 1);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!isOpen()) {
        return;
      }
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        render(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        render(activeIndex + 1);
      }
    });
  }

  function applyRevealVariant(el) {
    const variant = (el.getAttribute("data-reveal") || "").toLowerCase();
    if (!el.classList.contains("reveal")) {
      el.classList.add("reveal");
    }

    if (variant === "left") {
      el.classList.add("reveal--left");
    } else if (variant === "right") {
      el.classList.add("reveal--right");
    } else if (variant === "scale") {
      el.classList.add("reveal--scale");
    } else {
      el.classList.add("reveal--up");
    }
  }

  function applyRevealStagger() {
    const staggerGroups = [
      ".quick-grid .quick-card",
      ".stats-grid .stat-card",
      ".case-grid .case-card",
      ".testimonials-row .testimonial-card",
      ".gallery-grid .gallery-item",
      ".sj-gallery-grid .sj-gallery-item",
      ".sj-gallery-item--featured",
      ".teachers-grid .teacher-card",
      ".tuition-grid .tuition-card",
      ".faq-list .faq-item",
      ".notice-summary .notice-item",
      ".blog-list li",
    ];

    staggerGroups.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el, idx) {
        const delay = Math.min(idx * 80, 400);
        if (!el.style.getPropertyValue("--reveal-delay")) {
          el.style.setProperty("--reveal-delay", delay + "ms");
        }
      });
    });
  }

  function observeRevealElement(el) {
    if (!el || el.classList.contains("is-visible")) {
      return;
    }

    applyRevealVariant(el);

    if (!revealObserver) {
      if (revealInstantMode) {
        el.classList.add("is-visible");
      }
      return;
    }

    if (el.__revealObserved) {
      return;
    }

    revealObserver.observe(el);
    el.__revealObserved = true;
  }

  function refreshScrollReveal() {
    applyRevealStagger();
    document.querySelectorAll("[data-reveal], .reveal").forEach(function (el) {
      observeRevealElement(el);
    });
  }

  function initScrollReveal() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = document.querySelectorAll("[data-reveal], .reveal");
    if (!targets.length) {
      return;
    }

    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      revealInstantMode = true;
      revealObserver = null;
      applyRevealStagger();
      targets.forEach(function (el) {
        applyRevealVariant(el);
        el.classList.add("is-visible");
      });
      return;
    }

    revealInstantMode = false;
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    refreshScrollReveal();
  }

  function setupKakaoConsultButton() {
    const form = document.getElementById("contact-form");
    const btn = document.getElementById("kakao-consult-btn");
    const statusEl = document.getElementById("kakao-status");
    const fallbackTextEl = document.getElementById("kakao-fallback-text");
    if (!form || !btn || !statusEl || !fallbackTextEl) {
      return;
    }

    function readValue(name) {
      const field = form.elements.namedItem(name);
      if (!field || typeof field.value !== "string") {
        return "";
      }
      return field.value.trim();
    }

    function setStatus(message) {
      statusEl.textContent = message;
    }

    function buildConsultText() {
      const name = readValue("name");
      const grade = readValue("grade");
      const subject = readValue("subject");
      const phone = readValue("phone");
      const message = readValue("message");
      return [
        "[성진학원 상담 문의]",
        "이름: " + name,
        "학생학년: " + grade,
        "과목: " + subject,
        "연락처: " + phone,
        "문의내용: " + message,
      ].join("\n");
    }

    function isFormFilled() {
      return ["name", "grade", "subject", "message", "phone"].every(function (key) {
        return readValue(key).length > 0;
      });
    }

    btn.addEventListener("click", async function () {
      window.open(KAKAO_OPENCHAT_URL, "_blank", "noopener,noreferrer");

      if (!isFormFilled()) {
        setStatus("카카오톡 창이 열렸습니다. 상담 내용을 먼저 작성하면 복사도 함께 됩니다.");
        fallbackTextEl.hidden = true;
        fallbackTextEl.value = "";
        return;
      }

      const consultText = buildConsultText();
      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(consultText);
          copied = true;
        } catch (error) {
          console.warn("[contact] kakao clipboard copy failed", error);
        }
      }

      if (copied) {
        setStatus("내용이 복사되었습니다. 카카오톡에서 붙여넣기 후 전송해주세요.");
        fallbackTextEl.hidden = true;
        fallbackTextEl.value = "";
      } else {
        setStatus("복사가 실패했습니다. 아래 내용을 직접 복사해 주세요.");
        fallbackTextEl.value = consultText;
        fallbackTextEl.hidden = false;
      }

    });
  }

  function init() {
    if (initialized) {
      return;
    }
    initialized = true;

    initNavToggle();
    markActiveMenu();
    setupMobileCtaBar();
    loadBlogPostsFromCSV();
    try {
      initWpPostLists();
    } catch (err) {
      console.warn("WP post list init failed", err);
    }
    initMediaSlots();
    setupHeroSlider();
    initLightbox();
    initGalleryLightbox();
    setupKakaoConsultButton();
    initScrollReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
