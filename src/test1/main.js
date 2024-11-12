import '../style.css'

import { BoxGeometry, Clock, Color, FrontSide, OctahedronGeometry, PerspectiveCamera, Scene } from 'three'
import { WebGPURenderer } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import Particles from './Particles'

App()

function App () {
  let renderer, scene, camera, cameraCtrl, clock
  let width, height

  const time = { delta: 0, elapsed: 0 }

  let particles

  init()

  function init () {
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas'), antialias: true })

    camera = new PerspectiveCamera()
    camera.position.set(0, 0, 200)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    clock = new Clock()

    updateSize()
    window.addEventListener('resize', updateSize)

    initScene()

    renderer.setAnimationLoop(animate)
  }

  function initScene () {
    scene = new Scene()
    scene.background = new Color(0x000000)

    particles = new Particles(renderer, {
      count: 512 * 512,
      // geometry: new BoxGeometry()
      geometry: new OctahedronGeometry(1, 0),
      materialParams: { metalness: 0.75, roughness: 0.25, side: FrontSide }
    })
    scene.add(particles)
  }

  function animate () {
    if (cameraCtrl) cameraCtrl.update()
    time.delta = clock.getDelta()
    time.elapsed += time.delta

    particles.update(time)
    particles.rotation.x = Math.cos(time.elapsed * 0.05) * Math.PI
    particles.rotation.y = Math.sin(time.elapsed * 0.03) * Math.PI
    particles.rotation.z = Math.cos(time.elapsed * 0.02) * Math.PI

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
