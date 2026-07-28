'use client'
import { useEffect, useRef, useState } from 'react'
import { DAY_START, VIEW_START, VIEW_HOURS, ROW_HEIGHT } from './types'

/**
 * Sizes a time grid so exactly VIEW_HOURS are visible, and opens it scrolled
 * to VIEW_START.  The grid element must have a height that does not depend on
 * its content (a fixed height, not max-height), or the measurement will chase
 * itself.
 *
 * Returns the ref to attach to the scrolling grid container and the row height
 * to use for every hour cell and event block.
 */
export function useDayGrid(minRowHeight = 28) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState(ROW_HEIGHT)
  const [measured, setMeasured] = useState(false)
  const scrolled = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const h = el.clientHeight
      if (!h) return
      setRowH(Math.max(minRowHeight, Math.floor(h / VIEW_HOURS)))
      setMeasured(true)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minRowHeight])

  useEffect(() => {
    const el = ref.current
    if (!el || !measured || scrolled.current) return
    el.scrollTop = (VIEW_START - DAY_START) * rowH
    scrolled.current = true
  }, [measured, rowH])

  return { ref, rowH }
}
