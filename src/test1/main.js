import '../style.css'

import { BoxGeometry, CircleGeometry, Clock, Color, DoubleSide, FrontSide, OctahedronGeometry, PerspectiveCamera, PlaneGeometry, PostProcessing, Scene, SphereGeometry, WebGPURenderer } from 'three/webgpu'
import { mrt, output, pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Pane } from 'tweakpane'

import Particles, { defaultParams } from './Particles'

App()

function App () {
  let renderer, scene, camera, cameraCtrl, clock
  let width, height
  let particles

  let postprocessing
  let bloomPass

  const time = { delta: 0, elapsed: 0 }

  const urlParams = new URLSearchParams(window.location.search)

  const particlesParams = {
    ...defaultParams,
    type: urlParams.get('type') ?? 'octahedron',
    count: urlParams.get('count') ? parseInt(urlParams.get('count')) : 250000
  }

  const sceneParams = {
    pause: false,
    rotate: true
  }

  let pane, debugFolder

  init()

  function init () {
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas'), antialias: true })

    scene = new Scene()

    camera = new PerspectiveCamera()
    camera.position.set(0, 100, 200)
    camera.lookAt(0, 0, 0)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    // postprocessing
    postprocessing = new PostProcessing(renderer)
    const scenePass = pass(scene, camera)
    scenePass.setMRT(mrt({ output }))
    const outputPass = scenePass.getTextureNode()
    bloomPass = bloom(outputPass, 0.25, 0, 0)
    postprocessing.outputNode = outputPass.add(bloomPass)

    clock = new Clock()

    updateSize()
    window.addEventListener('resize', updateSize)

    initScene()
    initDebug()

    renderer.setAnimationLoop(animate)
  }

  function initScene () {
    scene.background = new Color(0x000000)

    createParticles()
  }

  function createParticles () {
    particlesParams.geometry = getGeometry(particlesParams.type)

    particles = new Particles(renderer, particlesParams)
    particles.material.side = ['box', 'octahedron', 'sphere'].includes(particlesParams.type) ? FrontSide : DoubleSide
    particles.material.flatShading = particlesParams.type === 'sphere'
    scene.add(particles)
  }

  function initDebug () {
    pane = new Pane()
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
      urlParams.set('count', ev.value)
      window.location.search = urlParams.toString()
    })

    const geoOptions = [
      { value: 'box', text: 'Box' },
      { value: 'circle', text: 'Circle' },
      { value: 'octahedron', text: 'Octahedron' },
      { value: 'plane', text: 'Plane' },
      { value: 'sphere', text: 'Sphere' }
    ]
    debugFolder.addBinding(particlesParams, 'type', { options: geoOptions }).on('change', (ev) => {
      urlParams.set('type', ev.value)
      window.location.search = urlParams.toString()
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

    debugFolder.addBinding(bloomPass.strength, 'value', { label: 'bloom strength', min: 0, max: 3, step: 0.001 })
    debugFolder.addBinding(bloomPass.radius, 'value', { label: 'bloom radius', min: 0, max: 1, step: 0.001 })
    debugFolder.addBinding(bloomPass.threshold, 'value', { label: 'bloom threshold', min: 0, max: 1, step: 0.001 })
  }

  async function animate () {
    if (cameraCtrl) cameraCtrl.update()
    time.delta = clock.getDelta()

    if (!sceneParams.pause) {
      time.elapsed += time.delta
      await particles.update(time)
      if (sceneParams.rotate) {
        particles.rotation.x = (particles.rotation.x + 0.001) % (Math.PI * 2)
        particles.rotation.y = (particles.rotation.y + 0.005) % (Math.PI * 2)
        particles.rotation.z = (particles.rotation.z + 0.003) % (Math.PI * 2)
      }
    }

    // await renderer.renderAsync(scene, camera)
    await postprocessing.renderAsync()
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
