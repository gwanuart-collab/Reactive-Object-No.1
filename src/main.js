import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* =========================================================
   0) 프로젝트 값 (Maya Outliner 기준 이름)
========================================================= */
const MODEL_URL = '/model/TrafficLight12/TrafficLight12.glb'

const POLE_NAME = 'POLE_MESH'
const SOCKET_NAME = 'SOCKET_SignR'
const LIGHT_NAMES = ['LIGHT1', 'LIGHT2', 'LIGHT3']

const STORAGE_KEY = 'reactive_object_no_1__signR_attached_names'

// =========================================================
// ✅ [복구] Cylinder17: 1회 hover로 시작 → 마우스 떼도 x번 상하 반복
// =========================================================
const CYL17_NAME = 'Cylinder17'

// 몇 번 반복? (1 = 위아래 한 사이클)
const CYL17_CYCLES = 3

// 상하 이동량(최대 진폭) — UNIT 자동 적용됨
const CYL17_MOVE_AMPLITUDE = 20

// 속도(1초에 몇 사이클?)  ex) 1.2면 1초에 1.2번 왕복
const CYL17_CYCLES_PER_SEC = 2

// 시작/복귀 보간(부드러움)
const CYL17_LERP = 0.18

// ===============================
// ✅ Cylinder17 squash (hover scale) — "상하축만" 줄이기
// ===============================

// ✅ 상하축(업축) 스케일만 줄어드는 정도 (1 = 원래, 0.6 = 40% 납작)
const CYL17_HOVER_UP_SCALE = 0.25

// 스케일 변화 속도
const CYL17_SCALE_LERP = 0.25

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

// ✅ 풍선 메쉬
const BALLOON_NAME = 'pasted__Cylinder5'

// ✅ 풍선이 커질 때 옆으로 밀릴 메쉬들
const BALLOON_PUSH_NAMES = ['pasted__CUBE12', 'pasted__CUBE11', 'pasted__CUBE10']
const BALLOON_PUSH_AXIS = 'x'
const BALLOON_PUSH_MAX = 15

// ✅ 풍선 핀(7/8): 밀림 (attach X)
const BALLOON_PIN_PUSH_NAMES = ['pasted__PIN7', 'pasted__PIN8']
const BALLOON_PIN_PUSH_MAX = 14.7

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
const CABLE2_B_NAME = 'CUBE5'
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
// ✅ CUBE5 "고무"
// =========================================================
const RUBBER_TARGET_NAME = 'CUBE5'
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
// ✅ CUBE5_BASE morph
// =========================================================
const CUBE5_BASE_NAME = 'CUBE5_BASE'
const CUBE5_MORPH_ON = 1.0
const CUBE5_MORPH_OFF = 0.0
const CUBE5_MORPH_LERP = 0.14

// =========================================================
// ✅ 필요시 숨김
// =========================================================
const HIDE_MESH_NAMES = ['CUBE5']

/* =========================================================
   1) 기본 세팅
========================================================= */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0f0f12)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const appEl = document.getElementById('app') ?? document.body
appEl.appendChild(renderer.domElement)
renderer.domElement.style.display = 'block'

