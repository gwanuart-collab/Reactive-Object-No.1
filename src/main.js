import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { parseGIF, decompressFrames } from 'gifuct-js'

/* =========================================================
   0) 프로젝트 값 (Maya Outliner 기준 이름)
========================================================= */
// Vite dev: base '/', prod: '/Reactive-Object-No.1/'. public 폴더가 base 아래로 서빙됨.
const MODEL_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/model/TrafficLight12/TrafficLight25.glb'
/** 마야 단위 보정. GLB가 마야 cm 기준이면 1단위=1m로 쓰려면 0.01, 그대로 쓰면 1 */
const MODEL_UNIT_SCALE = 1

const POLE_NAME = 'POLE_MESH'
const SOCKET_NAME = 'SOCKET_SignR'
const LIGHT_NAMES = ['LIGHT1', 'LIGHT2', 'LIGHT3', 'pasted__LIGHT2']
/** LIGHT1/2/3 호버 시 재생할 사운드. public/sound/light-hover.mp3 */
const LIGHT_HOVER_SOUND_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/sound/light-hover.mp3'
/** 풍선(pasted__Cylinder5) 호버 시 재생. public/sound/soundballoon-hover.mp3 */
const BALLOON_HOVER_SOUND_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/sound/soundballoon-hover.mp3'
/** CUBE5_BASE(pasted__pasted__CUBE5_BASE) 모프 시 재생. public/sound/hongiksound.mp3 */
const CUBE5_HONGIK_SOUND_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/sound/hongiksound.mp3'
/** CUBE8(로봇팔) 호버 시 재생. public/sound/robotsound.mp3 */
const ROBOT_SOUND_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/sound/robotsound.mp3'
/** CIRCLE1 호버 시 재생. public/sound/popball.mp3 */
const POPBALL_SOUND_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/sound/popball.mp3'
/** pPlane12에 표시할 GIF. public/gif/plane12.gif 에 파일 넣기 */
const PLANE12_GIF_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '') + '/gif/plane12.gif'
const PLANE12_NAME = 'pPlane12'
/** pasted__pPlane12에 표시할 이미지. public/redsign/redsign.jpg 또는 public/redsign.jpg */
const PASTED_PLANE12_NAME = 'pasted__pPlane12'

const STORAGE_KEY = 'signR_attached_names'
/** 폴(소켓)에 기본 연결할 메쉬 이름. 여기를 채우면 웹에서 따로 설정하지 않아도 동일하게 복원됨(코드 우선). getDefaultAttachCode()로 문자열 뽑기 가능 */
const DEFAULT_ATTACHED_TO_SOCKET = [
  'CUBE7',
  'CUBE7_C',
  'pPlane12',
  'pasted__pPlane12',
  'CUBE6_C',
  'CUBE6',
  'Cylinder36',
  'RING1',
  'Cylinder37',
  'Cylinder35',
  'RING3',
  'RING4',
  'Cylinder38',
  'RING2',
  'CUBE1',
  'Cylinder2',
  'Cylinder1',
  'HAT1',
  'HAT2',
  'BODY1',
  'BODY2',
  'BODY3',
  'CAP1',
  'LIGHT1',
  'CAP2',
  'LIGHT2',
  'CAP3',
  'LIGHT3',
  'polySurface36',
  'polySurface35',
  'polySurface37',
  'CUBE2',
  'CUBE3',
  'pasted__pasted__Cylinder1',
  'pasted__pasted__pasted__Cylinder1',
  'Cylinder4',
  'Cylinder14',
  'Cylinder15',
  'pPlane1',
  'pPlane2',
  'pPlane3',
  'pPlane4',
  'PIN17',
  'PIN2',
  'PIN3',
  'PIN4',
  'PIN6',
  'PIN5',
  'pSphere2',
  'sweep2',
  'pasted__LIGHT2',
  'PIN16',
  'PIN15',
  'PIN14',
  'PIN1',
  'Cylinder17',
  'Cylinder16',
  'Cylinder20',
]

// =========================================================
// ✅ [복구] Cylinder17: 1회 hover로 시작 → 마우스 떼도 x번 상하 반복
// =========================================================
const CYL17_NAME = 'Cylinder17'
const CYL40_FOLLOW_NAME = 'Cylinder40'  // Cylinder17에 붙어서 같이 움직이되, 스케일은 유지
const PASTED_CYL6_FOLLOW_NAME = 'pasted__Cylinder6'  // Cylinder17 따라 움직임 (Cylinder40과 동일). Cylinder6과 별개

// 몇 번 반복? (1 = 위아래 한 사이클)
const CYL17_CYCLES = 3

// 상하 이동량(최대 진폭) — UNIT 자동 적용됨
const CYL17_MOVE_AMPLITUDE = 5

// 속도(1초에 몇 사이클?)  ex) 1.2면 1초에 1.2번 왕복
const CYL17_CYCLES_PER_SEC = 2

// 시작/복귀 보간(부드러움)
const CYL17_LERP = 0.18

// ===============================
// ✅ Cylinder17 squash (hover scale) — "상하축만" 줄이기
// ===============================

// ✅ 상하축(업축) 스케일만 줄어드는 정도 (1 = 원래, 0.6 = 40% 납작)
const CYL17_HOVER_UP_SCALE = 0.6

// 스케일 변화 속도
const CYL17_SCALE_LERP = 0.1

let cyl17BaseScale = new THREE.Vector3()
let cyl17CurrentUpScale = 1
let cyl17TargetUpScale = 1

// =========================================================
// ✅ [단순화] CIRCLE1: hover 시 "월드 수직(Y)로만" 공처럼 반복 점프
// =========================================================
const CIRCLE1_NAME = 'CIRCLE1'

// 몇 번 튀기? (1 = 한 번 튀어오르고 착지까지)
const CIRCLE1_BOUNCE_CYCLES = 10

// 튀는 높이(최대) — UNIT 자동 적용됨
const CIRCLE1_BOUNCE_HEIGHT = 15

// 속도(1초에 몇 사이클?)
const CIRCLE1_CYCLES_PER_SEC = 2.2

// (유지) 보간(부드러움)
const CIRCLE1_LERP = 0.5

const CIRCLE1_BOUNCE_DECAY = 0.85
const CIRCLE1_STRETCH = 1.5
const CIRCLE1_SQUASH = 0.35
/** CIRCLE1 호버 트리거 쿨다운(초). 이 시간마다 한 번만 호버로 점프·사운드 */
const CIRCLE1_HOVER_COOLDOWN_SEC = 0.5

// 로봇팔 (4축 관절): 축1(본체 가까움) → 축2 → 축3 → 축4. 각 축 기준으로 축 이하가 함께 움직임.
// 축1: Cylinder26(고정)·Cylinder25(회전) → Cylinder24→32→33→28→71 → 축2
// 축2: Cylinder27(회전) → Cylinder19→70 → 축3
// 축3: Cylinder70(회전) → Cylinder18→39 → 축4
// 축4: Cylinder39(회전) → Cylinder41, Cylinder31, CUBE8
// → CUBE8 호버 시에만 4축이 함께 구동됨
const CYL24_NAME = 'Cylinder24'
const CYL25_JOINT_NAME = 'Cylinder25'
const CYL26_FIXED_NAME = 'Cylinder26'
// 축1 체인 순서 (Cylinder24 다음으로 한 줄로 연결)
const CYL24_CHAIN_ORDER = ['Cylinder32', 'Cylinder33', 'Cylinder28', 'Cylinder71']
const CYL25_JOINT_BEND_ANGLE = 0.5
const CYL25_JOINT_LERP = 0.1
// 회전 방향: 1 = 축 기준 오른손 방향, -1 = 반대 방향
const CYL25_JOINT_BEND_SIGN = -1
// 관절 회전축 — 위아래로 꺾이려면 수평축 사용 (world_x 또는 world_z). world_y면 옆으로 회전
const CYL25_JOINT_HINGE = 'world_x'
// 회전축 방향 미세 조정 (라디안). 기본축을 월드 X,Y,Z 순으로 이 각도만큼 회전한 뒤 축으로 사용
const CYL25_HINGE_TILT_X = 0
const CYL25_HINGE_TILT_Y = -0.37
const CYL25_HINGE_TILT_Z = 0
// 관절 회전축(피벗) 위치 세부 조정 — 자동 계산된 위치에 더하는 월드 오프셋
const CYL25_PIVOT_OFFSET_X = 0.001
const CYL25_PIVOT_OFFSET_Y = 0
const CYL25_PIVOT_OFFSET_Z = 0.02
const CYL25_AXIS_POINT_SIZE = 0.01
const CYL25_AXIS_LINE_LENGTH = 8

// 두 번째 관절: Cylinder19 고정, Cylinder27이 Cylinder19–Cylinder71 사이 축을 기준으로 회전
const CYL19_FIXED_NAME = 'Cylinder19'
const CYL27_JOINT_NAME = 'Cylinder27'
const CYL71_ATTACHED_NAME = 'Cylinder71'
const CYL27_JOINT_BEND_ANGLE = -2
const CYL27_JOINT_LERP = 0.1
const CYL27_JOINT_BEND_SIGN = 1
const CYL27_JOINT_HINGE = 'world_x'
const CYL27_HINGE_TILT_X = 0
const CYL27_HINGE_TILT_Y = -0.4 
const CYL27_HINGE_TILT_Z = 0
const CYL27_PIVOT_OFFSET_X = 0.001
const CYL27_PIVOT_OFFSET_Y = 0
const CYL27_PIVOT_OFFSET_Z = 0
const CYL27_AXIS_POINT_SIZE = 0.01
const CYL27_AXIS_LINE_LENGTH = 8

// 축3: Cylinder70 회전
const CYL70_JOINT_NAME = 'Cylinder70'
const CYL18_NAME = 'Cylinder18'
const CYL70_JOINT_BEND_ANGLE = 0.9
const CYL70_JOINT_LERP = 0.1
const CYL70_JOINT_BEND_SIGN = 1
const CYL70_JOINT_HINGE = 'world_x'
const CYL70_HINGE_TILT_X = 0
const CYL70_HINGE_TILT_Y = -17.3
const CYL70_HINGE_TILT_Z = 0
const CYL70_PIVOT_OFFSET_X = 0
const CYL70_PIVOT_OFFSET_Y = -0.015
const CYL70_PIVOT_OFFSET_Z = 0

// 축4: Cylinder39 회전
const CYL39_JOINT_NAME = 'Cylinder39'
const CYL39_JOINT_BEND_ANGLE = 0.1
const CYL39_JOINT_LERP = 0.1
const CYL39_JOINT_BEND_SIGN = 1
const CYL39_JOINT_HINGE = 'world_x'
const CYL39_HINGE_TILT_X = 0
const CYL39_HINGE_TILT_Y = -17.3
const CYL39_HINGE_TILT_Z = 0
const CYL39_PIVOT_OFFSET_X = 0
const CYL39_PIVOT_OFFSET_Y = 0
const CYL39_PIVOT_OFFSET_Z = 0

const CUBE8_NAME = 'CUBE8'
const CYL41_NAME = 'Cylinder41'
const CYL31_NAME = 'Cylinder31'
const CYL34_FOLLOW_NAME = 'Cylinder34'  // Cylinder41에 붙어서 같이 움직임
// 로봇팔: CUBE8 한 번 호버 시 한 사이클(휘었다가 복귀), 호버 유지 불필요
const ROBOT_ARM_TRIGGER_NAME = CUBE8_NAME
const ROBOT_ARM_BEND_DURATION = 0.6
const ROBOT_ARM_HOLD_DURATION = 0.25
const ROBOT_ARM_RETURN_DURATION = 0.6
/** 축 간 딜레이(초). 축1 → 축2 → 축3 → 축4 순으로 이만큼씩 늦게 시작. 축1은 도달 후 유지, 축2는 축34가 돌 때까지 유지... */
const ROBOT_ARM_AXIS_DELAY = 0.12
/** 휘기 시 각 축이 0→목표까지 도달하는 시간. BEND_DURATION >= 3*AXIS_DELAY + 이 값 이상 권장 */
const ROBOT_ARM_AXIS_BEND_DURATION = 0.14
/** 복귀 시 각 축이 목표→0까지 도달하는 시간. RETURN_DURATION >= 3*AXIS_DELAY + 이 값 이상 권장 */
const ROBOT_ARM_AXIS_RETURN_DURATION = 0.14

// ✅ 풍선 메쉬
const BALLOON_NAME = 'pasted__Cylinder5'
// 풍선이 커질 때 같이 스케일되는 플레인 — 플레인별로 "가장 커졌을 때" 이동할 오프셋 설정 (그룹 로컬)
const BALLOON_PLANES_OFFSETS = [
  { name: 'pPlane6', x: 0, y: -0.1, z: 0 },
  { name: 'pPlane7', x: 0, y: -0.01, z: 0 },
  { name: 'pPlane8', x: 0, y: -0.01, z: 0 },
  { name: 'pPlane9', x: -0.001, y: 0.09, z: 0 },
]
/** 풍선 본체 + 같이 늘어나는 plane. 이 중 하나에 마우스 올려도 풍선 호버로 처리 */
const BALLOON_HOVER_NAMES = [BALLOON_NAME, ...BALLOON_PLANES_OFFSETS.map((p) => p.name)]

/* =========================================================
   ✅ [수정] 풍선 커짐에 따른 "밀림"
   - 기존 pasted__CUBE12 / pasted__CUBE11 / pasted__CUBE10 유지
   - CUBE2, CUBE8 제거
   - 요청한 6개만 추가
========================================================= */
const BALLOON_PUSH_RULES = [
  { name: 'pasted__CUBE12', axis: 'x', max: 15, sign: +1 },
  { name: 'pasted__CUBE11', axis: 'x', max: 15, sign: +1 },
  { name: 'pasted__CUBE10', axis: 'x', max: 15, sign: +1 },

  // ✅ pasted__CUBE10과 반대 방향으로 밀림 (x-)
  { name: 'CIRCLE1', axis: 'x', max: 15, sign: -1 },
  { name: 'Cylinder11', axis: 'x', max: 15, sign: -1 },
  { name: 'Cylinder9', axis: 'x', max: 15, sign: -1 },
  { name: 'CUBE4', axis: 'x', max: 15, sign: -1 },
  { name: 'Cylinder8', axis: 'x', max: 15, sign: -1 },
  // CUBE5_BASE, pCube1: 풍선(pasted__Cylinder5) 늘어날 때 같이 밀림
  { name: 'pasted__pasted__CUBE5_BASE', axis: 'x', max: 15, sign: -1 },
  { name: 'pasted__pCube1', axis: 'x', max: 15, sign: -1 },
  { name: 'Cylinder10', axis: 'x', max: 15, sign: -1 },
]

// ✅ 풍선 핀(7/8): 밀림 (attach X)
const BALLOON_PIN_PUSH_RULES = [
  { name: 'pasted__PIN7', axis: 'x', max: 14.7, sign: +1 },
  { name: 'pasted__PIN8', axis: 'x', max: 14.7, sign: +1 },
]

// ✅ lift / drop
const BALLOON_LIFT_NAMES = ['Cylinder13']
const BALLOON_LIFT_MAX = 1.5

const BALLOON_DROP_NAMES = ['pasted__Cylinder30', 'pasted__Cylinder29']
const BALLOON_DROP_MAX = 0.5

// =========================================================
// ✅ 전선(케이블) #1
// =========================================================
const CABLE_A_NAME = 'CUBE2'
const CABLE_B_NAME = 'pasted__CUBE12'
const CABLE_A_OFFSET_LOCAL = new THREE.Vector3(-5, 0, -9)
const CABLE_B_OFFSET_LOCAL = new THREE.Vector3(-5, 0, -11)

// =========================================================
// ✅ 전선(케이블) #2
// =========================================================
const CABLE2_A_NAME = 'BODY1'
const CABLE2_B_NAME = 'pasted__CUBE5'
const CABLE2_A_OFFSET_LOCAL = new THREE.Vector3(-14, -10, -30)
const CABLE2_B_OFFSET_LOCAL = new THREE.Vector3(0, 0, 0)

// =========================================================
// ✅ 전선(케이블) #3
// =========================================================
const CABLE3_A_NAME = 'pasted__CUBE12'
const CABLE3_B_NAME = 'CUBE8'
const CABLE3_A_OFFSET_LOCAL = new THREE.Vector3(2, 6, 0)
const CABLE3_B_OFFSET_LOCAL = new THREE.Vector3(-5, 0, 0)

// =========================================================
// ✅ 전선(케이블) #4
// =========================================================
const CABLE4_A_NAME = 'pasted__CUBE10'
const CABLE4_B_NAME = 'CUBE8'
const CABLE4_A_OFFSET_LOCAL = new THREE.Vector3(2, 7, -1.8)
const CABLE4_B_OFFSET_LOCAL = new THREE.Vector3(-13, 0, 0)

// =========================================================
// ✅ pasted__CUBE5 "고무"
// =========================================================
const RUBBER_TARGET_NAME = 'pasted__CUBE5'
const RUBBER_STRETCH = 1.35
const RUBBER_SQUASH = 0.85
const RUBBER_PULL_ANGLE = 0.55
const RUBBER_LERP = 0.14
const RUBBER_WIGGLE = 0.1

// =========================================================
// ✅ PIN attach 그룹
// =========================================================
const PIN_ATTACH = {
  balloonPins: ['pasted__PIN7', 'pasted__PIN8'],
  cube12: ['pasted__PIN13', 'pasted__PIN11', 'pasted__PIN12'],
  cube10: ['pasted__PIN20', 'pasted__PIN19', 'pasted__PIN9'],
  cube11: ['pasted__PIN10'],
}

// =========================================================
// ✅ 기둥 바운스
// =========================================================
const BOUNCE_MESH_NAME = 'Cylinder12'
const BOUNCE_STRENGTH = 4.0
const BOUNCE_DAMPING = 0.82
const BOUNCE_SPRING = 0.2
const BOUNCE_MAX_OFFSET = 2.5
// =========================================================
// ✅ 폴 반동 조정 (타이밍 / 정도 / 속도)
// =========================================================
/** 타이밍: 폴 스케일이 원래의 이 비율 이하로 줄어들면 반동 발동. 1.0=정확히 원래, 1.01=1% 여유(조금 일찍), 0.99=끝난 뒤에 발동 */
const POLE_RETURN_REBOUND_TRIGGER = 1.01
/** 정도: 반동 크기(폴 스케일 추가분). 0=없음, 0.02~0.04 권장, 크면 반동이 세게 보임 */
const POLE_RETURN_REBOUND = 0.028
/** 속도: 매 프레임 반동이 줄어드는 비율. 1에 가까우면 반동이 오래 유지, 작으면(0.8 등) 빨리 사라짐. 0.85~0.92 권장 */
const POLE_RETURN_REBOUND_DECAY = 0.88
/** 반동값이 이 이하로 떨어지면 0으로 처리 (깜빡임 방지) */
const POLE_RETURN_REBOUND_CUTOFF = 1e-5
/** Cylinder6 아래 반동 양 (폴 반동 거리 대비 배율). 0=없음, 1=폴과 동일 거리, 0.5=절반, 2=2배 */
const CYLINDER6_REBOUND_AMOUNT = 0.2
/** Cylinder7 아래 반동 양 (폴 반동 거리 대비 배율). 0=없음, 1=폴과 동일 거리, 0.5=절반, 2=2배 */
const CYLINDER7_REBOUND_AMOUNT = 0.2
/** Cylinder6 반동 타이밍: 폴 스케일이 원래의 이 비율 이하일 때 반동 발동. 폴보다 크게(1.02 등) 주면 더 빨리 반응 */
const CYLINDER6_REBOUND_TRIGGER = 1.01
/** Cylinder7 반동 타이밍: 폴 스케일이 원래의 이 비율 이하일 때 반동 발동. 폴보다 크게(1.02 등) 주면 더 빨리 반응 */
const CYLINDER7_REBOUND_TRIGGER = 1.01
/** Cylinder6 반동 감쇠 속도. 폴과 같으면 0.88, 작을수록(0.8 등) 빨리 끝나서 더 날카롭게 반응 */
const CYLINDER6_REBOUND_DECAY = 0.82
/** Cylinder7 반동 감쇠 속도. 폴과 같으면 0.88, 작을수록(0.8 등) 빨리 끝나서 더 날카롭게 반응 */
const CYLINDER7_REBOUND_DECAY = 0.82

// =========================================================
// ✅ LIGHT/CAP 팀 반동 (팀1: LIGHT1+CAP1, 팀2: LIGHT2+CAP2, 팀3: LIGHT3+CAP3)
// =========================================================
/** 팀별 메쉬 이름 [LIGHT, CAP] */
const LIGHT_CAP_TEAM_NAMES = [['LIGHT1', 'CAP1'], ['LIGHT2', 'CAP2'], ['LIGHT3', 'CAP3']]
/** 팀1 반동 타이밍: 폴 스케일이 원래의 이 비율 이하일 때 발동. 크게 주면 더 빨리 반응 */
const TEAM1_REBOUND_TRIGGER = 1.00
const TEAM2_REBOUND_TRIGGER = 1.02
const TEAM3_REBOUND_TRIGGER = 1.02
/** 팀1 반동 감쇠 속도. 작을수록 빨리 끝남 */
const TEAM1_REBOUND_DECAY = 0.85
const TEAM2_REBOUND_DECAY = 0.85
const TEAM3_REBOUND_DECAY = 0.85
/** 팀1 아래 반동 양 (폴 반동 거리 대비 배율). 0=없음 */
const TEAM1_REBOUND_AMOUNT = 0.8
const TEAM2_REBOUND_AMOUNT = 0.15
const TEAM3_REBOUND_AMOUNT = 0.15
/** 팀별 상수 배열 (인덱스 0=팀1, 1=팀2, 2=팀3) */
const TEAM_REBOUND_TRIGGERS = [TEAM1_REBOUND_TRIGGER, TEAM2_REBOUND_TRIGGER, TEAM3_REBOUND_TRIGGER]
const TEAM_REBOUND_DECAYS = [TEAM1_REBOUND_DECAY, TEAM2_REBOUND_DECAY, TEAM3_REBOUND_DECAY]
const TEAM_REBOUND_AMOUNTS = [TEAM1_REBOUND_AMOUNT, TEAM2_REBOUND_AMOUNT, TEAM3_REBOUND_AMOUNT]

// =========================================================
// ✅ CUBE5_BASE morph
// =========================================================
const CUBE5_BASE_NAME = 'pasted__pasted__CUBE5_BASE'
// 전선 콜라이더: 이 이름의 메쉬와 충돌(튕겨나옴). 추가/제거 가능
const CABLE_COLLIDER_NAMES = [POLE_NAME, CUBE5_BASE_NAME, SOCKET_NAME, BALLOON_NAME, CUBE8_NAME]
const CUBE5_MORPH_ON = 1.0
const CUBE5_MORPH_OFF = 0.0
/** 스프링 강성 (클수록 빨리 목표에 붙음) */
const CUBE5_MORPH_BOUNCE_SPRING = 90
/** 스프링 감쇠 (작을수록 반동 많음, 10~20 정도가 쫀득) */
const CUBE5_MORPH_BOUNCE_DAMPING = 14
/** 돌아올 때 반동으로 넘어가는 최소값 (음수면 복귀 시 살짝 넘었다가 돌아옴) */
const CUBE5_MORPH_OVERSHOOT_MIN = -0.08
/** 이 값 이하가 되면 제자리로 돌아온 것으로 보고, 다음 호버 허용 */
const CUBE5_MORPH_REST_THRESHOLD = 0.02

