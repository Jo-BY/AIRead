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

## 실행 방법 (로컬)
1. 의존성 설치
   ```bash
   npm install
   ```
2. DB 서버 실행
   ```bash
   npm run start:db
   ```
3. WAS 서버 실행 (별도 터미널)
   ```bash
   npm run start:was
   ```
4. WEB 접속
   - WAS를 통해 접속: http://localhost:3000/
   - 또는 `WEB/login.html`을 브라우저로 열고 `WEB/config.js`에서 API 주소를 설정

## GitHub + Render로 외부 테스트하기 (WEB/WAS/DB 3서버)
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
3. 저장소의 `render.yaml`을 읽어 아래 3개 서비스를 자동 생성
   - `airead-web` (정적 WEB)
   - `airead-was` (Node API)
   - `airead-db` (Private DB API + Persistent Disk)

### 3) Render 환경변수 설정
- `airead-was`
   - `TEACHER_PASSWORD`: 교사용 비밀번호
   - `DB_SERVICE_URL`: `http://airead-db:10000` (기본값)
- `airead-web`
   - `AIREAD_API_BASE`: `https://airead-was.onrender.com` (실제 WAS URL로 설정)

### 4) 배포 완료 후 외부 접속
- 로그인 화면: `https://airead-web.onrender.com/`
- 앱 화면: `https://airead-web.onrender.com/app`
- WAS 상태 확인: `https://airead-was.onrender.com/api/health`

### 5) 테스트 체크리스트
1. 학생 로그인 가능 여부
2. 문해력 평가 저장 후 대시보드 반영 여부
3. 성장 타임라인 그래프 표시 여부
4. AI 진단/추천 탭 분석 결과 표시 여부

### 참고
- Render free 플랜은 슬립이 발생할 수 있어 첫 요청 시 지연될 수 있습니다.
- SQLite 영구 저장은 `airead-db`에 연결한 Persistent Disk에 저장됩니다.
- `airead-db`는 Private Service이므로 외부에서 직접 접근하지 않고 `airead-was`만 접근합니다.

## 배포 요약
이 프로젝트는 Render에서 `WEB(정적) + WAS(API) + DB(내부)` 3서비스 구조로 배포됩니다.

### GitHub 리포지토리 연동 배포 권장
GitHub에 푸시한 뒤, Render Blueprint로 같은 리포지토리를 연결해 `render.yaml` 기준으로 배포하세요.

### 주의
- GitHub 저장소 URL(`https://github.com/...`)이나 GitHub Pages URL은 WAS/DB 서버를 실행하지 못하므로 실제 동작 테스트는 Render 배포 URL에서 진행해야 합니다.

## 평가지표 근거
- OECD PISA Reading Literacy Framework (정보 이해, 해석, 평가)
- NAEP Reading Framework (이해와 분석적 읽기)
- 2015/2022 개정 국어과 성취기준(초등 읽기/쓰기 역량)

본 서비스의 자동평가는 진단 보조도구이며, 최종 평가는 교사의 전문적 판단과 함께 활용해야 합니다.
