import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import {
  CrossStitchButterfly,
  type PerchPoint,
} from './butterfly/CrossStitchButterfly'

/**
 * ASCII / Cross-Stitch Chroma Matrix
 * Discrete SDF "+" grid warped by viscous noise + mouse swirl.
 * Color sampled at each cell center from an underlying chroma field.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec2 u_mousePrev;
  uniform float u_mouseForce;

  varying vec2 vUv;

  // ─── Hash / value noise (cheap Perlin stand-in) ─────────────
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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.02 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // Divergence-ish flow from noise gradient
  vec2 flowField(vec2 p) {
    float e = 0.08;
    float n1 = fbm(p + vec2(0.0, e));
    float n2 = fbm(p - vec2(0.0, e));
    float n3 = fbm(p + vec2(e, 0.0));
    float n4 = fbm(p - vec2(e, 0.0));
    return vec2(n1 - n2, n4 - n3);
  }

  // Soft liquid mouse push - linear, no vortex / ripples / 1/r
  // influence from screen UV; offset applied on top of already-flowed UV
  vec2 softMousePush(vec2 screenUv, vec2 flowedUv, float aspect) {
    if (u_mouse.x < 0.0 || u_mouse.x > 1.0 || u_mouse.y < 0.0 || u_mouse.y > 1.0) {
      return flowedUv;
    }

    vec2 delta = screenUv - u_mouse;
    delta.x *= aspect; // round radius
    float mouseDist = length(delta);
    float mouseInfluence = smoothstep(0.65, 0.0, mouseDist);

    vec2 push = delta;
    push.x /= max(aspect, 1e-4);

    // Same soft shape, stronger push
    return flowedUv + push * mouseInfluence * 0.72;
  }

  // Autonomous background flow only (no mouse math here)
  vec2 autonomousFlow(vec2 uv, float t, float aspect) {
    vec2 p = uv * vec2(aspect, 1.0);

    vec2 f1 = flowField(p * 1.2 + vec2(t * 0.22, -t * 0.16));
    vec2 f2 = flowField(p * 2.4 - vec2(t * 0.14, t * 0.18) + 2.8);
    vec2 f3 = flowField(p * 0.65 + vec2(-t * 0.09, t * 0.11));

    vec2 disp = f1 * 0.09 + f2 * 0.045 + f3 * 0.03;

    disp += vec2(
      sin(t * 0.35 + uv.y * 2.8),
      cos(t * 0.28 + uv.x * 2.2)
    ) * 0.028;

    return uv + disp;
  }

  // Flow first, then soft mouse on top (so cursor always reads)
  vec2 displaceUV(vec2 uv, float t, float aspect) {
    vec2 flowed = autonomousFlow(uv, t, aspect);
    return softMousePush(uv, flowed, aspect);
  }

  // Rusty + ashy metals
  vec3 petrolRamp(float h) {
    h = fract(h);
    vec3 c0 = vec3(0.22, 0.22, 0.23); // ash charcoal
    vec3 c1 = vec3(0.38, 0.36, 0.34); // warm ash
    vec3 c2 = vec3(0.48, 0.42, 0.36); // dusty taupe
    vec3 c3 = vec3(0.55, 0.32, 0.18); // rust
    vec3 c4 = vec3(0.42, 0.22, 0.12); // deep oxidized rust
    vec3 c5 = vec3(0.62, 0.40, 0.22); // iron oxide
    vec3 c6 = vec3(0.58, 0.48, 0.38); // ash bronze

    float x = h * 6.0;
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    vec3 a = c0;
    vec3 b = c1;
    if (i < 0.5) { a = c0; b = c1; }
    else if (i < 1.5) { a = c1; b = c2; }
    else if (i < 2.5) { a = c2; b = c3; }
    else if (i < 3.5) { a = c3; b = c4; }
    else if (i < 4.5) { a = c4; b = c5; }
    else { a = c5; b = c6; }

    return mix(a, b, f);
  }

  vec3 chromaAt(vec2 uv, float t, float aspect) {
    vec2 p = uv * vec2(aspect, 1.0);
    float n = fbm(p * 1.8 + vec2(t * 0.05, t * 0.03));
    float m = fbm(p * 3.1 - vec2(t * 0.04, -t * 0.02) + 4.2);
    float q = fbm(p * 5.2 + vec2(-t * 0.06, t * 0.04) + 9.1);
    float field = mix(n, m, 0.4);

    float hue =
      field * 0.6 +
      q * 0.28 +
      (1.0 - uv.y) * 0.35 +
      uv.x * 0.1 +
      t * 0.08;

    vec3 col = petrolRamp(hue);
    vec3 fringe = petrolRamp(hue + 0.1 + m * 0.12);
    col = mix(col, fringe, 0.28);

    float rustFleck = smoothstep(0.72, 0.9, field * m);
    col = mix(col, vec3(0.58, 0.28, 0.12), rustFleck * 0.4);

    float presence = pow(smoothstep(0.12, 0.55, field), 0.95);
    presence = max(presence, 0.28);
    col *= 0.65 + presence * 0.65;

    return col * presence;
  }

  // SDF for axis-aligned "+" cross inside cell local coords [-0.5, 0.5]
  float sdCross(vec2 p, float armLen, float thickness) {
    p = abs(p);
    // Horizontal bar of vertical arm
    float h = max(p.x - armLen, p.y - thickness);
    float v = max(p.y - armLen, p.x - thickness);
    return min(h, v);
  }

  void main() {
    vec2 uv = vUv;
    float t = u_time * 0.32;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);

    vec2 duv = displaceUV(uv, t, aspect);

    float cellPx = 9.0;
    vec2 pixel = duv * u_resolution;
    vec2 cellId = floor(pixel / cellPx);
    vec2 cellOrigin = cellId * cellPx;
    vec2 local = (pixel - cellOrigin) / cellPx - 0.5;

    vec2 cellCenterUV = (cellOrigin + cellPx * 0.5) / u_resolution;
    vec3 chroma = chromaAt(cellCenterUV, t, aspect);
    float luminance = dot(chroma, vec3(0.299, 0.587, 0.114));

    float arm = mix(0.16, 0.36, smoothstep(0.0, 0.45, luminance));
    float thick = mix(0.04, 0.085, smoothstep(0.0, 0.4, luminance));

    float j = (hash21(cellId) - 0.5) * 0.03;
    local += j;

    float d = sdCross(local, arm, thick);
    float aa = 1.5 / cellPx;
    float crossMask = 1.0 - smoothstep(-aa, aa, d);

    float visibility = mix(0.45, 1.0, smoothstep(0.0, 0.12, luminance));
    // Slight translucency - crosses don't fully cover the void
    crossMask *= visibility * 0.7;

    vec3 bg = vec3(0.02);
    vec3 color = mix(bg, chroma, crossMask);
    color += chroma * crossMask * smoothstep(0.25, 0.75, luminance) * 0.08;

    // Less pattern on the sides - fade left/right toward void
    float sideFade = smoothstep(0.0, 0.28, uv.x) * smoothstep(0.0, 0.28, 1.0 - uv.x);
    sideFade = mix(0.12, 1.0, sideFade);
    color = mix(bg, color, sideFade);

    // Soft vertical vignette only (sides already handled)
    vec2 vc = uv - 0.5;
    float vig = smoothstep(1.15, 0.25, abs(vc.y) * 1.6);
    vig = mix(0.88, 1.0, vig);
    color = mix(bg, color, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`

type MouseState = {
  current: THREE.Vector2
  target: THREE.Vector2
  force: number
}

const TARGET_FPS = 30
const FRAME_MS = 1000 / TARGET_FPS

function FluidPlane({
  mouse,
  active,
}: {
  mouse: MutableRefObject<MouseState>
  active: boolean
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { size, viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_mousePrev: { value: new THREE.Vector2(0.5, 0.5) },
      u_mouseForce: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!active) return
    const mat = matRef.current
    if (!mat) return

    const m = mouse.current
    m.current.lerp(m.target, 1 - Math.exp(-Math.min(delta, 0.05) * 2.0))
    m.force *= Math.exp(-Math.min(delta, 0.05) * 1.4)

    mat.uniforms.u_time.value = state.clock.elapsedTime
    mat.uniforms.u_resolution.value.set(size.width, size.height)
    mat.uniforms.u_mousePrev.value.copy(mat.uniforms.u_mouse.value)
    mat.uniforms.u_mouse.value.set(m.current.x, m.current.y)
    mat.uniforms.u_mouseForce.value = Math.min(m.force, 1.45)
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

type FluidHalftoneBackgroundProps = {
  className?: string
}

function measurePerches(root: HTMLElement): PerchPoint[] {
  const nodes = root.ownerDocument.querySelectorAll<HTMLElement>('[data-hero-perch]')
  const rect = root.getBoundingClientRect()
  const points: PerchPoint[] = []
  nodes.forEach((node) => {
    const r = node.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return
    points.push({
      x: (r.left + r.width * 0.5 - rect.left) / Math.max(rect.width, 1),
      // WebGL Y up
      y: 1 - (r.top + r.height * 0.35 - rect.top) / Math.max(rect.height, 1),
    })
  })
  return points
}

export function FluidHalftoneBackground({ className = '' }: FluidHalftoneBackgroundProps) {
  const mouse = useRef<MouseState>({
    current: new THREE.Vector2(0.5, 0.5),
    target: new THREE.Vector2(0.5, 0.5),
    force: 0,
  })
  const perchPoints = useRef<PerchPoint[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  )

  const active = visible && pageVisible

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const syncPerches = () => {
      perchPoints.current = measurePerches(el)
    }
    syncPerches()
    const ro = new ResizeObserver(syncPerches)
    ro.observe(el)
    window.addEventListener('resize', syncPerches)
    // Letters may layout after fonts load
    const t = window.setTimeout(syncPerches, 400)

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio > 0.05),
      { threshold: [0, 0.05, 0.2] },
    )
    io.observe(el)

    const onVis = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncPerches)
      window.clearTimeout(t)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onMove = (e: PointerEvent) => {
      if (!active) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
      const y = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1)
      const m = mouse.current
      const nx = THREE.MathUtils.clamp(x, 0, 1)
      const ny = THREE.MathUtils.clamp(y, 0, 1)
      m.force = Math.min(m.force + Math.hypot(nx - m.target.x, ny - m.target.y) * 8, 1.45)
      m.target.set(nx, ny)
      // Keep cursor tracking snappy so soft push is always under the pointer
      m.current.lerp(m.target, 0.55)
      invalidate()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [active])

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => invalidate(), FRAME_MS)
    invalidate()
    return () => window.clearInterval(id)
  }, [active])

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      <Canvas
        dpr={0.85}
        frameloop={active ? 'always' : 'demand'}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#050505']} />
        <OrthographicCamera makeDefault position={[0, 0, 2]} near={0.1} far={20} />
        <FluidPlane mouse={mouse} active={active} />
        <CrossStitchButterfly mouse={mouse} perchPoints={perchPoints} active={active} />
      </Canvas>
    </div>
  )
}

export default FluidHalftoneBackground
