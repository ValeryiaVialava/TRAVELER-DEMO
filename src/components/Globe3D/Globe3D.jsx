import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import earcut from 'earcut'
import { drawThreeGeo } from '../../lib/threeGeoJSON.js'
import { useGame } from '../../context/GameContext.jsx'

// GeoJSON from https://github.com/martynafford/natural-earth-geojson
const GEOJSON_URL =
  'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/cultural/ne_50m_admin_0_countries.json'

let geoJsonCache = null

// Coordinate convention must match threeGeoJSON.js convertToSphereCoords
function geoToVec3(lon, lat, r) {
  const φ = lat * (Math.PI / 180)
  const λ = lon * (Math.PI / 180)
  return new THREE.Vector3(
    Math.cos(φ) * Math.cos(λ) * r,
    Math.cos(φ) * Math.sin(λ) * r,
    Math.sin(φ) * r,
  )
}

// Remove antimeridian jumps by unwrapping consecutive lon deltas > 180°
// (same idea as phase-unwrapping in signal processing)
function unwrapRing(ring) {
  const out = [[ring[0][0], ring[0][1]]]
  for (let i = 1; i < ring.length; i++) {
    let lo = ring[i][0]
    const prev = out[i - 1][0]
    while (lo - prev >  180) lo -= 360
    while (lo - prev < -180) lo += 360
    out.push([lo, ring[i][1]])
  }
  return out
}

// Signed area in lon/lat space — positive = CCW
function signedArea(ring) {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return a
}

// Recursively split a triangle in lon/lat space until every edge is short
// enough that, after projection to the sphere, the triangle's interior chord
// stays above the base sphere surface. Without this, big earcut triangles dip
// below r=1 and disappear behind the base sphere — visible as black holes.
function emitTri(a, b, c, maxStep, r, out) {
  const eAB = Math.hypot(b[0] - a[0], b[1] - a[1])
  const eBC = Math.hypot(c[0] - b[0], c[1] - b[1])
  const eCA = Math.hypot(a[0] - c[0], a[1] - c[1])
  const max = Math.max(eAB, eBC, eCA)
  if (max <= maxStep) {
    const va = geoToVec3(a[0], a[1], r)
    const vb = geoToVec3(b[0], b[1], r)
    const vc = geoToVec3(c[0], c[1], r)
    out.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z)
    return
  }
  if (max === eAB) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    emitTri(a, m, c, maxStep, r, out)
    emitTri(m, b, c, maxStep, r, out)
  } else if (max === eBC) {
    const m = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]
    emitTri(a, b, m, maxStep, r, out)
    emitTri(a, m, c, maxStep, r, out)
  } else {
    const m = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2]
    emitTri(a, b, m, maxStep, r, out)
    emitTri(m, b, c, maxStep, r, out)
  }
}

function buildCountryMesh(feature, r) {
  const polygons =
    feature.geometry.type === 'Polygon'       ? [feature.geometry.coordinates]
    : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates
    : null
  if (!polygons) return null

  const positions = []
  const MAX_EDGE_DEG = 2

  for (const polygon of polygons) {
    // GeoJSON rings close by repeating first point — earcut needs open ring
    let ring = polygon[0]?.slice(0, -1)
    if (!ring || ring.length < 3) continue

    // Unwrap antimeridian so earcut never sees a >180° lon jump
    ring = unwrapRing(ring)

    // Guarantee CCW winding → outward-facing normals after sphere projection
    if (signedArea(ring) < 0) ring = ring.slice().reverse()

    const flat2D = ring.flatMap(([lo, la]) => [lo, la])
    const tris   = earcut(flat2D)
    if (!tris.length) continue

    for (let i = 0; i < tris.length; i += 3) {
      emitTri(ring[tris[i]], ring[tris[i + 1]], ring[tris[i + 2]],
              MAX_EDGE_DEG, r, positions)
    }
  }

  if (!positions.length) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x0d1b2a, side: THREE.FrontSide }),
  )
}

