import { DirectionalLight, InstancedMesh, PointLight, SphereGeometry, Vector3 } from 'three'
import { clamp, float, Fn, hash, If, instanceIndex, length, Loop, max, step, storage, StorageInstancedBufferAttribute, uint, uniform, vec3 } from 'three/tsl'

import MeshCustomNodeMaterial from './MeshCustomNodeMaterial'

const defaultConfig = {
  count: 5000,
  size: 1,
  materialParams: { metalness: 1, roughness: 0.1 }
}

export default class Particles extends InstancedMesh {
  constructor (renderer, params) {
    const _params = { ...defaultConfig, ...params }

    const material = new MeshCustomNodeMaterial(_params.materialParams)
    const geometry = new SphereGeometry()

    super(geometry, material, _params.count)
    this.params = _params

    this.frustumCulled = false
    this.initLights()

    this.compute = new ParticlesCompute(renderer, this.params)
    this.uniforms = { ...this.compute.uniforms }

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
    light1.target.position.set(1, 1, 2)
    this.add(light1)
    this.add(light1.target)

    const light2 = this.light2 = new DirectionalLight(0x3060ff, 2)
    light2.position.set(1, 1, -1)
    light2.target.position.set(-1, -1, 2)
    this.add(light2)
    this.add(light2.target)
  }

  dispose () {
    this.compute.dispose()
    this.geometry.dispose()
    this.material.dispose()
  }
}

class ParticlesCompute {
  constructor (renderer, params) {
    this.renderer = renderer
    this.params = params

    const timeDelta = uniform(0.0)
    const timeElapsed = uniform(0.0)
    const size = uniform(params.size)
    const center = uniform(new Vector3(0))
    this.uniforms = { timeDelta, timeElapsed, size, center }

    // const createAttribute = (count, i = 3) => new StorageInstancedBufferAttribute(count, i)
    // const positionAttribute = this.positionAttribute = createAttribute(params.count, 4)
    // const velocityAttribute = this.velocityAttribute = createAttribute(params.count, 4)
    // const colorAttribute = this.colorAttribute = createAttribute(params.count)

    // const createBuffer = (attribute, count, i = 3) => storage(attribute, 'vec' + i, count)
    // const positionBuffer = this.positionBuffer = createBuffer(positionAttribute, params.count, 4)
    // const velocityBuffer = this.velocityBuffer = createBuffer(velocityAttribute, params.count, 4)
    // const colorBuffer = this.colorBuffer = createBuffer(colorAttribute, params.count)

    const createBuffer = (count, i = 3) => storage(new StorageInstancedBufferAttribute(count, i), 'vec' + i, count)
    const positionBuffer = this.positionBuffer = createBuffer(params.count, 4)
    const velocityBuffer = this.velocityBuffer = createBuffer(params.count, 4)
    const colorBuffer = this.colorBuffer = createBuffer(params.count)

    // init function
    const computeInit = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      const color = colorBuffer.element(instanceIndex)

      // init position
      const rand1 = hash(instanceIndex)
      const rand2 = hash(instanceIndex.add(2))
      const rand3 = hash(instanceIndex.add(3))
      const rand4 = hash(instanceIndex.add(4))
      const rand5 = hash(instanceIndex.add(5))
      position.xyz.assign(vec3(rand1, rand2, rand3).sub(0.5).normalize().mul(rand4.mul(0.3).add(0.2)).mul(10))
      position.w = rand5.mul(0.08).add(0.02) // radius

      // init velocity
      velocity.xyz.assign(vec3(0))
      velocity.w = 1

      // init color
      color.assign(vec3(rand1, rand2, rand3).mul(0.9).add(0.1))

      If(instanceIndex.equal(0), () => {
        position.xyz.assign(center)
        position.w = 1
        velocity.w = 0
        color.assign(vec3(0.5))
      })
    })().compute(params.count)

    renderer.computeAsync(computeInit)

    // update function 1 : attraction
    this.computeParticles1 = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      If(instanceIndex.greaterThan(0), () => {
        const dv = center.sub(position.xyz)
        const intensity = max(position.w.mul(size).mul(position.w.mul(size)), 0.1)
        velocity.xyz.addAssign(dv.normalize().mul(0.0025).mul(intensity))
        velocity.xyz.mulAssign(0.9975)
        velocity.xyz.assign(clamp(velocity.xyz, -0.04, 0.04))
        position.xyz.addAssign(velocity.xyz)
      }).Else(() => {
        position.xyz.assign(center)
        // velocity.xyz.assign(vec3(0))
      })
    })().compute(params.count)

    // update function 2 : collision
    this.computeParticles2 = Fn(() => {
      const position1 = positionBuffer.element(instanceIndex)
      const velocity1 = velocityBuffer.element(instanceIndex)

      const count = uint(params.count)
      Loop({ start: uint(0), end: count, type: 'uint', condition: '<' }, ({ i }) => {
        If(i.notEqual(instanceIndex), () => {
          const position2 = positionBuffer.element(i)
          const dv = position2.xyz.sub(position1.xyz)
          const distance = length(dv)
          const minDistance = position1.w.mul(size).add(position2.w.mul(size))
          If(distance.lessThan(minDistance), () => {
            const dif = minDistance.sub(distance)
            const correction = dv.normalize().mul(dif.mul(0.5))
            const velocity2 = velocityBuffer.element(i)
            const velocityCorrection1 = correction.mul(max(length(velocity1.xyz), 2))
            const velocityCorrection2 = correction.mul(max(length(velocity2.xyz), 2))
            If(instanceIndex.greaterThan(0), () => {
              // position1.xyz.subAssign(correction)
              position1.xyz.subAssign(correction.mul(float(2).sub(step(velocity2.w, 1))))
              velocity1.xyz.subAssign(velocityCorrection1)
            })
            If(i.greaterThan(0), () => {
              // position2.xyz.addAssign(correction)
              position2.xyz.addAssign(correction.mul(float(2).sub(step(velocity1.w, 1))))
              velocity2.xyz.addAssign(velocityCorrection2)
            })
          })
        })
      })
    })().compute(params.count)
  }

  update (time) {
    this.uniforms.timeDelta.value = time.delta
    this.uniforms.timeElapsed.value += time.delta
    this.renderer.computeAsync(this.computeParticles1)
    this.renderer.computeAsync(this.computeParticles2)
  }

  dispose () {
    this.positionBuffer.dispose()
    this.velocityBuffer.dispose()
    this.colorBuffer.dispose()
  }
}