// =========================================================
// ✅ typeMesh1 (마야에서 온 오브젝트)
// =========================================================
/** typeMesh1 오브젝트 이름. GLB에 pasted__ 접두사 있으면 getObjectByNameOrSuffix로 찾음 */
const TYPE_MESH1_NAMES = ['typeMesh1', 'pasted__typeMesh1', 'pasted__pasted__typeMesh1']
/** typeMesh1 호버 트리거 쿨다운(초). 이 시간마다 한 번만 호버로 애니 재생 */
const TYPE_MESH1_HOVER_COOLDOWN_SEC = 0.2
let typeMesh1Object = null
/** 애니가 덮어쓰지 않도록, CUBE9 기준 로컬 위치·회전·스케일 (CUBE9 붙인 직후 한 번 저장) */
let typeMesh1RestLocalPos = null
let typeMesh1RestLocalQuat = null
let typeMesh1RestLocalScale = null

// =========================================================
// ✅ 필요시 숨김
// =========================================================
const HIDE_MESH_NAMES = ['pasted__CUBE5']
/** 메쉬별 색 강제 지정 (이름 -> hex). 로드 후 적용 */
const MESH_COLOR_OVERRIDES = { 'pasted__Cylinder29': 0x888888 }

/* =========================================================
   1) 기본 세팅
========================================================= */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.style.margin = '0'
const appEl = document.getElementById('app')
;(appEl || document.body).appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

/** 기기 최대 텍스처 크기 안으로 그림자 맵 크기 clamp. 8192는 많은 환경에서 shadow map 생성 실패로 그림자가 안 보이므로 상한 4096 적용 */
const SHADOW_MAP_SIZE_CAP = 4096
function clampShadowMapSize(size) {
  const maxTex = (renderer.capabilities && renderer.capabilities.maxTextureSize) || 4096
  const safeMax = Math.min(maxTex, SHADOW_MAP_SIZE_CAP)
  return Math.min(Math.max(512, size), safeMax)
}

/* =========================================================
   2) 조명 설정 (마야 라이팅처럼 조절)
   - Intensity: 0=꺼짐, 1=약함, 3~5=보통, 8~10=강함. 마야의 Multiplier와 비슷.
   - Color: 0xRRGGBB (16진수). 흰색 0xffffff, 따뜻한빛 0xffeedd, 차가운빛 0xddddff.
   - Position: 조명이 놓인 3D 좌표. 카메라/씬 중심 기준. +x=오른쪽, +y=위, +z=앞.
========================================================= */
const LIGHT_CONFIG = {
  // ─── 배경 (배경만 바꿀 때 여기만 수정) ─────────────────────
  /** 배경 이미지 URL. null이면 아래 그라데이션 사용 */
  /** 배경 이미지 URL. null이면 검정 그라데이션 사용 */
  sceneBackgroundImage: null,
  /** true = 360 등장방형 파노라마, false = 일반 평면 이미지 */
  sceneBackground360: true,
  /** 이미지 없을 때 쓸 그라데이션. top=위쪽 색, bottom=아래쪽 색. #RRGGBB 형식 */
  sceneBackgroundGradient: {
    top: '#000000',
    bottom: '#000000',
  },

  // ─── Ambient Light (마야의 Ambient Light) ─────────────────
  /** 방향 없이 전역을 골고루 밝힘. 그림자를 죽이고 전체 톤 올릴 때 사용.
   *  너무 크면 평평해 보이므로 보통 0.1~0.4. 0이면 완전 끔. */
  ambient: {
    color: 0xffffff,   // 색: 흰색이면 중립, 0xffeedd=따뜻한 앰비언트
    intensity: 0.4,    // 강도: 0.1(은은) ~ 0.5(밝게) — 전구 밝게 보이도록 상향
  },

  // ─── Hemisphere Light (마야의 Sky Dome / 환경광 느낌) ─────
  /** 위쪽=하늘색, 아래쪽=땅색으로 그라데이션처럼 비춤. 야외/스카이돔 느낌.
   *  intensity로 전체 세기, skyColor/groundColor로 톤 조절. */
  hemisphere: {
    skyColor: 0xf0f0f8,   // 위쪽(하늘) 색. 더 밝게
    groundColor: 0x282838, // 아래쪽(땅) 색. 어두운 남색 → 조금 밝게
    intensity: 1.0,       // 0.5~1.2 정도. 키라이트 보조용 — 상향
  },

  // ─── Key Light (마야의 Key / 메인 라이트) ──────────────────
  /** 주 조명. 한 방향에서 강하게 비춤. 그림자 방향·주요 하이라이트 결정.
   *  position을 바꾸면 빛 방향이 달라짐: y 크면 위에서, z 음수면 뒤에서. */
  key: {
    color: 0xffffff,
    intensity: 5,              // 메인이라 보통 3~8. 가장 세게 두는 경우 많음
    position: { x: 12, y: 16, z: 10 },  // 오른쪽 위 앞쪽 → 왼쪽 아래 뒤로 그림자
    castShadow: true,          // true면 이 라이트가 그림자 생성 (보통 키만 켬)
    shadowRadius: 5,           // 그림자 부드러움. 0=날카로움, 2~5=보통, 6~10=매우 부드러움 (계단 완화에 5 권장)
    shadowMapSize: 4096,       // 그림자 맵 해상도. 1024/2048/4096. 8192는 일부 환경에서 그림자 미표시로 4096 상한 적용
  },

  // ─── Fill Light (마야의 Fill / 보조 라이트) ────────────────
  /** 키 라이트가 만든 그림자를 부드럽게 채움. 키 반대쪽이나 아래쪽에 두는 경우 많음.
   *  intensity는 키보다 낮게 (키의 1/3~1/2 수준). */
  fill: {
    color: 0xffffff,
    intensity: 0.4,
    position: { x: -8, y: 4, z: 4 },   // 키와 반대편(음수 x) + 낮은 높이
    castShadow: false,
    shadowRadius: 2,
    shadowMapSize: 1024,
  },

  // ─── Rim Light (마야의 Rim / Back / Edge Light) ───────────
  /** 뒤·옆에서 비춰 오브젝트 테두리(림)를 밝힘. 입체감·분리감 강조.
   *  color를 살짝 색 넣으면(보라·청록 등) 분위기 연출에 좋음. */
  rim: {
    color: 0xa890e0,     // 연보라. 0xffffff면 무채색 림
    intensity: 3,        // 키보다 약하게, 1.5~4 정도
    position: { x: -4, y: 8, z: -5 },   // 뒤쪽(z 음수) + 위쪽 → 머리·어깨 림
    castShadow: false,
    shadowRadius: 2,
    shadowMapSize: 1024,
  },
}

// ─── 라이팅 디버그: 저장/복원 (LIGHT_CONFIG가 유일한 기준, 콘솔 제거해도 유지)
const LIGHT_CONFIG_STORAGE_KEY = 'reactive-object-light-config'

function getLightConfigSnapshot() {
  return {
    ambient: { color: LIGHT_CONFIG.ambient.color, intensity: LIGHT_CONFIG.ambient.intensity },
    hemisphere: {
      skyColor: LIGHT_CONFIG.hemisphere.skyColor,
      groundColor: LIGHT_CONFIG.hemisphere.groundColor,
      intensity: LIGHT_CONFIG.hemisphere.intensity,
    },
    key: {
      color: LIGHT_CONFIG.key.color,
      intensity: LIGHT_CONFIG.key.intensity,
      position: { x: LIGHT_CONFIG.key.position.x, y: LIGHT_CONFIG.key.position.y, z: LIGHT_CONFIG.key.position.z },
      castShadow: LIGHT_CONFIG.key.castShadow,
      shadowRadius: LIGHT_CONFIG.key.shadowRadius,
      shadowMapSize: LIGHT_CONFIG.key.shadowMapSize,
    },
    fill: {
      color: LIGHT_CONFIG.fill.color,
      intensity: LIGHT_CONFIG.fill.intensity,
      position: { x: LIGHT_CONFIG.fill.position.x, y: LIGHT_CONFIG.fill.position.y, z: LIGHT_CONFIG.fill.position.z },
      castShadow: LIGHT_CONFIG.fill.castShadow,
      shadowRadius: LIGHT_CONFIG.fill.shadowRadius,
      shadowMapSize: LIGHT_CONFIG.fill.shadowMapSize,
    },
    rim: {
      color: LIGHT_CONFIG.rim.color,
      intensity: LIGHT_CONFIG.rim.intensity,
      position: { x: LIGHT_CONFIG.rim.position.x, y: LIGHT_CONFIG.rim.position.y, z: LIGHT_CONFIG.rim.position.z },
      castShadow: LIGHT_CONFIG.rim.castShadow,
      shadowRadius: LIGHT_CONFIG.rim.shadowRadius,
      shadowMapSize: LIGHT_CONFIG.rim.shadowMapSize,
    },
  }
}

const LIGHT_CONFIG_DEFAULTS = getLightConfigSnapshot()

function loadLightConfigFromStorage() {
  try {
    const raw = localStorage.getItem(LIGHT_CONFIG_STORAGE_KEY)
    if (!raw) return
    const stored = JSON.parse(raw)
    if (stored.ambient) {
      LIGHT_CONFIG.ambient.intensity = stored.ambient.intensity
      LIGHT_CONFIG.ambient.color = stored.ambient.color
    }
    if (stored.hemisphere) {
      LIGHT_CONFIG.hemisphere.skyColor = stored.hemisphere.skyColor
      LIGHT_CONFIG.hemisphere.groundColor = stored.hemisphere.groundColor
      LIGHT_CONFIG.hemisphere.intensity = stored.hemisphere.intensity
    }
    ;['key', 'fill', 'rim'].forEach((name) => {
      const s = stored[name]
      if (!s) return
      const c = LIGHT_CONFIG[name]
      if (s.color != null) c.color = s.color
      if (s.intensity != null) c.intensity = s.intensity
      if (s.position) {
        if (s.position.x != null) c.position.x = s.position.x
        if (s.position.y != null) c.position.y = s.position.y
        if (s.position.z != null) c.position.z = s.position.z
      }
      if (s.castShadow != null) c.castShadow = s.castShadow
      if (s.shadowRadius != null) c.shadowRadius = s.shadowRadius
      if (s.shadowMapSize != null) c.shadowMapSize = s.shadowMapSize
    })
    // Key 라이트는 그림자 품질 목적으로 항상 그림자 켜기 (저장값 false 무시)
    LIGHT_CONFIG.key.castShadow = true
  } catch (e) {
    console.warn('loadLightConfigFromStorage', e)
  }
}
loadLightConfigFromStorage()

// 배경: 사진 URL이 있으면 이미지, 없으면 그라데이션
;(function () {
  function applyGradientBackground() {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 256
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, LIGHT_CONFIG.sceneBackgroundGradient.top)
    g.addColorStop(1, LIGHT_CONFIG.sceneBackgroundGradient.bottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    scene.background = tex
  }

  const bgImage = LIGHT_CONFIG.sceneBackgroundImage
  if (bgImage) {
    applyGradientBackground()
    const loader = new THREE.TextureLoader()
    loader.load(
      bgImage,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.magFilter = THREE.LinearFilter
        tex.minFilter = THREE.LinearFilter
        if (LIGHT_CONFIG.sceneBackground360) {
          tex.mapping = THREE.EquirectangularReflectionMapping
        }
        scene.background = tex
      },
      undefined,
      () => {
        console.warn('배경 이미지 로드 실패, 그라데이션 유지:', bgImage)
      }
    )
  } else {
    applyGradientBackground()
  }
})()

const ambient = new THREE.AmbientLight(LIGHT_CONFIG.ambient.color, LIGHT_CONFIG.ambient.intensity)
scene.add(ambient)

const hemi = new THREE.HemisphereLight(
  LIGHT_CONFIG.hemisphere.skyColor,
  LIGHT_CONFIG.hemisphere.groundColor,
  LIGHT_CONFIG.hemisphere.intensity
)
hemi.position.set(0, 1, 0)
scene.add(hemi)

const key = new THREE.DirectionalLight(LIGHT_CONFIG.key.color, LIGHT_CONFIG.key.intensity)
key.position.set(LIGHT_CONFIG.key.position.x, LIGHT_CONFIG.key.position.y, LIGHT_CONFIG.key.position.z)
// 그림자 계단현상 감소: 카메라 범위를 씬에 맞게 좁히고, 맵 해상도 여유 두기
const SHADOW_CAMERA_HALF_SIZE = 12 // 25→12: 같은 맵 해상도로 더 촘촘하게 = 계단현상 완화
key.castShadow = LIGHT_CONFIG.key.castShadow !== false
key.shadow.mapSize.width = key.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.key.shadowMapSize ?? 4096)
key.shadow.radius = LIGHT_CONFIG.key.shadowRadius ?? 5
key.shadow.camera.near = 0.5
key.shadow.camera.far = 100
key.shadow.camera.left = key.shadow.camera.bottom = -SHADOW_CAMERA_HALF_SIZE
key.shadow.camera.right = key.shadow.camera.top = SHADOW_CAMERA_HALF_SIZE
key.shadow.bias = -0.0002
key.shadow.normalBias = 0.04  // 계단/얼룩 완화 (너무 크면 peter-panning)
scene.add(key)

const fill = new THREE.DirectionalLight(LIGHT_CONFIG.fill.color, LIGHT_CONFIG.fill.intensity)
fill.position.set(LIGHT_CONFIG.fill.position.x, LIGHT_CONFIG.fill.position.y, LIGHT_CONFIG.fill.position.z)
fill.castShadow = LIGHT_CONFIG.fill.castShadow === true
fill.shadow.mapSize.width = fill.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.fill.shadowMapSize ?? 1024)
fill.shadow.radius = LIGHT_CONFIG.fill.shadowRadius ?? 2
fill.shadow.camera.near = 0.5
fill.shadow.camera.far = 100
fill.shadow.camera.left = fill.shadow.camera.bottom = -SHADOW_CAMERA_HALF_SIZE
fill.shadow.camera.right = fill.shadow.camera.top = SHADOW_CAMERA_HALF_SIZE
fill.shadow.bias = -0.0001
scene.add(fill)

const rim = new THREE.DirectionalLight(LIGHT_CONFIG.rim.color, LIGHT_CONFIG.rim.intensity)
rim.position.set(LIGHT_CONFIG.rim.position.x, LIGHT_CONFIG.rim.position.y, LIGHT_CONFIG.rim.position.z)
rim.castShadow = LIGHT_CONFIG.rim.castShadow === true
rim.shadow.mapSize.width = rim.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.rim.shadowMapSize ?? 1024)
rim.shadow.radius = LIGHT_CONFIG.rim.shadowRadius ?? 2
rim.shadow.camera.near = 0.5
rim.shadow.camera.far = 100
rim.shadow.camera.left = rim.shadow.camera.bottom = -SHADOW_CAMERA_HALF_SIZE
rim.shadow.camera.right = rim.shadow.camera.top = SHADOW_CAMERA_HALF_SIZE
rim.shadow.bias = -0.0001
scene.add(rim)

// 조명 위치에 아주 작은 점 (시각 표시 + LIGHT_CONFIG와 동기화)
const LIGHT_DOT_RADIUS = 0.001
const LIGHT_DOT_GEOM = new THREE.SphereGeometry(LIGHT_DOT_RADIUS, 12, 8)
function makeLightDot(name, colorHex) {
  const mat = new THREE.MeshBasicMaterial({ color: colorHex })
  const mesh = new THREE.Mesh(LIGHT_DOT_GEOM, mat)
  mesh.name = name
  scene.add(mesh)
  return mesh
}
const keyDot = makeLightDot('keyLightDot', 0xffffff)
const fillDot = makeLightDot('fillLightDot', 0xcccccc)
const rimDot = makeLightDot('rimLightDot', 0xa890e0)

/** LIGHT_CONFIG 위치를 조명과 점에 반영 (코드에서 위치 바꾼 뒤 호출하거나 animate에서 자동 동기화) */
function syncLightPositionsFromConfig() {
  key.position.set(LIGHT_CONFIG.key.position.x, LIGHT_CONFIG.key.position.y, LIGHT_CONFIG.key.position.z)
  fill.position.set(LIGHT_CONFIG.fill.position.x, LIGHT_CONFIG.fill.position.y, LIGHT_CONFIG.fill.position.z)
  rim.position.set(LIGHT_CONFIG.rim.position.x, LIGHT_CONFIG.rim.position.y, LIGHT_CONFIG.rim.position.z)
  keyDot.position.copy(key.position)
  fillDot.position.copy(fill.position)
  rimDot.position.copy(rim.position)
}

/** LIGHT_CONFIG의 그림자(radius, mapSize, castShadow)를 조명에 반영. 설정 바꾼 뒤 호출 */
function syncShadowFromConfig() {
  key.castShadow = LIGHT_CONFIG.key.castShadow !== false
key.shadow.radius = LIGHT_CONFIG.key.shadowRadius ?? 5
key.shadow.mapSize.width = key.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.key.shadowMapSize ?? 4096)
key.shadow.normalBias = 0.04  // 계단/얼룩 완화
  fill.castShadow = LIGHT_CONFIG.fill.castShadow === true
  fill.shadow.radius = LIGHT_CONFIG.fill.shadowRadius ?? 2
  fill.shadow.mapSize.width = fill.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.fill.shadowMapSize ?? 1024)
  rim.castShadow = LIGHT_CONFIG.rim.castShadow === true
  rim.shadow.radius = LIGHT_CONFIG.rim.shadowRadius ?? 2
  rim.shadow.mapSize.width = rim.shadow.mapSize.height = clampShadowMapSize(LIGHT_CONFIG.rim.shadowMapSize ?? 1024)
}

/** LIGHT_CONFIG의 intensity·color를 실제 조명에 반영 (디버그 패널에서 값 바꿀 때 호출) */
function applyLightConfigToLights() {
  ambient.intensity = LIGHT_CONFIG.ambient.intensity
  ambient.color.setHex(LIGHT_CONFIG.ambient.color)
  hemi.intensity = LIGHT_CONFIG.hemisphere.intensity
  hemi.color.setHex(LIGHT_CONFIG.hemisphere.skyColor)
  hemi.groundColor.setHex(LIGHT_CONFIG.hemisphere.groundColor)
  key.intensity = LIGHT_CONFIG.key.intensity
  key.color.setHex(LIGHT_CONFIG.key.color)
  fill.intensity = LIGHT_CONFIG.fill.intensity
  fill.color.setHex(LIGHT_CONFIG.fill.color)
  rim.intensity = LIGHT_CONFIG.rim.intensity
  rim.color.setHex(LIGHT_CONFIG.rim.color)
}

function saveLightConfigToStorage() {
  try {
    localStorage.setItem(LIGHT_CONFIG_STORAGE_KEY, JSON.stringify(getLightConfigSnapshot()))
  } catch (e) {
    console.warn('saveLightConfigToStorage', e)
  }
}

syncLightPositionsFromConfig()
syncShadowFromConfig()
applyLightConfigToLights()

/** 조명 위치 이동 헬퍼 (코드/콘솔에서 사용) 예: setLightPosition('key', 15, 18, 12) */
function setLightPosition(lightName, x, y, z) {
  const cfg = LIGHT_CONFIG[lightName]
  if (!cfg || !cfg.position) return
  cfg.position.x = x
  cfg.position.y = y
  cfg.position.z = z
  syncLightPositionsFromConfig()
}

/** 그림자 radius(부드러움) 조절. 예: setShadowRadius('key', 6). lightName: 'key'|'fill'|'rim' */
function setShadowRadius(lightName, radius) {
  const cfg = LIGHT_CONFIG[lightName]
  if (!cfg) return
  cfg.shadowRadius = radius
  const light = { key, fill, rim }[lightName]
  if (light) light.shadow.radius = radius
}

/** LIGHT_CONFIG 변경 시 씬에 반영 + localStorage 저장 (디버그 패널용). 콘솔 제거해도 저장된 값이 로드됨 */
function applyAndSaveLightConfig() {
  syncLightPositionsFromConfig()
  syncShadowFromConfig()
  applyLightConfigToLights()
  saveLightConfigToStorage()
}