const COL = {
  bg:        0x0d1b2a,
  inRegion:  0x162a48,  // belongs to selected region but excluded by difficulty
  inGame:    0x1e3a5f,
  question:  0x005599,
  memorized: 0x005533,
  highlight: 0xaa7700,
}

function applyColors(group, { currentQuestion, correctHighlight, gameState, regionSet }) {
  group.children.forEach(mesh => {
    const iso = mesh.userData.iso
    const d   = gameState?.countries?.[iso]
    let hex = COL.bg

    if (correctHighlight === iso)          hex = COL.highlight
    else if (currentQuestion?.iso === iso) hex = COL.question
    else if (d?.memorized)                 hex = COL.memorized
    else if (d)                            hex = COL.inGame
    else if (regionSet?.has(iso))          hex = COL.inRegion

    mesh.material.color.setHex(hex)
  })
}

// Approx geographic centroids per region — used to point the camera at the
// area the user is choosing in the setup overlay.
const REGION_FOCUS = {
  all:      { lon:   0, lat:   0, dist: 3.0 },
  europe:   { lon:  15, lat:  50, dist: 2.4 },
  asia:     { lon:  90, lat:  30, dist: 2.6 },
  africa:   { lon:  20, lat:   0, dist: 2.5 },
  americas: { lon: -80, lat:  10, dist: 2.7 },
  oceania:  { lon: 140, lat: -25, dist: 2.6 },
}

function geoToCameraPos(lon, lat, dist) {
  const φ = lat * (Math.PI / 180)
  const λ = lon * (Math.PI / 180)
  return new THREE.Vector3(
    Math.cos(φ) * Math.cos(λ) * dist,
    Math.cos(φ) * Math.sin(λ) * dist,
    Math.sin(φ) * dist,
  )
}

