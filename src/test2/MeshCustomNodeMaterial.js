import { mat3, MeshSSSNodeMaterial, modelViewProjection, normalLocal, positionLocal, vec3, wgslFn } from 'three/tsl'

// import mat3LookAtWgsl from '../wgsl/mat3-lookAt.wgsl?raw'
import mat3RotationXYZ from '../wgsl/mat3-rotationXYZ.wgsl?raw'
import mat4ComposeWgsl from '../wgsl/mat4-compose.wgsl?raw'

// const lookAt = wgslFn(mat3LookAtWgsl)
const rotationXYZ = wgslFn(mat3RotationXYZ)
const compose = wgslFn(mat4ComposeWgsl)

export default class MeshCustomNodeMaterial extends MeshSSSNodeMaterial {
  setupPosition (builder) {
    builder.addStack()

    const rMat = rotationXYZ(vec3())
    const iMat = compose(this.positionNode, rMat, vec3(this.positionNode.w))
    positionLocal.assign(iMat.mul(positionLocal))

    const m = mat3(iMat)
    const transformedNormal = normalLocal.div(vec3(m[0].dot(m[0]), m[1].dot(m[1]), m[2].dot(m[2])))
    normalLocal.assign(rMat.mul(transformedNormal).xyz)

    const mvp = modelViewProjection()

    builder.context.vertex = builder.removeStack()
    builder.context.mvp = mvp

    return mvp
  }
}