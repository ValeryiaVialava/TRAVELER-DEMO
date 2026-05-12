import { useRef, useEffect, useMemo } from 'react'
import Globe from 'react-globe.gl'
import { feature } from 'topojson-client'
import worldAtlas from 'world-atlas/countries-110m.json'
import { useGame } from '../../context/GameContext.jsx'
import { COUNTRY_DATA } from '../../data/countries.js'
import styles from './Globe3D.module.css'

// numeric ISO 3166-1 → alpha-3 lookup built from our country data
const NUM_TO_ISO = {}
COUNTRY_DATA.forEach(c => { NUM_TO_ISO[c.num] = c.iso })

const GEO_FEATURES = feature(worldAtlas, worldAtlas.objects.countries).features

function getIso(feat) {
  return NUM_TO_ISO[feat.id] ?? null
}

export default function Globe3D({ currentQuestion, correctHighlight, onCountryClick }) {
  const globeRef = useRef()
  const { state } = useGame()

  useEffect(() => {
    const ctrl = globeRef.current?.controls()
    if (!ctrl) return
    ctrl.autoRotate = true
    ctrl.autoRotateSpeed = 0.35
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.1
  }, [])

  const getCapColor = useMemo(() => (feat) => {
    const iso = getIso(feat)
    if (!iso) return 'rgba(10,15,35,0.6)'

    if (correctHighlight === iso) return 'rgba(255,210,0,0.75)'

    const data = state.countries[iso]
    if (!data) return 'rgba(18,25,50,0.65)'

    if (data.memorized) return 'rgba(0,255,136,0.28)'
    if (currentQuestion?.iso === iso) return 'rgba(0,180,255,0.5)'
    return 'rgba(30,55,90,0.72)'
  }, [state.countries, currentQuestion, correctHighlight])

  const getLabelHtml = useMemo(() => (feat) => {
    if (state.labelMode === 'none') return ''
    const iso = getIso(feat)
    if (!iso) return ''
    const country = COUNTRY_DATA.find(c => c.iso === iso)
    if (!country) return ''
    return `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#fff;background:rgba(0,0,0,0.75);padding:3px 8px;border:1px solid rgba(0,255,136,0.35);letter-spacing:0.05em">${country.name}</div>`
  }, [state.labelMode])

  function handlePolygonClick(feat) {
    const iso = getIso(feat)
    if (!iso) return
    onCountryClick(iso)
    const ctrl = globeRef.current?.controls()
    if (ctrl) ctrl.autoRotate = false
  }

  function handlePolygonHover(feat) {
    const ctrl = globeRef.current?.controls()
    if (ctrl && feat) ctrl.autoRotate = false
  }

  return (
    <div className={styles.root}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor="rgba(30,100,255,0.22)"
        atmosphereAltitude={0.18}
        polygonsData={GEO_FEATURES}
        polygonAltitude={0.007}
        polygonCapColor={getCapColor}
        polygonSideColor={() => 'rgba(0,80,200,0.1)'}
        polygonStrokeColor={() => 'rgba(100,170,255,0.5)'}
        polygonLabel={getLabelHtml}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={handlePolygonHover}
      />
    </div>
  )
}
