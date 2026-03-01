# 성진학원 정적 사이트 가이드

## 1) 로컬 실행 방법

### VS Code Live Server
1. 프로젝트 폴더를 VS Code에서 엽니다.
2. `index.html` 우클릭 후 `Open with Live Server`를 실행합니다.

### Python 내장 서버
```bash
python -m http.server 5500
```
브라우저에서 `http://localhost:5500` 접속

## 2) 배너 이미지 교체 규칙

홈 슬라이더는 `index.html`의 각 슬라이드 `--hero-bg` 경로를 사용합니다.

- 1번 배너(완성형): `/assets/img/hero-1-main.png`
- 2번 배너: `assets/img/banners/hero-2-cert.jpg`
- 3번 배너: `assets/img/banners/hero-3-review.jpg`

### 1번 배너 contain 모드
1번 슬라이드는 `hero-slide--contain` 클래스로 잘림 없이 표시합니다.
- 기본 슬라이드는 `cover`
- `hero-slide--contain`은 `contain` + 단색 배경

## 3) 블로그 CSV 수정 방법

파일: `assets/data/blog_posts.csv`

헤더 형식:
```csv
title,date,link
```

예시:
```csv
중등 내신 대비 공부법 정리,2026-02-08,https://blog.naver.com/sja6123
```

주의:
- 날짜는 `YYYY-MM-DD` 권장
- 링크는 `https://` 포함
- 상단 5개만 홈에 표시

## 4) Firebase 관리자 페이지 운영 가이드

### 4-1) 구성 파일

| 경로 | 용도 |
|---|---|
| `admin/index.html` | 관리자 로그인 + 대시보드 |
| `admin/admin.css` | 관리자 UI 스타일 |
| `admin/admin.js` | 인증/권한/게시물 CRUD/이미지 업로드 |
| `assets/js/firebase-config.example.js` | Firebase 웹 설정 샘플 |
| `assets/js/firebase-config.js` | 실제 로컬 설정 파일(커밋 금지) |
| `firebase/firestore.rules` | Firestore 보안 규칙 |
| `firebase/storage.rules` | Storage 보안 규칙 |

### 4-2) 초기 세팅 체크리스트

| 항목 | 작업 |
|---|---|
| Firebase 프로젝트 생성 | Firebase Console에서 새 프로젝트 생성 |
| Auth 활성화 | Authentication > Sign-in method에서 Email/Password 활성화 |
| Firestore 생성 | Firestore Database 생성 후 `firebase/firestore.rules` 배포 |
| Storage 생성 | Storage 생성 후 `firebase/storage.rules` 배포 |
| 관리자 계정 생성 | Authentication에서 이메일/비밀번호 사용자 생성 |
| 관리자 권한 부여 | Firestore `admins/{uid}` 문서 생성, `active: true` 저장 |

### 4-3) 관리자 계정 만들기 상세

1. Firebase Console > Authentication > Users에서 관리자 이메일 계정을 생성합니다.
2. 생성된 사용자 `UID`를 확인합니다.
3. Firestore에 `admins/{UID}` 문서를 만들고 아래 필드를 넣습니다.

```json
{
  "active": true
}
```

4. `active`가 `true`인 계정만 `/admin/index.html` 접근이 허용됩니다.
5. 권한 없는 계정은 로그인 직후 자동 `signOut` 됩니다.

### 4-4) firebase-config 설정

1. `assets/js/firebase-config.example.js`를 복사해 `assets/js/firebase-config.js`를 만듭니다.
2. Firebase Console > 프로젝트 설정 > 일반 > 내 앱(Web)에서 구성 값을 복사해 입력합니다.
3. `firebaseConfig` 값은 공개 키 성격이므로 프론트에 노출될 수 있습니다.
4. 실제 보안은 Firestore/Storage Rules로 제어해야 합니다.
5. `assets/js/firebase-config.js`는 공개 저장소에 커밋하지 마세요.

### 4-5) 관리자 접속

- URL: `/admin/index.html`
- 로그인 성공 후 `admins/{uid}.active == true` 검증을 통과하면 대시보드가 표시됩니다.

### 4-6) posts 컬렉션 데이터 구조

| 필드 | 타입 | 설명 |
|---|---|---|
| `title` | string | 필수 |
| `category` | string | `notice` / `result` / `review` / `blog` |
| `status` | string | `draft` / `published` |
| `excerpt` | string | 선택 |
| `content` | string | 필수(plain text/간단 markdown 권장) |
| `featuredImage` | object/null | `{ url, path, width, height }` |
| `gallery` | array | `[{ url, path, width, height }]` |
| `createdAt` | timestamp | 생성 시 서버 시간 |
| `updatedAt` | timestamp | 수정 시 서버 시간 |
| `publishedAt` | timestamp/null | `published`일 때 사용 |
| `authorUid` | string | 작성/수정 사용자 UID |

## 5) 배포 체크리스트

1. 도메인 연결: DNS(A/CNAME) 설정 확인
2. 호스팅 업로드: HTML/CSS/JS/이미지/CSV 포함 전체 배포
3. Firebase 세팅: Auth/Firestore/Storage 및 rules 배포 확인
4. 관리자 점검: `/admin/index.html` 로그인, 권한 차단, CRUD, 이미지 업로드 확인
5. 기본 점검: 모바일 메뉴, 슬라이더, 블로그 로딩, 스크롤 리빌 동작 확인
6. 검색 노출: 네이버 서치어드바이저 사이트 등록/소유 확인
7. 사이트맵/robots: `sitemap.xml`, `robots.txt` 제공
8. 캐시 무효화: CDN/브라우저 캐시 갱신 후 재확인
