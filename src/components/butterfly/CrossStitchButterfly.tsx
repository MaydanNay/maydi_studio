import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createButterflyGeometry } from './createButterflyGeometry'

export type PerchPoint = { x: number; y: number }

type MouseState = {
  current: THREE.Vector2
  target: THREE.Vector2
  force: number
}

const IDLE_MS = 2200

const vertexShader = /* glsl */ `
  attribute float aWing;
  uniform float u_time;
  uniform float u_flapAmp;
  uniform float u_flapSpeed;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Procedural wing flap - rotate around body Z (no bones)
    float side = aWing;
    float angle = sin(u_time * u_flapSpeed) * u_flapAmp * side;
    float c = cos(angle);
    float s = sin(angle);
    float x = pos.x * c - pos.y * s;
    float y = pos.x * s + pos.y * c;
    pos.x = x;
    pos.y = y;
    // Slight Z lift at wing tips for volume
    pos.z += abs(side) * abs(sin(angle)) * 0.04 * abs(position.x);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_opacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float sdCross(vec2 p, float armLen, float thickness) {
    p = abs(p);
    float h = max(p.x - armLen, p.y - thickness);
    float v = max(p.y - armLen, p.x - thickness);
    return min(h, v);
  }

  // Palette: #C8D6D1 #C58975 #DED6BB #809894 #FDFDC7
  vec3 palette(vec2 uv) {
    float n = vnoise(uv * 3.2 + u_time * 0.08);
    float m = vnoise(uv * 5.5 - u_time * 0.05);
    float field = mix(n, m, 0.4);

    vec3 sage = vec3(0.784, 0.839, 0.820);
    vec3 copper = vec3(0.773, 0.537, 0.459);
    vec3 cream = vec3(0.871, 0.839, 0.733);
    vec3 teal = vec3(0.502, 0.596, 0.580);
    vec3 butter = vec3(0.992, 0.992, 0.780);

    float warm = smoothstep(0.3, 0.75, field + (1.0 - uv.y) * 0.25);
    float hi = smoothstep(0.55, 0.9, field);
    vec3 cool = mix(teal, sage, field);
    vec3 warmCol = mix(copper, cream, m);
    vec3 col = mix(cool, warmCol, warm);
    return mix(col, butter, hi * 0.55);
  }

  void main() {
    // Screen-space cross-stitch matrix (hologram of data)
    float cellPx = 7.0;
    vec2 pixel = gl_FragCoord.xy;
    vec2 cellId = floor(pixel / cellPx);
    vec2 local = fract(pixel / cellPx) - 0.5;

    vec2 cellCenterUV = (cellId + 0.5) * cellPx / u_resolution;
    // Local model chroma from mesh UVs
    vec3 chroma = palette(vUv);
    chroma = mix(chroma, palette(cellCenterUV), 0.35);

    float lum = dot(chroma, vec3(0.299, 0.587, 0.114));
    float arm = mix(0.14, 0.4, smoothstep(0.1, 0.7, lum + vUv.y * 0.2));
    float thick = mix(0.04, 0.1, lum);

    float d = sdCross(local, arm, thick);
    float aa = 1.2 / cellPx;
    float crossMask = 1.0 - smoothstep(-aa, aa, d);

    if (crossMask < 0.08) discard;

    vec3 color = chroma * (0.75 + lum * 0.45);
    color += vec3(0.992, 0.992, 0.780) * pow(lum, 2.0) * 0.15;

    gl_FragColor = vec4(color, crossMask * u_opacity);
  }
`

type CrossStitchButterflyProps = {
  mouse: MutableRefObject<MouseState>
  perchPoints: MutableRefObject<PerchPoint[]>
  active: boolean
}

