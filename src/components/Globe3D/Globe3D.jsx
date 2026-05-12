import { useRef, useEffect } from 'react'
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

function buildCountryMesh(feature, r) {
  const polygons =
    feature.geometry.type === 'Polygon'      ? [feature.geometry.coordinates]
    : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates
    : null
  if (!polygons) return null

  const positions = []
  const indices   = []
  let offset = 0

  for (const polygon of polygons) {
    const ring = polygon[0]
    if (!ring || ring.length < 3) continue

    // Earcut triangulates in 2D using lon/lat as x/y
    const flat2D = ring.flatMap(([lo, la]) => [lo, la])
    const tris   = earcut(flat2D)
    if (!tris.length) continue

    for (const [lo, la] of ring) {
      const v = geoToVec3(lo, la, r)
      positions.push(v.x, v.y, v.z)
    }
    for (const i of tris) indices.push(i + offset)
    offset += ring.length
  }

  if (!positions.length) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0x0d1b2a,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
}

const COL = {
  bg:        0x0d1b2a,
  inGame:    0x1e3a5f,
  question:  0x005599,
  memorized: 0x005533,
  highlight: 0xaa7700,
}

function applyColors(group, { currentQuestion, correctHighlight, gameState }) {
  group.children.forEach(mesh => {
    const iso = mesh.userData.iso
    const d   = gameState?.countries?.[iso]
    let hex = COL.bg

    if (correctHighlight === iso)          hex = COL.highlight
    else if (currentQuestion?.iso === iso) hex = COL.question
    else if (d?.memorized)                 hex = COL.memorized
    else if (d)                            hex = COL.inGame

    mesh.material.color.setHex(hex)
  })
}

export default function Globe3D({ currentQuestion, correctHighlight, onCountryClick }) {
  const mountRef  = useRef()
  const refs      = useRef({})
  const liveProps = useRef({})
  const { state: gameState } = useGame()

  // Keep live snapshot for event handlers without re-registering them
  useEffect(() => {
    liveProps.current = { currentQuestion, correctHighlight, onCountryClick, gameState }
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
    camera.position.z = 2.8

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

      // Filled meshes for coloring + raycasting
      for (const feat of geoJsonCache.features) {
        const iso = feat.properties?.ISO_A3
        if (!iso || iso === '-99') continue
        const mesh = buildCountryMesh(feat, 1.001)
        if (!mesh) continue
        mesh.userData.iso = iso
        countryGroup.add(mesh)
      }

      applyColors(countryGroup, liveProps.current)
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
    applyColors(countryGroup, { currentQuestion, correctHighlight, gameState })
  }, [gameState.countries, currentQuestion, correctHighlight])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