/* =========================================================
   2) 조명
========================================================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.35))

const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a22, 1.1)
hemi.position.set(0, 1, 0)
scene.add(hemi)

const key = new THREE.DirectionalLight(0xffffff, 2.4)
key.position.set(8, 14, 10)
scene.add(key)

const fill = new THREE.DirectionalLight(0xffffff, 1.2)
fill.position.set(-10, 5, 6)
scene.add(fill)

const rim = new THREE.DirectionalLight(0xffffff, 1.4)
rim.position.set(-6, 10, -12)
scene.add(rim)

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
controls.enablePan = true

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

function neutralizeMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return

    if (obj.geometry) {
      // ✅ GLB에 normal이 이미 있으면 덮어쓰지 않기 (로우폴리처럼 보이는 현상 방지)
      const hasNormals = !!obj.geometry.attributes?.normal
      if (!hasNormals) obj.geometry.computeVertexNormals()

      if (obj.geometry.attributes.color) obj.geometry.deleteAttribute('color')
    }

    const isKeep = KEEP_TEX_MESH_NAMES.has(obj.name)

    const apply = (mat) => {
      if (!mat) return

      mat.transparent = false
      mat.opacity = 1.0
      mat.depthWrite = true
      mat.alphaTest = 0

      // ✅ 기본 발광 제거(초기값 0) — 단, emissiveMap이 있는 경우는 건드리지 않음
      if (!mat.emissiveMap && 'emissive' in mat) mat.emissive = new THREE.Color(0x000000)
      if (!mat.emissiveMap && 'emissiveIntensity' in mat) mat.emissiveIntensity = 0.0

      // ✅ 텍스처 유지 대상이면: 텍스처/맵을 죽이지 않도록 최소만 건드림
      if (isKeep) {
        // map이 있으면 color는 흰색(텍스처 원색 유지)
        if (mat.map && mat.color) mat.color = new THREE.Color(0xffffff)

        // roughness/metalness 맵이 있으면 숫자로 덮어쓰지 않음
        if (!mat.roughnessMap && 'roughness' in mat) mat.roughness = mat.roughness ?? 0.65
        if (!mat.metalnessMap && 'metalness' in mat) mat.metalness = mat.metalness ?? 0.08

        if ('vertexColors' in mat) mat.vertexColors = false
        mat.needsUpdate = true
        return
      }

      // ✅ 기존 정리 로직(유지)
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

// ✅ 핵심: GLB에서 재질이 공유되면 "라이트 하나 변경"이 "전체 발광"으로 번짐
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

function attachKeepWorld(parent, child) {
  if (!parent || !child) return
  parent.updateMatrixWorld(true)
  child.updateMatrixWorld(true)
  parent.attach(child)
  child.updateMatrixWorld(true)
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

/* =========================================================
   ✅ 전선(케이블): Verlet Rope + Tube
========================================================= */
class Cable {
  constructor({
    startObj,
    endObj,
    segments = 50,
    radius = 0.3,
    slack = 1.5,
    gravity = 1.5,
    damping = 0.93,
    iterations = 12,
    color = 0xaaaaaa,
    parent = null,
  }) {
    this.startObj = startObj
    this.endObj = endObj
    this.segments = segments
    this.gravity = gravity
    this.damping = damping
    this.iterations = iterations
    this.radius = radius

    this.p = Array.from({ length: segments }, () => new THREE.Vector3())
    this.pp = Array.from({ length: segments }, () => new THREE.Vector3())

    this._a = new THREE.Vector3()
    this._b = new THREE.Vector3()
    this._delta = new THREE.Vector3()
    this._corr = new THREE.Vector3()

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

/* =========================================================
   7) 조명 메쉬 정보
========================================================= */
const lightOnInfo = [
  { name: 'LIGHT1', color: 0xff2b2b },
  { name: 'LIGHT2', color: 0xffd400 },
  { name: 'LIGHT3', color: 0x22ff66 },
]

/* =========================================================
   8) 모델 로드 + 세팅
========================================================= */
const loader = new GLTFLoader()

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

const lightMeshes = new Map()

// 🎈 풍선
let balloonMesh = null
let balloonPivot = null
let balloonUpAxisKey = 'y'
const balloonBasePivotScale = new THREE.Vector3(1, 1, 1)

// ✅ 단위 보정 (로드 후 결정)
let UNIT = 1
const U = (v) => v * UNIT
const UV = (v3) => v3.clone().multiplyScalar(UNIT)

// ✅ push/lift/drop
const pushMeshes = []
const pushBasePos = new Map()
const pushMaxByUuid = new Map()

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

// ✅ morph
let cube5Base = null
let cube5MorphIndex = -1
let cube5MorphValue = 0

// =========================================================
// ✅ Cylinder17 runtime state
// =========================================================
let cylinder17 = null
let cylinder17AxisKey = 'y'
let cylinder17BasePos = new THREE.Vector3()
let cyl17Started = false
let cyl17Time = 0
let cyl17TargetOffset = 0
let cyl17CurrentOffset = 0

// =========================================================
// ✅ CIRCLE1 runtime state (단순: 월드Y 정렬 pivot + position.y만)
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

// ✅ 재트리거(hover 들어오는 순간 감지)
let prevHoverCylinder17 = false
let prevHoverCircle1 = false

loader.load(
  MODEL_URL,
  (gltf) => {
    console.log('✅ GLTF loaded:', MODEL_URL)

    model = gltf.scene
    scene.add(model)

    // ✅ 강제 회전 제거
    model.rotation.set(0, 0, 0)
    model.position.set(0, 0, 0)
    model.updateMatrixWorld(true)

    // ✅ 단위 자동 판정
    const box0 = new THREE.Box3().setFromObject(model)
    const size0 = box0.getSize(new THREE.Vector3())
    const maxDim0 = Math.max(size0.x, size0.y, size0.z)

    UNIT = maxDim0 < 10 ? 0.01 : 1
    console.log('📏 maxDim:', maxDim0, '=> UNIT:', UNIT)

    // ✅ 재질 정리 + 재질 공유 끊기
    neutralizeMaterials(model)
    ensureUniqueMaterials(model)

    // 카메라
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    camera.position.set(center.x + maxDim * 0.9, center.y + maxDim * 0.55, center.z + maxDim * 1.35)
    camera.lookAt(center)
    controls.target.copy(center)
    controls.update()

    allMeshes = collectMeshes(model)
    console.log('✅ meshes collected:', allMeshes.length)

    // 숨김
    HIDE_MESH_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      if (m) {
        m.visible = false
        console.log('🙈 hidden:', nm)
      }
    })

    // POLE
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

    // bounce mesh
    bounceMesh = model.getObjectByName(BOUNCE_MESH_NAME)
    console.log('🟡 bounce mesh:', bounceMesh ? bounceMesh.name : 'NOT FOUND')
    if (bounceMesh) bounceBasePos.copy(bounceMesh.position)

    // SOCKET
    socketTest = model.getObjectByName(SOCKET_NAME)
    if (socketTest) {
      socketBasePos.copy(socketTest.position)
      console.log('✅ socket:', socketTest.name)
    } else {
      console.warn('❌ socket not found:', SOCKET_NAME)
    }

    // LIGHTS map
    lightOnInfo.forEach(({ name }) => {
      const m = model.getObjectByName(name)
      if (m && m.isMesh) lightMeshes.set(name, m)
    })
    console.log('✅ lights found:', [...lightMeshes.keys()])

    // morph 대상
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

    // =========================================================
    // ✅ Cylinder17 찾기 + 기준값 저장
    // =========================================================
    cylinder17 = model.getObjectByName(CYL17_NAME)
    console.log('🧱 Cylinder17:', cylinder17 ? cylinder17.name : 'NOT FOUND')
    if (cylinder17) {
      cylinder17AxisKey = getUpAxisKey(cylinder17)
      cylinder17BasePos.copy(cylinder17.position)

      // ✅ 베이스 스케일 저장 (부모 기준 로컬 스케일)
      cyl17BaseScale.copy(cylinder17.scale)
      cyl17CurrentUpScale = 1
      cyl17TargetUpScale = 1
    }

    // =========================================================
    // ✅ CIRCLE1: "월드축 고정" 컨테이너 + 바닥 pivot 생성
    // =========================================================
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

    // 풍선
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
      console.log('🎈 balloon pivot ready. up-axis =', balloonUpAxisKey)
    }

