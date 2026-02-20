(function () {
  let revealObserver;
  let revealInstantMode = false;
  function setupMobileNav() {
    const navToggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!navToggle || !nav) {
      return;
    }

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
      if (href === page) {
        link.classList.add("active");
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
      '<a href="https://naver.me/xrSMu90Z" target="_blank" rel="noopener" aria-label="오시는 길 보기">오시는 길</a>';
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

  function setupBlogPosts() {
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

  function setupHeroSliderFade() {
    const slider = document.querySelector(".hero-slider");
    if (!slider) {
      return;
    }

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

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    goTo(0);
    startAutoplay();
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

  function init() {
    setupMobileNav();
    markActiveMenu();
    setupMobileCtaBar();
    setupBlogPosts();
    initMediaSlots();
    setupHeroSliderFade();
    initScrollReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
