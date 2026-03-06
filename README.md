# Reactive Object No.1 (Three.js + Vite)

`three` 기반 3D 씬을 **`src/main.js`** 하나를 엔트리로 실행하는 최소 구조로 정리한 프로젝트입니다.

## 실행 방법

### 1) 의존성 설치

```bash
npm install
```

### 2) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 Vite가 출력하는 주소로 접속하면 됩니다.

### 3) 프로덕션 빌드 / 미리보기

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```text
.
├─ index.html                 # (엔트리) /src/main.js 로드 + HUD
├─ src/
│  └─ main.js                 # Three.js 씬/로더/인터랙션 전체
├─ public/
│  └─ model/
│     └─ TrafficLight12/
│        └─ TrafficLight12.glb
├─ package.json               # Vite 스크립트, three 의존성
└─ package-lock.json
```

## 에셋(모델)

- **모델 경로**: `public/model/TrafficLight12/TrafficLight12.glb`
- **로드 URL**: `/model/TrafficLight12/TrafficLight12.glb` (Vite의 `public/` 정적 경로 규칙)

## 조작 방법(기본)

프로젝트 HUD에도 동일하게 표시됩니다.

- **카메라**: 드래그(회전) / 휠(줌) / 패닝
- **선택**: `Shift + 클릭`
- **부착(attach)**: `Enter`
- **복구(restore)**: `Backspace`
- **선택 해제(detach)**: `Delete` 또는 `X`

## 참고

- 프로젝트는 **ESM**(`"type": "module"`) 기반입니다.
- `main.js`는 캔버스를 `#app`에 마운트합니다. (`index.html`에 `#app`이 존재해야 합니다.)