/** 라이팅 디버그 패널 생성. LIGHT_CONFIG만 읽고 쓰므로 패널 제거해도 설정 유지(저장 시) */
function createLightingDebugPanel() {
  const wrap = document.createElement('div')
  wrap.id = 'lighting-debug-panel'
  wrap.style.cssText =
    'position:fixed;top:10px;right:10px;width:280px;max-height:90vh;overflow:auto;background:rgba(20,20,28,0.95);color:#ddd;font:12px/1.4 sans-serif;padding:10px;border-radius:8px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);'
  const hexToHash = (n) => '#' + ('000000' + (n >>> 0).toString(16)).slice(-6)
  const hashToHex = (s) => parseInt(s.replace(/^#/, ''), 16)

  function addSection(title, fn) {
    const sec = document.createElement('div')
    sec.style.marginBottom = '12px'
    sec.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;color:#a0a0ff">${title}</div>`
    fn(sec)
    wrap.appendChild(sec)
  }
  function row(label, el) {
    const r = document.createElement('div')
    r.style.marginBottom = '4px'
    r.innerHTML = `<label style="display:inline-block;width:90px">${label}</label>`
    r.appendChild(el)
    return r
  }
  function numIn(name, obj, key, step = 0.1) {
    const el = document.createElement('input')
    el.type = 'number'
    el.step = step
    el.style.width = '70px'
    el.value = obj[key]
    el.addEventListener('change', () => {
      obj[key] = Number(el.value)
      applyAndSaveLightConfig()
    })
    return row(name, el)
  }
  function colorIn(name, obj, key) {
    const el = document.createElement('input')
    el.type = 'color'
    el.style.width = '50px'
    el.value = hexToHash(obj[key])
    el.addEventListener('input', () => {
      obj[key] = hashToHex(el.value)
      applyAndSaveLightConfig()
    })
    return row(name, el)
  }

  addSection('Ambient', (sec) => {
    sec.appendChild(numIn('intensity', LIGHT_CONFIG.ambient, 'intensity'))
    sec.appendChild(colorIn('color', LIGHT_CONFIG.ambient, 'color'))
  })
  addSection('Hemisphere', (sec) => {
    sec.appendChild(numIn('intensity', LIGHT_CONFIG.hemisphere, 'intensity'))
    sec.appendChild(colorIn('sky', LIGHT_CONFIG.hemisphere, 'skyColor'))
    sec.appendChild(colorIn('ground', LIGHT_CONFIG.hemisphere, 'groundColor'))
  })
  ;['Key', 'Fill', 'Rim'].forEach((title) => {
    const name = title.toLowerCase()
    const cfg = LIGHT_CONFIG[name]
    addSection(title, (sec) => {
      sec.appendChild(numIn('intensity', cfg, 'intensity', 0.5))
      sec.appendChild(colorIn('color', cfg, 'color'))
      sec.appendChild(numIn('pos X', cfg.position, 'x', 1))
      sec.appendChild(numIn('pos Y', cfg.position, 'y', 1))
      sec.appendChild(numIn('pos Z', cfg.position, 'z', 1))
      const cast = document.createElement('input')
      cast.type = 'checkbox'
      cast.checked = cfg.castShadow
      cast.addEventListener('change', () => {
        cfg.castShadow = cast.checked
        applyAndSaveLightConfig()
      })
      sec.appendChild(row('castShadow', cast))
      sec.appendChild(numIn('shadowR', cfg, 'shadowRadius', 1))
      const mapSize = document.createElement('select')
      mapSize.style.width = '70px'
      ;[1024, 2048, 4096].forEach((v) => {
        const o = document.createElement('option')
        o.value = v
        o.textContent = v
        if (cfg.shadowMapSize === v) o.selected = true
        mapSize.appendChild(o)
      })
      mapSize.addEventListener('change', () => {
        cfg.shadowMapSize = Number(mapSize.value)
        applyAndSaveLightConfig()
      })
      sec.appendChild(row('mapSize', mapSize))
    })
  })

  const resetBtn = document.createElement('button')
  resetBtn.textContent = '초기값으로 리셋'
  resetBtn.style.cssText = 'margin-top:8px;padding:6px 10px;cursor:pointer'
  resetBtn.addEventListener('click', () => {
    const d = LIGHT_CONFIG_DEFAULTS
    LIGHT_CONFIG.ambient.color = d.ambient.color
    LIGHT_CONFIG.ambient.intensity = d.ambient.intensity
    LIGHT_CONFIG.hemisphere.skyColor = d.hemisphere.skyColor
    LIGHT_CONFIG.hemisphere.groundColor = d.hemisphere.groundColor
    LIGHT_CONFIG.hemisphere.intensity = d.hemisphere.intensity
    ;['key', 'fill', 'rim'].forEach((n) => {
      Object.assign(LIGHT_CONFIG[n], d[n])
      LIGHT_CONFIG[n].position.x = d[n].position.x
      LIGHT_CONFIG[n].position.y = d[n].position.y
      LIGHT_CONFIG[n].position.z = d[n].position.z
    })
    applyAndSaveLightConfig()
    createLightingDebugPanel()
  })
  wrap.appendChild(resetBtn)

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '패널 닫기'
  closeBtn.style.cssText = 'margin-left:8px;padding:6px 10px;cursor:pointer'
  closeBtn.addEventListener('click', () => wrap.remove())
  wrap.appendChild(closeBtn)

  const existing = document.getElementById('lighting-debug-panel')
  if (existing) existing.replaceWith(wrap)
  else document.body.appendChild(wrap)
}

/** 화면 우상단에 "조명" 버튼 추가. 클릭 시 디버그 패널 열림 (한 번만 추가) */
function ensureLightingDebugToggle() {
  if (document.getElementById('lighting-debug-toggle')) return
  const btn = document.createElement('button')
  btn.id = 'lighting-debug-toggle'
  btn.textContent = '조명'
  btn.title = '라이팅 디버그 패널 열기'
  btn.style.cssText =
    'position:fixed;top:10px;right:10px;z-index:9998;padding:6px 12px;cursor:pointer;border-radius:6px;border:1px solid #444;background:#2a2a35;color:#ddd;font:12px sans-serif;display:none;'
  btn.addEventListener('click', createLightingDebugPanel)
  document.body.appendChild(btn)
}
ensureLightingDebugToggle()

/** 메쉬 지오메트리 바운딩 박스 중심(로컬). 전구 조명을 매쉬 정중앙에 맞출 때 사용 */
function getMeshLocalCenter(mesh) {
  if (!mesh?.isMesh?.geometry) return new THREE.Vector3(0, 0, 0)
  mesh.geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  mesh.geometry.boundingBox.getCenter(c)
  return c
}

/** 전구별 조명 오프셋 동기화. pasted__LIGHT2는 씬 월드 좌표로 위치·방향 갱신 */
function syncBulbLightPositions() {
  const meshPastedLight2 = lightMeshes.get('pasted__LIGHT2')
  const cfg = PASTED_LIGHT2_REAL_LIGHT
  lightPointLights.forEach((pt, name) => {
    const canonical = name === 'pasted__LIGHT2' ? null : (name === 'pasted__LIGHT1' ? 'LIGHT1' : name === 'pasted__LIGHT3' ? 'LIGHT3' : name)
    const off = name === 'pasted__LIGHT2' ? cfg : (BULB_LIGHT_OFFSETS[canonical] || BULB_LIGHT_OFFSETS[name] || { x: 0, y: 0, z: 0.35 })
    if (name === 'pasted__LIGHT2') {
      if (meshPastedLight2) {
        meshPastedLight2.updateMatrixWorld(true)
        _tmpWP.set(off.x, off.y, off.z).applyMatrix4(meshPastedLight2.matrixWorld)
        pt.position.copy(_tmpWP)
        if (cfg.useSpotLight && pastedLight2SpotTarget) {
          const d = cfg.downOffset
          const tx = off.x + (cfg.downAxis === 'x' ? -d : 0)
          const ty = off.y + (cfg.downAxis === 'y' ? -d : 0)
          const tz = off.z + (cfg.downAxis === 'z' ? -d : 0)
          _tmpWP.set(tx, ty, tz).applyMatrix4(meshPastedLight2.matrixWorld)
          pastedLight2SpotTarget.position.copy(_tmpWP)
        }
      } else if (model) {
        _tmpBox.setFromObject(model)
        _tmpBox.getCenter(_tmpCenterW)
        pt.position.copy(_tmpCenterW).add(new THREE.Vector3(0, 8, 0))
      }
      if (pt.angle !== undefined) {
        pt.angle = cfg.angle
        pt.penumbra = cfg.penumbra
      }
      if (pastedLight2DebugSphere) {
        pastedLight2DebugSphere.visible = !!cfg.debugSphere
        if (cfg.debugSphere) pastedLight2DebugSphere.position.copy(pt.position)
      }
    } else {
      pt.position.set(off.x, off.y, off.z)
    }
  })
  bulbLightDots.forEach((dot, name) => {
    const can = name === 'pasted__LIGHT2' ? null : (name === 'pasted__LIGHT1' ? 'LIGHT1' : name === 'pasted__LIGHT3' ? 'LIGHT3' : name)
    const off = name === 'pasted__LIGHT2' ? cfg : (BULB_LIGHT_OFFSETS[can] || BULB_LIGHT_OFFSETS[name] || { x: 0, y: 0, z: 0.35 })
    dot.position.set(off.x, off.y, off.z)
  })
}

/** 전구 조명 위치 조정 (전구별). 예: setBulbLightOffset('LIGHT1', 0, 0, 0.5) */
function setBulbLightOffset(lightName, x, y, z) {
  const off = BULB_LIGHT_OFFSETS[lightName]
  if (!off) return
  off.x = x
  off.y = y
  off.z = z
  syncBulbLightPositions()
}

/** pasted__LIGHT2 조명 좌표/거리/밝기 조정. 예: setPastedLight2RealLight(0.4, 0, 0.4) 또는 setPastedLight2RealLight(0.4, 0, 0.4, 3, 2, 2.5) */
/** pasted__LIGHT2 조명 조정. setPastedLight2RealLight(x, y, z [, distance, decay, intensityOn, useSpotLight, downAxis, downOffset, angle, penumbra]) */
function setPastedLight2RealLight(x, y, z, distance, decay, intensityOn, useSpotLight, downAxis, downOffset, angle, penumbra) {
  const c = PASTED_LIGHT2_REAL_LIGHT
  c.x = x
  c.y = y
  c.z = z
  if (distance != null) c.distance = distance
  if (decay != null) c.decay = decay
  if (intensityOn != null) c.intensityOn = intensityOn
  if (useSpotLight != null) c.useSpotLight = useSpotLight
  if (downAxis != null) c.downAxis = downAxis
  if (downOffset != null) c.downOffset = downOffset
  if (angle != null) c.angle = angle
  if (penumbra != null) c.penumbra = penumbra
  const pt = lightPointLights.get('pasted__LIGHT2')
  if (pt) {
    pt.distance = c.distance
    pt.decay = c.decay
    if (pt.angle !== undefined) { pt.angle = c.angle; pt.penumbra = c.penumbra }
  }
  syncBulbLightPositions()
}

/* =========================================================
   3) 컨트롤
========================================================= */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.ROTATE,
  RIGHT: THREE.MOUSE.ROTATE,
}
controls.enablePan = false
const CAMERA_VIEW_STORAGE_KEY = 'reactive-object-camera-view'
function saveCameraViewAsDefault() {
  if (!model) return
  const p = camera.position
  const t = controls.target
  try {
    localStorage.setItem(CAMERA_VIEW_STORAGE_KEY, JSON.stringify({
      position: [p.x, p.y, p.z],
      target: [t.x, t.y, t.z],
    }))
    console.log('✅ 현재 뷰를 기본으로 저장했습니다. 새로고침해도 이 뷰로 복원됩니다.')
  } catch (_) {}
}
// V 키: 지금 화면을 "기본 뷰"로 저장 (한 번만 누르면 이후 새로고침 시 항상 이 뷰로 복원)
window.addEventListener('keydown', (e) => {
  if (e.key === 'v' || e.key === 'V') {
    saveCameraViewAsDefault()
  }
})

/* =========================================================
   4) Raycaster
========================================================= */
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

/* =========================================================
   5) 유틸
========================================================= */
function collectMeshes(root) {
  const arr = []
  root.traverse((o) => {
    if (o.isMesh) arr.push(o)
  })
  return arr
}

// ✅ GLB 텍스처(내장) 그대로 보여야 하는 메쉬들
const KEEP_TEX_MESH_NAMES = new Set(['HAT1', 'HAT2', 'BODY1', 'CAP1', 'CAP2', 'CAP3'])
// ✅ 조명 메쉬: 마야 텍스처 유지 + 발광(emissive) 사용 가능하도록 예외 처리
const LIGHT_MESH_NAMES = new Set(LIGHT_NAMES)

function neutralizeMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return

    if (obj.geometry) {
      const hasNormals = !!obj.geometry.attributes?.normal
      if (!hasNormals) obj.geometry.computeVertexNormals()
      if (obj.geometry.attributes.color) obj.geometry.deleteAttribute('color')
    }

    const isKeep = KEEP_TEX_MESH_NAMES.has(obj.name)
    const isLight = LIGHT_MESH_NAMES.has(obj.name)

    const apply = (mat) => {
      if (!mat) return

      mat.transparent = false
      mat.opacity = 1.0
      mat.depthWrite = true
      mat.alphaTest = 0

      if (!isLight) {
        if (!mat.emissiveMap && 'emissive' in mat) mat.emissive = new THREE.Color(0x000000)
        if (!mat.emissiveMap && 'emissiveIntensity' in mat) mat.emissiveIntensity = 0.0
      }

      if (isKeep) {
        if (mat.map && mat.color) mat.color = new THREE.Color(0xffffff)
        if (!mat.roughnessMap && 'roughness' in mat) mat.roughness = mat.roughness ?? 0.65
        if (!mat.metalnessMap && 'metalness' in mat) mat.metalness = mat.metalness ?? 0.08
        if ('vertexColors' in mat) mat.vertexColors = false
        mat.needsUpdate = true
        return
      }

      if (isLight) {
        if (mat.map && mat.color) mat.color = new THREE.Color(0xffffff)
        if (!mat.roughnessMap && 'roughness' in mat) mat.roughness = mat.roughness ?? 0.5
        if (!mat.metalnessMap && 'metalness' in mat) mat.metalness = mat.metalness ?? 0.0
        if ('vertexColors' in mat) mat.vertexColors = false
        if ('emissive' in mat && !mat.emissiveMap) mat.emissive = new THREE.Color(0x111111)
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = mat.emissiveIntensity ?? 0
        mat.needsUpdate = true
        return
      }

      if (mat.color) mat.color = new THREE.Color(0xcccccc)
      if ('roughness' in mat) mat.roughness = 0.65
      if ('metalness' in mat) mat.metalness = 0.08
      if ('vertexColors' in mat) mat.vertexColors = false

      mat.needsUpdate = true
    }

    if (Array.isArray(obj.material)) obj.material.forEach(apply)
    else apply(obj.material)
  })
}

function ensureUniqueMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => (m ? m.clone() : m))
      obj.material.forEach((m) => (m && (m.needsUpdate = true)))
    } else {
      obj.material = obj.material.clone()
      obj.material.needsUpdate = true
    }
  })
}

function makeEmissive(mat, colorHex, strength) {
  if (!mat) return
  if ('emissive' in mat) {
    mat.emissive = new THREE.Color(colorHex)
    mat.emissiveIntensity = strength
    mat.needsUpdate = true
  }
}

/** LIGHT 메쉬용: MeshBasicMaterial로 교체해 조명 없이 항상 완전히 밝게 표시 */
function ensureLightMaterialBright(mesh) {
  if (!mesh?.isMesh) return
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const out = []
  for (const mat of mats) {
    if (!mat) {
      out.push(mat)
      continue
    }
    const basic = new THREE.MeshBasicMaterial({
      map: mat.map ?? null,
      color: new THREE.Color(0xffffff),
      transparent: mat.transparent ?? false,
      opacity: mat.opacity ?? 1,
      depthWrite: true,
      depthTest: true,
    })
    out.push(basic)
  }
  mesh.material = out.length === 1 ? out[0] : out
}

/** LIGHT 메쉬 색 설정 (MeshBasicMaterial·MeshStandardMaterial 등). emissiveIntensity 있으면 발광 세기 (0=꺼짐, 1.5~2=밝게) */
function setLightColor(mat, colorHex, emissiveIntensity) {
  if (!mat) return
  if (mat.color) mat.color.setHex(colorHex)
  if (mat.emissive) mat.emissive.setHex(colorHex)
  if (mat.emissiveIntensity !== undefined && emissiveIntensity !== undefined) mat.emissiveIntensity = emissiveIntensity
}

function attachKeepWorld(parent, child) {
  if (!parent || !child) return
  parent.updateMatrixWorld(true)
  child.updateMatrixWorld(true)
  parent.attach(child)
  child.updateMatrixWorld(true)
}

/** root 하위에서 이름이 정확히 name이거나 name으로 끝나는 오브젝트 반환 (예: 'Cylinder28' 또는 'pasted__Cylinder28') */
function getObjectByNameOrSuffix(root, name) {
  const o = root.getObjectByName(name)
  if (o) return o
  let found = null
  root.traverse((obj) => {
    if (found) return
    if (obj.name === name || obj.name.endsWith('_' + name) || obj.name.endsWith(name)) {
      found = obj
    }
  })
  return found
}

/** 두 오브젝트 경계가 맞닿는 쪽 면의 월드 위치 계산 (관절 피벗용) */
function getPivotWorldPosBetween(objA, objB, offsetX = 0, offsetY = 0, offsetZ = 0) {
  objA.updateMatrixWorld(true)
  objB.updateMatrixWorld(true)
  _tmpBox.setFromObject(objA)
  const worldPos = new THREE.Vector3()
  _tmpBox.getCenter(worldPos)
  const otherCenter = new THREE.Vector3()
  objB.getWorldPosition(otherCenter)
  const boxMin = _tmpBox.min
  const boxMax = _tmpBox.max
  const axes = ['x', 'y', 'z']
  let bestAxis = 'y'
  let bestDist = Infinity
  for (const axis of axes) {
    const dMin = Math.abs(otherCenter[axis] - boxMin[axis])
    const dMax = Math.abs(otherCenter[axis] - boxMax[axis])
    const d = Math.min(dMin, dMax)
    if (d < bestDist) {
      bestDist = d
      bestAxis = axis
    }
  }
  if (otherCenter[bestAxis] < worldPos[bestAxis]) worldPos[bestAxis] = boxMin[bestAxis]
  else worldPos[bestAxis] = boxMax[bestAxis]
  worldPos.x += offsetX
  worldPos.y += offsetY
  worldPos.z += offsetZ
  return worldPos
}

function makeWorldBottomPivot(mesh, pivotName = 'CIRCLE1_PIVOT_WORLD') {
  if (!mesh) return { world: null, pivot: null }

  mesh.updateMatrixWorld(true)
  const wPos = new THREE.Vector3()
  const wQuat = new THREE.Quaternion()
  const wScale = new THREE.Vector3()
  mesh.matrixWorld.decompose(wPos, wQuat, wScale)

  const world = new THREE.Object3D()
  world.name = `${pivotName}__WORLD`
  world.position.set(0, 0, 0)
  world.quaternion.identity()
  world.scale.set(1, 1, 1)
  scene.add(world)
  world.updateMatrixWorld(true)

  world.attach(mesh)
  mesh.updateMatrixWorld(true)

  const bbW = new THREE.Box3().setFromObject(mesh)
  const bottomY = bbW.min.y
  const centerX = (bbW.min.x + bbW.max.x) * 0.5
  const centerZ = (bbW.min.z + bbW.max.z) * 0.5

  const pivot = new THREE.Object3D()
  pivot.name = pivotName
  pivot.position.set(centerX, bottomY, centerZ)
  pivot.quaternion.identity()
  pivot.scale.set(1, 1, 1)
  world.add(pivot)
  pivot.updateMatrixWorld(true)

  pivot.attach(mesh)
  mesh.updateMatrixWorld(true)

  const bbAfter = new THREE.Box3().setFromObject(mesh)
  const dy = pivot.position.y - bbAfter.min.y
  mesh.position.y += dy
  mesh.updateMatrixWorld(true)

  return { world, pivot }
}

const _tmpWQ = new THREE.Quaternion()
const _tmpWP = new THREE.Vector3()

function makeWorldYAlignedPivotKeepWorld(mesh, pivotName = 'WORLDY_PIVOT') {
  if (!mesh) return null

  const parent = mesh.parent
  if (!parent) return null

  parent.updateMatrixWorld(true)
  mesh.updateMatrixWorld(true)

  const meshWorldPos = new THREE.Vector3()
  const meshWorldQuat = new THREE.Quaternion()
  const meshWorldScale = new THREE.Vector3()
  mesh.matrixWorld.decompose(meshWorldPos, meshWorldQuat, meshWorldScale)

  const pivot = new THREE.Object3D()
  pivot.name = pivotName
  parent.add(pivot)

  const parentWorldQuat = new THREE.Quaternion()
  parent.getWorldQuaternion(parentWorldQuat)

  pivot.quaternion.copy(parentWorldQuat).invert()
  pivot.updateMatrixWorld(true)

  const pivotLocalPos = meshWorldPos.clone()
  parent.worldToLocal(pivotLocalPos)
  pivot.position.copy(pivotLocalPos)
  pivot.updateMatrixWorld(true)

  pivot.attach(mesh)
  mesh.updateMatrixWorld(true)

  return pivot
}

