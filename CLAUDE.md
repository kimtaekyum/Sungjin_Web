# 성진학원 웹사이트 프로젝트

양천구 입시/내신 전문 성진학원 공식 홈페이지. 정적 HTML + 바닐라 JS + Firebase 스택.

- 라이브: https://sungjin-web.web.app
- GitHub: https://github.com/kimtaekyum/Sungjin_Web
- Firebase 프로젝트: `sungjin-web`

## 기술 스택

HTML5 + CSS3 + 바닐라 JavaScript (ES modules), Firebase Hosting/Firestore/Storage/Auth.
빌드 도구나 번들러 없음. CDN ESM(`gstatic.com/firebasejs/10.12.5/`), Quill 1.3.7, Cropper.js 1.6.2, DOMPurify 3.1.7.

## 디렉터리 구조

```
Sungjin_Web_git/              ← 소스 오브 트루스 (Git)
├── index.html                ← 메인 (히어로 슬라이더, 홈 공지/후기/블로그)
├── about.html                ← 학원 소개
├── programs.html             ← 수업 안내
├── results.html              ← 성과·후기 (Firestore 연동)
├── notice.html               ← 공지사항 (Firestore 연동)
├── contact.html              ← 상담 문의
├── admin/
│   ├── index.html            ← 관리자 대시보드
│   ├── admin.js              ← 인증/CRUD/에디터 (~1900줄)
│   └── admin.css
├── assets/
│   ├── js/main.js            ← 공개 사이트 스크립트 (~840줄)
│   ├── js/firebase-config.js ← 실제 키 (.gitignore 대상)
│   ├── css/style.css
│   └── data/                 ← 블로그 CSV/JSON 폴백
├── firebase/
│   ├── firestore.rules
│   └── storage.rules
└── firebase.json
```

## 핵심 명령어

```bash
# 로컬 서버
cd "/Users/mac_k/성진/Sungjin_Web_git"
python3 -m http.server 5500

# Firebase 배포 (반드시 --project sungjin-web 지정)
npx -y firebase-tools deploy --only hosting --project sungjin-web

# Firestore/Storage 규칙 배포
npx -y firebase-tools deploy --only firestore:rules,storage --project sungjin-web

# Git 커밋 & 푸시
git add -A && git commit -m "변경 내용" && git push origin main
```

## 코드 스타일 규칙

- ES modules (`import/export`) 사용. CommonJS 금지
- 바닐라 JS만 사용. jQuery, React 등 프레임워크 도입 금지
- `var` 사용 금지. `const`/`let`만 사용
- 한글 문자열 리터럴은 반드시 UTF-8로 저장. mojibake 주의
- 함수명은 camelCase, 상수는 UPPER_SNAKE_CASE
- console.warn에 `[admin]` 또는 `[main]` 접두사로 출처 구분

## Firestore 데이터 모델

`posts` 컬렉션 필수 필드: `type`(notice/result/review/blog), `category`(레거시 호환, type과 동일), `title`, `contentHtml`, `status`(draft/published), `createdAt`, `updatedAt`(서버 타임스탬프).

이미지 필드: `coverImage`, `featuredImage`(레거시), `resultImage`, `reviewProfileImage` — 모두 `{ url, path, name, type, size }` 구조.

## Firestore 쿼리 패턴

공개 페이지 목록 로드 전략 (main.js의 `getFirestorePublishedPosts`):
1. Primary: `where("type", "==", slug) + where("status", "==", "published") + orderBy("updatedAt", "desc")`
2. Fallback: `where("category", "==", slug)` — primary 결과 0건일 때
3. 필수 복합 인덱스: `type+status+updatedAt(DESC)`, `category+status+updatedAt(DESC)`

**IMPORTANT**: 인덱스 없으면 `failed-precondition` 에러로 목록이 안 뜬다.

## Firebase Named App 규칙

main.js는 Named App 2개 사용:
- `"sungjin-main-blog"` — 블로그 전용
- `"sungjin-main-posts"` — 공지/성과/후기 전용

admin.js는 기본(unnamed) 앱 사용. 이름 충돌 주의.

## Storage 경로 규칙

```
posts/{postId}/cover/{timestamp}-{safeName}
posts/{postId}/result/{timestamp}-{safeName}
posts/{postId}/review/{timestamp}-{safeName}
posts/{postId}/inline/{timestamp}-{safeName}
posts/{postId}/attachments/{timestamp}-{safeName}
```

보안 규칙: `posts/**` 공개 읽기, 쓰기는 active admin + image/* + 5MB 미만.

## 관리자 인증 흐름

1. `signInWithEmailAndPassword` → `onAuthStateChanged`
2. `getDoc(admins/{uid})` → `active === true` 확인
3. active가 아니면 `signOut` + 에러

관리자 추가: Firebase Console에서 Auth 사용자 생성 → Firestore `admins/{uid}` 문서에 `{ active: true }`.

## 캐시 버스팅

**IMPORTANT**: JS 수정 후 HTML의 `<script>` 태그에서 `?v=` 값을 반드시 변경해야 한다.
현재: `?v=20260330a`. 빌드 시스템이 없으므로 수동 관리.

현재 누락된 페이지: `about.html`, `contact.html`, `programs.html`에 `?v=` 미적용 상태.

## 알려진 문제 (수정 필요)

1. **한글 mojibake**: `main.js`의 `renderFirestoreList` 함수 (674~750줄) 내 한글 폴백 텍스트가 깨져 있음. "제목 없음", "자세히 보기", "후기", "이미지 준비 예정" 등을 정상 UTF-8로 재작성 필요
2. **storage_review 에러 오도**: `admin.js` 1482줄에서 모든 에러에 동일 메시지 표시. 네트워크/권한 에러 구분 필요
3. **Blob URL 누수**: `renderResultImagePreview` (admin.js 644줄)에서 `createObjectURL` 후 `revokeObjectURL` 미호출
4. **카카오 오픈챗 URL**: `main.js` 6줄 `REPLACE_ME` → 실제 URL로 교체 필요
5. **캐시버스팅 누락**: about.html, contact.html, programs.html

## 주의사항

- `firebase-config.js`는 `.gitignore` 대상. 절대 커밋하지 않는다
- 새 환경에서는 `firebase-config.example.js`를 복사해서 실제 키를 채워야 함
- `.firebaserc`에 앨리어스가 복수 존재. 배포 시 반드시 `--project sungjin-web` 지정
- `coverImage`와 `featuredImage`는 동일 데이터를 저장 (레거시 호환). 둘 다 업데이트해야 함
- `type`과 `category` 필드도 동일 값 저장 (레거시 호환). 둘 다 세팅해야 함

## 정리 대상 (삭제 가능)

- `index.broken.html`, `assets/js/main.broken.js`, `assets/css/style.broken.css` — 이전 백업
- `_remote_admin.js` — 루트의 미사용 파일
- main.js 내 WordPress REST 함수들 (`getCategoryIdBySlug`, `getPostsByCategorySlug`, `renderWpList`, `loadWpPostsInto`) — 미호출 데드 코드

## 검증 체크리스트

배포 후 반드시 확인:
- [ ] `sungjin-web.web.app` 메인 페이지 공지/후기/블로그 로드
- [ ] `/notice.html` 공지사항 목록 로드
- [ ] `/results.html` 성과+후기 목록 로드
- [ ] `/admin` 로그인 → 게시글 CRUD → 이미지 업로드
- [ ] 브라우저 콘솔에 `failed-precondition` 에러 없음
- [ ] 모바일 반응형 레이아웃 정상
