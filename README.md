# AIRead - 학생 문해력 평가 서비스

## 개요
이 프로젝트는 학생의 독서 감상문을 기반으로 문해력을 평가하는 WEB-WAS-DB 구조의 샘플 서비스입니다.

- WEB: `WEB/` 정적 웹 UI
- WAS: `WAS/server.js` (Node.js + Express API)
- DB: `DB/database.js`, SQLite (`DB/data/literacy.db`)

## 기능
- 학생 기본정보 입력
- 읽은 책 정보 및 느낀점(감상문) 입력
- 문해력 평가지표 기반 자동 점수 산출
- 학생, 글, 평가 결과를 대시보드에서 조회
- 평가 결과를 DB에 저장

## 실행 방법
1. 의존성 설치
   ```bash
   npm install
   ```
2. 서버 실행
   ```bash
   npm start
   ```
3. 브라우저 접속
   - http://localhost:3000

## GitHub Pages 접속
- 접속 주소: https://jo-by.github.io/AIRead/
- 루트 접속 시 `WEB/login.html`로 자동 이동합니다.

### 중요: API 서버 주소 설정
GitHub Pages는 정적 웹만 제공하므로 WAS/DB API는 별도 서버에 배포되어 있어야 합니다.

1. `WEB/config.js` 파일에서 API 주소를 설정합니다.
   ```js
   window.AIREAD_API_BASE = "https://your-api.example.com";
   ```
2. API 서버에서 CORS 허용이 필요합니다.

## 평가지표 근거
- OECD PISA Reading Literacy Framework (정보 이해, 해석, 평가)
- NAEP Reading Framework (이해와 분석적 읽기)
- 2015/2022 개정 국어과 성취기준(초등 읽기/쓰기 역량)

본 서비스의 자동평가는 진단 보조도구이며, 최종 평가는 교사의 전문적 판단과 함께 활용해야 합니다.