/* =========================================================
   ✅ 전선(케이블): Verlet Rope + Tube
========================================================= */
class Cable {
  constructor({
    startObj,
    endObj,
    segments = 50,      // 전선을 이루는 구간(마디) 개수. 많을수록 부드럽고 무거움
    radius = 0.3,      // 전선 튜브의 굵기(반지름)
    slack = 1.5,       // 처짐 정도. 1=직선에 가깝고, 클수록 더 늘어짐
    gravity = 2,     // 아래로 당기는 힘(중력) 세기
    damping = 0.95,    // 감쇠(0~1). 1에 가까울수록 흔들림이 빨리 줄어듦
    iterations = 12,   // 한 프레임당 물리 반복 횟수. 많을수록 안정, 비용 증가
    color = 0xcccccc,
    parent = null,
    colliders = [],    // 충돌할 메쉬 배열. 전선이 이 오브젝트를 뚫고 지나가지 않음
    bounce = 0.2,      // 충돌 시 튕겨나오는 정도 (0=안 튐, 1=완전 반사)
  }) {
    this.startObj = startObj
    this.endObj = endObj
    this.segments = segments
    this.gravity = gravity
    this.damping = damping
    this.iterations = iterations
    this.radius = radius
    this.colliders = Array.isArray(colliders) ? colliders : [colliders].filter(Boolean)
    this.bounce = bounce

    this.p = Array.from({ length: segments }, () => new THREE.Vector3())
    this.pp = Array.from({ length: segments }, () => new THREE.Vector3())

    this._a = new THREE.Vector3()
    this._b = new THREE.Vector3()
    this._delta = new THREE.Vector3()
    this._corr = new THREE.Vector3()
    this._colliderBox = new THREE.Box3()
    this._colliderBoxExpanded = new THREE.Box3()
    this._worldPt = new THREE.Vector3()
    this._worldPp = new THREE.Vector3()
    this._velWorld = new THREE.Vector3()
    this._normal = new THREE.Vector3()
    this._parentInverse = new THREE.Matrix4()

    startObj.getWorldPosition(this._a)
    endObj.getWorldPosition(this._b)

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1)
      this.p[i].lerpVectors(this._a, this._b, t)
      this.pp[i].copy(this.p[i])
    }

    const total = this._a.distanceTo(this._b) * slack
    this.restLen = total / (segments - 1)

    this.curve = new THREE.CatmullRomCurve3(this.p)
    this.geom = new THREE.TubeGeometry(this.curve, segments * 3, radius, 8, false)

    this.mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.15,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    })
    this.mesh = new THREE.Mesh(this.geom, this.mat)

    ;(parent || startObj.parent || startObj).add(this.mesh)
    this.mesh.frustumCulled = false
  }

  step(dt) {
    if (!this.startObj || !this.endObj) return
    const dtt = Math.min(Math.max(dt || 1 / 60, 1 / 240), 1 / 20)

    this.startObj.getWorldPosition(this._a)
    this.endObj.getWorldPosition(this._b)
    this.p[0].copy(this._a)
    this.p[this.segments - 1].copy(this._b)

    for (let i = 1; i < this.segments - 1; i++) {
      const cur = this.p[i]
      const prev = this.pp[i]

      const vx = (cur.x - prev.x) * this.damping
      const vy = (cur.y - prev.y) * this.damping
      const vz = (cur.z - prev.z) * this.damping

      prev.copy(cur)

      cur.x += vx
      cur.y += vy - this.gravity * dtt
      cur.z += vz
    }

    for (let k = 0; k < this.iterations; k++) {
      this.p[0].copy(this._a)
      this.p[this.segments - 1].copy(this._b)

      for (let i = 0; i < this.segments - 1; i++) {
        const p1 = this.p[i]
        const p2 = this.p[i + 1]

        this._delta.subVectors(p2, p1)
        const d = this._delta.length() || 1e-6
        const diff = (d - this.restLen) / d

        this._corr.copy(this._delta).multiplyScalar(0.5 * diff)

        if (i !== 0) p1.add(this._corr)
        if (i + 1 !== this.segments - 1) p2.sub(this._corr)
      }

      if (this.colliders.length > 0 && this.mesh.parent) {
        this.mesh.parent.updateMatrixWorld(true)
        this._parentInverse.copy(this.mesh.parent.matrixWorld).invert()
        for (const col of this.colliders) {
          if (!col || !col.isObject3D) continue
          col.updateMatrixWorld(true)
          this._colliderBox.setFromObject(col)
          if (this._colliderBox.isEmpty()) continue
          this._colliderBoxExpanded.copy(this._colliderBox).expandByScalar(this.radius * 1.5 + 0.05)
          const b = this._colliderBoxExpanded
          for (let i = 1; i < this.segments - 1; i++) {
            const pt = this.p[i]
            this._worldPt.copy(pt).applyMatrix4(this.mesh.parent.matrixWorld)
            if (!this._colliderBoxExpanded.containsPoint(this._worldPt)) continue
            this._worldPp.copy(this.pp[i]).applyMatrix4(this.mesh.parent.matrixWorld)
            this._velWorld.subVectors(this._worldPt, this._worldPp)
            const dx0 = this._worldPt.x - b.min.x
            const dx1 = b.max.x - this._worldPt.x
            const dy0 = this._worldPt.y - b.min.y
            const dy1 = b.max.y - this._worldPt.y
            const dz0 = this._worldPt.z - b.min.z
            const dz1 = b.max.z - this._worldPt.z
            const dists = [dx0, dx1, dy0, dy1, dz0, dz1]
            const dMin = Math.min(...dists)
            if (dMin <= 1e-6) continue
            const idx = dists.indexOf(dMin)
            if (idx === 0) { this._worldPt.x = b.min.x - 1e-5; this._normal.set(-1, 0, 0) }
            else if (idx === 1) { this._worldPt.x = b.max.x + 1e-5; this._normal.set(1, 0, 0) }
            else if (idx === 2) { this._worldPt.y = b.min.y - 1e-5; this._normal.set(0, -1, 0) }
            else if (idx === 3) { this._worldPt.y = b.max.y + 1e-5; this._normal.set(0, 1, 0) }
            else if (idx === 4) { this._worldPt.z = b.min.z - 1e-5; this._normal.set(0, 0, -1) }
            else { this._worldPt.z = b.max.z + 1e-5; this._normal.set(0, 0, 1) }
            const dot = this._velWorld.dot(this._normal)
            if (dot < 0) {
              this._velWorld.addScaledVector(this._normal, -2 * dot * this.bounce)
              this._worldPp.copy(this._worldPt).sub(this._velWorld)
              this.pp[i].copy(this._worldPp).applyMatrix4(this._parentInverse)
            } else {
              this.pp[i].copy(this._worldPt).applyMatrix4(this._parentInverse)
            }
            pt.copy(this._worldPt).applyMatrix4(this._parentInverse)
          }
        }
      }
    }

    // 반복 후 남은 침투 제거: 충돌만 3번 더 적용 (전선이 물체 통과 방지)
    for (let c = 0; c < 3; c++) {
      if (this.colliders.length > 0 && this.mesh.parent) {
        this.mesh.parent.updateMatrixWorld(true)
        this._parentInverse.copy(this.mesh.parent.matrixWorld).invert()
        for (const col of this.colliders) {
          if (!col || !col.isObject3D) continue
          col.updateMatrixWorld(true)
          this._colliderBox.setFromObject(col)
          if (this._colliderBox.isEmpty()) continue
          this._colliderBoxExpanded.copy(this._colliderBox).expandByScalar(this.radius * 1.5 + 0.05)
          const b = this._colliderBoxExpanded
          for (let i = 1; i < this.segments - 1; i++) {
            const pt = this.p[i]
            this._worldPt.copy(pt).applyMatrix4(this.mesh.parent.matrixWorld)
            if (!this._colliderBoxExpanded.containsPoint(this._worldPt)) continue
            this._worldPp.copy(this.pp[i]).applyMatrix4(this.mesh.parent.matrixWorld)
            this._velWorld.subVectors(this._worldPt, this._worldPp)
            const dx0 = this._worldPt.x - b.min.x
            const dx1 = b.max.x - this._worldPt.x
            const dy0 = this._worldPt.y - b.min.y
            const dy1 = b.max.y - this._worldPt.y
            const dz0 = this._worldPt.z - b.min.z
            const dz1 = b.max.z - this._worldPt.z
            const dists = [dx0, dx1, dy0, dy1, dz0, dz1]
            const dMin = Math.min(...dists)
            if (dMin <= 1e-6) continue
            const idx = dists.indexOf(dMin)
            if (idx === 0) { this._worldPt.x = b.min.x - 0.02; this._normal.set(-1, 0, 0) }
            else if (idx === 1) { this._worldPt.x = b.max.x + 0.02; this._normal.set(1, 0, 0) }
            else if (idx === 2) { this._worldPt.y = b.min.y - 0.02; this._normal.set(0, -1, 0) }
            else if (idx === 3) { this._worldPt.y = b.max.y + 0.02; this._normal.set(0, 1, 0) }
            else if (idx === 4) { this._worldPt.z = b.min.z - 0.02; this._normal.set(0, 0, -1) }
            else { this._worldPt.z = b.max.z + 0.02; this._normal.set(0, 0, 1) }
            const dot = this._velWorld.dot(this._normal)
            if (dot < 0) {
              this._velWorld.addScaledVector(this._normal, -2 * dot * this.bounce)
              this._worldPp.copy(this._worldPt).sub(this._velWorld)
              this.pp[i].copy(this._worldPp).applyMatrix4(this._parentInverse)
            } else {
              this.pp[i].copy(this._worldPt).applyMatrix4(this._parentInverse)
            }
            pt.copy(this._worldPt).applyMatrix4(this._parentInverse)
          }
        }
      }
    }

    this.curve.points = this.p
    const newGeom = new THREE.TubeGeometry(this.curve, this.segments * 3, this.radius, 8, false)
    this.mesh.geometry.dispose()
    this.mesh.geometry = newGeom
    this.geom = newGeom
  }
}

/* =========================================================
   ✅ "표면 앵커" + 오프셋
========================================================= */
const _bb = new THREE.Box3()
const _center = new THREE.Vector3()
const _size = new THREE.Vector3()
const _wA = new THREE.Vector3()
const _wB = new THREE.Vector3()
const _dirW = new THREE.Vector3()
const _rotInv = new THREE.Matrix4()
const _dirL = new THREE.Vector3()

