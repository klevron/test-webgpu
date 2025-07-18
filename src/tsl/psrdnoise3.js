// Three.js Transpiler r178

import { mod, Fn, mat3, property, floor, fract, step, sub, vec3, min, max, greaterThan, any, vec4, If, cos, sin, sqrt, mix, dot, mul, float } from 'three/tsl'

// Permutation polynomial for the hash value

const permute = /* @__PURE__ */ Fn(([x]) => {
  const xm = mod(x, 289.0)

  return mod(xm.mul(34.0).add(10.0).mul(xm), 289.0)
}, { x: 'vec4', return: 'vec4' })

export const psrdnoise3Fn = /* @__PURE__ */ Fn(([x, period, alpha]) => {
  // Transformation matrices for the axis-aligned simplex grid

  const M = mat3(0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0)
  const Mi = mat3(-0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5)
  const uvw = property('vec3')

  // Transform to simplex space (tetrahedral grid)
  // Use matrix multiplication, let the compiler optimise

  uvw.assign(M.mul(x))

  // Determine which simplex we're in, i0 is the "base corner"

  const i0 = floor(uvw).toVar()
  const f0 = fract(uvw)

  // coords within "skewed cube"
  // To determine which simplex corners are closest, rank order the
  // magnitudes of u,v,w, resolving ties in priority order u,v,w,
  // and traverse the four corners from largest to smallest magnitude.
  // o1, o2 are offsets in simplex space to the 2nd and 3rd corners.

  const g_ = step(f0.xyx, f0.yzz)

  // Makes comparison "less-than"

  const l_ = sub(1.0, g_)

  // complement is "greater-or-equal"

  const g = vec3(l_.z, g_.xy)
  const l = vec3(l_.xy, g_.z)
  const o1 = min(g, l)
  const o2 = max(g, l)

  // Enumerate the remaining simplex corners

  const i1 = i0.add(o1).toVar()
  const i2 = i0.add(o2).toVar()
  const i3 = i0.add(vec3(1.0)).toVar()
  const v0 = property('vec3'); const v1 = property('vec3'); const v2 = property('vec3'); const v3 = property('vec3')

  // Transform the corners back to texture space

  v0.assign(Mi.mul(i0))
  v1.assign(Mi.mul(i1))
  v2.assign(Mi.mul(i2))
  v3.assign(Mi.mul(i3))

  // Compute vectors to each of the simplex corners

  const x0 = x.sub(v0)
  const x1 = x.sub(v1)
  const x2 = x.sub(v2)
  const x3 = x.sub(v3)

  If(any(greaterThan(period, vec3(0.0))), () => {
    // Wrap to periods and transform back to simplex space

    const vx = vec4(v0.x, v1.x, v2.x, v3.x).toVar()
    const vy = vec4(v0.y, v1.y, v2.y, v3.y).toVar()
    const vz = vec4(v0.z, v1.z, v2.z, v3.z).toVar()

    // Wrap to periods where specified

    If(period.x.greaterThan(0.0), () => {
      vx.assign(mod(vx, period.x))
    })

    If(period.y.greaterThan(0.0), () => {
      vy.assign(mod(vy, period.y))
    })

    If(period.z.greaterThan(0.0), () => {
      vz.assign(mod(vz, period.z))
    })

    // Transform back

    i0.assign(M.mul(vec3(vx.x, vy.x, vz.x)))
    i1.assign(M.mul(vec3(vx.y, vy.y, vz.y)))
    i2.assign(M.mul(vec3(vx.z, vy.z, vz.z)))
    i3.assign(M.mul(vec3(vx.w, vy.w, vz.w)))

    // Fix rounding errors

    i0.assign(floor(i0.add(0.5)))
    i1.assign(floor(i1.add(0.5)))
    i2.assign(floor(i2.add(0.5)))
    i3.assign(floor(i3.add(0.5)))
  })

  // Compute one pseudo-random hash value for each corner

  const hash = permute(permute(permute(vec4(i0.z, i1.z, i2.z, i3.z)).add(vec4(i0.y, i1.y, i2.y, i3.y))).add(vec4(i0.x, i1.x, i2.x, i3.x)))

  // Compute generating gradients from a Fibonacci spiral on the unit sphere

  const theta = hash.mul(3.883222077)

  // 2*pi/golden ratio

  const sz = hash.mul(-0.006920415).add(0.996539792)

  // 1-(hash+0.5)*2/289

  const psi = hash.mul(0.108705628)

  // 10*pi/289, chosen to avoid correlation

  const Ct = cos(theta)
  const St = sin(theta)
  const szPrime = sqrt(sub(1.0, sz.mul(sz)))

  // s is a point on a unit fib-sphere

  const gx = property('vec4'); const gy = property('vec4'); const gz = property('vec4')

  // Rotate gradients by angle alpha around a pseudo-random ortogonal axis
  // Slightly slower algorithm, but with g = s for alpha = 0, and a
  // useful conditional speedup for alpha = 0 across all fragments

  If(alpha.notEqual(0.0), () => {
    const Sp = sin(psi)

    // q' from psi on equator

    const Cp = cos(psi)
    const px = Ct.mul(szPrime)

    // px = sx

    const py = St.mul(szPrime)

    // py = sy

    const pz = sz
    const Ctp = St.mul(Sp).sub(Ct.mul(Cp))

    // q = (rotate( cross(s,n), dot(s,n))(q')

    const qx = mix(Ctp.mul(St), Sp, sz)
    const qy = mix(Ctp.mul(-1).mul(Ct), Cp, sz)
    const qz = py.mul(Cp).add(px.mul(Sp)).mul(-1)
    const Sa = vec4(sin(alpha))

    // psi and alpha in different planes

    const Ca = vec4(cos(alpha))
    gx.assign(Ca.mul(px).add(Sa.mul(qx)))
    gy.assign(Ca.mul(py).add(Sa.mul(qy)))
    gz.assign(Ca.mul(pz).add(Sa.mul(qz)))
  }).Else(() => {
    gx.assign(Ct.mul(szPrime))

    // alpha = 0, use s directly as gradient

    gy.assign(St.mul(szPrime))
    gz.assign(sz)
  })

  // Reorganize for dot products below

  const g0 = vec3(gx.x, gy.x, gz.x)
  const g1 = vec3(gx.y, gy.y, gz.y)
  const g2 = vec3(gx.z, gy.z, gz.z)
  const g3 = vec3(gx.w, gy.w, gz.w)

  // Radial decay with distance from each simplex corner

  const w = sub(0.5, vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3))).toVar()
  w.assign(max(w, 0.0))
  const w2 = w.mul(w)
  const w3 = w2.mul(w)

  // The value of the linear ramp from each of the corners

  const gdotx = vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3))

  // Multiply by the radial decay and sum up the noise value

  const n = dot(w3, gdotx)

  // Compute the first order partial derivatives

  const dw = float(-6.0).mul(w2).mul(gdotx)
  const dn0 = w3.x.mul(g0).add(dw.x.mul(x0))
  const dn1 = w3.y.mul(g1).add(dw.y.mul(x1))
  const dn2 = w3.z.mul(g2).add(dw.z.mul(x2))
  const dn3 = w3.w.mul(g3).add(dw.w.mul(x3))

  const result = property('vec4')
  result.xyz.assign(mul(39.5, dn0.add(dn1).add(dn2).add(dn3)))
  result.w.assign(mul(39.5, n))

  return result
}, { x: 'vec3', period: 'vec3', alpha: 'float', return: 'vec4' })
