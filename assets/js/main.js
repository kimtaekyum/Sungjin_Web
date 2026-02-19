(function () {
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

  function setupBlogPosts() {
    const blogList = document.getElementById("blog-post-list");
    if (!blogList) {
      return;
    }

    fetch("assets/data/blog_posts.json")
      .then(function (res) {
        if (!res.ok) {
          throw new Error("블로그 데이터 로딩 실패");
        }
        return res.json();
      })
      .then(function (posts) {
        blogList.innerHTML = "";
        posts.slice(0, 5).forEach(function (post) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = post.link || "#";
          a.textContent = post.title || "제목을 입력하세요";
          a.target = "_blank";
          a.rel = "noopener";

          const span = document.createElement("span");
          span.className = "date";
          span.textContent = post.date || "YYYY-MM-DD";

          li.appendChild(a);
          li.appendChild(span);
          blogList.appendChild(li);
        });
      })
      .catch(function () {
        blogList.innerHTML =
          "<li>최신글 데이터를 불러오지 못했습니다. assets/data/blog_posts.json을 확인해주세요.</li>";
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
      img.onerror = function () {
      };
      img.src = url;
    });
  }

  function init() {
    setupMobileNav();
    markActiveMenu();
    setupMobileCtaBar();
    setupBlogPosts();
    initMediaSlots();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
