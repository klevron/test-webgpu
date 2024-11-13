import '../style.css'

import { BoxGeometry, CircleGeometry, Clock, Color, DoubleSide, FrontSide, OctahedronGeometry, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry } from 'three'
import { WebGPURenderer } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Pane } from 'tweakpane'

import Particles, { defaultParams } from './Particles'

App()

function App () {
  let renderer, scene, camera, cameraCtrl, clock
  let width, height
  let particles

  const time = { delta: 0, elapsed: 0 }

  const particlesParams = {
    type: 'octahedron',
    ...defaultParams
  }

  const sceneParams = {
    pause: false,
    rotate: true
  }

  let pane, debugFolder

  init()

  function init () {
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas'), antialias: true })

    camera = new PerspectiveCamera()
    camera.position.set(0, 100, 200)
    camera.lookAt(0, 0, 0)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    clock = new Clock()

    updateSize()
    window.addEventListener('resize', updateSize)

    initScene()
    initDebug()

    renderer.setAnimationLoop(animate)
  }

  function initScene () {
    scene = new Scene()
    scene.background = new Color(0x000000)

    createParticles()
  }

  function createParticles (type = 'octahedron') {
    if (particles) {
      scene.remove(particles)
      particles.dispose()
    }

    particlesParams.geometry = getGeometry(type)

    particles = new Particles(renderer, particlesParams)
    particles.material.side = ['box', 'octahedron', 'sphere'].includes(type) ? FrontSide : DoubleSide
    particles.material.flatShading = type === 'sphere'
    scene.add(particles)
  }

  function initDebug () {
    if (!pane) pane = new Pane()
    if (debugFolder) debugFolder.dispose()
    debugFolder = pane.addFolder({ title: 'Debug', expanded: true })

    debugFolder.addBinding(sceneParams, 'pause')
    debugFolder.addBinding(sceneParams, 'rotate')

    const countOptions = [
      { value: 100000, text: '100k' },
      { value: 250000, text: '250k' },
      { value: 500000, text: '500k' },
      { value: 1000000, text: '1M' },
      { value: 2000000, text: '2M' },
      { value: 4000000, text: '4M' }
    ]
    debugFolder.addBinding(particlesParams, 'count', { options: countOptions }).on('change', (ev) => {
      createParticles(particlesParams.type)
      initDebug()
    })

    const geoOptions = [
      { value: 'box', text: 'Box' },
      { value: 'circle', text: 'Circle' },
      { value: 'octahedron', text: 'Octahedron' },
      { value: 'plane', text: 'Plane' },
      { value: 'sphere', text: 'Sphere' }
    ]
    debugFolder.addBinding(particlesParams, 'type', { options: geoOptions }).on('change', (ev) => {
      // particles.geometry = getGeometry(ev.value) // doesn't work
      createParticles(ev.value)
      initDebug()
    })

    debugFolder.addBinding(particles.uniforms.size, 'value', { label: 'size', min: 0.1, max: 5, step: 0.001 }).on('change', (ev) => { particlesParams.size = ev.value })

    // partFolder.addBinding(particles.uniforms.noiseCoordScale, 'value', { min: 0.0001, max: 0.5, step: 0.0001 })
    // partFolder.addBinding(particles.uniforms.noiseIntensity, 'value', { min: 0, max: 0.1, step: 0.0001 })
    debugFolder.addBinding(particles.uniforms.maxVelocity, 'value', { label: 'max velocity', min: 0, max: 0.3, step: 0.0001 }).on('change', (ev) => { particlesParams.maxVelocity = ev.value })

    debugFolder.addBinding(particles.material, 'metalness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { particlesParams.materialParams.metalness = ev.value })
    debugFolder.addBinding(particles.material, 'roughness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { particlesParams.materialParams.roughness = ev.value })

    debugFolder.addBinding(particles.light1, 'color', { label: 'light1', color: { type: 'float' } })
    debugFolder.addBinding(particles.light1, 'intensity', { min: 0, max: 10, step: 0.01 })
    debugFolder.addBinding(particles.light2, 'color', { label: 'light2', color: { type: 'float' } })
    debugFolder.addBinding(particles.light2, 'intensity', { min: 0, max: 10, step: 0.01 })
  }

  function animate () {
    if (cameraCtrl) cameraCtrl.update()
    time.delta = clock.getDelta()

    if (!sceneParams.pause) {
      time.elapsed += time.delta
      particles.update(time)
      if (sceneParams.rotate) {
        particles.rotation.x = Math.sin(time.elapsed * 0.03) * Math.PI
        particles.rotation.y = Math.cos(time.elapsed * 0.05) * Math.PI
        particles.rotation.z = Math.sin(time.elapsed * 0.02) * Math.PI
      }
    }

    renderer.render(scene, camera)
  }

  function updateSize () {
    width = window.innerWidth
    height = window.innerHeight
    if (renderer && camera) {
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  }
}

function getGeometry (type) {
  let geometry
  switch (type) {
    case 'box' :
      geometry = new BoxGeometry()
      break
    case 'octahedron':
      geometry = new OctahedronGeometry(1, 0)
      break
    case 'sphere' :
      geometry = new SphereGeometry(1, 6, 4)
      break
    case 'circle':
      geometry = new CircleGeometry(1, 8)
      break
    default:
      geometry = new PlaneGeometry()
  }
  return geometry
}
