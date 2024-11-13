import { DirectionalLight, InstancedMesh, PointLight, SphereGeometry } from 'three'

import ParticlesCompute from './ParticlesCompute'
import MeshCustomNodeMaterial from './MeshCustomNodeMaterial'

export const defaultParams = {
  count: 1000,
  size0: 1,
  size: 1,
  maxVelocity: 0.03,
  materialParams: { metalness: 1, roughness: 0.1 }
}

export default class Particles extends InstancedMesh {
  constructor (renderer, params) {
    const _params = { ...defaultParams, ...params }

    const material = new MeshCustomNodeMaterial(_params.materialParams)
    const geometry = new SphereGeometry()

    super(geometry, material, _params.count)
    this.params = _params

    this.frustumCulled = false
    this.initLights()

    this.compute = new ParticlesCompute(renderer, this.params)
    this.uniforms = { ...this.compute.uniforms }

    this.uniforms.maxVelocity.value = this.params.maxVelocity

    this.material.size = this.uniforms.size
    this.material.positionNode = this.compute.positionBuffer.toAttribute()
    this.material.velocityNode = this.compute.velocityBuffer.toAttribute()
    this.material.colorNode = this.compute.colorBuffer.toAttribute()
    this.material.thicknessColorNode = this.compute.colorBuffer.toAttribute()
    // this.material.thicknessDistortionNode.value = 0.1 // default 0.1
    this.material.thicknessAttenuationNode.value = 0.125 // default 0.1
    // this.material.thicknessPowerNode.value = 2 // default 2
    // this.material.thicknessScaleNode.value = 10 // default 10

    this.update = this.compute.update.bind(this.compute)
  }

  initLights () {
    const light = this.light = new PointLight(0xffffff, 2)
    light.position.set(0, 0, 0)
    this.add(light)

    const light1 = this.light1 = new DirectionalLight(0xff6030, 2)
    light1.position.set(-1, -1, -1)
    light1.target.position.set(1, 1, 3)
    this.add(light1)
    this.add(light1.target)

    const light2 = this.light2 = new DirectionalLight(0x3060ff, 2)
    light2.position.set(1, 1, -1)
    light2.target.position.set(-1, -1, 3)
    this.add(light2)
    this.add(light2.target)
  }

  dispose () {
    this.compute.dispose()
    this.geometry.dispose()
    this.material.dispose()
  }
}
