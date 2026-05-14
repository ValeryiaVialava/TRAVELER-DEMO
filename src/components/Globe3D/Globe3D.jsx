import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import earcut from 'earcut'
import { drawThreeGeo } from '../../lib/threeGeoJSON.js'
import { useGame } from '../../context/GameContext.jsx'
import { COUNTRY_DATA } from '../../data/countries.js'

const GEOJSON_URL =
  'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/cultural/ne_50m_admin_0_countries.json'

let geoJsonCache = null

const ISO_NAME       = new Map(COUNTRY_DATA.map(c => [c.iso, c.name]))
const ISO_TIER       = new Map(COUNTRY_DATA.map(c => [c.iso, c.tier]))
// All valid game ISOs — used to distinguish "other-region country" from
// "unrecognized territory" so we can blend the latter into the globe.
const ALL_GAME_ISOS  = new Set(COUNTRY_DATA.map(c => c.iso))

function geoToVec3(lon, lat, r) {
  const φ = lat * (Math.PI / 180)
  const λ = lon * (Math.PI / 180)
  return new THREE.Vector3(
    Math.cos(φ) * Math.cos(λ) * r,
    Math.cos(φ) * Math.sin(λ) * r,
    Math.sin(φ) * r,
  )
}

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

function signedArea(ring) {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return a
}

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
    let ring = polygon[0]?.slice(0, -1)
    if (!ring || ring.length < 3) continue

    ring = unwrapRing(ring)

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

// Natural Earth label coords (LABEL_X / LABEL_Y props) when present,
// else fall back to the polygon's average vertex position.
function featureLabelPos(feat) {
  const p = feat.properties
  if (typeof p.LABEL_X === 'number' && typeof p.LABEL_Y === 'number')
    return [p.LABEL_X, p.LABEL_Y]
  const coords =
    feat.geometry.type === 'Polygon'       ? feat.geometry.coordinates[0]
    : feat.geometry.type === 'MultiPolygon' ? feat.geometry.coordinates[0][0]
    : null
  if (!coords?.length) return [0, 0]
  let lo = 0, la = 0
  coords.forEach(([x, y]) => { lo += x; la += y })
  return [lo / coords.length, la / coords.length]
}

function makeLabel(name) {
  const el = document.createElement('div')
  el.textContent = name
  el.style.cssText = [
    'color:rgba(160,210,255,.9)',
    'font-family:Courier New,monospace',
    'font-size:11px',
    'letter-spacing:.07em',
    'text-transform:uppercase',
    'padding:1px 5px',
    'background:rgba(3,10,22,.65)',
    'border:1px solid rgba(30,90,180,.4)',
    'border-radius:2px',
    'pointer-events:none',
    'white-space:nowrap',
    'line-height:1.5',
    'text-shadow:0 1px 4px rgba(0,0,0,.8)',
  ].join(';')
  return el
}

const COL = {
  bg:        0x0d1b2a,
  inRegion:  0x162a48,
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
    // Territories present in GeoJSON but absent from COUNTRY_DATA (e.g. Puerto
    // Rico, Curaçao) have no regionSet entry and would render as COL.bg creating
    // visible dark holes. Blend them into the globe instead.
    else if (!ALL_GAME_ISOS.has(iso))      hex = COL.inRegion

    mesh.material.color.setHex(hex)
  })
}

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