function ensureGeomBB(mesh) {
  if (mesh?.geometry && !mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
}

function createSurfaceAnchorWithOffset(mesh, otherMesh, localOffset, name) {
  if (!mesh || !otherMesh) return null

  mesh.updateMatrixWorld(true)
  otherMesh.updateMatrixWorld(true)

  ensureGeomBB(mesh)

  if (mesh.geometry?.boundingBox) _bb.copy(mesh.geometry.boundingBox)
  else _bb.setFromObject(mesh)

  _bb.getCenter(_center)
  _bb.getSize(_size)

  mesh.getWorldPosition(_wA)
  otherMesh.getWorldPosition(_wB)
  _dirW.subVectors(_wB, _wA).normalize()

  _rotInv.extractRotation(mesh.matrixWorld).invert()
  _dirL.copy(_dirW).applyMatrix4(_rotInv).normalize()

  const ax =
    Math.abs(_dirL.x) >= Math.abs(_dirL.y) && Math.abs(_dirL.x) >= Math.abs(_dirL.z)
      ? 'x'
      : Math.abs(_dirL.y) >= Math.abs(_dirL.x) && Math.abs(_dirL.y) >= Math.abs(_dirL.z)
        ? 'y'
        : 'z'
  const sign = _dirL[ax] >= 0 ? 1 : -1

  const anchor = new THREE.Object3D()
  anchor.name = name

  anchor.position.copy(_center)
  anchor.position[ax] += sign * (_size[ax] * 0.5)
  anchor.position.add(localOffset)

  mesh.add(anchor)
  anchor.updateMatrixWorld(true)
  return anchor
}

/* =========================================================
   6) 축 찾기
========================================================= */
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const WORLD_RIGHT = new THREE.Vector3(1, 0, 0)
const WORLD_PULL_AXIS = new THREE.Vector3(0, 0, -1)

const _rotM = new THREE.Matrix4()
const _axX = new THREE.Vector3()
const _axY = new THREE.Vector3()
const _axZ = new THREE.Vector3()

function getUpAxisKey(obj) {
  obj.updateMatrixWorld(true)
  _rotM.extractRotation(obj.matrixWorld)

  _axX.set(1, 0, 0).applyMatrix4(_rotM).normalize()
  _axY.set(0, 1, 0).applyMatrix4(_rotM).normalize()
  _axZ.set(0, 0, 1).applyMatrix4(_rotM).normalize()

  const dx = Math.abs(_axX.dot(WORLD_UP))
  const dy = Math.abs(_axY.dot(WORLD_UP))
  const dz = Math.abs(_axZ.dot(WORLD_UP))

  if (dx >= dy && dx >= dz) return 'x'
  if (dy >= dx && dy >= dz) return 'y'
  return 'z'
}

function getWorldAxis(obj, axisKey) {
  obj.updateMatrixWorld(true)
  _rotM.extractRotation(obj.matrixWorld)
  const v = new THREE.Vector3(axisKey === 'x' ? 1 : 0, axisKey === 'y' ? 1 : 0, axisKey === 'z' ? 1 : 0)
  return v.applyMatrix4(_rotM).normalize()
}

function getAxisKeyClosestToWorld(obj, worldDir) {
  obj.updateMatrixWorld(true)
  _rotM.extractRotation(obj.matrixWorld)

  _axX.set(1, 0, 0).applyMatrix4(_rotM).normalize()
  _axY.set(0, 1, 0).applyMatrix4(_rotM).normalize()
  _axZ.set(0, 0, 1).applyMatrix4(_rotM).normalize()

  const dx = Math.abs(_axX.dot(worldDir))
  const dy = Math.abs(_axY.dot(worldDir))
  const dz = Math.abs(_axZ.dot(worldDir))

  if (dx >= dy && dx >= dz) return 'x'
  if (dy >= dx && dy >= dz) return 'y'
  return 'z'
}

/** 메쉬 geometry 바운딩 박스에서 가장 긴 축 키 반환 ('x'|'y'|'z') — 실린더 길이 스케일용 */
function getLengthAxisKey(mesh) {
  if (!mesh || !mesh.geometry) return 'y'
  const geo = mesh.geometry
  if (!geo.boundingBox) geo.computeBoundingBox()
  const size = new THREE.Vector3()
  geo.boundingBox.getSize(size)
  const x = Math.abs(size.x)
  const y = Math.abs(size.y)
  const z = Math.abs(size.z)
  if (x >= y && x >= z) return 'x'
  if (y >= x && y >= z) return 'y'
  return 'z'
}

/* =========================================================
   7) 조명 메쉬 정보
========================================================= */
const lightOnInfo = [
  { name: 'LIGHT1', color: 0xff6688, intensity: 3.5 },   // 켜졌을 때 채도·밝기 높은 빨강 (메쉬 자체)
  { name: 'LIGHT2', color: 0xffee66, intensity: 0.2 },   // 켜졌을 때 선명·밝은 노랑
  { name: 'LIGHT3', color: 0x66ff99, intensity: 0.2 },   // 켜졌을 때 선명·밝은 초록
  { name: 'pasted__LIGHT2', color: 0xffee66, intensity: 2.0 },
]
/** 전구 켜졌을 때 재질 발광 세기 (메쉬 자체 밝기, 클수록 더 밝게) */
const LIGHT_ON_EMISSIVE_INTENSITY = 4.5
/** 전구 꺼진 상태 색 (더 밝게: 0x909090, 더 어둡게: 0x626262) */
const LIGHT_OFF_COLOR = 0x909090

/** 호버 없을 때 LIGHT1→2→3 순서로 자동 점등. [LIGHT1 유지 초, LIGHT2 유지 초, LIGHT3 유지 초] */
const AUTO_LIGHT_CYCLE_NAMES = ['LIGHT1', 'LIGHT2', 'LIGHT3']
const AUTO_LIGHT_DURATIONS = [2, 2, 5]
/** 호버 신호 들어오면 자동 순차 점등을 멈출 시간(초) */
const AUTO_LIGHT_HOVER_PAUSE = 5

/* =========================================================
   8) 모델 로드 + 세팅
========================================================= */
const loader = new GLTFLoader()

/** #status 로딩 문구 (index.html). 큰 GLB는 네트워크+디코딩에 시간이 걸림 */
function setLoadingStatus(visible, text) {
  const el = document.getElementById('status')
  if (!el) return
  el.style.display = visible ? 'block' : 'none'
  if (text != null) el.textContent = text
}
function notifyReactiveObjectReady() {
  window.dispatchEvent(new CustomEvent('reactive-object-ready'))
}

let model = null
let allMeshes = []

let pole = null
let poleBB = null
let poleAxisKey = 'y'
let poleBase = 0
let poleOriginScale = 1
let poleOriginPos = 0
let poleHeightLocal = 0

let socketTest = null
let socketBasePos = new THREE.Vector3()

/** 폴 반동과 동시에 아래로 같은 범위만큼 반동할 실린더 */
let cylinder6Mesh = null
let cylinder7Mesh = null
let cylinder6BasePos = new THREE.Vector3()
let cylinder7BasePos = new THREE.Vector3()

const lightMeshes = new Map()
/** 호버 시 전구 조명 (PointLight 또는 pasted__LIGHT2만 SpotLight) */
const lightPointLights = new Map()
/** pasted__LIGHT2가 SpotLight일 때만 사용. 빛이 바라볼 타깃(월드 좌표로 동기화) */
let pastedLight2SpotTarget = null
/** pasted__LIGHT2 클릭으로 껐다 켰다. true=켜짐(기본, 새로고침 후에도 켜진 상태) */
let pastedLight2LightOn = true
/** pasted__LIGHT2 조명 위치 표시용 노란 구(debugSphere: true일 때) */
let pastedLight2DebugSphere = null
/** 전구 조명 위치 표시 점 (반경 0.01), name -> Mesh */
const bulbLightDots = new Map()
/** 전구별 조명 오프셋 (메쉬 로컬). setBulbLightOffset('LIGHT1', x,y,z)로 개별 지정 */
const BULB_LIGHT_OFFSETS = {
  LIGHT1: { x: 0.62, y: 0.17, z: 0.7 },
  LIGHT2: { x: 0.62, y: -0.01, z: 0.7 },
  LIGHT3: { x: 0.62, y: -0.17, z: 0.7 },
}
/** pasted__LIGHT2 전용. useSpotLight: true면 방향 조절(SpotLight), false면 전방향(PointLight) */
const PASTED_LIGHT2_REAL_LIGHT = {
  x: 0.62,
  y: 0,
  z: 0.65,
  distance: 20,
  decay: 0.3,
  intensityOn: 5,
  alwaysOn: true,
  /** true면 조명 위치에 노란 구 표시(위치 확인용) */
  debugSphere: false,
  /** true = SpotLight(방향 조절), false = PointLight(핀포인트, 전방향) — 빛 보이게 하려면 false 권장 */
  useSpotLight: false,
  /** SpotLight일 때: 빛이 향할 방향. 'y' = 로컬 -Y, 'z' = 로컬 -Z, 'x' = 로컬 -X */
  downAxis: 'y',
  /** SpotLight일 때: 조명 위치에서 타깃까지 거리(로컬). 클수록 더 멀리 비춤 */
  downOffset: 2,
  /** SpotLight 원뿔 각도(라디안). Math.PI/6≈30°, Math.PI/3≈60° */
  angle: Math.PI / 4,
  penumbra: 0.2,
}
const BULB_LIGHT_DOT_RADIUS = 0.00001

// 🎈 풍선
let balloonMesh = null
let balloonPivot = null
let balloonPlanesGroup = null  // pPlane만 위아래 포함 균일 스케일용
const balloonPlaneBasePos = new Map()  // name -> Vector3 (그룹 내 기준 위치)
let balloonUpAxisKey = 'y'
const balloonBasePivotScale = new THREE.Vector3(1, 1, 1)
/** 풍선 호버 보간용. 호버가 프레임마다 튀어도 스케일이 버벅거리지 않게 */
let balloonSmoothedTarget = 1.0

// ✅ 단위 보정 (로드 후 결정)
let UNIT = 1
const U = (v) => v * UNIT
const UV = (v3) => v3.clone().multiplyScalar(UNIT)

// ✅ push/lift/drop
const pushMeshes = []
const pushBasePos = new Map()
const pushMaxByUuid = new Map()
const pushAxisByUuid = new Map()
const pushSignByUuid = new Map()

const liftMeshes = []
const liftBasePos = new Map()
const liftDirLocal = new Map()

const dropMeshes = []
const dropBasePos = new Map()
const dropDirLocal = new Map()

const _tmpDir = new THREE.Vector3()
const _invRot = new THREE.Matrix4()

const _tmpBox = new THREE.Box3()
const _tmpCenterW = new THREE.Vector3()
const _tmpLocal = new THREE.Vector3()

// ✅ 전선들
let cable = null
let cableAnchorA = null
let cableAnchorB = null

let cable2 = null
let cable2AnchorA = null
let cable2AnchorB = null

let cable3 = null
let cable3AnchorA = null
let cable3AnchorB = null

let cable4 = null
let cable4AnchorA = null
let cable4AnchorB = null

// ✅ 고무
let rubberMesh = null
let rubberPivot = null
let rubberRightAxisKey = 'x'
const rubberBasePivotScale = new THREE.Vector3(1, 1, 1)
const rubberBasePivotQuat = new THREE.Quaternion()
const rubberTargetQuat = new THREE.Quaternion()
const rubberAxisLocal = new THREE.Vector3(0, 0, 1)
const _qTmp = new THREE.Quaternion()
const _invRot2 = new THREE.Matrix4()

// ✅ bounce
let bounceMesh = null
let bounceBasePos = new THREE.Vector3()
let bounceVel = 0
let bounceOffset = 0
let hasBounced = false
/** 폴 줄어들기 끝난 뒤 반동용. 한 번만 트리거 후 감쇠 */
let poleReturnRebound = 0
let poleReturnReboundTriggered = false
let cylinder6Rebound = 0
let cylinder7Rebound = 0
let cylinder6ReboundTriggered = false
let cylinder7ReboundTriggered = false

/** LIGHT/CAP 팀 반동: [팀0, 팀1, 팀2] 각각 [LIGHT메쉬, CAP메쉬] */
const lightCapTeamMeshes = [[null, null], [null, null], [null, null]]
/** 팀별 기본 위치 [LIGHT position, CAP position] */
const lightCapTeamBasePositions = [
  [new THREE.Vector3(), new THREE.Vector3()],
  [new THREE.Vector3(), new THREE.Vector3()],
  [new THREE.Vector3(), new THREE.Vector3()],
]
/** 팀별 반동 값·발동 플래그 (인덱스 0=팀1, 1=팀2, 2=팀3) */
const teamRebounds = [0, 0, 0]
const teamReboundTriggered = [false, false, false]

// ✅ morph
let cube5Base = null
let cube5MorphIndex = -1
let cube5MorphValue = 0
let cube5MorphVelocity = 0
/** pasted__pCube1: CUBE5_BASE와 같은 모프 값으로 같이 움직임 */
const PCUBE1_NAME = 'pasted__pCube1'
let pCube1Mesh = null
let pCube1MorphIndex = -1
/** true면 모프가 제자리로 돌아오기 전까지 호버 무시 */
let cube5HoverLocked = false

/** pPlane12 GIF 텍스처 (gifuct-js로 프레임 디코딩 후 수동 재생) */
let plane12Mesh = null
let plane12GifCanvas = null
let plane12GifCtx = null
let plane12GifTexture = null
let plane12GifFrames = []
let plane12GifFrameIndex = 0
let plane12GifNextFrameTime = 0
let plane12GifWidth = 0
let plane12GifHeight = 0

/** GLB에 포함된 마야 애니메이션 재생용 (typeMesh1, pasted__pasted__CUBE5_BASE 등 morph/트랜스폼) */
let modelMixer = null
/** mixer 액션들 — typeMesh1 호버 시 한 번만 쭉 재생용 */
let modelMixerActions = []
/** typeMesh1 호버로 시작한 애니메이션이 끝까지 재생 중인지 */
let typeMesh1AnimationPlaying = false
/** 이전 프레임 typeMesh1 호버 여부 (엣지 감지) */
let prevHoverTypeMesh1 = false
/** typeMesh1 호버로 애니를 마지막으로 트리거한 시각(ms) — 쿨다운용 */
let typeMesh1LastTriggerTime = 0

// =========================================================
// ✅ Cylinder17 runtime state
// =========================================================
let cylinder17 = null
let cylinder17AxisKey = 'y'
let cylinder17BasePos = new THREE.Vector3()
let cylinder40Follow = null
const cylinder40BaseWorldScale = new THREE.Vector3()
const _cyl17WorldScale = new THREE.Vector3()
let cyl17Started = false
let cyl17Time = 0
let cyl17TargetOffset = 0
let cyl17CurrentOffset = 0

// =========================================================
// ✅ CIRCLE1 runtime state
// =========================================================
let circle1Mesh = null
let circle1Pivot = null
let circle1PivotBasePos = new THREE.Vector3()
let circle1Started = false
let circle1Time = 0
let circle1CurY = 0
const circle1BasePivotScale = new THREE.Vector3(1, 1, 1)
let circle1World = null
let circle1MeshBaseLocalPos = new THREE.Vector3()

// ✅ 재트리거
let prevHoverCylinder17 = false
let prevHoverCircle1 = false
/** CIRCLE1 호버로 트리거한 마지막 시각(ms) — 쿨다운용 */
let circle1LastTriggerTime = 0

// Cylinder25 관절 (Cylinder26 고정, Cylinder25가 접점 축으로 회전)
let cyl25Pivot = null
const cyl25HingeAxisWorld = new THREE.Vector3()
let cyl25JointAngleCurrent = 0
let cyl25JointAngleTarget = 0
const _cyl25ParentWorldQuat = new THREE.Quaternion()
const _cyl25DesiredWorldQuat = new THREE.Quaternion()
const _cyl25AxisAngleQ = new THREE.Quaternion()
const cyl25PivotBaseWorldQuat = new THREE.Quaternion()
let cyl25AxisHelper = null

// 두 번째 관절 (축2: Cylinder27 회전)
let cyl27Pivot = null
const cyl27HingeAxisWorld = new THREE.Vector3()
let cyl27JointAngleCurrent = 0
let cyl27JointAngleTarget = 0
const _cyl27ParentWorldQuat = new THREE.Quaternion()
const _cyl27DesiredWorldQuat = new THREE.Quaternion()
const _cyl27AxisAngleQ = new THREE.Quaternion()
const cyl27PivotBaseWorldQuat = new THREE.Quaternion()
let cyl27AxisHelper = null

// 축3 (Cylinder70 회전)
let cyl70Pivot = null
const cyl70HingeAxisWorld = new THREE.Vector3()
let cyl70JointAngleCurrent = 0
let cyl70JointAngleTarget = 0
const _cyl70ParentWorldQuat = new THREE.Quaternion()
const _cyl70DesiredWorldQuat = new THREE.Quaternion()
const _cyl70AxisAngleQ = new THREE.Quaternion()
const cyl70PivotBaseWorldQuat = new THREE.Quaternion()
let cyl70AxisHelper = null

// 축4 (Cylinder39 회전)
let cyl39Pivot = null
const cyl39HingeAxisWorld = new THREE.Vector3()
let cyl39JointAngleCurrent = 0
let cyl39JointAngleTarget = 0
const _cyl39ParentWorldQuat = new THREE.Quaternion()
const _cyl39DesiredWorldQuat = new THREE.Quaternion()
const _cyl39AxisAngleQ = new THREE.Quaternion()
const cyl39PivotBaseWorldQuat = new THREE.Quaternion()
let cyl39AxisHelper = null

// 로봇팔 한 사이클: 0=대기, 1=휘기, 2=유지, 3=복귀
let robotArmPhase = 0
let robotArmPhaseTime = 0
let robotArmCycleValue = 0
/** 축별 휘기 보간값 0~1. [축1, 축2, 축3, 축4] 순. 축1 먼저 도달 후 유지, 축4가 마지막 */
const robotArmAxisBendValues = [0, 0, 0, 0]
let prevHoverRobotArmTrigger = false

setLoadingStatus(true, '모델 다운로드 준비 중…')

loader.load(
  MODEL_URL,
  (gltf) => {
    try {
      setLoadingStatus(true, '모델 적용 중… (큰 파일은 10~60초 걸릴 수 있음)')
      console.log('✅ GLTF loaded:', MODEL_URL)

      model = gltf.scene
      if (!model) {
        console.error('GLTF scene이 비어 있음')
        setLoadingStatus(true, 'GLTF scene이 비어 있음')
        notifyReactiveObjectReady()
        return
      }
      scene.add(model)

      if (MODEL_UNIT_SCALE !== 1) {
        model.scale.multiplyScalar(MODEL_UNIT_SCALE)
        model.updateMatrixWorld(true)
        console.log('📏 MODEL_UNIT_SCALE 적용:', MODEL_UNIT_SCALE, '(마야 단위 보정)')
      }
      if (gltf.asset) {
        console.log('📏 GLTF asset:', gltf.asset.generator || '', gltf.asset.version || '', gltf.asset.extras || '')
      }

      // GLB에 포함된 마야 애니메이션·밴딩(morph) 재생 (typeMesh1, pasted__pasted__CUBE5_BASE 등)
      if (gltf.animations && gltf.animations.length > 0) {
        modelMixer = new THREE.AnimationMixer(model)
        modelMixerActions = []
        gltf.animations.forEach((clip) => {
          const action = modelMixer.clipAction(clip)
          action.setLoop(THREE.LoopOnce) // typeMesh1 호버 시 한 번만 쭉 재생
          modelMixerActions.push(action)
        })
        modelMixer.addEventListener('finished', () => {
          typeMesh1AnimationPlaying = false
        })
        console.log('🎬 Maya 애니메이션 (typeMesh1 호버 시 1회 재생):', gltf.animations.length, 'clips')
      }

      model.rotation.set(0, 0, 0)
    model.position.set(0, 0, 0)
    model.updateMatrixWorld(true)

    const box0 = new THREE.Box3().setFromObject(model)
    const size0 = box0.getSize(new THREE.Vector3())
    const maxDim0 = Math.max(size0.x, size0.y, size0.z)

    UNIT = maxDim0 < 10 ? 0.01 : 1
    console.log('📏 maxDim:', maxDim0, '=> UNIT:', UNIT)

    neutralizeMaterials(model)
    ensureUniqueMaterials(model)
    model.traverse((o) => {
      if (o.isMesh) {
        o.receiveShadow = true
        o.castShadow = true
      }
    })

    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    camera.position.set(center.x + maxDim * 0.9, center.y + maxDim * 0.55, center.z + maxDim * 1.35)
    camera.lookAt(center)
    controls.target.copy(center)
    controls.update()
    try {
      const saved = localStorage.getItem(CAMERA_VIEW_STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (Array.isArray(data.position) && data.position.length === 3 && Array.isArray(data.target) && data.target.length === 3) {
          camera.position.set(data.position[0], data.position[1], data.position[2])
          controls.target.set(data.target[0], data.target[1], data.target[2])
          controls.update()
        }
      }
    } catch (_) {}

    // 그림자 계단현상 완화: 키 라이트 그림자 카메라를 씬 크기에 맞춤 (같은 해상도로 더 촘촘)
    const half = Math.max(maxDim * 0.45, 2)
    key.shadow.camera.left = key.shadow.camera.bottom = -half
    key.shadow.camera.right = key.shadow.camera.top = half
    key.shadow.camera.updateProjectionMatrix()

    allMeshes = collectMeshes(model)
    console.log('✅ meshes collected:', allMeshes.length)

    HIDE_MESH_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      if (m) {
        m.visible = false
        console.log('🙈 hidden:', nm)
      }
    })

    Object.entries(MESH_COLOR_OVERRIDES).forEach(([name, colorHex]) => {
      const m = model.getObjectByName(name) || getObjectByNameOrSuffix(model, name)
      if (m && m.isMesh) {
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((mat) => {
          if (mat.color) mat.color.setHex(colorHex)
          if (mat.emissive) mat.emissive.setHex(0x000000)
        })
      }
    })

    pole = model.getObjectByName(POLE_NAME)
    if (pole?.geometry) {
      pole.geometry.computeBoundingBox()
      poleBB = pole.geometry.boundingBox.clone()
      poleAxisKey = getUpAxisKey(pole)
      poleOriginScale = pole.scale[poleAxisKey]
      poleOriginPos = pole.position[poleAxisKey]
      poleHeightLocal = poleBB.max[poleAxisKey] - poleBB.min[poleAxisKey]
      poleBase = poleOriginPos + poleBB.min[poleAxisKey] * poleOriginScale
      console.log('✅ pole:', pole.name, 'axis:', poleAxisKey)
    } else {
      console.warn('❌ pole not found or no geometry:', POLE_NAME)
    }

    bounceMesh = model.getObjectByName(BOUNCE_MESH_NAME)
    console.log('🟡 bounce mesh:', bounceMesh ? bounceMesh.name : 'NOT FOUND')
    if (bounceMesh) bounceBasePos.copy(bounceMesh.position)

    socketTest = model.getObjectByName(SOCKET_NAME)
    if (socketTest) {
      socketBasePos.copy(socketTest.position)
      console.log('✅ socket:', socketTest.name)
    } else {
      console.warn('❌ socket not found:', SOCKET_NAME)
    }

    cylinder6Mesh = getObjectByNameOrSuffix(model, 'Cylinder6')
    cylinder7Mesh = getObjectByNameOrSuffix(model, 'Cylinder7')
    if (cylinder6Mesh) {
      cylinder6BasePos.copy(cylinder6Mesh.position)
      console.log('✅ Cylinder6 (pole rebound):', cylinder6Mesh.name)
    }
    if (cylinder7Mesh) {
      cylinder7BasePos.copy(cylinder7Mesh.position)
      console.log('✅ Cylinder7 (pole rebound):', cylinder7Mesh.name)
    }

    LIGHT_CAP_TEAM_NAMES.forEach(([lightName, capName], teamIndex) => {
      const lightMesh = getObjectByNameOrSuffix(model, lightName)
      const capMesh = getObjectByNameOrSuffix(model, capName)
      lightCapTeamMeshes[teamIndex][0] = lightMesh || null
      lightCapTeamMeshes[teamIndex][1] = capMesh || null
      if (lightMesh) lightCapTeamBasePositions[teamIndex][0].copy(lightMesh.position)
      if (capMesh) lightCapTeamBasePositions[teamIndex][1].copy(capMesh.position)
      if (lightMesh || capMesh) {
        console.log('✅ LIGHT/CAP 팀' + (teamIndex + 1) + ' 반동:', lightName, capName, lightMesh?.name, capMesh?.name)
      }
    })

    lightOnInfo.forEach(({ name }) => {
      let m = model.getObjectByName(name)
      if (!m && (name === 'LIGHT1' || name === 'LIGHT2' || name === 'LIGHT3')) m = getObjectByNameOrSuffix(model, name)
      const isPastedLight2 = name === 'pasted__LIGHT2'
      const off = isPastedLight2 ? PASTED_LIGHT2_REAL_LIGHT : (BULB_LIGHT_OFFSETS[name] || { x: 0, y: 0, z: 0.35 })
      if (isPastedLight2) {
        const cfg = PASTED_LIGHT2_REAL_LIGHT
        let pt
        if (cfg.useSpotLight) {
          pt = new THREE.SpotLight(0xffffff, 0, cfg.distance, cfg.angle, cfg.penumbra, cfg.decay)
          pastedLight2SpotTarget = new THREE.Object3D()
          pastedLight2SpotTarget.name = 'pasted__LIGHT2_spotTarget'
          scene.add(pastedLight2SpotTarget)
          pt.target = pastedLight2SpotTarget
        } else {
          pt = new THREE.PointLight(0xffffff, 0, cfg.distance, cfg.decay)
        }
        pt.position.set(0, 8, 0)
        scene.add(pt)
        lightPointLights.set(name, pt)
        if (cfg.debugSphere) {
          pastedLight2DebugSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffdd00 })
          )
          pastedLight2DebugSphere.name = 'pasted__LIGHT2_debugSphere'
          scene.add(pastedLight2DebugSphere)
        }
        if (m && m.isMesh) {
          ensureLightMaterialBright(m)
          lightMeshes.set(name, m)
          const dotGeom = new THREE.SphereGeometry(BULB_LIGHT_DOT_RADIUS, 8, 6)
          const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff88 })
          const dot = new THREE.Mesh(dotGeom, dotMat)
          dot.position.set(off.x, off.y, off.z)
          dot.name = name + '_lightDot'
          dot.visible = false
          m.add(dot)
          bulbLightDots.set(name, dot)
        } else {
          console.warn('🔦 pasted__LIGHT2 메쉬 없음. 조명만 씬에 추가됨. 메쉬 이름 확인.')
        }
      } else if (m && m.isMesh) {
        ensureLightMaterialBright(m)
        lightMeshes.set(name, m)
        lightMeshes.set(m.name, m) // 호버 시 히트한 메쉬 이름으로도 조회 (pasted__LIGHT1 등)
        // 전구 메쉬 바운딩 박스 중심에 조명·점 위치 맞춤
        const center = getMeshLocalCenter(m)
        BULB_LIGHT_OFFSETS[name].x = center.x
        BULB_LIGHT_OFFSETS[name].y = center.y
        BULB_LIGHT_OFFSETS[name].z = center.z
        const pt = new THREE.PointLight(0xffffff, 0, 1.2, 1)
        pt.position.copy(center)
        m.add(pt)
        lightPointLights.set(name, pt)
        lightPointLights.set(m.name, pt) // 히트한 메쉬 이름으로도 조회
        const dotGeom = new THREE.SphereGeometry(BULB_LIGHT_DOT_RADIUS, 8, 6)
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff88 })
        const dot = new THREE.Mesh(dotGeom, dotMat)
        dot.position.copy(center)
        dot.name = name + '_lightDot'
        dot.visible = false
        m.add(dot)
        bulbLightDots.set(name, dot)
      }
    })
    // LIGHT1/2/3를 forEach에서 못 찾았으면 traverse로 이름에 LIGHT1·LIGHT2·LIGHT3 포함된 메쉬에 PointLight 추가
    ;['LIGHT1', 'LIGHT2', 'LIGHT3'].forEach((canonical) => {
      if (lightMeshes.get(canonical)) return
      let found = null
      model.traverse((o) => {
        if (found || !o.isMesh) return
        const n = (o.name || '')
        if (n === canonical || n.endsWith('_' + canonical) || n.includes(canonical)) {
          found = o
        }
      })
      if (found && found.isMesh) {
        ensureLightMaterialBright(found)
        lightMeshes.set(canonical, found)
        lightMeshes.set(found.name, found)
        const center = getMeshLocalCenter(found)
        if (!BULB_LIGHT_OFFSETS[canonical]) BULB_LIGHT_OFFSETS[canonical] = { x: 0, y: 0, z: 0 }
        BULB_LIGHT_OFFSETS[canonical].x = center.x
        BULB_LIGHT_OFFSETS[canonical].y = center.y
        BULB_LIGHT_OFFSETS[canonical].z = center.z
        const pt = new THREE.PointLight(0xffffff, 0, 1.2, 1)
        pt.position.copy(center)
        found.add(pt)
        lightPointLights.set(canonical, pt)
        lightPointLights.set(found.name, pt)
        console.log('🔦 전구 fallback:', canonical, '→', found.name, 'center', center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3))
      }
    })
    // 전구(LIGHT1/2/3) 등록 확인: 없으면 호버해도 발광 안 함
    ;['LIGHT1', 'LIGHT2', 'LIGHT3'].forEach((k) => {
      const has = !!(lightMeshes.get(k) && lightPointLights.get(k))
      if (!has) console.warn('🔦 전구 미등록:', k, '→ mesh:', !!lightMeshes.get(k), 'pt:', !!lightPointLights.get(k))
    })
    console.log('✅ lights found:', [...lightMeshes.keys()])

    cube5Base = model.getObjectByName(CUBE5_BASE_NAME)
    console.log('🧬 cube5Base:', cube5Base ? cube5Base.name : 'NOT FOUND')
    if (cube5Base && cube5Base.isMesh) {
      const infl = cube5Base.morphTargetInfluences
      const dict = cube5Base.morphTargetDictionary
      const keys = dict ? Object.keys(dict) : []
      if (infl && infl.length > 0) {
        cube5MorphIndex = 0
        console.log('🧬 morph targets:', infl.length, 'names:', keys)
      } else {
        console.warn('❌ cube5Base has no morph targets')
      }
    }
    pCube1Mesh = model.getObjectByName(PCUBE1_NAME) || getObjectByNameOrSuffix(model, PCUBE1_NAME)
    if (pCube1Mesh && pCube1Mesh.isMesh && pCube1Mesh.morphTargetInfluences && pCube1Mesh.morphTargetInfluences.length > 0) {
      pCube1MorphIndex = 0
      console.log('🧬 pCube1 morph 동기화 (CUBE5_BASE와 같이 움직임):', pCube1Mesh.name)
    } else if (pCube1Mesh) {
      pCube1Mesh = null
    }
    const pCube1Hide = model.getObjectByName('pCube1')
    if (pCube1Hide) {
      pCube1Hide.visible = false
      console.log('🙈 pCube1 비표시 (pasted__pCube1과 별개)')
    }

    // typeMesh1: 호버 시 애니 재생용으로 참조만 저장
    for (const name of TYPE_MESH1_NAMES) {
      typeMesh1Object = model.getObjectByName(name) || getObjectByNameOrSuffix(model, name)
      if (typeMesh1Object) break
    }
    if (typeMesh1Object) {
      console.log('📍 typeMesh1:', typeMesh1Object.name)
    } else {
      console.warn('❌ typeMesh1 미발견. 이름 확인:', TYPE_MESH1_NAMES)
    }

    // pPlane12: GIF 텍스처 (public/gif/plane12.gif) — 마야 플레인
    plane12Mesh = model.getObjectByName(PLANE12_NAME) || getObjectByNameOrSuffix(model, PLANE12_NAME)
    if (!plane12Mesh) {
      model.traverse((o) => {
        if (o.isMesh && o.name && (o.name === 'pPlane12' || (o.name.endsWith('pPlane12') && !o.name.startsWith('pasted__')))) {
          plane12Mesh = o
        }
      })
    }
    if (plane12Mesh && plane12Mesh.isMesh) {
      plane12Mesh.visible = true
      if (plane12Mesh.parent) plane12Mesh.parent.visible = true
      const s = plane12Mesh.scale
      if (s.x === 0 || s.y === 0 || s.z === 0) {
        if (s.x === 0) plane12Mesh.scale.x = 1
        if (s.y === 0) plane12Mesh.scale.y = 1
        if (s.z === 0) plane12Mesh.scale.z = 1
        console.log('🖼 pPlane12 스케일 0 보정:', plane12Mesh.scale.x, plane12Mesh.scale.y, plane12Mesh.scale.z)
      }
      const gifUrl =
        (typeof window !== 'undefined' && window.location
          ? window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/?$/, '')
          : (import.meta.env.BASE_URL || '/').replace(/\/?$/, '')) + '/gif/plane12.gif'
      fetch(gifUrl)
        .then((r) => r.arrayBuffer())
        .then((buffer) => {
          const gif = parseGIF(buffer)
          const frames = decompressFrames(gif, true)
          if (!frames.length) {
            console.warn('❌ pPlane12 GIF 프레임 없음')
            return
          }
          let w = 0
          let h = 0
          frames.forEach((fr) => {
            const d = fr.dims
            w = Math.max(w, d.left + d.width)
            h = Math.max(h, d.top + d.height)
          })
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          const tex = new THREE.CanvasTexture(c)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.minFilter = THREE.LinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.flipY = false
          plane12GifCanvas = c
          plane12GifCtx = ctx
          plane12GifTexture = tex
          plane12GifFrames = frames
          plane12GifFrameIndex = 0
          plane12GifNextFrameTime = performance.now() + (frames[0].delay || 50)
          plane12GifWidth = w
          plane12GifHeight = h
          const drawFrame = (idx) => {
            ctx.clearRect(0, 0, w, h)
            for (let i = 0; i <= idx; i++) {
              const f = plane12GifFrames[i]
              const d = f.dims
              const imgData = new ImageData(new Uint8ClampedArray(f.patch), d.width, d.height)
              ctx.putImageData(imgData, d.left, d.top)
            }
          }
          drawFrame(0)
          tex.needsUpdate = true
          plane12Mesh.material = new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: true,
          })
          plane12Mesh.visible = true
          plane12Mesh.renderOrder = 1
          plane12Mesh.rotation.x = Math.PI / 2
          if (plane12Mesh.parent) plane12Mesh.parent.visible = true
          console.log('🖼 pPlane12 GIF 적용 (gifuct-js, 프레임 수):', frames.length)
        })
        .catch((err) => console.warn('❌ pPlane12 GIF 로드/디코딩 실패:', gifUrl, err))
    } else if (plane12Mesh) {
      plane12Mesh = null
    }

    // pasted__pPlane12: 정적 이미지 (public/redsign/redsign.jpg)
    const pastedPlane12 = model.getObjectByName(PASTED_PLANE12_NAME) || getObjectByNameOrSuffix(model, PASTED_PLANE12_NAME)
    if (pastedPlane12 && pastedPlane12.isMesh) {
      pastedPlane12.visible = true
      if (pastedPlane12.parent) pastedPlane12.parent.visible = true
      const base =
        typeof window !== 'undefined' && window.location
          ? window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/?$/, '')
          : (import.meta.env.BASE_URL || '/').replace(/\/?$/, '')
      const urlsToTry = [base + '/redsign/redsign.jpg', base + '/redsign.jpg']
      const loader = new THREE.TextureLoader()
      const tryLoad = (idx) => {
        if (idx >= urlsToTry.length) {
          console.warn('❌ pasted__pPlane12 이미지 로드 실패. public/redsign/ 또는 public/redsign.jpg 확인')
          return
        }
        const imgUrl = urlsToTry[idx]
        loader.load(
          imgUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.minFilter = THREE.LinearFilter
            tex.magFilter = THREE.LinearFilter
            pastedPlane12.material = new THREE.MeshBasicMaterial({
              map: tex,
              side: THREE.DoubleSide,
              depthTest: true,
              depthWrite: true,
            })
            pastedPlane12.visible = true
            pastedPlane12.rotation.x = -Math.PI / 2
            console.log('🖼 pasted__pPlane12 이미지 적용:', imgUrl)
          },
          undefined,
          () => tryLoad(idx + 1)
        )
      }
      tryLoad(0)
    }

    cylinder17 = model.getObjectByName(CYL17_NAME)
    console.log('🧱 Cylinder17:', cylinder17 ? cylinder17.name : 'NOT FOUND')
    if (cylinder17) {
      cylinder17AxisKey = getUpAxisKey(cylinder17)
      cylinder17BasePos.copy(cylinder17.position)
      cyl17BaseScale.copy(cylinder17.scale)
      cyl17CurrentUpScale = 1
      cyl17TargetUpScale = 1

      const cyl40 = model.getObjectByName(CYL40_FOLLOW_NAME)
      if (cyl40 && cyl40 !== cylinder17) {
        attachKeepWorld(cylinder17, cyl40)
        model.updateMatrixWorld(true)
        cyl40.updateMatrixWorld(true)
        cyl40.matrixWorld.decompose(_tmpWP, _tmpWQ, cylinder40BaseWorldScale)
        cylinder40Follow = cyl40
        console.log('🔗 Cylinder40 follows Cylinder17, scale preserved:', cylinder40BaseWorldScale.toArray().map((v) => v.toFixed(3)))
      }
      const pastedCyl6 = model.getObjectByName(PASTED_CYL6_FOLLOW_NAME) || getObjectByNameOrSuffix(model, PASTED_CYL6_FOLLOW_NAME)
      if (pastedCyl6 && pastedCyl6 !== cylinder17) {
        attachKeepWorld(cylinder17, pastedCyl6)
        console.log('🔗 pasted__Cylinder6 follows Cylinder17')
      }
    }

    circle1Mesh = model.getObjectByName(CIRCLE1_NAME)
    console.log('⚪ CIRCLE1:', circle1Mesh ? circle1Mesh.name : 'NOT FOUND')

    if (circle1Mesh) {
      const res = makeWorldBottomPivot(circle1Mesh, 'CIRCLE1_PIVOT_WORLD')
      circle1World = res.world
      circle1Pivot = res.pivot

      if (circle1Pivot) {
        circle1PivotBasePos.copy(circle1Pivot.position)
        circle1BasePivotScale.copy(circle1Pivot.scale)
        circle1MeshBaseLocalPos.copy(circle1Mesh.position)
      }
    }

    // 4축 관절: 축1(cyl26)·축2(cyl27)·축3(cyl70)·축4(cyl39). 선형 체인으로 축 이하가 함께 움직임.
    const cyl26 = model.getObjectByName(CYL26_FIXED_NAME)
    const cyl25 = model.getObjectByName(CYL25_JOINT_NAME)
    const cyl24 = model.getObjectByName(CYL24_NAME)
    const cyl32 = getObjectByNameOrSuffix(model, 'Cylinder32')
    const cyl33 = getObjectByNameOrSuffix(model, 'Cylinder33')
    const cyl28 = getObjectByNameOrSuffix(model, 'Cylinder28')
    const cyl71 = getObjectByNameOrSuffix(model, CYL71_ATTACHED_NAME)
    const cyl27 = model.getObjectByName(CYL27_JOINT_NAME)
    const cyl19 = model.getObjectByName(CYL19_FIXED_NAME)
    const cyl70 = getObjectByNameOrSuffix(model, CYL70_JOINT_NAME)
    const cyl18 = getObjectByNameOrSuffix(model, CYL18_NAME)
    const cyl39 = getObjectByNameOrSuffix(model, CYL39_JOINT_NAME)
    const cyl41 = getObjectByNameOrSuffix(model, CYL41_NAME)
    const cyl31 = getObjectByNameOrSuffix(model, CYL31_NAME)
    const cube8 = getObjectByNameOrSuffix(model, CUBE8_NAME)

    const chainOk =
      cyl24 &&
      cyl25 &&
      cyl26 &&
      cyl32 &&
      cyl33 &&
      cyl28 &&
      cyl71 &&
      cyl27 &&
      cyl19 &&
      cyl70 &&
      cyl18 &&
      cyl39
    if (chainOk) {
      model.updateMatrixWorld(true)

      function setHingeAxis(outVec, mesh, hinge, tiltX, tiltY, tiltZ) {
        if (hinge === 'world_x') outVec.set(1, 0, 0)
        else if (hinge === 'world_y') outVec.set(0, 1, 0)
        else if (hinge === 'world_z') outVec.set(0, 0, 1)
        else if (hinge === 'local_x' || hinge === 'local_y' || hinge === 'local_z') {
          const key = hinge.replace('local_', '')
          outVec.copy(getWorldAxis(mesh, key))
        } else {
          outVec.copy(getWorldAxis(mesh, getUpAxisKey(mesh)))
        }
        outVec.normalize()
        if (tiltX !== 0 || tiltY !== 0 || tiltZ !== 0) {
          const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, tiltY, tiltZ))
          outVec.applyQuaternion(tiltQ).normalize()
        }
      }

      // 축1: pivot1 @ cyl26, cyl25 회전 → cyl24 → cyl32 → cyl33 → cyl28 → cyl71
      const pivotParent = cyl26.parent
      if (pivotParent) {
        setHingeAxis(
          cyl25HingeAxisWorld,
          cyl26,
          CYL25_JOINT_HINGE,
          CYL25_HINGE_TILT_X,
          CYL25_HINGE_TILT_Y,
          CYL25_HINGE_TILT_Z
        )
        const worldPos1 =
          cube5Base && cube5Base !== cyl26
            ? getPivotWorldPosBetween(
                cyl26,
                cube5Base,
                CYL25_PIVOT_OFFSET_X,
                CYL25_PIVOT_OFFSET_Y,
                CYL25_PIVOT_OFFSET_Z
              )
            : (() => {
                cyl26.updateMatrixWorld(true)
                _tmpBox.setFromObject(cyl26)
                const p = new THREE.Vector3()
                _tmpBox.getCenter(p)
                p.x += CYL25_PIVOT_OFFSET_X
                p.y += CYL25_PIVOT_OFFSET_Y
                p.z += CYL25_PIVOT_OFFSET_Z
                return p
              })()
        pivotParent.updateMatrixWorld(true)
        pivotParent.worldToLocal(worldPos1)
        cyl25Pivot = new THREE.Object3D()
        cyl25Pivot.name = 'CYL25_JOINT_PIVOT'
        cyl25Pivot.position.copy(worldPos1)
        pivotParent.add(cyl25Pivot)
        cyl25Pivot.updateMatrixWorld(true)
        attachKeepWorld(cyl25Pivot, cyl25)
        cyl25Pivot.getWorldQuaternion(cyl25PivotBaseWorldQuat)
        attachKeepWorld(cyl25, cyl24)
        attachKeepWorld(cyl24, cyl32)
        attachKeepWorld(cyl32, cyl33)
        attachKeepWorld(cyl33, cyl28)
        attachKeepWorld(cyl28, cyl71)
      }

      // 축2: pivot2 @ Cylinder27 중앙, cyl27 회전 → cyl19
      cyl27.updateMatrixWorld(true)
      _tmpBox.setFromObject(cyl27)
      const worldPos2 = _tmpBox.getCenter(new THREE.Vector3())
      worldPos2.x += CYL27_PIVOT_OFFSET_X
      worldPos2.y += CYL27_PIVOT_OFFSET_Y
      worldPos2.z += CYL27_PIVOT_OFFSET_Z
      cyl71.updateMatrixWorld(true)
      const local2 = worldPos2.clone()
      cyl71.worldToLocal(local2)
      cyl27Pivot = new THREE.Object3D()
      cyl27Pivot.name = 'CYL27_JOINT_PIVOT'
      cyl27Pivot.position.copy(local2)
      cyl71.add(cyl27Pivot)
      cyl27Pivot.updateMatrixWorld(true)
      attachKeepWorld(cyl27Pivot, cyl27)
      cyl27Pivot.getWorldQuaternion(cyl27PivotBaseWorldQuat)
      setHingeAxis(
        cyl27HingeAxisWorld,
        cyl27,
        CYL27_JOINT_HINGE,
        CYL27_HINGE_TILT_X,
        CYL27_HINGE_TILT_Y,
        CYL27_HINGE_TILT_Z
      )
      attachKeepWorld(cyl27, cyl19)

      // 축3: Cylinder27·Cylinder19 용접(축2로 같이 회전). 19 → pivot3 → 70 → 18…
      cyl70.updateMatrixWorld(true)
      _tmpBox.setFromObject(cyl70)
      const worldPos3 = _tmpBox.getCenter(new THREE.Vector3())
      const cyl70UpKey = getUpAxisKey(cyl70)
      worldPos3[cyl70UpKey] = _tmpBox.max[cyl70UpKey]
      worldPos3.x += CYL70_PIVOT_OFFSET_X
      worldPos3.y += CYL70_PIVOT_OFFSET_Y
      worldPos3.z += CYL70_PIVOT_OFFSET_Z
      cyl19.updateMatrixWorld(true)
      const local3 = worldPos3.clone()
      cyl19.worldToLocal(local3)
      cyl70Pivot = new THREE.Object3D()
      cyl70Pivot.name = 'CYL70_JOINT_PIVOT'
      cyl70Pivot.position.copy(local3)
      cyl19.add(cyl70Pivot)
      cyl70Pivot.updateMatrixWorld(true)
      attachKeepWorld(cyl70Pivot, cyl70)
      cyl70Pivot.getWorldQuaternion(cyl70PivotBaseWorldQuat)
      setHingeAxis(
        cyl70HingeAxisWorld,
        cyl70,
        CYL70_JOINT_HINGE,
        CYL70_HINGE_TILT_X,
        CYL70_HINGE_TILT_Y,
        CYL70_HINGE_TILT_Z
      )
      attachKeepWorld(cyl70, cyl18)

      // 축4: pivot4 @ Cylinder39 중앙
      cyl39.updateMatrixWorld(true)
      _tmpBox.setFromObject(cyl39)
      const worldPos4 = _tmpBox.getCenter(new THREE.Vector3())
      worldPos4.x += CYL39_PIVOT_OFFSET_X
      worldPos4.y += CYL39_PIVOT_OFFSET_Y
      worldPos4.z += CYL39_PIVOT_OFFSET_Z
      cyl18.updateMatrixWorld(true)
      const local4 = worldPos4.clone()
      cyl18.worldToLocal(local4)
      cyl39Pivot = new THREE.Object3D()
      cyl39Pivot.name = 'CYL39_JOINT_PIVOT'
      cyl39Pivot.position.copy(local4)
      cyl18.add(cyl39Pivot)
      cyl39Pivot.updateMatrixWorld(true)
      attachKeepWorld(cyl39Pivot, cyl39)
      cyl39Pivot.getWorldQuaternion(cyl39PivotBaseWorldQuat)
      setHingeAxis(
        cyl39HingeAxisWorld,
        cyl39,
        CYL39_JOINT_HINGE,
        CYL39_HINGE_TILT_X,
        CYL39_HINGE_TILT_Y,
        CYL39_HINGE_TILT_Z
      )
      if (cyl41) attachKeepWorld(cyl39, cyl41)
      if (cyl31) attachKeepWorld(cyl39, cyl31)
      if (cube8) {
        attachKeepWorld(cyl39, cube8)
        ;['pasted__pasted__PIN13', 'pasted__pasted__pasted__PIN13', 'Cylinder21', 'CUBE9'].forEach((name) => {
          const obj = model.getObjectByName(name)
          if (obj && obj !== cube8) {
            attachKeepWorld(cube8, obj)
            console.log('🔗', name, 'follows CUBE8')
          }
        })
        const cube9 = getObjectByNameOrSuffix(model, 'CUBE9')
        if (typeMesh1Object && cube9) {
          attachKeepWorld(cube9, typeMesh1Object)
          typeMesh1RestLocalPos = typeMesh1Object.position.clone()
          typeMesh1RestLocalQuat = typeMesh1Object.quaternion.clone()
          typeMesh1RestLocalScale = typeMesh1Object.scale.clone()
          console.log('🔗 typeMesh1 follows CUBE9 (로컬 위치·회전·스케일 마야 그대로 유지)')
        }
      }
      const cyl34 = getObjectByNameOrSuffix(model, CYL34_FOLLOW_NAME)
      if (cyl34 && cyl41 && cyl34 !== cyl41) {
        attachKeepWorld(cyl41, cyl34)
        console.log('🔗 Cylinder34 follows Cylinder41')
      }

      // Cylinder26은 CUBE5_BASE에 붙이지 않음 → 풍선 밀림 시 같이 밀리지 않음
      console.log('🔗 4축 관절 체인: 축1→25→24→32→33→28→71→축2→27→19→축3→70→18→축4→39→41,31,CUBE8')

      function addAxisHelper(name, color, axisWorld, pointSize, lineLength) {
        const g = new THREE.Group()
        g.name = name
        g.visible = false
        const pointGeom = new THREE.SphereGeometry(pointSize, 12, 8)
        const pointMat = new THREE.MeshBasicMaterial({ color })
        g.add(new THREE.Mesh(pointGeom, pointMat))
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(axisWorld.x * lineLength, axisWorld.y * lineLength, axisWorld.z * lineLength),
        ])
        g.add(new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color })))
        scene.add(g)
        return g
      }
      cyl25AxisHelper = addAxisHelper(
        'CYL25_AXIS_HELPER',
        0xff2222,
        cyl25HingeAxisWorld,
        CYL25_AXIS_POINT_SIZE,
        CYL25_AXIS_LINE_LENGTH
      )
      cyl27AxisHelper = addAxisHelper(
        'CYL27_AXIS_HELPER',
        0x22ff22,
        cyl27HingeAxisWorld,
        CYL27_AXIS_POINT_SIZE,
        CYL27_AXIS_LINE_LENGTH
      )
      cyl70AxisHelper = addAxisHelper(
        'CYL70_AXIS_HELPER',
        0x2222ff,
        cyl70HingeAxisWorld,
        CYL27_AXIS_POINT_SIZE,
        CYL27_AXIS_LINE_LENGTH
      )
      cyl39AxisHelper = addAxisHelper(
        'CYL39_AXIS_HELPER',
        0xffff22,
        cyl39HingeAxisWorld,
        CYL27_AXIS_POINT_SIZE,
        CYL27_AXIS_LINE_LENGTH
      )
    }

    balloonMesh = model.getObjectByName(BALLOON_NAME)
    console.log('🎈 balloon:', balloonMesh ? balloonMesh.name : 'NOT FOUND')

    if (balloonMesh) {
      const parent = balloonMesh.parent || model

      balloonPivot = new THREE.Object3D()
      balloonPivot.name = 'BALLOON_PIVOT_FIXED'
      parent.add(balloonPivot)

      balloonPivot.attach(balloonMesh)

      balloonPivot.updateMatrixWorld(true)
      _tmpBox.setFromObject(balloonMesh)
      _tmpBox.getCenter(_tmpCenterW)
      _tmpLocal.copy(_tmpCenterW)
      balloonPivot.worldToLocal(_tmpLocal)

      balloonPivot.position.add(_tmpLocal)
      balloonMesh.position.sub(_tmpLocal)

      balloonBasePivotScale.copy(balloonPivot.scale)
      balloonUpAxisKey = getUpAxisKey(balloonPivot)
      balloonPlanesGroup = new THREE.Object3D()
      balloonPlanesGroup.name = 'BALLOON_PLANES_GROUP'
      balloonPivot.add(balloonPlanesGroup)
      BALLOON_PLANES_OFFSETS.forEach(({ name: nm }) => {
        const plane = model.getObjectByName(nm)
        if (plane && plane !== balloonMesh) {
          attachKeepWorld(balloonPlanesGroup, plane)
          balloonPlaneBasePos.set(nm, plane.position.clone())
          console.log('🎈 balloon planes (균일 스케일):', nm)
        }
      })
      console.log('🎈 balloon pivot ready. up-axis =', balloonUpAxisKey)
    }

    function registerPushTarget(obj, axis, max, sign) {
      if (!obj) return
      pushMeshes.push(obj)
      pushBasePos.set(obj.uuid, obj.position.clone())
      pushMaxByUuid.set(obj.uuid, U(max))
      pushAxisByUuid.set(obj.uuid, axis)
      pushSignByUuid.set(obj.uuid, sign)
    }

    BALLOON_PUSH_RULES.forEach((rule) => {
      const { name, axis, max, sign } = rule

      if (name === 'CIRCLE1') return

      const m = model.getObjectByName(name)
      console.log('🧱 push target lookup:', name, '=>', !!m)
      registerPushTarget(m, axis, max, sign)
    })

    BALLOON_PIN_PUSH_RULES.forEach((rule) => {
      const { name, axis, max, sign } = rule
      const m = model.getObjectByName(name)
      console.log('📌 pin push target lookup:', name, '=>', !!m)
      registerPushTarget(m, axis, max, sign)
    })

    if (circle1World) {
      const rule = BALLOON_PUSH_RULES.find((r) => r.name === 'CIRCLE1')
      if (rule) {
        circle1World.name = 'CIRCLE1_WORLDCONTAINER'
        console.log('⚪ CIRCLE1 push via world container:', circle1World.name)
        registerPushTarget(circle1World, rule.axis, rule.max, rule.sign)
      }
    }

    const cyl8 = model.getObjectByName('Cylinder8')
    if (cyl8) {
      // CUBE5_BASE(pasted__pasted__CUBE5_BASE)는 애니메이션만 적용 → Cylinder8에 붙이지 않음
      if (cube5Base && cube5Base !== cyl8) {
        // 호버 시에만 morph 적용하는 오브젝트이므로 Cylinder8 따라붙임 생략
        console.log('🔗 CUBE5_BASE(pasted__pasted__CUBE5_BASE) → Cylinder8 따라붙임 생략')
      }
      const cyl1 = model.getObjectByName('pasted__Cylinder1')
      if (cyl1 && cyl1 !== cyl8) {
        attachKeepWorld(cyl8, cyl1)
        console.log('🔗 pasted__Cylinder1 follows Cylinder8 (기본 위치 유지하며 밀림)')
      }
    }

    const cube10 = model.getObjectByName('pasted__CUBE10')
    if (cube10) {
      const cyl1_1 = model.getObjectByName('pasted__pasted__Cylinder1_(1)')
      if (cyl1_1 && cyl1_1 !== cube10) {
        attachKeepWorld(cube10, cyl1_1)
        console.log('🔗 pasted__pasted__Cylinder1_(1) follows pasted__CUBE10 (같이 밀림)')
      }
    }

    BALLOON_LIFT_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      console.log('⬆️ lift target lookup:', nm, '=>', !!m)
      if (!m) return

      liftMeshes.push(m)
      liftBasePos.set(m.uuid, m.position.clone())

      const parent = m.parent
      parent.updateMatrixWorld(true)

      _invRot.extractRotation(parent.matrixWorld).invert()
      _tmpDir.copy(WORLD_UP).applyMatrix4(_invRot).normalize()
      liftDirLocal.set(m.uuid, _tmpDir.clone())
    })

    BALLOON_DROP_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      console.log('⬇️ drop target lookup:', nm, '=>', !!m)
      if (!m) return

      dropMeshes.push(m)
      dropBasePos.set(m.uuid, m.position.clone())

      const parent = m.parent
      parent.updateMatrixWorld(true)

      _invRot.extractRotation(parent.matrixWorld).invert()
      _tmpDir.copy(WORLD_UP).applyMatrix4(_invRot).normalize()
      dropDirLocal.set(m.uuid, _tmpDir.clone())
    })

    if (socketTest) {
      let names = []
      if (DEFAULT_ATTACHED_TO_SOCKET.length) {
        names = [...DEFAULT_ATTACHED_TO_SOCKET]
        console.log('📌 DEFAULT_ATTACHED_TO_SOCKET 사용 (코드 고정 목록):', names.length, '개')
      } else {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length) names = parsed
          }
        } catch (err) {
          console.warn('❌ Failed to parse saved attach list:', err)
        }
      }
      if (names.length) {
        names.forEach((name) => {
          const obj = model.getObjectByName(name)
          if (!obj) return

          if (!originalState.has(obj.uuid)) {
            originalState.set(obj.uuid, {
              parent: obj.parent,
              pos: obj.position.clone(),
              quat: obj.quaternion.clone(),
              scale: obj.scale.clone(),
            })
          }

          socketTest.attach(obj)

          if (obj.name === CYL17_NAME) {
            cylinder17BasePos.copy(obj.position)
            cylinder17AxisKey = getUpAxisKey(obj)

            cyl17BaseScale.copy(obj.scale)
            cyl17CurrentUpScale = 1
            cyl17TargetUpScale = 1

            cyl17CurrentOffset = 0
            cyl17TargetOffset = 0
            cyl17Time = 0
            cyl17Started = false
            prevHoverCylinder17 = false
          }
        })

        const attachedNames = socketTest.children.map((c) => c.name).filter(Boolean)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attachedNames))

        console.log('✅ restored attached to socket:', attachedNames)
      }
      // 콘솔에서 getDefaultAttachCode() 실행 시 현재 부착 목록을 코드 문자열로 반환 → main.js의 DEFAULT_ATTACHED_TO_SOCKET에 붙여넣기
      if (typeof window !== 'undefined') {
        window.getDefaultAttachCode = function () {
          if (!socketTest) return 'socketTest not ready'
          const names = socketTest.children.map((c) => c.name).filter(Boolean)
          return 'const DEFAULT_ATTACHED_TO_SOCKET = ' + JSON.stringify(names, null, 2)
        }
      }
    }

    {
      const p12 = model.getObjectByName('pasted__CUBE12')
      PIN_ATTACH.cube12.forEach((nm) => {
        const pin = model.getObjectByName(nm)
        if (p12 && pin) attachKeepWorld(p12, pin)
      })

      const p10 = model.getObjectByName('pasted__CUBE10')
      PIN_ATTACH.cube10.forEach((nm) => {
        const pin = model.getObjectByName(nm)
        if (p10 && pin) attachKeepWorld(p10, pin)
      })

      const p11 = model.getObjectByName('pasted__CUBE11')
      PIN_ATTACH.cube11.forEach((nm) => {
        const pin = model.getObjectByName(nm)
        if (p11 && pin) attachKeepWorld(p11, pin)
      })
    }

    model.updateMatrixWorld(true)

    const cableColliders = []
    model.traverse((o) => {
      if (CABLE_COLLIDER_NAMES.includes(o.name)) cableColliders.push(o)
    })
    if (cableColliders.length === 0) {
      CABLE_COLLIDER_NAMES.forEach((nm) => {
        const obj = model.getObjectByName(nm)
        if (obj) cableColliders.push(obj)
      })
    }
    if (cableColliders.length) console.log('🔷 cable colliders:', cableColliders.length, '개:', cableColliders.map((o) => o.name))

    {
      const cableA = model.getObjectByName(CABLE_A_NAME)
      const cableB = model.getObjectByName(CABLE_B_NAME)
      console.log('🧷 cable#1 endpoints:', CABLE_A_NAME, '=>', !!cableA, '/', CABLE_B_NAME, '=>', !!cableB)

      if (cableA && cableB) {
        cableAnchorA = createSurfaceAnchorWithOffset(cableA, cableB, UV(CABLE_A_OFFSET_LOCAL), 'CABLE_ANCHOR_A')
        cableAnchorB = createSurfaceAnchorWithOffset(cableB, cableA, UV(CABLE_B_OFFSET_LOCAL), 'CABLE_ANCHOR_B')

        cable = new Cable({
          startObj: cableAnchorA,
          endObj: cableAnchorB,
          segments: 50,
          radius: U(0.3),
          slack: 1.5,
          gravity: U(1.5),
          damping: 0.93,
          iterations: 12,
          parent: scene,
          colliders: cableColliders,
        })

        console.log('✅ cable#1 created.')
      }
    }

    rubberMesh = model.getObjectByName(RUBBER_TARGET_NAME)
    console.log('🧽 rubber target:', rubberMesh ? rubberMesh.name : 'NOT FOUND')

    if (rubberMesh) {
      const parent = rubberMesh.parent || model

      rubberPivot = new THREE.Object3D()
      rubberPivot.name = 'RUBBER_PIVOT_LEFT'
      parent.add(rubberPivot)

      rubberPivot.attach(rubberMesh)

      rubberRightAxisKey = getAxisKeyClosestToWorld(rubberPivot, WORLD_RIGHT)

      rubberPivot.updateMatrixWorld(true)
      const bbW = new THREE.Box3().setFromObject(rubberMesh)
      const szW = bbW.getSize(new THREE.Vector3())
      const lenW = rubberRightAxisKey === 'x' ? szW.x : rubberRightAxisKey === 'y' ? szW.y : szW.z

      parent.updateMatrixWorld(true)
      _invRot2.extractRotation(parent.matrixWorld).invert()
      const rightDirLocal = WORLD_RIGHT.clone().applyMatrix4(_invRot2).normalize()
      const leftOffsetLocal = rightDirLocal.clone().multiplyScalar(-lenW * 0.5)

      rubberPivot.position.add(leftOffsetLocal)
      rubberMesh.position.sub(leftOffsetLocal)

      rubberBasePivotScale.copy(rubberPivot.scale)
      rubberBasePivotQuat.copy(rubberPivot.quaternion)

      _invRot2.extractRotation(parent.matrixWorld).invert()
      rubberAxisLocal.copy(WORLD_PULL_AXIS).applyMatrix4(_invRot2).normalize()
    }

    {
      const cable2A = model.getObjectByName(CABLE2_A_NAME)
      const cable2B = model.getObjectByName(CABLE2_B_NAME)
      console.log('🧷 cable#2 endpoints:', CABLE2_A_NAME, '=>', !!cable2A, '/', CABLE2_B_NAME, '=>', !!cable2B)

      if (cable2A && cable2B) {
        cable2AnchorA = createSurfaceAnchorWithOffset(cable2A, cable2B, UV(CABLE2_A_OFFSET_LOCAL), 'CABLE2_ANCHOR_A')
        cable2AnchorB = createSurfaceAnchorWithOffset(cable2B, cable2A, UV(CABLE2_B_OFFSET_LOCAL), 'CABLE2_ANCHOR_B')

        cable2 = new Cable({
          startObj: cable2AnchorA,
          endObj: cable2AnchorB,
          segments: 50,
          radius: U(0.3),
          slack: 2.5,
          gravity: U(8),
          damping: 0.93,
          iterations: 20,
          parent: scene,
          colliders: cableColliders,
        })

        console.log('✅ cable#2 created.')
      }
    }

    {
      const cable3A = model.getObjectByName(CABLE3_A_NAME)
      const cable3B = model.getObjectByName(CABLE3_B_NAME)
      console.log('🧷 cable#3 endpoints:', CABLE3_A_NAME, '=>', !!cable3A, '/', CABLE3_B_NAME, '=>', !!cable3B)

      if (cable3A && cable3B) {
        cable3AnchorA = createSurfaceAnchorWithOffset(cable3A, cable3B, UV(CABLE3_A_OFFSET_LOCAL), 'CABLE3_ANCHOR_A')
        cable3AnchorB = createSurfaceAnchorWithOffset(cable3B, cable3A, UV(CABLE3_B_OFFSET_LOCAL), 'CABLE3_ANCHOR_B')

        cable3 = new Cable({
          startObj: cable3AnchorA,
          endObj: cable3AnchorB,
          segments: 45,
          radius: U(0.22),
          slack: 1.6,
          gravity: U(2.4),
          damping: 0.93,
          iterations: 14,
          parent: scene,
          colliders: cableColliders,
        })

        console.log('✅ cable#3 created.')
      }
    }

    {
      const cable4A = model.getObjectByName(CABLE4_A_NAME)
      const cable4B = model.getObjectByName(CABLE4_B_NAME)
      console.log('🧷 cable#4 endpoints:', CABLE4_A_NAME, '=>', !!cable4A, '/', CABLE4_B_NAME, '=>', !!cable4B)

      if (cable4A && cable4B) {
        cable4AnchorA = createSurfaceAnchorWithOffset(cable4A, cable4B, UV(CABLE4_A_OFFSET_LOCAL), 'CABLE4_ANCHOR_A')
        cable4AnchorB = createSurfaceAnchorWithOffset(cable4B, cable4A, UV(CABLE4_B_OFFSET_LOCAL), 'CABLE4_ANCHOR_B')

        cable4 = new Cable({
          startObj: cable4AnchorA,
          endObj: cable4AnchorB,
          colliders: cableColliders,
          segments: 45,
          radius: U(0.22),
          slack: 1.6,
          gravity: U(2.4),
          damping: 0.93,
          iterations: 14,
          parent: scene,
        })

        console.log('✅ cable#4 created.')
      }
    }

      setLoadingStatus(false)
      notifyReactiveObjectReady()
    } catch (e) {
      console.error('Model setup error:', e)
      setLoadingStatus(true, '모델 설정 중 오류 — 콘솔(F12) 확인')
      notifyReactiveObjectReady()
    }
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100))
      setLoadingStatus(true, `모델 다운로드 ${pct}%`)
    } else {
      setLoadingStatus(true, `모델 다운로드 ${(xhr.loaded / 1048576).toFixed(1)} MB …`)
    }
  },
  (err) => {
    console.error('GLTF load error:', err)
    setLoadingStatus(true, '모델을 불러오지 못했습니다. 네트워크·경로·용량을 확인하세요.')
  }
)

