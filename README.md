# Python Quest Academy

파이썬 코드를 직접 입력해 콤보를 이어가고 XP, 별, 코인을 얻는 브라우저 기반 타이핑 게임입니다.

## 주요 기능

- 초급·중급·고급 3개 월드와 135개 코드 미션
- 워밍업, 메인 퀘스트, 파이널 스테이지 모드
- 실제 키 입력 기준 정확도, 수정 횟수, 콤보, 타수/분 측정
- 미션별 별 1~3개, 플레이어 레벨, XP, 코인, 연속 학습 기록
- 개인 업적과 브라우저 로컬 저장
- Pyodide를 이용한 Python 실행 및 Matplotlib 그래프 표시
- 전용 마스코트와 밝은 플레이룸 테마
- 키보드와 모바일 화면을 지원하는 반응형 UI

## 실행 방법

메타데이터와 Python 예제 파일을 `fetch()`로 읽기 때문에 `index.html`을 파일로 직접 열지 말고 로컬 HTTP 서버를 사용해야 합니다.

```powershell
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`으로 접속합니다.

## 파일 구조

```text
index.html                         화면 구조
style.css                         게임 UI와 반응형 기본 스타일
light-theme.css                   밝은 플레이룸 비주얼 테마
assets/robot-logo.png             마스코트 원본 로고
assets/robot-mascot-typing.png    키보드로 코딩하는 전신 로봇 마스코트
assets/world-01-grammar.webp      문법 플레이룸 월드 타일 이미지
assets/world-01-hub.webp          문법 플레이룸 내부 허브와 스테이지 맵 이미지
assets/world-01-zone-01..05.webp  문법 플레이룸의 다섯 스테이지 구역 이미지
assets/world-02-logic.webp        로직 아케이드 월드 타일 이미지
assets/world-02-hub.webp          로직 아케이드 내부 허브와 스테이지 맵 이미지
assets/world-02-zone-01..05.webp  로직 아케이드의 다섯 스테이지 구역 이미지
assets/world-03-data.webp         데이터 스테이지 월드 타일 이미지
assets/world-03-hub.webp          데이터 스테이지 내부 허브와 스테이지 맵 이미지
assets/world-03-zone-01..05.webp  데이터 스테이지의 다섯 분석 구역 이미지
assets/play-data-dashboard.webp   홈 MY PLAY DATA 카드의 플레이어 이미지
assets/play-log-champion.webp     플레이 로그의 로봇 트로피 이미지
script.js                         게임 상태, 점수, 보상, 화면 흐름
python-codes.js                   미션 데이터 로더
python-codes/codes-metadata.json  135개 미션 메타데이터
python-codes/**/*.py              실제 타이핑·실행용 Python 코드
```

## 데이터 저장

플레이 기록은 브라우저의 `localStorage`에 `pythonQuestProfileV2` 키로 저장됩니다. 서버나 계정 간 동기화는 제공하지 않습니다.

## 외부 연결

- Pretendard 웹폰트
- Pyodide Python 실행 엔진
- Python 예제에서 사용하는 pandas, NumPy, Matplotlib, scikit-learn 등의 Pyodide 패키지

인터넷이 연결되지 않아도 로컬 미션 데이터가 이미 제공되면 타이핑 게임은 진행할 수 있지만, 웹폰트와 Python 코드 실행은 제한될 수 있습니다.
