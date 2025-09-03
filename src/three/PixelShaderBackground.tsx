import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

type PixelShaderBackgroundProps = {
  pixelSize?: number // larger = chunkier pixels (2..8)
  zIndex?: number
}

// Fullscreen animated shader background rendered at low resolution and upscaled
// with nearest-neighbor sampling for a pixel-art look.
export function PixelShaderBackground(props: PixelShaderBackgroundProps): JSX.Element {
  const { pixelSize = 3, zIndex = 0 } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(performance.now())

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    rendererRef.current = renderer
    renderer.setPixelRatio(1) // important for crisp upscale
    renderer.domElement.style.position = 'fixed'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.zIndex = String(zIndex)
    renderer.domElement.style.pointerEvents = 'none'
    ;(renderer.domElement.style as any).imageRendering = 'pixelated'

    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    cameraRef.current = camera

    const uniforms: Record<string, THREE.IUniform> = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float time;
        uniform vec2 resolution;

        // Simple retro plasma + scanlines
        float hash(vec2 p){return fract(sin(dot(p,vec2(41.0,289.0)))*43758.5453);}
        void main(){
          vec2 uv = vUv;
          // slower movement for calmer background
          float t = time*0.06;
          float v = 0.0;
          v += sin((uv.x + t)*6.2831)*0.5+0.5;
          v += sin((uv.y*1.3 - t*1.1)*6.2831)*0.5+0.5;
          v *= 0.5 + 0.5*sin((uv.x*0.7 - uv.y*0.6 + t*0.4)*6.2831);
          vec3 col = mix(vec3(0.02,0.04,0.08), vec3(0.10,0.18,0.35), v);
          // scanlines (smaller/denser)
          float sl = smoothstep(0.48,0.52,fract(uv.y*resolution.y*1.5));
          col *= mix(0.85,1.0,sl);
          gl_FragColor = vec4(col, 0.85);
        }
      `,
      transparent: true,
    })

    const geo = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geo, material)
    meshRef.current = mesh
    scene.add(mesh)

    function resize() {
      const w = Math.max(1, window.innerWidth)
      const h = Math.max(1, window.innerHeight)
      const internalW = Math.max(1, Math.floor(w / pixelSize))
      const internalH = Math.max(1, Math.floor(h / pixelSize))
      renderer.setSize(internalW, internalH, false) // do not update style; CSS scales to full
      const u = (mesh.material as THREE.ShaderMaterial).uniforms
      if (u.resolution) u.resolution.value.set(internalW, internalH)
    }

    function tick(now: number) {
      const u = (mesh.material as THREE.ShaderMaterial).uniforms
      if (u.time) u.time.value = (now - startRef.current) / 1000
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('resize', resize)
    resize()
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      try { container.removeChild(renderer.domElement) } catch {}
      mesh.geometry.dispose()
      ;(mesh.material as THREE.ShaderMaterial).dispose()
      renderer.dispose()
      meshRef.current = null
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
    }
  }, [pixelSize, zIndex])

  return <div ref={containerRef} />
}


