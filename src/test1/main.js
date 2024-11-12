import '../style.css'

import {
  BoxGeometry,
  CircleGeometry,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  InstancedMesh,
  PerspectiveCamera,
  Scene,
  SphereGeometry
} from 'three'

import { clamp, code, Fn, hash, instanceIndex, length, smoothstep, storage, StorageInstancedBufferAttribute, uniform, vec3, WebGPURenderer, wgslFn } from 'three/tsl'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import MeshCustomNodeMaterial from './MeshCustomNodeMaterial'
import psrdnoise3 from '../wgsl/psrdnoise3.wgsl?raw'
import psrdnoise3Common from '../wgsl/psrdnoise3-common.wgsl?raw'

const psrdnoise3WGSL = wgslFn(psrdnoise3, [code(psrdnoise3Common)])

App()

function App () {
  const COUNT = 500000

  let renderer, scene, camera, cameraCtrl, clock
  let width, height

  const time = uniform(0.0)
  const noiseCoordScale = uniform(0.01)
  const noiseIntensity = uniform(0.0025)
  const noiseTimeCoef = 1.5
  const attractionRadius1 = uniform(150)
  const attractionRadius2 = uniform(250)
  const maxVelocity = uniform(0.1)

  let positionBuffer
  let rotationBuffer
  let velocityBuffer
  let colorBuffer
  let computeParticles
  let particles

  init()

  function init () {
    renderer = new WebGPURenderer({ canvas: document.getElementById('canvas'), antialias: true })

    camera = new PerspectiveCamera(75)
    camera.position.set(0, 0, 200)

    cameraCtrl = new OrbitControls(camera, renderer.domElement)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    clock = new Clock()

    updateSize()
    window.addEventListener('resize', updateSize)

    initCompute()
    initScene()

    renderer.setAnimationLoop(animate)
  }

  function initCompute () {
    const createBuffer = (count, i = 3) => storage(new StorageInstancedBufferAttribute(count, i), 'vec' + i, count)
    positionBuffer = createBuffer(COUNT, 4)
    rotationBuffer = createBuffer(COUNT)
    velocityBuffer = createBuffer(COUNT, 4)
    colorBuffer = createBuffer(COUNT)

    const deltaRotationBuffer = createBuffer(COUNT, 3)

    // const deltaRotationArray = new Float32Array(COUNT * 3).fill(0).map(() => 0.25 + Math.random() * 0.5)
    // const deltaRotationNode = vec3(instancedBufferAttribute(new InstancedBufferAttribute(deltaRotationArray, 3), 'vec3', 3, 0))

    // init function
    const computeInit = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const rotation = rotationBuffer.element(instanceIndex)
      const deltaRotation = deltaRotationBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      const color = colorBuffer.element(instanceIndex)

      // init position
      const rand1 = hash(instanceIndex)
      const rand2 = hash(instanceIndex.add(2))
      const rand3 = hash(instanceIndex.add(3))
      const rand4 = hash(instanceIndex.add(4))
      const rand5 = hash(instanceIndex.add(5))
      position.assign(vec3(rand1.sub(0.5), rand2.sub(0.5), rand3.sub(0.5)).normalize().mul(rand4).mul(attractionRadius1))
      position.w = rand5.mul(0.9).add(0.1) // displacement intensity

      // init rotation
      const rand6 = hash(instanceIndex.add(6))
      const rand7 = hash(instanceIndex.add(7))
      const rand8 = hash(instanceIndex.add(8))
      rotation.x = rand6.sub(0.5).mul(Math.PI * 2)
      rotation.y = rand7.sub(0.5).mul(Math.PI * 2)
      rotation.z = rand8.sub(0.5).mul(Math.PI * 2)

      // init delta rotation
      const rand9 = hash(instanceIndex.add(9))
      const rand10 = hash(instanceIndex.add(10))
      const rand11 = hash(instanceIndex.add(11))
      deltaRotation.assign(vec3(rand9.mul(0.5).add(0.25), rand10.mul(0.5).add(0.25), rand11.mul(0.5).add(0.25)))

      // init velocity
      const rand12 = hash(instanceIndex.add(12))
      velocity.xyz.assign(vec3(0))
      velocity.w = rand12.mul(0.75).add(0.25) // scale

      // init color
      color.assign(vec3(rand1.mul(0.75).add(0.25), rand2.mul(0.75).add(0.25), rand3.mul(0.75).add(0.25)))
    })().compute(COUNT)

    renderer.computeAsync(computeInit)

    // update function
    computeParticles = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      // noise
      const psrd = psrdnoise3WGSL(position.xyz.mul(noiseCoordScale), vec3(0.0), time.mul(0.25)).toVar()
      const displacement = psrd.xyz.mul(noiseIntensity).mul(position.w)
      velocity.xyz.addAssign(displacement)

      // attraction
      const dv = position.xyz.mul(-1)
      const coef = smoothstep(attractionRadius1, attractionRadius2, length(dv))
      velocity.xyz.addAssign(dv.normalize().mul(coef).mul(0.25))

      // velocity limit
      velocity.xyz.assign(clamp(velocity, maxVelocity.negate(), maxVelocity))

      position.xyz.addAssign(velocity.xyz)

      const rotation = rotationBuffer.element(instanceIndex)
      const deltaRotation = deltaRotationBuffer.element(instanceIndex)
      rotation.addAssign(deltaRotation.mul(0.025))
    })().compute(COUNT)
  }

  function initScene () {
    scene = new Scene()
    scene.background = new Color(0x000000)

    const material = new MeshCustomNodeMaterial()
    material.metalness = 0.75
    material.roughness = 0.25
    // material.thicknessColorNode = colorBuffer.toAttribute().mul(0.25)
    // material.thicknessAttenuationNode.value = 0.2

    material.positionNode = positionBuffer.toAttribute()
    material.rotationNode = rotationBuffer.toAttribute()
    material.velocityNode = velocityBuffer.toAttribute()
    material.colorNode = colorBuffer.toAttribute()
    material.time = time

    // const geometry = new PlaneGeometry(1, 1, 1)
    // const geometry = new CircleGeometry(1, 12)
    // material.side = DoubleSide
    const geometry = new BoxGeometry(1, 1, 1)
    // const geometry = new SphereGeometry(1, 5, 3)
    // material.flatShading = true

    particles = new InstancedMesh(geometry, material, COUNT)
    particles.frustumCulled = false
    scene.add(particles)

    const light1 = new DirectionalLight(0xff9060, 1)
    light1.position.set(-1, -1, 0)
    light1.target.position.set(0, 0, 0)
    particles.add(light1)
    particles.add(light1.target)

    const light2 = new DirectionalLight(0x6090ff, 1)
    light2.position.set(1, 1, 0)
    light2.target.position.set(0, 0, 0)
    particles.add(light2)
    particles.add(light2.target)
  }

  async function animate () {
    if (cameraCtrl) cameraCtrl.update()
    const delta = clock.getDelta()
    time.value += delta * noiseTimeCoef
    // particles.rotation.x = Math.cos(time.value * 0.05) * Math.PI
    // particles.rotation.y = Math.sin(time.value * 0.03) * Math.PI
    // particles.rotation.z = Math.cos(time.value * 0.02) * Math.PI
    await renderer.compute(computeParticles)
    await renderer.render(scene, camera)
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
