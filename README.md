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

## 4) 배포 체크리스트

1. 도메인 연결: DNS(A/CNAME) 설정 확인
2. 호스팅 업로드: HTML/CSS/JS/이미지/CSV 포함 전체 배포
3. 기본 점검: 모바일 메뉴, 슬라이더, 블로그 로딩, 스크롤 리빌 동작 확인
4. 검색 노출: 네이버 서치어드바이저 사이트 등록/소유 확인
5. 사이트맵/robots: `sitemap.xml`, `robots.txt` 제공
6. 캐시 무효화: CDN/브라우저 캐시 갱신 후 재확인
