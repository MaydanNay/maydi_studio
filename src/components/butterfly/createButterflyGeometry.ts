import * as THREE from 'three'

/**
 * Low-poly butterfly: body + left/right wings.
 * Attribute `aWing`: -1 left, 0 body, +1 right — for vertex flap.
 */
function pushTri(
  positions: number[],
  wings: number[],
  uvs: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  wing: number,
) {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  wings.push(wing, wing, wing)
  // planar UVs from XY bounds later normalized
  uvs.push(a.x, a.y, b.x, b.y, c.x, c.y)
}

function fanWing(
  positions: number[],
  wings: number[],
  uvs: number[],
  hinge: THREE.Vector3,
  outline: THREE.Vector3[],
  wing: number,
) {
  for (let i = 0; i < outline.length - 1; i++) {
    pushTri(positions, wings, uvs, hinge, outline[i], outline[i + 1], wing)
  }
}

export function createButterflyGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const wings: number[] = []
  const uvs: number[] = []

  const hingeL = new THREE.Vector3(-0.04, 0, 0)
  const hingeR = new THREE.Vector3(0.04, 0, 0)

  // Left fore + hind wing outline (XY), organic moth/butterfly
  const leftFore = [
    new THREE.Vector3(-0.08, 0.06, 0),
    new THREE.Vector3(-0.32, 0.28, 0),
    new THREE.Vector3(-0.55, 0.22, 0),
    new THREE.Vector3(-0.62, 0.02, 0),
    new THREE.Vector3(-0.48, -0.08, 0),
    new THREE.Vector3(-0.22, -0.02, 0),
    new THREE.Vector3(-0.06, 0.02, 0),
  ]
  const leftHind = [
    new THREE.Vector3(-0.06, -0.02, 0),
    new THREE.Vector3(-0.28, -0.12, 0),
    new THREE.Vector3(-0.42, -0.32, 0),
    new THREE.Vector3(-0.28, -0.42, 0),
    new THREE.Vector3(-0.1, -0.28, 0),
    new THREE.Vector3(-0.04, -0.08, 0),
  ]

  fanWing(positions, wings, uvs, hingeL, leftFore, -1)
  fanWing(positions, wings, uvs, hingeL, leftHind, -1)

  // Mirror right
  const mirror = (pts: THREE.Vector3[]) =>
    pts.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
  fanWing(positions, wings, uvs, hingeR, mirror(leftFore), 1)
  fanWing(positions, wings, uvs, hingeR, mirror(leftHind), 1)

  // Body (abdomen + thorax) — aWing = 0
  const body = [
    new THREE.Vector3(0, 0.22, 0.01),
    new THREE.Vector3(0.05, 0.08, 0.01),
    new THREE.Vector3(0.04, -0.2, 0.01),
    new THREE.Vector3(0, -0.32, 0.01),
    new THREE.Vector3(-0.04, -0.2, 0.01),
    new THREE.Vector3(-0.05, 0.08, 0.01),
  ]
  const bodyCenter = new THREE.Vector3(0, -0.02, 0.01)
  for (let i = 0; i < body.length; i++) {
    pushTri(positions, wings, uvs, bodyCenter, body[i], body[(i + 1) % body.length], 0)
  }

  // Head
  const head = new THREE.Vector3(0, 0.28, 0.015)
  pushTri(
    positions,
    wings,
    uvs,
    head,
    new THREE.Vector3(-0.035, 0.2, 0.01),
    new THREE.Vector3(0.035, 0.2, 0.01),
    0,
  )

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aWing', new THREE.Float32BufferAttribute(wings, 1))

  // Normalize UVs to 0–1
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < uvs.length; i += 2) {
    minX = Math.min(minX, uvs[i])
    maxX = Math.max(maxX, uvs[i])
    minY = Math.min(minY, uvs[i + 1])
    maxY = Math.max(maxY, uvs[i + 1])
  }
  const spanX = Math.max(maxX - minX, 1e-5)
  const spanY = Math.max(maxY - minY, 1e-5)
  for (let i = 0; i < uvs.length; i += 2) {
    uvs[i] = (uvs[i] - minX) / spanX
    uvs[i + 1] = (uvs[i + 1] - minY) / spanY
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()

  return geo
}