/* =========================================================
   9) Shift+클릭 선택 / Enter 확정 attach / Backspace 원복
========================================================= */
const selectedMeshes = new Set()
const originalState = new Map()

function isSelectable(mesh) {
  const n = mesh?.name || ''
  if (!mesh || !mesh.isMesh) return false
  if (n === POLE_NAME) return false
  if (n === SOCKET_NAME) return false
  if (n === BOUNCE_MESH_NAME) return false
  return true
}

function setSelectedVisual(mesh, on) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  mats.forEach((mat) => {
    if (!mat) return
    if ('emissive' in mat) {
      mat.emissive = new THREE.Color(on ? 0x4aa3ff : 0x000000)
      mat.emissiveIntensity = on ? 0.35 : 0.0
      mat.needsUpdate = true
    }
  })
}

function toggleSelect(mesh) {
  if (selectedMeshes.has(mesh)) {
    selectedMeshes.delete(mesh)
    setSelectedVisual(mesh, false)
  } else {
    selectedMeshes.add(mesh)
    setSelectedVisual(mesh, true)
  }
}

window.addEventListener('click', (e) => {
  if (!model || !allMeshes.length) return
  if (!e.shiftKey) return

  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(allMeshes, true)
  if (!hits.length) return

  console.log(
    '🧲 hits:',
    hits
      .slice(0, 10)
      .map((h) => h.object?.name)
      .filter(Boolean)
  )

  const picked = hits.map((h) => h.object).find((o) => isSelectable(o))
  if (!picked) {
    console.log('⚠️ selectable hit 없음')
    return
  }

  toggleSelect(picked)
  const names = [...selectedMeshes].map((m) => m.name)
  console.log('✅ selected toggled:', picked.name, '| 현재 선택된 전체:', names.length ? names : '(없음)')
})

