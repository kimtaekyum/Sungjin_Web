# 성진학원 웹 프로젝트 인수인계 문서

> 작성일: 2026-04-11
> 라이브 URL: https://sungjin-web.web.app
> GitHub: https://github.com/kimtaekyum/Sungjin_Web
> Firebase 프로젝트: `sungjin-web` (콘솔: https://console.firebase.google.com/project/sungjin-web)

---

## 1. 프로젝트 개요

양천구 입시/내신 전문 **성진학원** 공식 홈페이지.
정적 HTML + 바닐라 JS로 구성되며, **Firebase Hosting**으로 배포한다.
공지사항/성과/후기/블로그 등 동적 콘텐츠는 **Cloud Firestore `posts` 컬렉션**에서 읽고,
관리자 전용 페이지(`/admin`)에서 로그인 후 CRUD + 이미지 업로드로 관리한다.

---

## 2. 기술 스택

| 구분 | 상세 |
|------|------|
| 프론트엔드 | HTML5, CSS3, 바닐라 JavaScript (ES modules) |
| 호스팅 | Firebase Hosting (`public: "."`, `firebase.json`) |
| 데이터베이스 | Cloud Firestore — `posts`, `admins` 컬렉션 |
| 파일 저장소 | Firebase Storage — `posts/{postId}/**` 경로 |
| 인증 | Firebase Authentication — 이메일/비밀번호 |
| 에디터 | Quill 1.3.7 (리치 텍스트), Cropper.js 1.6.2 (후기 프로필 이미지 자르기), DOMPurify 3.1.7 |
| Firebase SDK | npm `firebase` 패키지 (Vite 번들) |
| 빌드 | Vite 8 (`npm run build` → `dist/`) |
| 환경변수 | `.env.local` (`VITE_` 접두사) + `src/firebase.js` 중앙 초기화 |
| CLI/배포 | `npx firebase-tools` (로컬에 전역 설치 없이 사용) |
| 버전 관리 | Git + GitHub (`kimtaekyum/Sungjin_Web`, `main` 브랜치) |

---

## 3. 저장소 구조

```
Sungjin_Web/                  ← 프로젝트 루트 (= Hosting public 디렉터리)
├── index.html                ← 메인 페이지 (히어로 슬라이더, 홈 공지/후기/블로그)
├── about.html                ← 학원 소개 (인사말, 철학, 연혁, 강사, 시설)
├── programs.html             ← 수업 안내 (과정별 설명, 운영, 학습관리, FAQ)
├── results.html              ← 성과·후기 (성과 목록 + 후기 목록, Firestore 연동)
├── notice.html               ← 공지사항 (Firestore 연동)
├── contact.html              ← 상담 문의 (폼 + 카카오 오픈챗)
├── 404.html                  ← 에러 페이지
├── index.broken.html         ← 이전 백업 (배포에서 제외됨)
│
├── admin/
│   ├── index.html            ← 관리자 로그인 + 대시보드 셸
│   ├── admin.js              ← 인증/CRUD/이미지 업로드/에디터 (≈1910줄)
│   ├── admin.css             ← 관리자 UI 스타일
│   └── preview.html          ← 관리자 미리보기 헬퍼
│
├── assets/
│   ├── css/
│   │   ├── style.css         ← 공개 사이트 전체 스타일
│   │   └── style.broken.css  ← 이전 백업
│   ├── js/
│   │   ├── main.js           ← 공개 사이트 전체 스크립트 (≈840줄)
│   │   ├── main.broken.js    ← 이전 백업
│   │   ├── firebase-config.js        ← 실제 Firebase 키 (gitignore 대상)
│   │   └── firebase-config.example.js ← 키 예시 파일 (커밋 가능)
│   ├── data/
│   │   ├── blog_posts.csv    ← 블로그 정적 폴백 데이터 (CSV)
│   │   └── blog_posts.json   ← 블로그 정적 폴백 데이터 (JSON)
│   └── img/                  ← 이미지 에셋 (로고, 배너, 시설 사진 등)
│
├── firebase/
│   ├── firestore.rules       ← Firestore 보안 규칙
│   └── storage.rules         ← Storage 보안 규칙
│
├── firebase.json             ← Firebase 호스팅/규칙 설정
├── .firebaserc               ← 프로젝트 앨리어스 (prod → sungjin-web)
├── .gitignore                ← firebase-config.js 제외
├── robots.txt
├── sitemap.xml
├── README.md                 ← 운영 가이드 (배너, 블로그, 관리자, 인덱스, 배포 체크리스트)
├── CONTENT_UPDATE_TEMPLATE.md ← about.html 콘텐츠 교체 템플릿
└── HANDOVER.md               ← 이 문서
```

### 로컬 작업 폴더 참고

Mac에 두 폴더가 존재한다.

| 경로 | 설명 |
|------|------|
| `/Users/mac_k/성진/Sungjin_Web` | 원본 작업 폴더 (Firebase 배포도 가능하지만 Git 없음) |
| `/Users/mac_k/성진/Sungjin_Web_git` | GitHub 클론 (`git remote` = `origin`). **커밋/푸시/배포 모두 여기서** |

2026-04-11 기준으로 두 폴더의 콘텐츠는 동기화되어 있다 (`CONTENT_UPDATE_TEMPLATE.md`만 `Sungjin_Web`에만 존재).
앞으로는 **`Sungjin_Web_git` 한 곳만** 소스 오브 트루스로 사용하는 것을 권장한다.

---

## 4. Firebase 설정

### 4-1. 프로젝트 정보

- 프로젝트 ID: `sungjin-web`
- `.firebaserc` 앨리어스: `default` = `sungjin-academy-web`, `prod` / `.` = `sungjin-web`
- 배포 시 반드시 `--project sungjin-web` 지정 (또는 `firebase use prod`)

### 4-2. firebase-config.js

`assets/js/firebase-config.js`는 `.gitignore`에 포함되어 커밋되지 않는다.
새 환경에서 작업할 때는 `firebase-config.example.js`를 복사해 실제 값을 채워야 한다.

```js
// assets/js/firebase-config.example.js
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
  measurementId: "PASTE_YOUR_MEASUREMENT_ID_HERE"
};
```

실제 값은 Firebase Console > 프로젝트 설정 > 일반 > 내 앱(Web)에서 확인한다.

### 4-3. Firestore 보안 규칙 (`firebase/firestore.rules`)

```
admins/{uid}  → 본인만 읽기, 쓰기 차단 (콘솔에서만 관리)
posts/{docId} → published는 공개 읽기, admin은 전체 읽기, 쓰기는 active admin만
그 외          → 전면 차단
```

`isAdmin()` 조건: 로그인 + `admins/{uid}` 문서 존재 + `active == true`.

### 4-4. Storage 보안 규칙 (`firebase/storage.rules`)

```
posts/{allPaths=**} → 공개 읽기
                    → 쓰기: active admin + image/* + 5MB 미만
그 외               → 전면 차단
```

### 4-5. Firestore 복합 인덱스 (필수)

`firestore.indexes.json`이 없으므로 **Firebase Console에서 수동 생성**해야 한다.

| 컬렉션 | 필드 1 | 필드 2 | 필드 3 | 용도 |
|---------|--------|--------|--------|------|
| `posts` | `type` (ASC) | `status` (ASC) | `updatedAt` (DESC) | 공개 페이지 목록 쿼리 (primary) |
| `posts` | `category` (ASC) | `status` (ASC) | `updatedAt` (DESC) | 레거시 호환 폴백 쿼리 |

인덱스 없으면 **`failed-precondition`** 에러로 목록이 뜨지 않는다.
최초 배포 시 브라우저 콘솔 에러 메시지에 "Create index" 링크가 나오므로 클릭하면 된다.

---

## 5. 관리자(Admin) 시스템

### 5-1. 관리자 계정 생성

1. Firebase Console > Authentication > Users에서 이메일/비밀번호 사용자 생성
2. 생성된 사용자의 UID 확인
3. Firestore > `admins` 컬렉션에 `{UID}` 문서 생성, 필드: `{ active: true }`
4. `active: true`가 아닌 계정은 로그인 직후 자동 `signOut` 처리됨

### 5-2. 관리자 인증 흐름

```
[로그인 폼] → signInWithEmailAndPassword
           → onAuthStateChanged 콜백
           → getDoc(admins/{uid})
           → active === true? → 대시보드
           → active !== true? → signOut + 에러 메시지
```

### 5-3. 게시글 데이터 모델 (`posts` 컬렉션)

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | string | `notice` / `result` / `review` / `blog` |
| `category` | string | 레거시 호환 (type과 동일 값 저장) |
| `title` | string | 제목 |
| `contentHtml` | string | 본문 HTML |
| `content` | string | 레거시 본문 (contentHtml 우선) |
| `excerpt` | string | 요약문 |
| `status` | string | `draft` / `published` |
| `createdAt` | timestamp | 생성 시각 |
| `updatedAt` | timestamp | 수정 시각 (항상 서버 타임스탬프) |
| `publishedAt` | timestamp/null | 최초 공개 시각 |
| `authorUid` | string | 작성자 UID |
| `coverImage` | object/null | `{ url, path, name, type, size }` |
| `featuredImage` | object/null | 레거시 호환 (coverImage와 동일) |
| `resultImage` | object/null | 성과 전용 이미지 |
| `reviewProfileImage` | object/null | 후기 프로필 이미지 |
| `reviewYear` | string | 후기 연도 |
| `blogLink` / `link` | string | 블로그 외부 링크 |
| `attachments` | array | 첨부파일 메타 배열 (공지 전용) |

### 5-4. 게시글 저장 흐름 (`savePost`)

```
[유효성 검증] → [커버 이미지 업로드] → [성과 이미지 업로드]
             → [후기 프로필 업로드] → [첨부파일 업로드 + 삭제된 파일 정리]
             → [payload 정규화]    → [Firestore setDoc/updateDoc]
             → [목록 새로고침]
```

각 단계는 `saveStage` 변수로 추적되며, 실패 시 해당 단계명이 로그에 남는다.

### 5-5. Storage 경로 규칙

```
posts/{postId}/cover/{timestamp}-{safeName}       ← 커버 이미지
posts/{postId}/result/{timestamp}-{safeName}      ← 성과 이미지
posts/{postId}/review/{timestamp}-{safeName}      ← 후기 프로필
posts/{postId}/inline/{timestamp}-{safeName}      ← Quill 에디터 인라인 이미지
posts/{postId}/attachments/{timestamp}-{safeName} ← 첨부파일 (공지)
```

---

## 6. 공개 사이트 (`main.js`) 동작

### 6-1. 부트 시퀀스 (`init`)

1. 내비게이션 (모바일 토글, active 메뉴 표시)
2. 모바일 CTA 바
3. 블로그 목록: Firestore → CSV → JSON → 하드코딩 폴백
4. WP 포스트 리스트 (실제로는 Firestore 연동)
5. 배경 이미지 지연 로드 (`data-bg`)
6. 히어로 슬라이더
7. 라이트박스 (갤러리)
8. 카카오 상담 버튼
9. 스크롤 리빌 애니메이션

### 6-2. Firestore 목록 로드

**대상 컨테이너와 포스트 타입:**

| DOM ID | 타입 | 페이지 | 최대 개수 |
|--------|------|--------|-----------|
| `#wp-notice-list` | notice | notice.html | 8 |
| `#wp-result-list` | result | results.html | 6 |
| `#wp-review-list` | review | results.html | 6 |
| `#wp-home-notice` | notice | index.html | 3 |
| `#wp-home-review` | review | index.html | 4 |
| `#blog-post-list` | blog | index.html | 5 |

**쿼리 전략:**
1. Primary: `where("type", "==", slug)` + `where("status", "==", "published")` + `orderBy("updatedAt", "desc")`
2. Fallback: `where("category", "==", slug)` (primary가 결과 0건일 때)
3. 실패 시 인라인 에러 메시지 표시

### 6-3. Firebase 앱 인스턴스

`main.js`는 Named App을 2개 사용한다:
- `"sungjin-main-blog"` — 블로그 전용
- `"sungjin-main-posts"` — 공지/성과/후기 목록 전용

### 6-4. `normalizePostType` 맵핑

입력값의 마지막 `/` 세그먼트를 반환한다.
예: `"blog/category/notice"` → `"notice"`, `"review"` → `"review"`, 빈 값 → `""`

### 6-5. 캐시 무력화

HTML의 script 태그에 `?v=YYYYMMDD` 쿼리를 붙여 브라우저 캐시를 우회한다.
현재: `?v=20260330a`. JS 수정 후 배포 시 반드시 이 값을 변경해야 한다.

---

## 7. 커밋 이력 (주요)

```
a8daecc  캐시버스트 및 Firestore 로딩 안정화        ← 최신
b42c12e  성진 웹 프로젝트 맥북 이전을 위한 업로드
fbc2f7a  WIP: firebase admin login wiring
7889500  관리자 페이지
44baea9  backup before cleanup
a9e1c9c  Add main pages for 성진학원 website
```

---

## 8. 지금까지 완료된 작업

### 8-1. Firestore 목록 로드 오류 수정

- **문제**: 공개 페이지에서 `failed-precondition` 에러로 공지/성과/후기 목록이 뜨지 않음
- **원인**: `main.js`가 모든 `published` 문서를 가져온 뒤 클라이언트에서 `type` 필터링 → `status + updatedAt` 인덱스만으로는 부족
- **수정**: `getFirestorePublishedPosts`에 `where("type", "==", slug)` 추가, `category` 폴백 쿼리 추가, 에러 로그에 `code`/`message` 문자열 출력 개선
- **파일**: `assets/js/main.js`

### 8-2. 관리자 저장 안정화

- **문제**: 후기 저장 시 `TypeError: Cannot read properties of undefined (reading 'replace') at buildSafeFilename`
- **수정**: `buildSafeFilename` 함수에 빈 입력 시 `"image.png"` 폴백 추가, `storage_review` 단계 에러 메시지를 "후기 프로필 이미지를 선택해 주세요."로 특화
- **파일**: `admin/admin.js`

### 8-3. 캐시 무력화 적용

- `index.html`, `results.html`, `notice.html` → `main.js?v=20260330a`
- `admin/index.html` → `admin.js?v=20260330a`

### 8-4. GitHub 반영 & Firebase Hosting 배포

- `main` 브랜치에 푸시 완료 (`b42c12e` → `a8daecc`)
- `npx firebase-tools deploy --only hosting --project sungjin-web` 실행, 배포 완료 (2026-04-11)

---

## 9. 현재 진행 중인 작업

현재 능동적으로 진행 중인 작업은 없다. 아래 "해야 할 일"을 참고.

---

## 10. 해야 할 일 / 개선 과제

### 10-1. 높은 우선순위

| 항목 | 상세 |
|------|------|
| **라이브 검증** | 배포 후 `sungjin-web.web.app`에서 공지/성과/후기/블로그 목록이 정상 로드되는지 브라우저 콘솔 확인. `/admin`에서 로그인 → 게시글 저장 → 이미지 업로드 전체 흐름 테스트. |
| **Firestore 인덱스 확인** | Firebase Console > Firestore > 인덱스 탭에서 `type+status+updatedAt`와 `category+status+updatedAt` 복합 인덱스가 `Enabled` 상태인지 확인. 없으면 생성. |
| **Firebase CLI 재인증** | 배포 시 `Authentication Error: Your credentials are no longer valid` 경고가 나왔다. `npx firebase-tools login --reauth` 실행 권장. |

### 10-2. 중간 우선순위

| 항목 | 상세 |
|------|------|
| **`firestore.indexes.json` 추가** | 현재 인덱스가 콘솔 수동 생성이라 환경 재구축 시 누락 위험. `firebase.json`에 `"indexes"` 경로를 추가하고 `firebase deploy --only firestore:indexes`로 관리 권장. |
| **비원자적 저장 (Storage → Firestore)** | 이미지 업로드 후 Firestore 쓰기가 실패하면 Storage에 고아 파일이 남는다. Cloud Functions로 정리하거나 트랜잭션 패턴을 도입할 수 있음. |
| **Result 이미지 Blob URL 누수** | `renderResultImagePreview`가 생성한 Object URL을 `state`에 저장하지 않아 `revokeObjectURL`이 호출되지 않는다. 반복 선택 시 메모리 누수 가능. |
| **`renderFirestoreList` 내 한글 인코딩 깨짐** | 일부 한글 리터럴이 mojibake로 표시됨. 파일을 UTF-8로 다시 저장하면 해결. |
| **관리자 게시글 목록 300건 제한** | `fetchPosts`의 `limit(300)` 때문에 오래된 글은 관리자 목록에 안 뜸. 페이지네이션 또는 `startAfter` 도입 필요. |

### 10-3. 낮은 우선순위 / 선택

| 항목 | 상세 |
|------|------|
| **WordPress REST 코드 정리** | `main.js`에 WP REST API 관련 함수(`getPostsByCategorySlug`, `renderWpList` 등)가 남아있으나 `init()`에서 호출되지 않음. 삭제해도 무방. |
| **로컬 폴더 통합** | `Sungjin_Web`과 `Sungjin_Web_git` 2개 폴더 운영 중. Git이 있는 `Sungjin_Web_git` 하나로 통합 권장. |
| **`about.html` 콘텐츠 업데이트** | `CONTENT_UPDATE_TEMPLATE.md` 템플릿이 준비되어 있음. Word 문서 수령 후 반영. |
| **Review crop MIME 불일치** | `applyImageCrop`이 JPEG로 출력하지만 파일명이 `.png`으로 생성될 수 있음. 실사용에는 문제 없으나 정리 가능. |
| **블로그 슬롯 vs 일반 편집기 통합** | `blog` 타입은 별도 슬롯 UI(`createBlogPostForSlot`)를 사용하고, notice/result/review는 리치 텍스트 편집기를 사용. UX 통합 여지 있음. |

---

## 11. 알려진 문제점 / 주의사항

1. **`storage_review` 에러 메시지 오도 가능성**
   `saveStage === "storage_review"` 시점에서 발생하는 모든 에러에 "후기 프로필 이미지를 선택해 주세요"가 뜬다. 네트워크/권한 에러와 구분되지 않음.

2. **Review crop 타임스탬프 중복**
   Storage 경로에 `Date.now()`가 들어가고, `buildSafeFilename`도 `Date.now()`를 붙여 이중으로 들어감. 무해하지만 경로가 길어짐.

3. **`normalizePostData`의 coverImage/featuredImage 동기화**
   두 필드에 동일한 이미지 객체를 넣는데, Firestore raw 데이터에서 둘이 다르면 혼란 가능.

4. **캐시 버스팅 수동 관리**
   JS 파일 수정 후 HTML의 `?v=` 값을 직접 바꿔야 함. 빌드 시스템이 없어 자동화되지 않음.

5. **Firebase 키 공개**
   `firebase-config.js`의 값은 클라이언트에 노출됨 (Firebase Web SDK 특성상 정상). 실제 보안은 Firestore/Storage Rules로 제어.

---

## 12. 배포 절차

```bash
# 1. 작업 폴더로 이동
cd "/Users/mac_k/성진/Sungjin_Web_git"

# 2. 변경사항 커밋 & 푸시
git add -A
git commit -m "변경 내용 요약"
git push origin main

# 3. 프로덕션 빌드 (dist/ 생성 + 이미지 자동 복사)
npm run build

# 4. Firebase 배포
npx -y firebase-tools deploy --only hosting --project sungjin-web

# (Firestore/Storage 규칙도 변경했다면)
npx -y firebase-tools deploy --only firestore:rules,storage --project sungjin-web
```

배포 후 반드시 `https://sungjin-web.web.app`에서 확인한다.
Vite가 빌드 시 자동으로 파일명 해시를 붙이므로 `?v=` 수동 관리는 불필요.

---

## 13. 로컬 개발 환경

```bash
cd "/Users/mac_k/성진/Sungjin_Web_git"
npm run dev   # → http://localhost:5173 (Vite HMR)
```

`.env.local`이 없으면 Firebase 초기화가 안 된다. Firebase Console > 프로젝트 설정 > 내 앱(Web)에서 값을 확인해 `.env.local`을 생성한다.

---

## 14. 참고 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| README.md | 프로젝트 루트 | 배너 교체, 블로그 CSV, 관리자 세팅, 인덱스, 배포 체크리스트 |
| CONTENT_UPDATE_TEMPLATE.md | 프로젝트 루트 | about.html 콘텐츠 교체 가이드 |
| firebase-config.example.js | assets/js/ | Firebase 웹 설정 템플릿 |
| firestore.rules | firebase/ | Firestore 보안 규칙 원본 |
| storage.rules | firebase/ | Storage 보안 규칙 원본 |

---

## 15. 연락처 / 계정 정보

| 항목 | 값 |
|------|-----|
| Firebase 로그인 계정 | ktg2096@gmail.com |
| GitHub 저장소 | https://github.com/kimtaekyum/Sungjin_Web |
| 학원 상담 전화 | 02-2693-6123 |
| 학원 주소 | 서울 양천구 오목로 15 지우빌딩 301, 401호 |
