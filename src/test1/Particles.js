import { DirectionalLight, InstancedMesh } from 'three'
import { uniform } from 'three/tsl'

import ParticlesCompute from './ParticlesCompute'
import MeshCustomNodeMaterial from './MeshCustomNodeMaterial'

export const defaultParams = {
  count: 250000,
  size: 1,
  materialParams: { metalness: 0.75, roughness: 0.25 },
  noiseCoordScale: 0.01,
  noiseIntensity: 0.0025,
  noiseTimeCoef: 0.375,
  attractionRadius1: 250,
  attractionRadius2: 350,
  maxVelocity: 0.1
}

export default class Particles extends InstancedMesh {
  constructor (renderer, params) {
    const _params = { ...defaultParams, ...params }

    const material = new MeshCustomNodeMaterial(_params.materialParams)

    super(_params.geometry, material, _params.count)
    this.params = _params

    this.frustumCulled = false
    this.initLights()

    this.compute = new ParticlesCompute(renderer, this.params)
    this.uniforms = { ...this.compute.uniforms, size: uniform(this.params.size) }

    this.material.size = this.uniforms.size
    this.material.positionNode = this.compute.positionBuffer.toAttribute()
    this.material.rotationNode = this.compute.rotationBuffer.toAttribute()
    this.material.velocityNode = this.compute.velocityBuffer.toAttribute()
    this.material.colorNode = this.compute.colorBuffer.toAttribute()

    this.update = this.compute.update.bind(this.compute)
  }

  initLights () {
    const light1 = this.light1 = new DirectionalLight(0xff9060, 2)
    light1.position.set(-1, -1, 0)
    light1.target.position.set(0, 0, 0)
    this.add(light1)
    this.add(light1.target)

    const light2 = this.light2 = new DirectionalLight(0x6090ff, 2)
    light2.position.set(1, 1, 0)
    light2.target.position.set(0, 0, 0)
    this.add(light2)
    this.add(light2.target)
  }

  dispose () {
    this.compute.dispose()
    this.geometry.dispose()
    this.material.dispose()
  }
}