window.addEventListener('keydown', (e) => {
  if (!model || !socketTest) return

  if (e.key === 'Enter') {
    if (selectedMeshes.size === 0) return

    selectedMeshes.forEach((m) => {
      if (!originalState.has(m.uuid)) {
        originalState.set(m.uuid, {
          parent: m.parent,
          pos: m.position.clone(),
          quat: m.quaternion.clone(),
          scale: m.scale.clone(),
        })
      }

      socketTest.attach(m)
      setSelectedVisual(m, false)

      if (m.name === CYL17_NAME) {
        cylinder17BasePos.copy(m.position)
        cylinder17AxisKey = getUpAxisKey(m)

        cyl17BaseScale.copy(m.scale)
        cyl17CurrentUpScale = 1
        cyl17TargetUpScale = 1

        cyl17CurrentOffset = 0
        cyl17TargetOffset = 0
        cyl17Time = 0
        cyl17Started = false
        prevHoverCylinder17 = false
      }
    })

    const attachedNames = socketTest.children.map((c) => c.name).filter(Boolean)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attachedNames))
    selectedMeshes.clear()
    console.log('✅ attached to socket. saved:', attachedNames)
  }

  if (e.key === 'Backspace') {
    e.preventDefault()
    if (selectedMeshes.size === 0) return

    selectedMeshes.forEach((m) => {
      const st = originalState.get(m.uuid)
      if (!st || !st.parent) return

      st.parent.attach(m)
      m.position.copy(st.pos)
      m.quaternion.copy(st.quat)
      m.scale.copy(st.scale)

      if (m.name === CYL17_NAME) {
        cylinder17BasePos.copy(m.position)
        cylinder17AxisKey = getUpAxisKey(m)

        cyl17BaseScale.copy(m.scale)
        cyl17CurrentUpScale = 1
        cyl17TargetUpScale = 1

        cyl17CurrentOffset = 0
        cyl17TargetOffset = 0
        cyl17Time = 0
        cyl17Started = false
        prevHoverCylinder17 = false
      }

      originalState.delete(m.uuid)
      setSelectedVisual(m, false)
    })

    const attachedNames = socketTest.children.map((c) => c.name).filter(Boolean)
    if (attachedNames.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(attachedNames))
    else localStorage.removeItem(STORAGE_KEY)
    selectedMeshes.clear()
    console.log('↩️ 선택한 개체만 소켓에서 해제. 남은 부착:', attachedNames.length ? attachedNames : '(없음)')
  }

  if (e.key === 'Delete' || e.key.toLowerCase() === 'x') {
    e.preventDefault()
    if (selectedMeshes.size === 0) return

    selectedMeshes.forEach((m) => {
      const st = originalState.get(m.uuid)
      if (!st || !st.parent) return

      st.parent.attach(m)
      m.position.copy(st.pos)
      m.quaternion.copy(st.quat)
      m.scale.copy(st.scale)

      if (m.name === CYL17_NAME) {
        cylinder17BasePos.copy(m.position)
        cylinder17AxisKey = getUpAxisKey(m)

        cyl17BaseScale.copy(m.scale)
        cyl17CurrentUpScale = 1
        cyl17TargetUpScale = 1

        cyl17CurrentOffset = 0
        cyl17TargetOffset = 0
        cyl17Time = 0
        cyl17Started = false
        prevHoverCylinder17 = false
      }

      originalState.delete(m.uuid)
      setSelectedVisual(m, false)
    })

    const attachedNames = socketTest.children.map((c) => c.name).filter(Boolean)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attachedNames))

    selectedMeshes.clear()
    console.log('🧹 detached selected meshes. saved:', attachedNames)
  }
})

/* =========================================================
   10) 애니메이션 루프
========================================================= */
let _prevT = performance.now()
/** LIGHT1/2/3 호버 시 재생용. public/sound/light-hover.mp3 */
const lightHoverSound = new Audio(LIGHT_HOVER_SOUND_URL)
lightHoverSound.preload = 'none'
let _prevHoverLightName = null
let _prevHoverPole = false
/** 자동 순차 점등: 현재 인덱스(0=LIGHT1, 1=LIGHT2, 2=LIGHT3), 다음 전환 시각(초), 호버 시 일시정지 끝 시각 */
let autoLightIndex = 0
let autoLightNextTime = 0
let autoLightHoverPauseUntil = 0
let _prevHasAnyHover = false
/** 풍선(pasted__Cylinder5) 호버 시 재생용 */
const balloonHoverSound = new Audio(BALLOON_HOVER_SOUND_URL)
balloonHoverSound.preload = 'none'
let _prevHoverBalloon = false
/** CUBE5_BASE 모프 시 재생용 */
const cube5HongikSound = new Audio(CUBE5_HONGIK_SOUND_URL)
cube5HongikSound.preload = 'none'
let _prevHoverCube5Base = false
/** CUBE8(로봇팔) 호버 시 재생용 */
const robotSound = new Audio(ROBOT_SOUND_URL)
robotSound.preload = 'none'
/** CIRCLE1 호버 시 재생용 */
const popballSound = new Audio(POPBALL_SOUND_URL)
popballSound.preload = 'none'
/** 호버 사운드/트리거 연속 재생 방지. 이 시간(ms) 지나야 다시 재생 */
const HOVER_COOLDOWN_MS = 450
let _lastHoverSoundTime = 0
/** 브라우저 정책: 한 번이라도 사용자 클릭 후에만 소리 재생 가능 */
let _lightSoundUnlocked = false
function unlockLightHoverSound() {
  if (_lightSoundUnlocked) return
  _lightSoundUnlocked = true
  lightHoverSound.volume = 1
  balloonHoverSound.volume = 1
  cube5HongikSound.volume = 1
  robotSound.volume = 1
  popballSound.volume = 1
  const p = lightHoverSound.play()
  if (p && typeof p.then === 'function') {
    p.then(() => { lightHoverSound.pause(); lightHoverSound.currentTime = 0 }).catch(() => {})
  }
}
lightHoverSound.addEventListener('error', () => {
  console.warn('🔇 light-hover 사운드 로드 실패. 경로 확인: ', LIGHT_HOVER_SOUND_URL)
})
balloonHoverSound.addEventListener('error', () => {
  console.warn('🔇 balloon-hover 사운드 로드 실패. 경로 확인: ', BALLOON_HOVER_SOUND_URL)
})
cube5HongikSound.addEventListener('error', () => {
  console.warn('🔇 hongiksound 로드 실패. 경로 확인: ', CUBE5_HONGIK_SOUND_URL)
})
robotSound.addEventListener('error', () => {
  console.warn('🔇 robotsound 로드 실패. 경로 확인: ', ROBOT_SOUND_URL)
})
popballSound.addEventListener('error', () => {
  console.warn('🔇 popball 로드 실패. 경로 확인: ', POPBALL_SOUND_URL)
})
window.addEventListener('click', unlockLightHoverSound, { once: true })
window.addEventListener('pointerdown', unlockLightHoverSound, { once: true })

