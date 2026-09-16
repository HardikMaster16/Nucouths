'use client'

import React, { useState, useEffect, useRef } from 'react'

interface PriceRangeSliderProps {
  /** Absolute minimum across all products */
  globalMin: number
  /** Absolute maximum across all products */
  globalMax: number
  /** Currently selected minimum (from URL / parent) */
  currentMin: number
  /** Currently selected maximum (from URL / parent) */
  currentMax: number
  /** Snap step in ₹ */
  step?: number
  /** Called after user stops dragging, debounced */
  onCommit: (min: number, max: number) => void
}

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN')}`
}

export function PriceRangeSlider({
  globalMin,
  globalMax,
  currentMin,
  currentMax,
  step = 500,
  onCommit,
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(currentMin)
  const [localMax, setLocalMax] = useState(currentMax)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)


  // Sync if parent resets (e.g., "clear all")
  useEffect(() => {
    setLocalMin(currentMin)
    setLocalMax(currentMax)
  }, [currentMin, currentMax])

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const range = globalMax - globalMin
  const minPct = range > 0 ? ((localMin - globalMin) / range) * 100 : 0
  const maxPct = range > 0 ? ((localMax - globalMin) / range) * 100 : 100

  function scheduleCommit(min: number, max: number) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onCommit(min, max), 350)
  }

  function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(Number(e.target.value), localMax - step)
    setLocalMin(v)
    scheduleCommit(v, localMax)
  }

  function handleMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.max(Number(e.target.value), localMin + step)
    setLocalMax(v)
    scheduleCommit(localMin, v)
  }

  return (
    <div>
      {/* Current range labels */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col items-start">
          <span className="text-[9px] font-sans text-text-secondary tracking-wide uppercase mb-0.5">Min</span>
          <span className="text-sm font-sans font-semibold text-text-primary">{fmt(localMin)}</span>
        </div>
        <div className="w-8 h-px bg-border" aria-hidden="true" />
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-sans text-text-secondary tracking-wide uppercase mb-0.5">Max</span>
          <span className="text-sm font-sans font-semibold text-text-primary">{fmt(localMax)}</span>
        </div>
      </div>

      {/* Slider track + thumbs */}
      <div className="relative h-5 flex items-center select-none" role="group" aria-label="Price range">
        {/* Grey background track */}
        <div className="absolute w-full h-[2px] bg-border rounded-full" aria-hidden="true" />

        {/* Active (coloured) track between thumbs */}
        <div
          className="absolute h-[2px] bg-text-primary rounded-full pointer-events-none"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
          aria-hidden="true"
        />

        {/*
          Two transparent range inputs overlaid to capture interaction.
          The z-index swap prevents the min thumb getting stuck when
          both thumbs reach the same position.
        */}
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          aria-label={`Minimum price, currently ${fmt(localMin)}`}
          aria-valuemin={globalMin}
          aria-valuemax={globalMax}
          aria-valuenow={localMin}
          aria-valuetext={fmt(localMin)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
          style={{ zIndex: localMin > globalMax - step * 2 ? 5 : 3 }}
        />
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          aria-label={`Maximum price, currently ${fmt(localMax)}`}
          aria-valuemin={globalMin}
          aria-valuemax={globalMax}
          aria-valuenow={localMax}
          aria-valuetext={fmt(localMax)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
          style={{ zIndex: 4 }}
        />

        {/* Visual min thumb */}
        <div
          className="absolute w-[15px] h-[15px] rounded-full bg-white border-2 border-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.2)] pointer-events-none"
          style={{ left: `${minPct}%`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        />
        {/* Visual max thumb */}
        <div
          className="absolute w-[15px] h-[15px] rounded-full bg-white border-2 border-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.2)] pointer-events-none"
          style={{ left: `${maxPct}%`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        />
      </div>

      {/* Global min/max hint */}
      <div className="flex justify-between mt-2.5">
        <span className="text-[10px] font-sans text-text-secondary">{fmt(globalMin)}</span>
        <span className="text-[10px] font-sans text-text-secondary">{fmt(globalMax)}</span>
      </div>
    </div>
  )
}
