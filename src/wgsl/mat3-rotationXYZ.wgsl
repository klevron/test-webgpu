fn rotationXYZ(euler:vec3<f32>) -> mat3x3<f32> {
  let a = cos(euler.x); let b = sin(euler.x);
  let c = cos(euler.y); let d = sin(euler.y);
  let e = cos(euler.z); let f = sin(euler.z);
  let ae = a * e; let af = a * f; let be = b * e; let bf = b * f;
  return mat3x3<f32>(
    vec3<f32>(c * e, af + be * d, bf - ae * d),
    vec3<f32>(-c * f, ae - bf * d, be + af * d),
    vec3<f32>(d, -b * c, a * c)
  );
}