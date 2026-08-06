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
   - 로그인 화면: http://localhost:3000/
   - 앱 화면: http://localhost:3000/app

## 배포 (WEB/WAS/DB 단일 서버)
이 프로젝트는 Node 서버 1개에서 WEB 정적파일 + WAS API + DB(SQLite)를 함께 실행합니다.

### GitHub 리포지토리 연동 배포 권장
GitHub에 푸시한 뒤, Render 같은 Node 호스팅에서 같은 리포지토리를 연결해 배포하세요.

1. Build Command: `npm install`
2. Start Command: `npm start`
3. 배포 URL 접속
   - 로그인 화면: `https://<your-service>.onrender.com/`
   - 앱 화면: `https://<your-service>.onrender.com/app`

### 주의
- GitHub 저장소 URL(`https://github.com/...`)이나 GitHub Pages URL은 Node/SQLite 서버를 실행하지 못하므로, WEB/WAS/DB 단일 서버 구조를 그대로 호스팅할 수 없습니다.

## 평가지표 근거
- OECD PISA Reading Literacy Framework (정보 이해, 해석, 평가)
- NAEP Reading Framework (이해와 분석적 읽기)
- 2015/2022 개정 국어과 성취기준(초등 읽기/쓰기 역량)

본 서비스의 자동평가는 진단 보조도구이며, 최종 평가는 교사의 전문적 판단과 함께 활용해야 합니다.
