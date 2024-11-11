fn compose(pos: vec3<f32>, rmat: mat3x3<f32>, scale: vec3<f32>) -> mat4x4<f32> {
	return mat4x4<f32>(
    rmat[0][0] * scale.x, rmat[0][1] * scale.x, rmat[0][2] * scale.x, 0.,
    rmat[1][0] * scale.y, rmat[1][1] * scale.y, rmat[1][2] * scale.y, 0.,
    rmat[2][0] * scale.z, rmat[2][1] * scale.z, rmat[2][2] * scale.z, 0.,
    pos.x, pos.y, pos.z, 1.
  );
}