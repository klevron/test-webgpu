import '../style.css'

import { ACESFilmicToneMapping, Clock, DataTexture, PerspectiveCamera, Plane, PostProcessing, Raycaster, RepeatWrapping, Scene, Vector3, WebGPURenderer } from 'three/webgpu'
import { mrt, normalView, output, pass } from 'three/tsl'
import { ao } from 'three/addons/tsl/display/GTAONode.js'
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js'

import { Pane } from 'tweakpane'

import usePointer from '../utils/pointer'
import Particles, { defaultParams } from './Particles'

App()

function App () {
  let renderer, scene, camera, cameraCtrl, clock
  let width, height
  let pointer
  let particles

  let postprocessing
  let aoPass, denoisePass

  const time = { delta: 0, elapsed: 0 }

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
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas') })
    renderer.toneMapping = ACESFilmicToneMapping

    scene = new Scene()

    camera = new PerspectiveCamera()
    camera.position.set(0, 0, 7)
    camera.lookAt(0, 0, 0)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    // postprocessing
    postprocessing = new PostProcessing(renderer)
    const scenePass = pass(scene, camera)
    scenePass.setMRT(mrt({ output, normal: normalView }))
    const scenePassDepth = scenePass.getTextureNode('depth')
    const scenePassNormal = scenePass.getTextureNode('normal')
    const scenePassColor = scenePass.getTextureNode('output')
    // ao
    aoPass = ao(scenePassDepth, scenePassNormal, camera)
    aoPass.resolutionScale = 1
    aoPass.thickness.value = 2
    // const blendPassAO = aoPass.getTextureNode().mul(scenePassColor)
    // denoise
    denoisePass = denoise(aoPass.getTextureNode(), scenePassDepth, scenePassNormal, camera)
    const blendPassDenoise = denoisePass.mul(scenePassColor)
    postprocessing.outputNode = blendPassDenoise

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
    createParticles()
  }

  function createParticles () {
    if (particles) {
      scene.remove(particles)
      particles.dispose()
    }

    particles = new Particles(renderer)
    scene.add(particles)
  }

  function initDebug () {
    if (!pane) pane = new Pane()
    if (debugFolder) debugFolder.dispose()
    debugFolder = pane.addFolder({ title: 'Debug', expanded: true })

    const countOptions = [
      { value: 1000, text: '1k' },
      { value: 2000, text: '2k' },
      { value: 5000, text: '5k' },
      { value: 10000, text: '10k' },
      { value: 20000, text: '20k' },
      { value: 50000, text: '30k' }
    ]
    debugFolder.addBinding(defaultParams, 'count', { options: countOptions }).on('change', (ev) => {
      createParticles()
      initDebug()
    })

    debugFolder.addBinding(sceneParams, 'pause')
    debugFolder.addBinding(sceneParams, 'followMouse')

    debugFolder.addBinding(particles.uniforms.size0, 'value', { label: 'size0', min: 0.5, max: 3, step: 0.01 }).on('change', (ev) => { defaultParams.size0 = ev.value })
    debugFolder.addBinding(particles.uniforms.size, 'value', { label: 'size', min: 0.5, max: 3, step: 0.01 }).on('change', (ev) => { defaultParams.size = ev.value })
    debugFolder.addBinding(particles.uniforms.maxVelocity, 'value', { label: 'maxVelocity', min: 0, max: 0.1, step: 0.0001 }).on('change', (ev) => { defaultParams.maxVelocity = ev.value })
    debugFolder.addBinding(particles.material, 'metalness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { defaultParams.materialParams.metalness = ev.value })
    debugFolder.addBinding(particles.material, 'roughness', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => { defaultParams.materialParams.roughness = ev.value })
    debugFolder.addBinding(particles.material.thicknessDistortionNode, 'value', { label: 'thickness distortion', min: 0, max: 1, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessAttenuationNode, 'value', { label: 'thickness attenuation', min: 0, max: 1, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessPowerNode, 'value', { label: 'thickness power', min: 0.001, max: 20, step: 0.001 })
    debugFolder.addBinding(particles.material.thicknessScaleNode, 'value', { label: 'thickness scale', min: 0, max: 50, step: 0.01 })

    const lightPosOptions = { picker: 'inline', x: { min: -10, max: 10 }, y: { min: -10, max: 10, inverted: true } }
    debugFolder.addBinding(particles.light, 'color', { label: 'light', color: { type: 'float' } })
    debugFolder.addBinding(particles.light, 'intensity', { min: 0, max: 10, step: 0.01 })
    debugFolder.addBinding(particles.light1, 'color', { label: 'light1', color: { type: 'float' } })
    debugFolder.addBinding(particles.light1, 'intensity', { min: 0, max: 10, step: 0.01 })
    const light1Pos = { position: { x: particles.light1.position.x, y: particles.light1.position.y } }
    debugFolder.addBinding(light1Pos, 'position', lightPosOptions).on('change', (ev) => { particles.light1.position.x = ev.value.x; particles.light1.position.y = ev.value.y })
    debugFolder.addBinding(particles.light2, 'color', { label: 'light2', color: { type: 'float' } })
    debugFolder.addBinding(particles.light2, 'intensity', { min: 0, max: 10, step: 0.01 })
    const light2Pos = { position: { x: particles.light2.position.x, y: particles.light2.position.y } }
    debugFolder.addBinding(light2Pos, 'position', lightPosOptions).on('change', (ev) => { particles.light2.position.x = ev.value.x; particles.light2.position.y = ev.value.y })

    // debugFolder.addBinding(aoPass.distanceExponent, 'value', { label: 'distance exponent', min: 1, max: 4, step: 0.001 })
    // debugFolder.addBinding(aoPass.distanceFallOff, 'value', { label: 'distance falloff', min: 0.001, max: 1, step: 0.001 })
    // debugFolder.addBinding(aoPass.radius, 'value', { label: 'radius', min: 0.001, max: 1, step: 0.001 })
    // debugFolder.addBinding(aoPass.scale, 'value', { label: 'scale', min: 0.001, max: 2, step: 0.001 })
    // debugFolder.addBinding(aoPass.thickness, 'value', { label: 'thickness', min: 0.001, max: 2, step: 0.001 })
    // debugFolder.addBinding(denoisePass.radius, 'value', { label: 'denoise radius', min: 0.001, max: 10, step: 0.001 })
    // debugFolder.addBinding(denoisePass.lumaPhi, 'value', { label: 'denoise lumaPhi', min: 0.001, max: 10, step: 0.001 })
    // debugFolder.addBinding(denoisePass.depthPhi, 'value', { label: 'denoise depthPhi', min: 0.001, max: 10, step: 0.001 })
    // debugFolder.addBinding(denoisePass.normalPhi, 'value', { label: 'denoise normalPhi', min: 0.001, max: 10, step: 0.001 })
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

    // renderer.render(scene, camera)
    postprocessing.render()
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

// From https://github.com/mrdoob/three.js/blob/master/examples/webgpu_postprocessing_ao.html
function generateNoiseTexture (size = 64) {
  const simplex = new SimplexNoise()

  const arraySize = size * size * 4
  const data = new Uint8Array(arraySize)

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const x = i
      const y = j

      data[(i * size + j) * 4] = (simplex.noise(x, y) * 0.5 + 0.5) * 255
      data[(i * size + j) * 4 + 1] = (simplex.noise(x + size, y) * 0.5 + 0.5) * 255
      data[(i * size + j) * 4 + 2] = (simplex.noise(x, y + size) * 0.5 + 0.5) * 255
      data[(i * size + j) * 4 + 3] = (simplex.noise(x + size, y + size) * 0.5 + 0.5) * 255
    }
  }

  const noiseTexture = new DataTexture(data, size, size)
  noiseTexture.wrapS = RepeatWrapping
  noiseTexture.wrapT = RepeatWrapping
  noiseTexture.needsUpdate = true

  return noiseTexture
}