export default function Globe3D({ currentQuestion, correctHighlight, onCountryClick, regionISOs, onMeshesReady, focusRegion, autoRotate = false, forceHideLabels = false }) {
  const mountRef  = useRef()
  const refs      = useRef({})
  const liveProps = useRef({})
  const { state: gameState } = useGame()
  const regionSet = useMemo(() => new Set(regionISOs ?? []), [regionISOs])

  useEffect(() => {
    liveProps.current = { currentQuestion, correctHighlight, onCountryClick, gameState, regionSet, forceHideLabels }
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

    // CSS2D overlay for country name labels
    const css2dRenderer = new CSS2DRenderer()
    css2dRenderer.setSize(W, H)
    css2dRenderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;'
    mount.appendChild(css2dRenderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(2.8, 0, 0)
    camera.up.set(0, 0, 1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.06
    controls.autoRotate       = false
    controls.autoRotateSpeed  = 0.4
    controls.minDistance      = 1.4
    controls.maxDistance      = 5.5

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x020b18, emissive: 0x000308, shininess: 8 }),
    ))

    scene.add(new THREE.AmbientLight(0x223355, 1.5))
    const sun = new THREE.DirectionalLight(0x5588cc, 1.2)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    const countryGroup = new THREE.Group()
    const borderGroup  = new THREE.Group()
    scene.add(countryGroup)
    scene.add(borderGroup)

    refs.current = { renderer, css2dRenderer, camera, controls, countryGroup, labelMap: new Map(), hoveredIso: null }

    // ── Load GeoJSON ───────────────────────────────────────
    ;(async () => {
      if (!geoJsonCache) {
        const res  = await fetch(GEOJSON_URL)
        geoJsonCache = await res.json()
      }

      drawThreeGeo(geoJsonCache, 1.003, 'sphere', { color: 0x1a44aa }, borderGroup)

      const ISO_ALIASES = {
        SAH: 'ESH',
        SOL: 'SOM',
        SDS: 'SSD',
        KOS: 'KOS',
      }

      const LABEL_R = 1.016

      for (const feat of geoJsonCache.features) {
        const p = feat.properties
        let iso = (p?.ISO_A3 && p.ISO_A3 !== '-99') ? p.ISO_A3 : p?.ADM0_A3
        if (!iso || iso === '-99') continue
        iso = ISO_ALIASES[iso] ?? iso

        const mesh = buildCountryMesh(feat, 1.001)
        if (!mesh) continue
        mesh.userData.iso = iso
        countryGroup.add(mesh)

        // One label per ISO — skip duplicates (e.g. Somaliland SOL→SOM would
        // create a second CSS2DObject for SOM that stays visible forever because
        // the tick loop only updates the entry in labelMap).
        if (!refs.current.labelMap.has(iso)) {
          const name = ISO_NAME.get(iso) ?? p?.NAME ?? iso
          const [lon, lat] = featureLabelPos(feat)
          const el  = makeLabel(name)
          const obj = new CSS2DObject(el)
          obj.position.copy(geoToVec3(lon, lat, LABEL_R))
          obj.element.style.visibility = 'hidden'
          scene.add(obj)
          refs.current.labelMap.set(iso, obj)
        }
      }

      applyColors(countryGroup, liveProps.current)
      onMeshesReady?.(new Set(countryGroup.children.map(m => m.userData.iso)))
    })()

    // ── Resize ─────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      css2dRenderer.setSize(w, h)
    })
    ro.observe(mount)

    // ── Pointer events ─────────────────────────────────────
    let downX = 0, downY = 0

    const onPointerDown = e => { downX = e.clientX; downY = e.clientY }

    const onPointerUp = e => {
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (dx * dx + dy * dy > 25) return

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

    const onPointerMove = e => {
      const rect  = mount.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        ((e.clientY - rect.top)  / rect.height) * -2 + 1,
      )
      const ray = new THREE.Raycaster()
      ray.setFromCamera(mouse, camera)
      const hits = ray.intersectObjects(refs.current.countryGroup?.children ?? [])
      refs.current.hoveredIso = hits.length ? hits[0].object.userData.iso : null
    }

    mount.addEventListener('pointerdown', onPointerDown)
    mount.addEventListener('pointerup',   onPointerUp)
    mount.addEventListener('pointermove', onPointerMove)

    // ── Render loop ────────────────────────────────────────
    let raf

    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()

      // Update label visibility every frame.
      // We use obj.layers to control visibility:
      //   layer 0 = visible to camera  (CSS2DRenderer shows)
      //   layer 1 = invisible to camera (CSS2DRenderer hides via layers check)
      // obj.visible is NOT used — CSS2DRenderer's hideObject path skips children
      // which can leave orphaned elements; layers are checked per-object and are
      // the safest flag CSS2DRenderer always respects.
      const { labelMap, hoveredIso } = refs.current
      if (labelMap.size) {
        const forceHideLabels = liveProps.current.forceHideLabels
        const labelMode = forceHideLabels ? 'none' : (liveProps.current.gameState?.labelMode ?? 'always')
        const camDir  = camera.position.clone().normalize()
        const camDist = camera.position.length()
        // Zoom-based detail levels:
        // zoomed out (> 3.3): tier 1 (large countries only)
        // default (~2.8): tier 1 + 2
        // zoomed in (< 2.2): tier 1 + 2 + 3 (small countries too)
        const tierLimit = camDist > 3.3 ? 1 : (camDist < 2.2 ? 3 : 2)

        labelMap.forEach((obj, iso) => {
          let show = false
          if (labelMode === 'always') {
            const onFront = obj.position.clone().normalize().dot(camDir) > 0.2
            show = onFront
          } else if (labelMode === 'hover') {
            const onFront = obj.position.clone().normalize().dot(camDir) > 0.2
            show = onFront && iso === hoveredIso
          }
          // 'none' → show stays false
          obj.element.style.visibility = show ? 'visible' : 'hidden'
        })
      }

      renderer.render(scene, camera)
      css2dRenderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mount.removeEventListener('pointerdown', onPointerDown)
      mount.removeEventListener('pointerup',   onPointerUp)
      mount.removeEventListener('pointermove', onPointerMove)
      renderer.dispose()
      if (mount.contains(renderer.domElement))    mount.removeChild(renderer.domElement)
      if (mount.contains(css2dRenderer.domElement)) mount.removeChild(css2dRenderer.domElement)
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
      const ease = 1 - Math.pow(1 - t, 3)
      camera.position.lerpVectors(from, to, ease)
      camera.lookAt(0, 0, 0)
      if (t < 1) raf = requestAnimationFrame(step)
      else controls.autoRotate = autoRotate
    }
    step()
    return () => cancelAnimationFrame(raf)
  }, [focusRegion])

  return <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }} />
}