export default function Globe3D({ currentQuestion, correctHighlight, onCountryClick, regionISOs, onMeshesReady, focusRegion, autoRotate = true }) {
  const mountRef  = useRef()
  const refs      = useRef({})
  const liveProps = useRef({})
  const { state: gameState } = useGame()
  const regionSet = useMemo(() => new Set(regionISOs ?? []), [regionISOs])

  // Keep live snapshot for event handlers without re-registering them
  useEffect(() => {
    liveProps.current = { currentQuestion, correctHighlight, onCountryClick, gameState, regionSet }
  })

  // ── Init Three.js scene (runs once) ─────────────────────
  useEffect(() => {
    const mount = mountRef.current
    const W = mount.clientWidth  || window.innerWidth
    const H = mount.clientHeight || window.innerHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    // threeGeoJSON coords: X → (0°N,0°E), Y → (0°N,90°E), Z → North Pole
    // Camera on +X axis looks at Africa/Europe; up = Z (North Pole)
    camera.position.set(2.8, 0, 0)
    camera.up.set(0, 0, 1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.06
    controls.autoRotate       = true
    controls.autoRotateSpeed  = 0.4
    controls.minDistance      = 1.4
    controls.maxDistance      = 5.5

    // Base sphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x020b18, emissive: 0x000308, shininess: 8 }),
    ))

    // Lighting
    scene.add(new THREE.AmbientLight(0x223355, 1.5))
    const sun = new THREE.DirectionalLight(0x5588cc, 1.2)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    const countryGroup = new THREE.Group()
    const borderGroup  = new THREE.Group()
    scene.add(countryGroup)
    scene.add(borderGroup)

    refs.current = { renderer, camera, controls, countryGroup }

    // ── Load GeoJSON ───────────────────────────────────────
    ;(async () => {
      if (!geoJsonCache) {
        const res  = await fetch(GEOJSON_URL)
        geoJsonCache = await res.json()
      }

      // Border lines via threeGeoJSON (bobbyroe/ThreeGeoJSON)
      drawThreeGeo(geoJsonCache, 1.003, 'sphere', { color: 0x1a44aa }, borderGroup)

      // Natural Earth uses some non-ISO 3-letter codes; map them to the
      // codes we use in COUNTRY_DATA so meshes match game records.
      const ISO_ALIASES = {
        SAH: 'ESH',  // Western Sahara: NE uses SAH, ISO 3166 uses ESH
        SOL: 'SOM',  // Somaliland: NE lists it separately; merge into Somalia
        SDS: 'SSD',  // older NE used SDS for South Sudan
        KOS: 'KOS',  // Kosovo (already aligned, kept for clarity)
      }

      // Filled meshes for coloring + raycasting
      for (const feat of geoJsonCache.features) {
        // Natural Earth puts '-99' in ISO_A3 for disputed cases (France,
        // Kosovo, N. Cyprus, etc.). ADM0_A3 reliably holds the 3-letter code.
        const p = feat.properties
        let iso = (p?.ISO_A3 && p.ISO_A3 !== '-99') ? p.ISO_A3 : p?.ADM0_A3
        if (!iso || iso === '-99') continue
        iso = ISO_ALIASES[iso] ?? iso
        const mesh = buildCountryMesh(feat, 1.001)
        if (!mesh) continue
        mesh.userData.iso = iso
        countryGroup.add(mesh)
      }

      applyColors(countryGroup, liveProps.current)

      // Tell the parent which countries actually got rendered — micro-states
      // too small for the 50m GeoJSON may have no mesh, and would otherwise
      // appear as unanswerable questions.
      onMeshesReady?.(new Set(countryGroup.children.map(m => m.userData.iso)))
    })()

    // ── Resize ─────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(mount)

    // ── Pointer: distinguish drag from click ───────────────
    let downX = 0, downY = 0
    const onPointerDown = e => { downX = e.clientX; downY = e.clientY }
    const onPointerUp   = e => {
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (dx * dx + dy * dy > 25) return          // dragging — ignore

      const rect  = mount.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        ((e.clientY - rect.top)  / rect.height) * -2 + 1,
      )
      const ray = new THREE.Raycaster()
      ray.setFromCamera(mouse, camera)
      const hits = ray.intersectObjects(refs.current.countryGroup?.children ?? [])
      if (hits.length) {
        controls.autoRotate = false
        liveProps.current.onCountryClick(hits[0].object.userData.iso)
      }
    }
    mount.addEventListener('pointerdown', onPointerDown)
    mount.addEventListener('pointerup',   onPointerUp)

    // ── Render loop ────────────────────────────────────────
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mount.removeEventListener('pointerdown', onPointerDown)
      mount.removeEventListener('pointerup',   onPointerUp)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // ── Reactive color updates ─────────────────────────────
  useEffect(() => {
    const { countryGroup } = refs.current
    if (!countryGroup) return
    applyColors(countryGroup, { currentQuestion, correctHighlight, gameState, regionSet })
  }, [gameState.countries, currentQuestion, correctHighlight, regionSet])

  // ── Toggle auto-rotation ───────────────────────────────
  useEffect(() => {
    const { controls } = refs.current
    if (controls) controls.autoRotate = autoRotate
  }, [autoRotate])

  // ── Animate camera toward the chosen region ────────────
  useEffect(() => {
    const { camera, controls } = refs.current
    if (!camera || !controls || !focusRegion) return
    const target = REGION_FOCUS[focusRegion]
    if (!target) return

    const from = camera.position.clone()
    const to   = geoToCameraPos(target.lon, target.lat, target.dist)
    const dur  = 900
    const t0   = performance.now()
    let raf

    controls.autoRotate = false
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur)
      const ease = 1 - Math.pow(1 - t, 3)   // easeOutCubic
      camera.position.lerpVectors(from, to, ease)
      camera.lookAt(0, 0, 0)
      if (t < 1) raf = requestAnimationFrame(step)
      else controls.autoRotate = autoRotate
    }
    step()
    return () => cancelAnimationFrame(raf)
  }, [focusRegion])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