    // push (CUBE들) — ✅ UNIT 적용
    BALLOON_PUSH_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      console.log('🧱 push target lookup:', nm, '=>', !!m)
      if (!m) return
      pushMeshes.push(m)
      pushBasePos.set(m.uuid, m.position.clone())
      pushMaxByUuid.set(m.uuid, U(BALLOON_PUSH_MAX))
    })

    // push (핀 7/8) — ✅ UNIT 적용
    BALLOON_PIN_PUSH_NAMES.forEach((nm) => {
      const m = model.getObjectByName(nm)
      console.log('📌 pin push target lookup:', nm, '=>', !!m)
      if (!m) return
      pushMeshes.push(m)
      pushBasePos.set(m.uuid, m.position.clone())
      pushMaxByUuid.set(m.uuid, U(BALLOON_PIN_PUSH_MAX))
    })

    // lift — ✅ UNIT 적용
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

    // drop — ✅ UNIT 적용
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

    /* =========================================================
       ✅ 저장된 attach 자동 복구 (원복 가능하도록 originalState도 같이 저장)
    ========================================================= */
    if (socketTest) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const names = JSON.parse(saved)
          if (Array.isArray(names) && names.length) {
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

              // ✅ Cylinder17이 저장 복구로 붙을 때도 베이스 재설정(위치+스케일)
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
        } catch (err) {
          console.warn('❌ Failed to parse saved attach list:', err)
        }
      }
    }

    // PIN attach (유지)
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

    /* =========================
       ✅ 케이블들 생성 (굵기/오프셋/중력 모두 UNIT 적용)
    ========================= */

    // cable #1
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
        })

        console.log('✅ cable#1 created.')
      }
    }

    // rubber pivot
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

    // cable #2
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
        })

        console.log('✅ cable#2 created.')
      }
    }

    // cable #3
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
        })

        console.log('✅ cable#3 created.')
      }
    }

    // cable #4
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
  },
  undefined,
  (err) => console.error('GLTF load error:', err)
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
  console.log('✅ selected toggled:', picked.name)
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

      // ✅ 기존 동작 유지: socket에 attach
      socketTest.attach(m)
      setSelectedVisual(m, false)

      // ✅ Cylinder17은 attach 직후 "새 부모 기준" 베이스 재설정 (위치+스케일)
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
    if (originalState.size === 0) return

    originalState.forEach((st, uuid) => {
      const mesh = model.getObjectByProperty('uuid', uuid)
      if (!mesh || !st?.parent) return

      st.parent.attach(mesh)
      mesh.position.copy(st.pos)
      mesh.quaternion.copy(st.quat)
      mesh.scale.copy(st.scale)

      // ✅ Cylinder17 원복 후에도 기준값 리셋
      if (mesh.name === CYL17_NAME) {
        cylinder17BasePos.copy(mesh.position)
        cylinder17AxisKey = getUpAxisKey(mesh)

        cyl17BaseScale.copy(mesh.scale)
        cyl17CurrentUpScale = 1
        cyl17TargetUpScale = 1

        cyl17CurrentOffset = 0
        cyl17TargetOffset = 0
        cyl17Time = 0
        cyl17Started = false
        prevHoverCylinder17 = false
      }
    })

    originalState.clear()
    selectedMeshes.clear()
    localStorage.removeItem(STORAGE_KEY)
    console.log('↩️ restored + cleared saved attach')
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

      // ✅ Cylinder17 detach 후에도 기준값 리셋
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