window.addEventListener('click', (e) => {
  if (e.shiftKey) return
  if (!model || !allMeshes.length) return
  const ndcX = (e.clientX / window.innerWidth) * 2 - 1
  const ndcY = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  const hits = raycaster.intersectObjects(allMeshes, true)
  if (hits[0] && hits[0].object.name === 'pasted__LIGHT2') {
    pastedLight2LightOn = !pastedLight2LightOn
  }
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  syncLightPositionsFromConfig()
  syncBulbLightPositions()

  const now = performance.now()
  const dt = (now - _prevT) / 1000
  _prevT = now

  // CUBE5_BASE(마야 morph/typeMesh1)는 호버할 때만 애니메이션 재생 → mixer는 호버 시에만 갱신 (아래에서 처리)

  // LIGHT1/2/3: 애니메이션이 재질·가시성을 덮어써도 우리가 적용한 조명이 유지되도록 mixer 직후에 다시 적용
  if (model && lightMeshes.size) {
    const lightNames = ['LIGHT1', 'LIGHT2', 'LIGHT3']
    lightNames.forEach((name) => {
      const m = lightMeshes.get(name)
      if (m) m.visible = true
    })
  }

  // pPlane12: GIF 애니메이션 (gifuct-js 디코딩 프레임을 캔버스에 재생)
  if (plane12GifTexture && plane12GifCtx && plane12GifFrames.length) {
    const now = performance.now()
    if (now >= plane12GifNextFrameTime) {
      const f = plane12GifFrames[plane12GifFrameIndex]
      plane12GifNextFrameTime = now + (f.delay || 50)
      plane12GifFrameIndex = (plane12GifFrameIndex + 1) % plane12GifFrames.length
      plane12GifCtx.clearRect(0, 0, plane12GifWidth, plane12GifHeight)
      for (let i = 0; i <= plane12GifFrameIndex; i++) {
        const fr = plane12GifFrames[i]
        const d = fr.dims
        plane12GifCtx.putImageData(
          new ImageData(new Uint8ClampedArray(fr.patch), d.width, d.height),
          d.left,
          d.top
        )
      }
      plane12GifTexture.needsUpdate = true
    }
  }

  if (model && allMeshes.length) {
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(allMeshes, true)

    let hoverPole = false
    let hoverLightName = null
    let hoverBalloon = false
    let hoverRubber = false
    let hoverCube5Base = false
    let hoverTypeMesh1 = false
    let hoverCylinder17 = false
    let hoverCircle1 = false
    let hoverCUBE8Chain = false
    // 가장 가까운 첫 번째 히트만 사용해, 레이가 물체를 통과해 여러 개가 동시에 반응하는 것 방지
    const first = hits[0]
    if (first?.object) {
      const n = first.object.name || ''
      if (n === POLE_NAME) hoverPole = true
      else if (n === 'Cylinder6' || n === 'pasted__Cylinder6' || n === 'Cylinder7' || n === 'pasted__Cylinder7') hoverPole = true
      else if (LIGHT_NAMES.includes(n)) hoverLightName = n
      else if (n === 'pasted__LIGHT2') hoverLightName = 'pasted__LIGHT2'
      else if (n === 'LIGHT1' || n.endsWith('_LIGHT1')) hoverLightName = 'LIGHT1'
      else if (n === 'LIGHT2' || n.endsWith('_LIGHT2')) hoverLightName = 'LIGHT2'
      else if (n === 'LIGHT3' || n.endsWith('_LIGHT3')) hoverLightName = 'LIGHT3'
      else if (BALLOON_HOVER_NAMES.includes(n)) hoverBalloon = true
      else if (n === RUBBER_TARGET_NAME) hoverRubber = true
      else if (n === CUBE5_BASE_NAME || n === PCUBE1_NAME || (n && n.includes('pCube1'))) hoverCube5Base = true
      else if (TYPE_MESH1_NAMES.includes(n) || (typeMesh1Object && first.object === typeMesh1Object) || (n && n.includes('typeMesh1'))) hoverTypeMesh1 = true
      else if (n === CYL17_NAME) hoverCylinder17 = true
      else if (n === CIRCLE1_NAME) hoverCircle1 = true
      else if (n === ROBOT_ARM_TRIGGER_NAME || n.endsWith('_' + ROBOT_ARM_TRIGGER_NAME) || n.endsWith(ROBOT_ARM_TRIGGER_NAME))
        hoverCUBE8Chain = true
    }

    // 전구: 평소엔 LIGHT_OFF_COLOR, 호버 시 밝게 + PointLight로 주변 비춤
    lightOnInfo.forEach(({ name, color }) => {
      const m = lightMeshes.get(name)
      const pt = lightPointLights.get(name)
      if (name === 'pasted__LIGHT2') {
        if (pastedLight2LightOn && pt) {
          pt.intensity = PASTED_LIGHT2_REAL_LIGHT.intensityOn
          pt.color.setHex(color)
          if (m) {
            const mats = Array.isArray(m.material) ? m.material : [m.material]
            mats.forEach((mat) => setLightColor(mat, color, LIGHT_ON_EMISSIVE_INTENSITY))
          }
        } else {
          if (pt) pt.intensity = 0
          if (m) {
            const mats = Array.isArray(m.material) ? m.material : [m.material]
            mats.forEach((mat) => setLightColor(mat, LIGHT_OFF_COLOR, 0))
          }
        }
        return
      }
      if (!m) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((mat) => setLightColor(mat, LIGHT_OFF_COLOR, 0))
      if (pt) pt.intensity = 0
    })

    // 모델 내 단 하나라도 호버되면 → 호버를 떠난 그 순간부터 5초간 자동 순차 점등 정지
    const hasAnyHover = !!(
      hoverLightName ||
      hoverPole ||
      hoverBalloon ||
      hoverRubber ||
      hoverCube5Base ||
      hoverTypeMesh1 ||
      hoverCylinder17 ||
      hoverCircle1 ||
      hoverCUBE8Chain
    )
    if (_prevHasAnyHover && !hasAnyHover) {
      autoLightHoverPauseUntil = now + AUTO_LIGHT_HOVER_PAUSE * 1000
    }
    _prevHasAnyHover = hasAnyHover

    const hasLightHoverSignal = !!(hoverLightName || hoverPole || hoverBalloon)

    if (hoverLightName) {
      if (hoverLightName !== _prevHoverLightName) {
        _prevHoverLightName = hoverLightName
        lightHoverSound.currentTime = 0
        lightHoverSound.play().catch(() => {})
      }
      const info = lightOnInfo.find((x) => x.name === hoverLightName)
      // 히트한 메쉬 이름으로 조회(실제 발광할 그 메쉬), 없으면 canonical 이름으로
      const hitName = first?.object?.name
      const mesh = lightMeshes.get(hitName) || lightMeshes.get(hoverLightName)
      const pt = lightPointLights.get(hitName) || lightPointLights.get(hoverLightName)
      if (info && mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const isPastedL2 = hoverLightName === 'pasted__LIGHT2'
        if (!isPastedL2 || pastedLight2LightOn) {
          mats.forEach((mat) => setLightColor(mat, info.color, LIGHT_ON_EMISSIVE_INTENSITY))
          if (pt) {
            // 호버 시 각 전구 앞에서 발광: 밝기·거리 적당히 (빛 범위 작게)
            const intensity = isPastedL2 ? PASTED_LIGHT2_REAL_LIGHT.intensityOn : 2.2
            pt.intensity = intensity
            pt.distance = 0.8 // 전구 주변 더 밝게
            pt.color.setHex(info.color)
          }
        }
        document.body.style.cursor = 'pointer'
      } else if (hoverLightName && !mesh) {
        // 호버는 감지됐는데 메쉬 없음 → 전구 미등록 가능성
        if (Math.floor(now / 1000) !== Math.floor((now - 16) / 1000)) {
          console.warn('🔦 호버됐지만 메쉬 없음:', hoverLightName, 'hitName:', first?.object?.name)
        }
      }
    } else {
      _prevHoverLightName = null
      document.body.style.cursor =
        hoverPole || hoverBalloon || hoverRubber || hoverCube5Base || hoverTypeMesh1 || hoverCylinder17 || hoverCircle1 || hoverCUBE8Chain
          ? 'pointer'
          : 'default'
    }

    // 폴 호버 시 LIGHT1에 불 들어옴 + 전구 호버 사운드 (LIGHT1 호버와 같은 효과)
    if (hoverPole) {
      if (!_prevHoverPole) {
        _prevHoverPole = true
        if (now - _lastHoverSoundTime >= HOVER_COOLDOWN_MS) {
          _lastHoverSoundTime = now
          lightHoverSound.currentTime = 0
          lightHoverSound.play().catch(() => {})
        }
      }
      const info = lightOnInfo.find((x) => x.name === 'LIGHT1')
      const mesh = lightMeshes.get('LIGHT1')
      if (info && mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => setLightColor(mat, info.color, LIGHT_ON_EMISSIVE_INTENSITY))
        const pt = lightPointLights.get('LIGHT1')
        if (pt) {
          pt.intensity = info.intensity ?? 3.5
          pt.color.setHex(info.color)
        }
      }
    } else {
      _prevHoverPole = false
    }

    if (hoverBalloon) {
      if (!_prevHoverBalloon) {
        _prevHoverBalloon = true
        if (now - _lastHoverSoundTime >= HOVER_COOLDOWN_MS) {
          _lastHoverSoundTime = now
          balloonHoverSound.currentTime = 0
          balloonHoverSound.play().catch(() => {})
          lightHoverSound.currentTime = 0
          lightHoverSound.play().catch(() => {})
        }
      }
      // 풍선(pasted__Cylinder5) 늘어날 때 LIGHT3 호버와 같은 효과
      const info = lightOnInfo.find((x) => x.name === 'LIGHT3')
      const mesh = lightMeshes.get('LIGHT3')
      if (info && mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => setLightColor(mat, info.color, LIGHT_ON_EMISSIVE_INTENSITY))
        const pt = lightPointLights.get('LIGHT3')
        if (pt) {
          pt.intensity = info.intensity ?? 3.5
          pt.color.setHex(info.color)
        }
      }
    } else {
      _prevHoverBalloon = false
    }

    // 호버 없을 때: LIGHT1 → LIGHT2 → LIGHT3 순서로 자동 점등. 호버 떠난 뒤 5초간은 LIGHT2(노란불)만 대기 신호
    if (!hasLightHoverSignal) {
      const nowSec = now / 1000
      if (autoLightNextTime === 0) autoLightNextTime = nowSec + AUTO_LIGHT_DURATIONS[0]
      const inStandby = now < autoLightHoverPauseUntil
      const pauseActive = hasAnyHover || inStandby
      if (!pauseActive) {
        if (nowSec >= autoLightNextTime) {
          autoLightIndex = (autoLightIndex + 1) % 3
          autoLightNextTime = nowSec + AUTO_LIGHT_DURATIONS[autoLightIndex]
        }
      }
      // 5초 대기 중이면 LIGHT2(노란불)만, 아니면 자동 순차 인덱스 불 — 빛 세기·거리는 호버 시와 동일
      const name = inStandby ? 'LIGHT2' : AUTO_LIGHT_CYCLE_NAMES[autoLightIndex]
      const info = lightOnInfo.find((x) => x.name === name)
      const mesh = lightMeshes.get(name)
      const pt = lightPointLights.get(name)
      if (info && mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => setLightColor(mat, info.color, LIGHT_ON_EMISSIVE_INTENSITY))
        if (pt) {
          pt.intensity = 2.2
          pt.distance = 0.8
          pt.color.setHex(info.color)
        }
      }
    }

    // typeMesh1: 호버 시 애니메이션 한 번 쭉 재생 (0.2초 쿨다운)
    if (modelMixer && modelMixerActions.length) {
      const typeMesh1CooldownOk = (now - typeMesh1LastTriggerTime) >= TYPE_MESH1_HOVER_COOLDOWN_SEC * 1000
      if (!prevHoverTypeMesh1 && hoverTypeMesh1 && typeMesh1CooldownOk) {
        typeMesh1LastTriggerTime = now
        modelMixerActions.forEach((a) => { a.reset(); a.time = 0; a.play(); })
        typeMesh1AnimationPlaying = true
      }
      prevHoverTypeMesh1 = hoverTypeMesh1
      if (typeMesh1AnimationPlaying) {
        modelMixer.update(dt)
      }
    }
    if (cube5Base && cube5MorphIndex >= 0 && cube5Base.morphTargetInfluences) {
      if (cube5MorphValue <= CUBE5_MORPH_REST_THRESHOLD) cube5HoverLocked = false
      const canTrigger = hoverCube5Base && !cube5HoverLocked
      if (!_prevHoverCube5Base && canTrigger && now - _lastHoverSoundTime >= HOVER_COOLDOWN_MS) {
        _lastHoverSoundTime = now
        cube5HongikSound.currentTime = 0
        cube5HongikSound.play().catch(() => {})
      }
      _prevHoverCube5Base = hoverCube5Base

      const target =
        hoverCube5Base && (cube5MorphValue > CUBE5_MORPH_REST_THRESHOLD || !cube5HoverLocked)
          ? CUBE5_MORPH_ON
          : CUBE5_MORPH_OFF
      if (hoverCube5Base && !cube5HoverLocked) cube5HoverLocked = true
      const acc = CUBE5_MORPH_BOUNCE_SPRING * (target - cube5MorphValue) - CUBE5_MORPH_BOUNCE_DAMPING * cube5MorphVelocity
      cube5MorphVelocity += acc * dt
      cube5MorphValue += cube5MorphVelocity * dt
      if (cube5MorphValue > 1) {
        cube5MorphValue = 1
        if (cube5MorphVelocity > 0) cube5MorphVelocity = 0
      } else if (cube5MorphValue < CUBE5_MORPH_OVERSHOOT_MIN) {
        cube5MorphValue = CUBE5_MORPH_OVERSHOOT_MIN
        if (cube5MorphVelocity < 0) cube5MorphVelocity = 0
      }
      cube5Base.morphTargetInfluences[cube5MorphIndex] = cube5MorphValue
      if (pCube1Mesh && pCube1MorphIndex >= 0 && pCube1Mesh.morphTargetInfluences) {
        pCube1Mesh.morphTargetInfluences[pCube1MorphIndex] = cube5MorphValue
      }
    }

    if (balloonPivot) {
      balloonSmoothedTarget = THREE.MathUtils.lerp(balloonSmoothedTarget, hoverBalloon ? 3 : 1.0, 0.18)
      const breathe = hoverBalloon ? Math.sin(performance.now() * 0.01) * 0.03 : 0.0
      const target = balloonSmoothedTarget + breathe

      const s = {
        x: balloonBasePivotScale.x,
        y: balloonBasePivotScale.y,
        z: balloonBasePivotScale.z,
      }
      ;['x', 'y', 'z'].forEach((k) => {
        if (k === balloonUpAxisKey) s[k] *= 1.0
        else s[k] *= target
      })

      balloonPivot.scale.x = THREE.MathUtils.lerp(balloonPivot.scale.x, s.x, 0.15)
      balloonPivot.scale.y = THREE.MathUtils.lerp(balloonPivot.scale.y, s.y, 0.15)
      balloonPivot.scale.z = THREE.MathUtils.lerp(balloonPivot.scale.z, s.z, 0.15)

      const horizAxis = balloonUpAxisKey === 'x' ? 'z' : 'x'
      const ratio = balloonPivot.scale[horizAxis] / balloonBasePivotScale[horizAxis]
      const t = THREE.MathUtils.clamp((ratio - 1.0) / 0.35, 0, 1)

      if (balloonPlanesGroup) {
        const cur = balloonPlanesGroup.scale[balloonUpAxisKey]
        balloonPlanesGroup.scale.set(1, 1, 1)
        balloonPlanesGroup.scale[balloonUpAxisKey] = THREE.MathUtils.lerp(cur, target, 0.15)
        balloonPlanesGroup.children.forEach((plane) => {
          const base = balloonPlaneBasePos.get(plane.name)
          const cfg = BALLOON_PLANES_OFFSETS.find((o) => o.name === plane.name)
          if (base && cfg) {
            plane.position.x = base.x + cfg.x * t
            plane.position.y = base.y + cfg.y * t
            plane.position.z = base.z + cfg.z * t
          }
        })
      }

      if (pushMeshes.length) {
        pushMeshes.forEach((m) => {
          const base = pushBasePos.get(m.uuid)
          if (!base) return

          const axis = pushAxisByUuid.get(m.uuid) ?? 'x'
          const sign = pushSignByUuid.get(m.uuid) ?? +1
          const max = pushMaxByUuid.get(m.uuid) ?? U(15)

          const offset = sign * max * t

          const targetPos = base.clone()
          targetPos[axis] += offset

          m.position[axis] = THREE.MathUtils.lerp(m.position[axis], targetPos[axis], 0.35)
        })
      }

      if (liftMeshes.length) {
        const lift = U(BALLOON_LIFT_MAX) * t
        liftMeshes.forEach((m) => {
          const base = liftBasePos.get(m.uuid)
          const dir = liftDirLocal.get(m.uuid)
          if (!base || !dir) return
          const targetPos = base.clone().addScaledVector(dir, lift)
          m.position.x = THREE.MathUtils.lerp(m.position.x, targetPos.x, 0.15)
          m.position.y = THREE.MathUtils.lerp(m.position.y, targetPos.y, 0.15)
          m.position.z = THREE.MathUtils.lerp(m.position.z, targetPos.z, 0.15)
        })
      }

      if (dropMeshes.length) {
        const drop = U(BALLOON_DROP_MAX) * t
        dropMeshes.forEach((m) => {
          const base = dropBasePos.get(m.uuid)
          const dir = dropDirLocal.get(m.uuid)
          if (!base || !dir) return
          const targetPos = base.clone().addScaledVector(dir, -drop)
          m.position.x = THREE.MathUtils.lerp(m.position.x, targetPos.x, 0.15)
          m.position.y = THREE.MathUtils.lerp(m.position.y, targetPos.y, 0.15)
          m.position.z = THREE.MathUtils.lerp(m.position.z, targetPos.z, 0.15)
        })
      }
    }

    if (rubberPivot) {
      const wiggle = hoverRubber ? Math.sin(performance.now() * 0.012) * RUBBER_WIGGLE : 0.0
      const ang = hoverRubber ? -(RUBBER_PULL_ANGLE + wiggle) : 0.0

      rubberTargetQuat.copy(rubberBasePivotQuat)
      _qTmp.setFromAxisAngle(rubberAxisLocal, ang)
      rubberTargetQuat.multiply(_qTmp)

      rubberPivot.quaternion.slerp(rubberTargetQuat, RUBBER_LERP)

      const sc = {
        x: rubberBasePivotScale.x,
        y: rubberBasePivotScale.y,
        z: rubberBasePivotScale.z,
      }

      const stretch = hoverRubber ? RUBBER_STRETCH : 1.0
      const squash = hoverRubber ? RUBBER_SQUASH : 1.0

      ;['x', 'y', 'z'].forEach((k) => {
        if (k === rubberRightAxisKey) sc[k] *= stretch
        else sc[k] *= squash
      })

      rubberPivot.scale.x = THREE.MathUtils.lerp(rubberPivot.scale.x, sc.x, RUBBER_LERP)
      rubberPivot.scale.y = THREE.MathUtils.lerp(rubberPivot.scale.y, sc.y, RUBBER_LERP)
      rubberPivot.scale.z = THREE.MathUtils.lerp(rubberPivot.scale.z, sc.z, RUBBER_LERP)
    }

    if (pole && poleBB) {
      const curScale = pole.scale[poleAxisKey]
      if (hoverPole) {
        poleReturnReboundTriggered = false
        cylinder6ReboundTriggered = false
        cylinder7ReboundTriggered = false
        cylinder6Rebound = 0
        cylinder7Rebound = 0
        teamReboundTriggered[0] = false
        teamReboundTriggered[1] = false
        teamReboundTriggered[2] = false
        teamRebounds[0] = 0
        teamRebounds[1] = 0
        teamRebounds[2] = 0
      } else {
        if (curScale <= poleOriginScale * POLE_RETURN_REBOUND_TRIGGER && !poleReturnReboundTriggered && POLE_RETURN_REBOUND > 0) {
          poleReturnRebound = poleOriginScale * POLE_RETURN_REBOUND
          poleReturnReboundTriggered = true
        }
        poleReturnRebound *= POLE_RETURN_REBOUND_DECAY
        if (poleReturnRebound < POLE_RETURN_REBOUND_CUTOFF) poleReturnRebound = 0

        if (cylinder6Mesh && CYLINDER6_REBOUND_AMOUNT !== 0) {
          if (curScale <= poleOriginScale * CYLINDER6_REBOUND_TRIGGER && !cylinder6ReboundTriggered) {
            cylinder6Rebound = poleOriginScale * POLE_RETURN_REBOUND
            cylinder6ReboundTriggered = true
          }
          cylinder6Rebound *= CYLINDER6_REBOUND_DECAY
          if (cylinder6Rebound < POLE_RETURN_REBOUND_CUTOFF) cylinder6Rebound = 0
        }
        if (cylinder7Mesh && CYLINDER7_REBOUND_AMOUNT !== 0) {
          if (curScale <= poleOriginScale * CYLINDER7_REBOUND_TRIGGER && !cylinder7ReboundTriggered) {
            cylinder7Rebound = poleOriginScale * POLE_RETURN_REBOUND
            cylinder7ReboundTriggered = true
          }
          cylinder7Rebound *= CYLINDER7_REBOUND_DECAY
          if (cylinder7Rebound < POLE_RETURN_REBOUND_CUTOFF) cylinder7Rebound = 0
        }
        for (let t = 0; t < 3; t++) {
          if (TEAM_REBOUND_AMOUNTS[t] === 0) continue
          if (curScale <= poleOriginScale * TEAM_REBOUND_TRIGGERS[t] && !teamReboundTriggered[t]) {
            teamRebounds[t] = poleOriginScale * POLE_RETURN_REBOUND
            teamReboundTriggered[t] = true
          }
          teamRebounds[t] *= TEAM_REBOUND_DECAYS[t]
          if (teamRebounds[t] < POLE_RETURN_REBOUND_CUTOFF) teamRebounds[t] = 0
        }
      }
      const targetScale = hoverPole ? poleOriginScale * 1.6 : poleOriginScale + poleReturnRebound
      const nextScale = THREE.MathUtils.lerp(curScale, targetScale, 0.12)

      pole.scale[poleAxisKey] = nextScale
      pole.position[poleAxisKey] = poleBase - poleBB.min[poleAxisKey] * nextScale

      const growthMove = (nextScale - poleOriginScale) * poleHeightLocal

      if (socketTest) {
        socketTest.position[poleAxisKey] = socketBasePos[poleAxisKey] + growthMove
      }

      // Cylinder6, Cylinder7 아래 반동 (타이밍·양·감쇠 각각 조정 가능)
      if (cylinder6Mesh && CYLINDER6_REBOUND_AMOUNT !== 0) {
        const dist6 = cylinder6Rebound * poleHeightLocal * CYLINDER6_REBOUND_AMOUNT
        cylinder6Mesh.position[poleAxisKey] = cylinder6BasePos[poleAxisKey] - dist6
      }
      if (cylinder7Mesh && CYLINDER7_REBOUND_AMOUNT !== 0) {
        const dist7 = cylinder7Rebound * poleHeightLocal * CYLINDER7_REBOUND_AMOUNT
        cylinder7Mesh.position[poleAxisKey] = cylinder7BasePos[poleAxisKey] - dist7
      }
      // LIGHT/CAP 팀별 아래 반동 (팀1: LIGHT1+CAP1, 팀2: LIGHT2+CAP2, 팀3: LIGHT3+CAP3)
      for (let t = 0; t < 3; t++) {
        if (TEAM_REBOUND_AMOUNTS[t] === 0) continue
        const distT = teamRebounds[t] * poleHeightLocal * TEAM_REBOUND_AMOUNTS[t]
        const [lightMesh, capMesh] = lightCapTeamMeshes[t]
        const [lightBase, capBase] = lightCapTeamBasePositions[t]
        if (lightMesh) lightMesh.position[poleAxisKey] = lightBase[poleAxisKey] - distT
        if (capMesh) capMesh.position[poleAxisKey] = capBase[poleAxisKey] - distT
      }

      if (hoverPole && !hasBounced && nextScale > poleOriginScale * 1.58) {
        bounceVel = U(BOUNCE_STRENGTH)
        hasBounced = true
      }
      if (!hoverPole) hasBounced = false

      if (bounceMesh) {
        const springForce = -bounceOffset * BOUNCE_SPRING
        bounceVel += springForce
        bounceVel *= BOUNCE_DAMPING
        bounceOffset += bounceVel

        bounceOffset = THREE.MathUtils.clamp(bounceOffset, -U(BOUNCE_MAX_OFFSET), U(BOUNCE_MAX_OFFSET))
        bounceMesh.position[poleAxisKey] = bounceBasePos[poleAxisKey] + growthMove + bounceOffset
      }
    }

    if (cylinder17) {
      const justEntered = hoverCylinder17 && !prevHoverCylinder17

      if (justEntered) {
        cyl17Started = true
        cyl17Time = 0
      }

      cyl17TargetUpScale = hoverCylinder17 ? CYL17_HOVER_UP_SCALE : 1

      if (cyl17Started) {
        const totalDuration = CYL17_CYCLES / CYL17_CYCLES_PER_SEC
        cyl17Time += dt

        if (cyl17Time <= totalDuration) {
          const wave = Math.sin(cyl17Time * CYL17_CYCLES_PER_SEC * Math.PI * 2)
          cyl17TargetOffset = wave * U(CYL17_MOVE_AMPLITUDE)
        } else {
          cyl17Started = false
          cyl17TargetOffset = 0
          cyl17Time = 0
        }
      }

      cyl17CurrentOffset = THREE.MathUtils.lerp(cyl17CurrentOffset, cyl17TargetOffset, CYL17_LERP)
      cylinder17.position[cylinder17AxisKey] = cylinder17BasePos[cylinder17AxisKey] + cyl17CurrentOffset

      cyl17CurrentUpScale = THREE.MathUtils.lerp(cyl17CurrentUpScale, cyl17TargetUpScale, CYL17_SCALE_LERP)

      const sx = cyl17BaseScale.x
      const sy = cyl17BaseScale.y
      const sz = cyl17BaseScale.z

      if (cylinder17AxisKey === 'x') {
        cylinder17.scale.set(sx * cyl17CurrentUpScale, sy, sz)
      } else if (cylinder17AxisKey === 'y') {
        cylinder17.scale.set(sx, sy * cyl17CurrentUpScale, sz)
      } else {
        cylinder17.scale.set(sx, sy, sz * cyl17CurrentUpScale)
      }

      if (cylinder40Follow) {
        cylinder17.updateMatrixWorld(true)
        cylinder17.matrixWorld.decompose(_tmpWP, _tmpWQ, _cyl17WorldScale)
        cylinder40Follow.scale.x = cylinder40BaseWorldScale.x / (_cyl17WorldScale.x || 1e-6)
        cylinder40Follow.scale.y = cylinder40BaseWorldScale.y / (_cyl17WorldScale.y || 1e-6)
        cylinder40Follow.scale.z = cylinder40BaseWorldScale.z / (_cyl17WorldScale.z || 1e-6)
      }

      prevHoverCylinder17 = hoverCylinder17
    }

    // 로봇팔: CUBE8 한 번 호버 시 한 사이클(휘었다가 복귀)
    if (hoverCUBE8Chain && !prevHoverRobotArmTrigger && robotArmPhase === 0) {
      robotArmPhase = 1
      robotArmPhaseTime = 0
      robotSound.currentTime = 0
      robotSound.play().catch(() => {})
    }
    prevHoverRobotArmTrigger = hoverCUBE8Chain

    if (robotArmPhase === 1) {
      robotArmPhaseTime += dt
      const delay = ROBOT_ARM_AXIS_DELAY
      const dur = ROBOT_ARM_AXIS_BEND_DURATION
      for (let i = 0; i < 4; i++) {
        const localT = (robotArmPhaseTime - i * delay) / dur
        const t = Math.max(0, Math.min(1, localT))
        robotArmAxisBendValues[i] = t * t * (3 - 2 * t)
      }
      robotArmCycleValue = robotArmAxisBendValues[3]
      const bendTotal = 3 * delay + dur
      if (robotArmPhaseTime >= bendTotal) {
        robotArmPhase = 2
        robotArmPhaseTime = 0
        robotArmCycleValue = 1
        robotArmAxisBendValues[0] = 1
        robotArmAxisBendValues[1] = 1
        robotArmAxisBendValues[2] = 1
        robotArmAxisBendValues[3] = 1
      }
    } else if (robotArmPhase === 2) {
      robotArmPhaseTime += dt
      if (robotArmPhaseTime >= ROBOT_ARM_HOLD_DURATION) {
        robotArmPhase = 3
        robotArmPhaseTime = 0
      }
    } else if (robotArmPhase === 3) {
      robotArmPhaseTime += dt
      const delay = ROBOT_ARM_AXIS_DELAY
      const dur = ROBOT_ARM_AXIS_RETURN_DURATION
      for (let i = 0; i < 4; i++) {
        const startReturn = (3 - i) * delay
        const localT = (robotArmPhaseTime - startReturn) / dur
        const t = Math.max(0, Math.min(1, localT))
        robotArmAxisBendValues[i] = 1 - t * t * (3 - 2 * t)
      }
      robotArmCycleValue = robotArmAxisBendValues[0]
      const returnTotal = 3 * delay + dur
      if (robotArmPhaseTime >= returnTotal) {
        robotArmPhase = 0
        robotArmPhaseTime = 0
        robotArmCycleValue = 0
        robotArmAxisBendValues[0] = 0
        robotArmAxisBendValues[1] = 0
        robotArmAxisBendValues[2] = 0
        robotArmAxisBendValues[3] = 0
      }
    } else {
      robotArmAxisBendValues[0] = 0
      robotArmAxisBendValues[1] = 0
      robotArmAxisBendValues[2] = 0
      robotArmAxisBendValues[3] = 0
    }

    if (cyl25Pivot) {
      const bend1 = robotArmAxisBendValues[0]
      cyl25JointAngleTarget = bend1 * CYL25_JOINT_BEND_ANGLE
      cyl25JointAngleCurrent = THREE.MathUtils.lerp(cyl25JointAngleCurrent, cyl25JointAngleTarget, CYL25_JOINT_LERP)
      _cyl25AxisAngleQ.setFromAxisAngle(cyl25HingeAxisWorld, cyl25JointAngleCurrent * CYL25_JOINT_BEND_SIGN)
      _cyl25DesiredWorldQuat.copy(cyl25PivotBaseWorldQuat).multiply(_cyl25AxisAngleQ)
      const parent = cyl25Pivot.parent
      if (parent) {
        parent.getWorldQuaternion(_cyl25ParentWorldQuat).invert()
        cyl25Pivot.quaternion.copy(_cyl25ParentWorldQuat).multiply(_cyl25DesiredWorldQuat)
      }
      if (cyl25AxisHelper) cyl25Pivot.getWorldPosition(cyl25AxisHelper.position)
    }
    if (cyl27Pivot) {
      const bend2 = robotArmAxisBendValues[1]
      cyl27JointAngleTarget = bend2 * CYL27_JOINT_BEND_ANGLE
      cyl27JointAngleCurrent = THREE.MathUtils.lerp(cyl27JointAngleCurrent, cyl27JointAngleTarget, CYL27_JOINT_LERP)
      _cyl27AxisAngleQ.setFromAxisAngle(cyl27HingeAxisWorld, cyl27JointAngleCurrent * CYL27_JOINT_BEND_SIGN)
      _cyl27DesiredWorldQuat.copy(cyl27PivotBaseWorldQuat).multiply(_cyl27AxisAngleQ)
      const parent = cyl27Pivot.parent
      if (parent) {
        parent.getWorldQuaternion(_cyl27ParentWorldQuat).invert()
        cyl27Pivot.quaternion.copy(_cyl27ParentWorldQuat).multiply(_cyl27DesiredWorldQuat)
      }
      if (cyl27AxisHelper) cyl27Pivot.getWorldPosition(cyl27AxisHelper.position)
    }
    if (cyl70Pivot) {
      const bend3 = robotArmAxisBendValues[2]
      cyl70JointAngleTarget = bend3 * CYL70_JOINT_BEND_ANGLE
      cyl70JointAngleCurrent = THREE.MathUtils.lerp(cyl70JointAngleCurrent, cyl70JointAngleTarget, CYL70_JOINT_LERP)
      _cyl70AxisAngleQ.setFromAxisAngle(cyl70HingeAxisWorld, cyl70JointAngleCurrent * CYL70_JOINT_BEND_SIGN)
      cyl70Pivot.quaternion.copy(_cyl70AxisAngleQ)
      if (cyl70AxisHelper) cyl70Pivot.getWorldPosition(cyl70AxisHelper.position)
    }
    if (cyl39Pivot) {
      const bend4 = robotArmAxisBendValues[3]
      cyl39JointAngleTarget = bend4 * CYL39_JOINT_BEND_ANGLE
      cyl39JointAngleCurrent = THREE.MathUtils.lerp(cyl39JointAngleCurrent, cyl39JointAngleTarget, CYL39_JOINT_LERP)
      _cyl39AxisAngleQ.setFromAxisAngle(cyl39HingeAxisWorld, cyl39JointAngleCurrent * CYL39_JOINT_BEND_SIGN)
      _cyl39DesiredWorldQuat.copy(cyl39PivotBaseWorldQuat).multiply(_cyl39AxisAngleQ)
      const parent = cyl39Pivot.parent
      if (parent) {
        parent.getWorldQuaternion(_cyl39ParentWorldQuat).invert()
        cyl39Pivot.quaternion.copy(_cyl39ParentWorldQuat).multiply(_cyl39DesiredWorldQuat)
      }
      if (cyl39AxisHelper) cyl39Pivot.getWorldPosition(cyl39AxisHelper.position)
    }

    if (circle1Pivot) {
      const circle1CooldownOk = (now - circle1LastTriggerTime) >= CIRCLE1_HOVER_COOLDOWN_SEC * 1000
      const justEntered = hoverCircle1 && !prevHoverCircle1 && circle1CooldownOk
      prevHoverCircle1 = hoverCircle1

      if (justEntered) {
        circle1LastTriggerTime = now
        circle1Started = true
        circle1Time = 0
        circle1CurY = 0
        circle1Pivot.position.copy(circle1PivotBasePos)
        circle1Pivot.scale.copy(circle1BasePivotScale)
        popballSound.currentTime = 0
        popballSound.play().catch(() => {})
      }

      if (circle1Started) {
        const totalDuration = CIRCLE1_BOUNCE_CYCLES / CIRCLE1_CYCLES_PER_SEC
        circle1Time += dt

        circle1Pivot.position.copy(circle1PivotBasePos)
        circle1Pivot.scale.copy(circle1BasePivotScale)

        if (circle1Time <= totalDuration) {
          const omega = CIRCLE1_CYCLES_PER_SEC * Math.PI * 2

          const bounceIndex = Math.floor(circle1Time * CIRCLE1_CYCLES_PER_SEC)
          const amp = U(CIRCLE1_BOUNCE_HEIGHT) * Math.pow(CIRCLE1_BOUNCE_DECAY, bounceIndex)

          const raw = Math.sin(circle1Time * omega)
          const up = Math.max(0, raw)
          const down = Math.max(0, -raw)

          const targetY = up * amp
          circle1CurY = THREE.MathUtils.lerp(circle1CurY, targetY, CIRCLE1_LERP)
          circle1Pivot.position.y += circle1CurY

          const stretchT = up
          const squashT = down

          const energyFactor = Math.pow(CIRCLE1_BOUNCE_DECAY, bounceIndex)
          const dynamicStretch = 1 + (CIRCLE1_STRETCH - 1) * energyFactor
          const dynamicSquash = 1 - (1 - CIRCLE1_SQUASH) * energyFactor

          const stretchY = THREE.MathUtils.lerp(1.0, dynamicStretch, stretchT)
          const squashY = THREE.MathUtils.lerp(1.0, dynamicSquash, squashT)
          const scaleY = stretchY * squashY
          const inv = 1 / Math.sqrt(scaleY)

          circle1Pivot.scale.y *= scaleY
          circle1Pivot.scale.x *= inv
          circle1Pivot.scale.z *= inv
        } else {
          circle1Started = false
          circle1Time = 0
          circle1CurY = 0
          circle1Pivot.position.copy(circle1PivotBasePos)
          circle1Pivot.scale.copy(circle1BasePivotScale)
        }
      }
    }
  }

  if (cable) cable.step(dt)
  if (cable2) cable2.step(dt)
  if (cable3) cable3.step(dt)
  if (cable4) cable4.step(dt)

  renderer.render(scene, camera)
}
animate()

/* =========================================================
   11) 리사이즈
========================================================= */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})