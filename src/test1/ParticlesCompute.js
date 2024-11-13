import { clamp, code, Fn, hash, instanceIndex, length, smoothstep, storage, StorageInstancedBufferAttribute, uniform, vec3, wgslFn } from 'three/tsl'

import psrdnoise3 from '../wgsl/psrdnoise3.wgsl?raw'
import psrdnoise3Common from '../wgsl/psrdnoise3-common.wgsl?raw'

const psrdnoise3WGSL = wgslFn(psrdnoise3, [code(psrdnoise3Common)])

export default class ParticlesCompute {
  constructor (renderer, params) {
    this.renderer = renderer
    this.params = params

    const timeDelta = uniform(0.0)
    const timeNoise = uniform(0.0)
    const noiseCoordScale = uniform(params.noiseCoordScale)
    const noiseIntensity = uniform(params.noiseIntensity)
    const attractionRadius1 = uniform(params.attractionRadius1)
    const attractionRadius2 = uniform(params.attractionRadius2)
    const maxVelocity = uniform(params.maxVelocity)
    this.uniforms = { timeDelta, timeNoise, noiseCoordScale, noiseIntensity, attractionRadius1, attractionRadius2, maxVelocity }

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
      position.assign(vec3(rand1, rand2, rand3).sub(0.5).normalize().mul(rand4).mul(attractionRadius1))
      position.w = rand5.mul(0.9).add(0.1) // displacement intensity

      // init rotation
      const rand6 = hash(instanceIndex.add(6))
      const rand7 = hash(instanceIndex.add(7))
      const rand8 = hash(instanceIndex.add(8))
      rotation.assign(vec3(rand6, rand7, rand8).sub(0.5).mul(Math.PI * 2))

      // init delta rotation
      const rand9 = hash(instanceIndex.add(9))
      const rand10 = hash(instanceIndex.add(10))
      const rand11 = hash(instanceIndex.add(11))
      deltaRotation.assign(vec3(rand9, rand10, rand11).add(0.25))

      // init velocity
      const rand12 = hash(instanceIndex.add(12))
      velocity.xyz.assign(vec3(0))
      velocity.w = rand12.mul(0.75).add(0.25) // scale

      // init color
      color.assign(vec3(rand1, rand2, rand3).mul(0.75).add(0.25))
    })().compute(params.count)

    renderer.computeAsync(computeInit)

    // update function
    this.computeParticles = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      // noise
      const psrd = psrdnoise3WGSL(position.xyz.mul(noiseCoordScale), vec3(0.0), timeNoise).toVar()
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
      rotation.addAssign(deltaRotation.mul(timeDelta))
    })().compute(params.count)
  }

  update (time) {
    this.uniforms.timeDelta.value = time.delta
    this.uniforms.timeNoise.value += time.delta * this.params.noiseTimeCoef
    this.renderer.computeAsync(this.computeParticles)
  }

  dispose () {
    this.positionBuffer.dispose()
    this.rotationBuffer.dispose()
    this.deltaRotationBuffer.dispose()
    this.velocityBuffer.dispose()
    this.colorBuffer.dispose()
  }
}
