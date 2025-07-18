import { Vector4 } from 'three'
import { clamp, Fn, instancedArray, instanceIndex, length, smoothstep, uniform, vec3 } from 'three/tsl'

import { psrdnoise3Fn } from '../tsl/psrdnoise3.js'

const rnd = Math.random

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

    const positionData = (() => {
      const data = new Float32Array(params.count * 4)
      const pos = new Vector4()
      for (let i = 0; i < params.count; i++) {
        pos.set(rnd(), rnd(), rnd(), 0)
        pos.subScalar(0.5).normalize().multiplyScalar(rnd() * params.attractionRadius1)
        pos.w = rnd() * 0.9 + 0.1 // displacement intensity
        pos.toArray(data, i * 4)
      }
      return data
    })()

    const velocityData = (() => {
      const data = new Float32Array(params.count * 4)
      const v = new Vector4()
      for (let i = 0; i < params.count; i++) {
        v.set(0, 0, 0, rnd() * 0.75 + 0.25) // w : scale
        v.toArray(data, i * 4)
      }
      return data
    })()

    const rotationData = new Float32Array(params.count * 3).fill(0).map(() => (rnd() - 0.5) * Math.PI * 2)
    const deltaRotationData = new Float32Array(params.count * 3).fill(0).map(() => rnd() + 0.25)
    const colorData = new Float32Array(params.count * 3).fill(0).map(() => (rnd() * 0.75 + 0.25))

    const positionBuffer = this.positionBuffer = instancedArray(positionData, 'vec4') // .setPBO(true) // setPBO(true) is only important for the WebGL Fallback
    const velocityBuffer = this.velocityBuffer = instancedArray(velocityData, 'vec4')
    const rotationBuffer = this.rotationBuffer = instancedArray(rotationData, 'vec3')
    const deltaRotationBuffer = this.deltaRotationBuffer = instancedArray(deltaRotationData, 'vec3')
    this.colorBuffer = instancedArray(colorData, 'vec3')

    // update function
    this.computeParticles = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      // noise
      const psrd = psrdnoise3Fn(position.xyz.mul(noiseCoordScale), vec3(0.0), timeNoise).toVar()
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

  async update (time) {
    this.uniforms.timeDelta.value = time.delta
    this.uniforms.timeNoise.value += time.delta * this.params.noiseTimeCoef
    await this.renderer.computeAsync(this.computeParticles)
  }

  dispose () {
    this.positionBuffer.dispose()
    this.rotationBuffer.dispose()
    this.deltaRotationBuffer.dispose()
    this.velocityBuffer.dispose()
    this.colorBuffer.dispose()
  }
}
