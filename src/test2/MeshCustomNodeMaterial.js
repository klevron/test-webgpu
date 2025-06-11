import { MeshSSSNodeMaterial } from 'three/webgpu'
import { mat3, normalLocal, positionLocal, uniform, vec3, wgslFn } from 'three/tsl'

// import mat3LookAtWgsl from '../wgsl/mat3-lookAt.wgsl?raw'
import mat3RotationXYZ from '../wgsl/mat3-rotationXYZ.wgsl?raw'
import mat4ComposeWgsl from '../wgsl/mat4-compose.wgsl?raw'

// const lookAt = wgslFn(mat3LookAtWgsl)
const rotationXYZ = wgslFn(mat3RotationXYZ)
const compose = wgslFn(mat4ComposeWgsl)

export default class MeshCustomNodeMaterial extends MeshSSSNodeMaterial {
  constructor (parameters) {
    super(parameters)

    this.thicknessColorNode = null
    this.thicknessDistortionNode = uniform(0.1)
    this.thicknessAmbientNode = uniform(0.0)
    this.thicknessAttenuationNode = uniform(0.1)
    this.thicknessPowerNode = uniform(2.0)
    this.thicknessScaleNode = uniform(10.0)
  }

  setupPosition (builder) {
    const rMat = rotationXYZ(vec3())
    const iMat = compose(this.positionNode, rMat, vec3(this.positionNode.w).mul(this.size))
    positionLocal.assign(iMat.mul(positionLocal))

    const m = mat3(iMat)
    const transformedNormal = normalLocal.div(vec3(m[0].dot(m[0]), m[1].dot(m[1]), m[2].dot(m[2])))
    normalLocal.assign(rMat.mul(transformedNormal).xyz)

		return positionLocal
  }
}