function animate() {
  requestAnimationFrame(animate)
  controls.update()

  const now = performance.now()
  const dt = (now - _prevT) / 1000
  _prevT = now

  if (model && allMeshes.length) {
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(allMeshes, true)

    let hoverPole = false
    let hoverLightName = null
    let hoverBalloon = false
    let hoverRubber = false
    let hoverCube5Base = false

    let hoverCylinder17 = false
    let hoverCircle1 = false

    for (const h of hits) {
      const n = h.object?.name || ''
      if (n === POLE_NAME) hoverPole = true
      if (LIGHT_NAMES.includes(n) && !hoverLightName) hoverLightName = n
      if (n === BALLOON_NAME) hoverBalloon = true
      if (n === RUBBER_TARGET_NAME) hoverRubber = true
      if (n === CUBE5_BASE_NAME) hoverCube5Base = true

      if (n === CYL17_NAME) hoverCylinder17 = true
      if (n === CIRCLE1_NAME) hoverCircle1 = true

      if (
        hoverPole ||
        hoverLightName ||
        hoverBalloon ||
        hoverRubber ||
        hoverCube5Base ||
        hoverCylinder17 ||
        hoverCircle1
      )
        break
    }

    // lights off
    lightOnInfo.forEach(({ name }) => {
      const m = lightMeshes.get(name)
      if (!m) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((mat) => makeEmissive(mat, 0x000000, 0))
    })

    if (hoverLightName) {
      const info = lightOnInfo.find((x) => x.name === hoverLightName)
      const mesh = lightMeshes.get(hoverLightName)
      if (info && mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => makeEmissive(mat, info.color, 2.0))
        appEl.style.cursor = 'pointer'
      }
    } else {
      appEl.style.cursor =
        hoverPole || hoverBalloon || hoverRubber || hoverCube5Base || hoverCylinder17 || hoverCircle1
          ? 'pointer'
          : 'default'
    }

    // morph
    if (cube5Base && cube5MorphIndex >= 0 && cube5Base.morphTargetInfluences) {
      const targetW = hoverCube5Base ? CUBE5_MORPH_ON : CUBE5_MORPH_OFF
      cube5MorphValue = THREE.MathUtils.lerp(cube5MorphValue, targetW, CUBE5_MORPH_LERP)
      cube5Base.morphTargetInfluences[cube5MorphIndex] = cube5MorphValue
    }

    // balloon scale + push/lift/drop(풍선)
    if (balloonPivot) {
      const baseTarget = hoverBalloon ? 3 : 1.0
      const breathe = hoverBalloon ? Math.sin(performance.now() * 0.01) * 0.03 : 0.0
      const target = baseTarget + breathe

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

      if (pushMeshes.length) {
        pushMeshes.forEach((m) => {
          const base = pushBasePos.get(m.uuid)
          const max = pushMaxByUuid.get(m.uuid) ?? U(BALLOON_PUSH_MAX)
          if (!base) return
          const offset = max * t

          const targetPos = base.clone()
          targetPos[BALLOON_PUSH_AXIS] += offset

          m.position[BALLOON_PUSH_AXIS] = THREE.MathUtils.lerp(
            m.position[BALLOON_PUSH_AXIS],
            targetPos[BALLOON_PUSH_AXIS],
            0.15
          )
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

    // rubber
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

    // pole + bounce
    if (pole && poleBB) {
      const targetScale = hoverPole ? poleOriginScale * 1.6 : poleOriginScale
      const nextScale = THREE.MathUtils.lerp(pole.scale[poleAxisKey], targetScale, 0.12)

      pole.scale[poleAxisKey] = nextScale
      pole.position[poleAxisKey] = poleBase - poleBB.min[poleAxisKey] * nextScale

      const growthMove = (nextScale - poleOriginScale) * poleHeightLocal

      if (socketTest) {
        socketTest.position[poleAxisKey] = socketBasePos[poleAxisKey] + growthMove
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

    // =========================================================
    // ✅ Cylinder17: hover 시 위아래 + "상하축만" 납작(스케일 Y만 감소)
    // =========================================================
    if (cylinder17) {
      const justEntered = hoverCylinder17 && !prevHoverCylinder17

      if (justEntered) {
        cyl17Started = true
        cyl17Time = 0
      }

      // ✅ 스케일 목표(hover 중엔 납작, 아니면 원복)
      cyl17TargetUpScale = hoverCylinder17 ? CYL17_HOVER_UP_SCALE : 1

      // ✅ 상하 반복(hover 들어온 순간 시작 → hover 끝나도 CYL17_CYCLES만큼 계속)
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

      // ✅ 위치 적용
      cyl17CurrentOffset = THREE.MathUtils.lerp(cyl17CurrentOffset, cyl17TargetOffset, CYL17_LERP)
      cylinder17.position[cylinder17AxisKey] = cylinder17BasePos[cylinder17AxisKey] + cyl17CurrentOffset

      // ✅ "상하축만" 스케일 적용
      cyl17CurrentUpScale = THREE.MathUtils.lerp(cyl17CurrentUpScale, cyl17TargetUpScale, CYL17_SCALE_LERP)

      // baseScale을 기준으로, 업축만 곱하고 나머지는 그대로
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

      prevHoverCylinder17 = hoverCylinder17
    }

    // CIRCLE1 bounce
    if (circle1Pivot) {
      const justEntered = hoverCircle1 && !prevHoverCircle1
      prevHoverCircle1 = hoverCircle1

      if (justEntered) {
        circle1Started = true
        circle1Time = 0
        circle1CurY = 0
        circle1Pivot.position.copy(circle1PivotBasePos)
        circle1Pivot.scale.copy(circle1BasePivotScale)
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