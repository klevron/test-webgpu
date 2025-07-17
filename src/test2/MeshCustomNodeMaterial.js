import { MeshSSSNodeMaterial } from 'three/webgpu'
import { uniform } from 'three/tsl'

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
}
