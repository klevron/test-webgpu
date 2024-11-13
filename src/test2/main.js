import '../style.css'

import { Clock, Color, FrontSide, PerspectiveCamera, Plane, Raycaster, Scene, Vector3 } from 'three'
import { WebGPURenderer } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Pane } from 'tweakpane'

import usePointer from '../utils/pointer'
import Particles from './Particles'

App()

function App () {
  let renderer, scene, camera, cameraCtrl, clock
  let width, height
  let pointer
  let particles

  const time = { delta: 0, elapsed: 0 }

  const particlesParams = {
    count: 5000,
    size: 1,
    materialParams: { metalness: 1, roughness: 0.1 }
  }

  const sceneParams = {
    followMouse: true,
    pause: false
  }

  const raycaster = new Raycaster()
  const raycasterPlane = new Plane(new Vector3(0, 0, 1), 0)
  const raycasterIntersect = new Vector3()

  let pane, debugFolder

  init()

  function init () {
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas'), antialias: true })

    camera = new PerspectiveCamera()
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    clock = new Clock()

    updateSize()
    window.addEventListener('resize', updateSize)

    initScene()
    initDebug()

    pointer = usePointer({
      domElement: renderer.domElement,
      onMove: () => {
        if (sceneParams.followMouse) {
          raycaster.setFromCamera(pointer.nPosition, camera)
          camera.getWorldDirection(raycasterPlane.normal)
          raycaster.ray.intersectPlane(raycasterPlane, raycasterIntersect)
        } else {
          raycasterIntersect.set(0, 0, 0)
        }
      },
      onLeave: () => {
        raycasterIntersect.set(0, 0, 0)
      }
    })

    renderer.setAnimationLoop(animate)
  }

  function initScene () {
    scene = new Scene()
    // scene.background = new Color(0x000000)

    createParticles()
  }

  function createParticles () {
    if (particles) {
      scene.remove(particles)
      particles.dispose()
    }

    particles = new Particles(renderer, particlesParams)
    scene.add(particles)
  }

  function initDebug () {
    if (!pane) pane = new Pane()
    if (debugFolder) debugFolder.dispose()
    debugFolder = pane.addFolder({ title: 'Debug', expanded: true })

    const countOptions = [
      { value: 1000, text: '1000' },
      { value: 2500, text: '2500' },
      { value: 5000, text: '5000' },
      { value: 10000, text: '10000' },
      { value: 20000, text: '20000' },
      { value: 50000, text: '30000' }
    ]
    debugFolder.addBinding(particlesParams, 'count', { options: countOptions }).on('change', (ev) => {
      createParticles()
      initDebug()
    })

    debugFolder.addBinding(sceneParams, 'pause')
    debugFolder.addBinding(sceneParams, 'followMouse')

    debugFolder.addBinding(particles.uniforms.size, 'value', { label: 'size', min: 0.5, max: 10, step: 0.01 }).on('change', (ev) => { particlesParams.size = ev.value })
    debugFolder.addBinding(particles.material, 'metalness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { particlesParams.materialParams.metalness = ev.value })
    debugFolder.addBinding(particles.material, 'roughness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { particlesParams.materialParams.roughness = ev.value })
    debugFolder.addBinding(particles.material.thicknessDistortionNode, 'value', { label: 'thickness distortion', min: 0, max: 1, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessAttenuationNode, 'value', { label: 'thickness attenuation', min: 0, max: 1, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessPowerNode, 'value', { label: 'thickness power', min: 0.001, max: 20, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessScaleNode, 'value', { label: 'thickness scale', min: 0, max: 50, step: 0.01 })

    debugFolder.addBinding(particles.light, 'color', { label: 'light', color: { type: 'float' } })
    debugFolder.addBinding(particles.light, 'intensity', { min: 0, max: 10, step: 0.01 })
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
      particles.uniforms.center.value.lerp(raycasterIntersect, 0.1)
      particles.light.position.copy(particles.uniforms.center.value)
      particles.update(time)
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
