# AIRead - 학생 문해력 평가 서비스

## 개요
이 프로젝트는 학생의 독서 감상문을 기반으로 문해력을 평가하는 WEB-WAS-DB 구조의 샘플 서비스입니다.

- WEB: `WEB/` 정적 웹 UI
- WAS: `WAS/server.js` (Node.js + Express API)
- DB: `DB/database.js`, SQLite (`DB/data/literacy.db`)

## 기능
- 학생 로그인(이름, 학교, 학년, 반, 번호)
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

## GitHub + Render로 외부 테스트하기
GitHub URL 자체는 코드 저장소 페이지이며, 앱 테스트는 Render 배포 URL에서 진행합니다.

### 1) GitHub에 최신 코드 반영
1. 변경사항 확인
   - git status
2. 커밋
   - git add .
   - git commit -m "Add Render deployment config"
3. 원격 저장소로 푸시
   - git push origin main

### 2) Render에서 배포 생성
1. Render 대시보드에서 New + -> Blueprint 선택
2. GitHub 저장소 연결 후 배포
3. 저장소의 render.yaml을 읽어 자동으로 Web Service + Persistent Disk 생성

### 3) Render 환경변수 확인
- NODE_ENV: production
- DB_DIR: /tmp/airead-data
- TEACHER_PASSWORD: Render가 자동 생성

### 4) 배포 완료 후 외부 접속
- 서비스 URL 예시: https://airead.onrender.com
- 로그인 화면: https://airead.onrender.com/
- 앱 화면: https://airead.onrender.com/app
- 상태 확인: https://airead.onrender.com/api/health

### 5) 테스트 체크리스트
1. 학생 로그인 가능 여부
2. 문해력 평가 저장 후 대시보드 반영 여부
3. 성장 타임라인 그래프 표시 여부
4. AI 진단/추천 탭 분석 결과 표시 여부

### 참고
- Render free 플랜은 슬립이 발생할 수 있어 첫 요청 시 지연될 수 있습니다.
- Render free 플랜은 Persistent Disk를 지원하지 않아 DB가 재배포/재시작 시 초기화될 수 있습니다.
- 데이터 영구 저장이 필요하면 유료 플랜(디스크 사용)으로 변경하거나 외부 DB(PostgreSQL 등)를 사용하세요.

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
