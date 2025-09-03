import React, { useEffect, useRef } from 'react'

type CRTLayerProps = {
  width: number
  height: number
  className?: string
  opacity?: number // overall strength 0..1
}

// Lightweight CRT overlay: scanlines + vignette using 2D canvas.
// This avoids interfering with FlipImage's DOM animations and stays performant.
export function CRTLayer(props: CRTLayerProps): JSX.Element {
  const { width, height, className, opacity = 0.25 } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.floor(width))
    canvas.height = Math.max(1, Math.floor(height))
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw scanlines (semi-transparent dark lines every 2px)
    ctx.globalAlpha = opacity
    ctx.fillStyle = '#000'
    const gap = 2
    for (let y = 0; y < canvas.height; y += gap) {
      // thinner line for subtlety
      ctx.fillRect(0, y, canvas.width, 1)
    }

    // Vignette
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      Math.min(canvas.width, canvas.height) * 0.2,
      canvas.width / 2,
      canvas.height / 2,
      Math.hypot(canvas.width, canvas.height) * 0.6,
    )
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.6, opacity + 0.15).toFixed(2)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Subtle mask to emulate phosphor aperture grille
    const stripeOpacity = Math.min(0.15, opacity * 0.6)
    if (stripeOpacity > 0) {
      ctx.globalAlpha = stripeOpacity
      for (let x = 0; x < canvas.width; x += 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(x, 0, 1, canvas.height)
      }
    }
  }, [width, height, opacity])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }}
    />
  )
}


