import { DirectionalLight, InstancedMesh } from 'three'
import { clamp, code, Fn, hash, instanceIndex, length, smoothstep, storage, StorageInstancedBufferAttribute, uniform, vec3, wgslFn } from 'three/tsl'

import MeshCustomNodeMaterial from './MeshCustomNodeMaterial'
import psrdnoise3 from '../wgsl/psrdnoise3.wgsl?raw'
import psrdnoise3Common from '../wgsl/psrdnoise3-common.wgsl?raw'

const psrdnoise3WGSL = wgslFn(psrdnoise3, [code(psrdnoise3Common)])

const defaultConfig = {
  count: 512 * 512,
  materialParams: { metalness: 0.75, roughness: 0.25 },
  noiseCoordScale: 0.01,
  noiseIntensity: 0.0025,
  noiseTimeCoef: 1.5,
  attractionRadius1: 250,
  attractionRadius2: 350,
  maxVelocity: 0.1
}

export default class Particles extends InstancedMesh {
  constructor (renderer, params) {
    const _params = { ...defaultConfig, ...params }

    const material = new MeshCustomNodeMaterial(_params.materialParams)

    super(_params.geometry, material, _params.count)
    this.params = _params

    this.frustumCulled = false
    this.initLights()

    this.compute = new ParticlesCompute(renderer, this.params)
    this.material.positionNode = this.compute.positionBuffer.toAttribute()
    this.material.rotationNode = this.compute.rotationBuffer.toAttribute()
    this.material.velocityNode = this.compute.velocityBuffer.toAttribute()
    this.material.colorNode = this.compute.colorBuffer.toAttribute()

    this.update = this.compute.update.bind(this.compute)
  }

  initLights () {
    const light1 = new DirectionalLight(0xff9060, 1)
    light1.position.set(-1, -1, 0)
    light1.target.position.set(0, 0, 0)
    this.add(light1)
    this.add(light1.target)

    const light2 = new DirectionalLight(0x6090ff, 1)
    light2.position.set(1, 1, 0)
    light2.target.position.set(0, 0, 0)
    this.add(light2)
    this.add(light2.target)
  }
}

class ParticlesCompute {
  constructor (renderer, params) {
    this.renderer = renderer
    this.params = params

    const time = uniform(0.0)
    const noiseCoordScale = uniform(params.noiseCoordScale)
    const noiseIntensity = uniform(params.noiseIntensity)
    const attractionRadius1 = uniform(params.attractionRadius1)
    const attractionRadius2 = uniform(params.attractionRadius2)
    const maxVelocity = uniform(params.maxVelocity)
    this.uniforms = { time, noiseCoordScale, noiseIntensity, attractionRadius1, attractionRadius2, maxVelocity }

    const createBuffer = (count, i = 3) => storage(new StorageInstancedBufferAttribute(count, i), 'vec' + i, count)
    const positionBuffer = this.positionBuffer = createBuffer(params.count, 4)
    const rotationBuffer = this.rotationBuffer = createBuffer(params.count)
    const deltaRotationBuffer = this.deltaRotationBuffer = createBuffer(params.count)
    const velocityBuffer = this.velocityBuffer = createBuffer(params.count, 4)
    const colorBuffer = this.colorBuffer = createBuffer(params.count)

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
    })().compute(params.count)

    renderer.computeAsync(computeInit)

    // update function
    this.computeParticles = Fn(() => {
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
    })().compute(params.count)
  }

  update (time) {
    this.uniforms.time.value += time.delta * this.params.noiseTimeCoef
    this.renderer.computeAsync(this.computeParticles)
  }
}
