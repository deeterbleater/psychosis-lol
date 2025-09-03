import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react'
import { loadAnime } from '../../lib/anime/loader'
import { CRTLayer } from './CRTLayer'

type FlipImageProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  // Flip when this changes (used to detect per-slot changes)
  changeKey?: string | number
  playing: boolean
  reversed?: boolean
  // Controls which orientation boundary triggers the 180° rotate animation.
  // true  → animate on even→odd (upright→reversed)
  // false → animate on odd→even (reversed→upright) — for backwards time
  animateOnReversed?: boolean
}

// Split-flap/rolodex style flip animation between image sources
export function FlipImage(props: FlipImageProps): JSX.Element {
  const { src, alt, width, height, className, changeKey, playing, reversed, animateOnReversed = true } = props
  const [currentSrc, setCurrentSrc] = useState<string>(src)
  const [nextSrc, setNextSrc] = useState<string | null>(null)
  const [isFlipping, setIsFlipping] = useState<boolean>(false)
  const [flicker, setFlicker] = useState<boolean>(false)
  const [debugCount, setDebugCount] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const animeRef = useRef<any>(null)
  const topAnimationRef = useRef<any>(null)
  const bottomAnimationRef = useRef<any>(null)
  const animatingRef = useRef<boolean>(false)
  const prevReversedRef = useRef<boolean | undefined>(undefined)
  const [rotateTransition, setRotateTransition] = useState<boolean>(false)
  const prevKeyRef = useRef<string | number | undefined>(undefined)
  const [currentReversed, setCurrentReversed] = useState<boolean>(!!reversed)
  const [pendingReversed, setPendingReversed] = useState<boolean | null>(null)
  
  // Mount
  useEffect(() => {}, [alt])
  
  // Load anime.js once
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const anime = await loadAnime()
      if (mounted) {
        animeRef.current = anime
      }
    })()
    return () => {
      mounted = false
      // Cancel any ongoing animations
      if (topAnimationRef.current?.pause) {
        topAnimationRef.current.pause()
      }
      if (bottomAnimationRef.current?.pause) {
        bottomAnimationRef.current.pause()
      }
      animeRef.current = null
      topAnimationRef.current = null
      bottomAnimationRef.current = null
    }
  }, [alt])

  // Mechanical rolodex-style flip animation - simulates an analog split-flap display
  const triggerFlicker = useCallback(() => {
    setFlicker(true)
    // Short vintage channel-change pulse
    window.setTimeout(() => setFlicker(false), 140)
  }, [])

  const flip = useCallback((nextImage: string) => {
    if (!playing) { return }
    if (animatingRef.current) { return }
    if (!animeRef.current) { return }

    animatingRef.current = true
    
    // Set state without flushSync to avoid React warnings
    setIsFlipping(true)
    setNextSrc(nextImage)
    triggerFlicker()
  }, [playing, alt, triggerFlicker])

  // Handle animation after state is set
  useLayoutEffect(() => {
    // Only run when we're flipping and have a next image
    if (!isFlipping || !nextSrc || !playing) return
    
    // Wait for refs to be available
    if (!topRef.current || !bottomRef.current) return
    
    const topEl = topRef.current
    const bottomEl = bottomRef.current
    const container = containerRef.current
    const anime = animeRef.current
    
    // No animation API available
    if (!anime) {
      setCurrentSrc(nextSrc)
      if (pendingReversed !== null) setCurrentReversed(pendingReversed)
      setPendingReversed(null)
      setIsFlipping(false)
      setNextSrc(null)
      animatingRef.current = false
      return
    }
    
    // Setup initial positions
    topEl.style.transform = 'rotateX(0deg)'
    bottomEl.style.transform = 'rotateX(90deg)'
    
    // Add shadow for depth during flip
    topEl.style.boxShadow = '0 -2px 6px rgba(0,0,0,0.3)'
    bottomEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
    
    // Add mechanical sound effect class
    if (container) container.classList.add('flipping')
    
    if (container) container.classList.add('flipping')
    
    // First part: rotate top half out
    topAnimationRef.current = anime({
      targets: topEl,
      rotateX: -90,
      duration: 60,
      easing: 'easeInQuad',
      complete: function() {
        // Second part: rotate bottom half in after a brief pause
        setTimeout(() => {
          bottomAnimationRef.current = anime({
            targets: bottomEl,
            rotateX: 0,
            duration: 70,
            easing: 'easeOutQuad',
            complete: function() {
              // Animation complete, update state
              setCurrentSrc(nextSrc)
              if (pendingReversed !== null) setCurrentReversed(pendingReversed)
              setPendingReversed(null)
              setIsFlipping(false)
              setNextSrc(null)
              animatingRef.current = false
              
              // Remove shadow and mechanical sound effect class
              if (topRef.current) topRef.current.style.boxShadow = ''
              if (bottomRef.current) bottomRef.current.style.boxShadow = ''
              if (containerRef.current) containerRef.current.classList.remove('flipping')
            }
          })
        }, 20)
      }
    })
    
    // Cleanup function if component unmounts during animation
    return () => {
      if (topAnimationRef.current?.pause) topAnimationRef.current.pause()
      if (bottomAnimationRef.current?.pause) bottomAnimationRef.current.pause()
      if (topRef.current) topRef.current.style.boxShadow = ''
      if (bottomRef.current) bottomRef.current.style.boxShadow = ''
      if (containerRef.current) containerRef.current.classList.remove('flipping')
    }
  }, [isFlipping, nextSrc, playing, alt])

  // Pause guard: stop scheduling/clear state when playing turns false
  useEffect(() => {
    if (!playing) {
      animatingRef.current = false
      setIsFlipping(false)
      setNextSrc(null)
    }
  }, [playing, alt])
  
  // Orientation-only change (even↔odd seconds): play flicker pulse
  useEffect(() => {
    if (prevReversedRef.current === undefined) {
      prevReversedRef.current = reversed
      setCurrentReversed(!!reversed)
      return
    }
    if (reversed !== prevReversedRef.current) {
      prevReversedRef.current = reversed
      // Always flicker on orientation toggle
      triggerFlicker()
      // Animate rotate depending on direction policy
      if (reversed === animateOnReversed) {
        setRotateTransition(true)
        window.setTimeout(() => setRotateTransition(false), 120)
      } else {
        setRotateTransition(false)
      }
      if (!isFlipping) setCurrentReversed(!!reversed)
    }
  }, [reversed, animateOnReversed, src, currentSrc, triggerFlicker, isFlipping])
  
  // Debug helper removed for production
  
  // Prefer source-change driven flip; key-based path disabled due to re-mounting behavior
  useEffect(() => {
    // no-op
  }, [changeKey])

  // React to src changes directly (primary path)
  useEffect(() => {
    if (src === currentSrc) return
    if (!playing || !animeRef.current) {
      setCurrentSrc(src)
      setIsFlipping(false)
      setNextSrc(null)
      triggerFlicker()
      setCurrentReversed(!!reversed)
      return
    }
    setPendingReversed(!!reversed)
    flip(src)
  }, [src, currentSrc, flip, playing, alt, triggerFlicker, reversed])

  const commonImgStyle: React.CSSProperties = {
    width,
    height,
    objectFit: 'cover',
    display: 'block',
    transform: currentReversed ? 'rotate(180deg)' : 'none',
    transition: rotateTransition ? 'transform 90ms ease-in-out' : 'none',
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width, height, perspective: 800, overflow: 'hidden' }}
      aria-busy={isFlipping}
    >
      {/* Base/static image */}
      <img className={className} src={currentSrc} alt={alt} style={commonImgStyle} />

      {/* Overlay for flip halves */
      /* CRT overlay sits above images to emulate retro display */}
      {isFlipping && nextSrc ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Top half (current) rotates out around its bottom edge */}
          <div
            ref={topRef}
            role="flip-top"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: height / 2,
              transformOrigin: '50% 100%',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            <img
              className={className}
              src={currentSrc}
              alt={alt}
              style={{
                ...commonImgStyle,
                clipPath: 'inset(0 0 50% 0)',
              }}
            />
          </div>

          {/* Bottom half (next) rotates in around its top edge */}
          <div
            ref={bottomRef}
            role="flip-bottom"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: height / 2,
              transformOrigin: '50% 0%',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            <img
              className={className}
              src={nextSrc}
              alt={alt}
              style={{
                ...commonImgStyle,
                clipPath: 'inset(50% 0 0 0)',
                transform: (pendingReversed ?? !!reversed) ? 'rotate(180deg)' : 'none',
              }}
            />
          </div>
          <CRTLayer width={width} height={height} opacity={0.22} />
          {flicker ? <div className="crt-flicker" /> : null}
        </div>
      ) : null}

      {/* Static CRT overlay when not flipping */}
      {!isFlipping ? <CRTLayer width={width} height={height} opacity={0.18} /> : null}
      {flicker && !isFlipping ? <div className="crt-flicker" /> : null}
    </div>
  )
}