export function CrossStitchButterfly({
  mouse,
  perchPoints,
  active,
}: CrossStitchButterflyProps) {
  const group = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, size } = useThree()

  const geometry = useMemo(() => createButterflyGeometry(), [])

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_flapAmp: { value: 0.55 },
      u_flapSpeed: { value: 9.0 },
      u_opacity: { value: 0.92 },
    }),
    [],
  )

  const pos = useRef(new THREE.Vector3(0, 0.15, 0.2))
  const vel = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3(0, 0.15, 0.2))
  const lastMove = useRef(performance.now())
  const lastMouse = useRef(new THREE.Vector2(0.5, 0.5))
  const perchIndex = useRef(0)
  const perchTimer = useRef(0)
  const bank = useRef(0)

  useFrame((state, delta) => {
    if (!active || !group.current || !matRef.current) return

    const dt = Math.min(delta, 0.05)
    const m = mouse.current
    const moved =
      Math.hypot(m.target.x - lastMouse.current.x, m.target.y - lastMouse.current.y) > 0.002
    if (moved) {
      lastMove.current = performance.now()
      lastMouse.current.copy(m.target)
    }

    const idle = performance.now() - lastMove.current > IDLE_MS
    const vw = viewport.width
    const vh = viewport.height

    if (idle && perchPoints.current.length > 0) {
      perchTimer.current += dt
      if (perchTimer.current > 4.5) {
        perchTimer.current = 0
        perchIndex.current = (perchIndex.current + 1) % perchPoints.current.length
      }
      const p = perchPoints.current[perchIndex.current]
      // UV 0–1 → orthographic world
      target.current.set((p.x - 0.5) * vw, (p.y - 0.5) * vh, 0.25)
    } else {
      // Follow smoothed mouse
      target.current.set((m.current.x - 0.5) * vw, (m.current.y - 0.5) * vh, 0.35)
      // Offset slightly so butterfly doesn't sit under cursor
      target.current.x += 0.12
      target.current.y += 0.08
    }

    // Steering with inertia (boids-lite)
    const desired = target.current.clone().sub(pos.current)
    const dist = desired.length()
    const maxSpeed = idle ? 0.55 : 1.35
    if (dist > 1e-4) desired.multiplyScalar(maxSpeed / dist)
    const steer = desired.sub(vel.current).multiplyScalar(idle ? 1.8 : 3.2)
    vel.current.add(steer.multiplyScalar(dt))
    vel.current.multiplyScalar(1 - 0.08)
    // Clamp
    if (vel.current.length() > maxSpeed) vel.current.setLength(maxSpeed)
    pos.current.add(vel.current.clone().multiplyScalar(dt))

    // Soft bob while flying
    const bob = idle ? Math.sin(state.clock.elapsedTime * 1.2) * 0.008 : Math.sin(state.clock.elapsedTime * 3.0) * 0.02
    group.current.position.set(pos.current.x, pos.current.y + bob, pos.current.z)

    // Bank into turn
    const targetBank = THREE.MathUtils.clamp(-vel.current.x * 0.9, -0.55, 0.55)
    bank.current = THREE.MathUtils.damp(bank.current, targetBank, 4, dt)
    group.current.rotation.z = bank.current
    group.current.rotation.x = idle ? -0.15 : -0.35 + Math.sin(state.clock.elapsedTime * 2) * 0.05
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      vel.current.x * 0.35,
      3,
      dt,
    )

    // Scale relative to viewport
    const s = Math.min(vw, vh) * (idle ? 0.13 : 0.15)
    group.current.scale.setScalar(s)

    // Flap: slow when perched, faster in flight
    const mat = matRef.current
    mat.uniforms.u_time.value = state.clock.elapsedTime
    mat.uniforms.u_resolution.value.set(size.width, size.height)
    mat.uniforms.u_flapAmp.value = THREE.MathUtils.damp(
      mat.uniforms.u_flapAmp.value,
      idle ? 0.18 : 0.62,
      2.5,
      dt,
    )
    mat.uniforms.u_flapSpeed.value = THREE.MathUtils.damp(
      mat.uniforms.u_flapSpeed.value,
      idle ? 4.5 : 10.5,
      2.5,
      dt,
    )
  })

  return (
    <group ref={group} renderOrder={2}>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
