'use client'

import { useEffect, useRef } from 'react'

type HeroBloomVideoProps = {
  posterClassName: string
  videoClassName: string
  preload?: 'none' | 'metadata' | 'auto'
  ariaHidden?: boolean
}

const VIDEO_SRC = '/media/lumora-bloom-hero.mp4'
const POSTER_SRC = '/media/lumora-bloom-poster.jpg'

export default function HeroBloomVideo({
  posterClassName,
  videoClassName,
  preload = 'metadata',
  ariaHidden = true,
}: HeroBloomVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true

    const play = () => {
      if (document.visibilityState === 'hidden') return

      const promise = video.play()
      if (promise) {
        promise.catch(() => {
          // Mobile browsers can reject autoplay until the first user gesture.
        })
      }
    }

    const handlePageShow = () => play()
    const handleVisibility = () => play()
    const handleLoadedData = () => play()

    play()
    const retryTimer = window.setTimeout(play, 700)

    video.addEventListener('loadeddata', handleLoadedData)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('touchstart', play, { passive: true, once: true })
    document.addEventListener('pointerdown', play, { passive: true, once: true })

    return () => {
      window.clearTimeout(retryTimer)
      video.removeEventListener('loadeddata', handleLoadedData)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('touchstart', play)
      document.removeEventListener('pointerdown', play)
    }
  }, [])

  return (
    <>
      <img
        src={POSTER_SRC}
        alt=""
        aria-hidden="true"
        className={posterClassName}
      />
      <video
        ref={videoRef}
        className={videoClassName}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        autoPlay
        muted
        controls={false}
        loop
        playsInline
        preload={preload}
        aria-hidden={ariaHidden}
        tabIndex={-1}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
      />
    </>
  )
}
