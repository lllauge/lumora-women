'use client'

import { useEffect } from 'react'

export default function AxeProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    let cleanup: (() => void) | undefined

    import('react').then((React) =>
      import('react-dom').then((ReactDOM) =>
        import('@axe-core/react').then((axe) => {
          axe.default(React.default, ReactDOM.default, 1000)
          cleanup = () => {
            // axe-core doesn't expose a teardown, but we only load it once
          }
        })
      )
    )

    return () => cleanup?.()
  }, [])

  return null
}
