'use client'

import React, { useEffect, useRef } from 'react'

interface SizeGuideProps {
  isOpen: boolean
  onClose: () => void
  category: string
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

const CLOTHING_GUIDE = [
  { size: 'XS', chest: '80–84', waist: '62–66', hip: '86–90' },
  { size: 'S', chest: '84–88', waist: '66–70', hip: '90–94' },
  { size: 'M', chest: '88–92', waist: '70–74', hip: '94–98' },
  { size: 'L', chest: '92–96', waist: '74–78', hip: '98–102' },
  { size: 'XL', chest: '96–100', waist: '78–82', hip: '102–106' },
  { size: 'XXL', chest: '100–106', waist: '82–88', hip: '106–112' },
]

const WAIST_GUIDE = [
  { waist: '28', hip: '36', inseam: '32' },
  { waist: '30', hip: '38', inseam: '32' },
  { waist: '32', hip: '40', inseam: '32' },
  { waist: '34', hip: '42', inseam: '32' },
  { waist: '36', hip: '44', inseam: '32' },
]

export function SizeGuide({ isOpen, onClose, category }: SizeGuideProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const isMen = category === 'men'

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => closeRef.current?.focus(), 80)
      return () => { document.body.style.overflow = '' }
    }
    document.body.style.overflow = ''
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Size Guide"
        className={[
          'fixed inset-x-4 top-1/2 z-50 -translate-y-1/2',
          'sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2',
          'w-full sm:w-[520px] max-h-[85vh] overflow-y-auto',
          'bg-white',
          'transition-all duration-300',
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-display text-xl text-text-primary">Size Guide</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          <p className="text-sm font-sans text-text-secondary">
            All measurements are in centimetres (cm). If you're between sizes, we recommend sizing up.
          </p>

          {/* How to measure */}
          <div>
            <h3 className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-secondary mb-3">
              How to Measure
            </h3>
            <ul className="text-sm font-sans text-text-secondary space-y-1.5">
              {isMen ? (
                <>
                  <li><strong className="text-text-primary">Waist:</strong> Measure around your natural waistline.</li>
                  <li><strong className="text-text-primary">Hip:</strong> Measure around the fullest part of your hips.</li>
                  <li><strong className="text-text-primary">Inseam:</strong> Measure from crotch to ankle.</li>
                </>
              ) : (
                <>
                  <li><strong className="text-text-primary">Chest:</strong> Measure around the fullest part of your chest.</li>
                  <li><strong className="text-text-primary">Waist:</strong> Measure around your natural waistline.</li>
                  <li><strong className="text-text-primary">Hip:</strong> Measure around the fullest part of your hips.</li>
                </>
              )}
            </ul>
          </div>

          {/* Size table */}
          <div>
            <h3 className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-secondary mb-3">
              {isMen ? 'Trousers' : 'Clothing'} Size Chart
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              {isMen ? (
                <table className="w-full text-sm font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-xs tracking-wide uppercase text-text-secondary font-semibold">Waist</th>
                      <th className="text-left py-2 pr-4 text-xs tracking-wide uppercase text-text-secondary font-semibold">Hip</th>
                      <th className="text-left py-2 text-xs tracking-wide uppercase text-text-secondary font-semibold">Inseam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WAIST_GUIDE.map((row) => (
                      <tr key={row.waist} className="border-b border-border/50 hover:bg-surface transition-colors duration-100">
                        <td className="py-2.5 pr-4 font-medium text-text-primary">{row.waist}"</td>
                        <td className="py-2.5 pr-4 text-text-secondary">{row.hip}"</td>
                        <td className="py-2.5 text-text-secondary">{row.inseam}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-xs tracking-wide uppercase text-text-secondary font-semibold">Size</th>
                      <th className="text-left py-2 pr-4 text-xs tracking-wide uppercase text-text-secondary font-semibold">Chest</th>
                      <th className="text-left py-2 pr-4 text-xs tracking-wide uppercase text-text-secondary font-semibold">Waist</th>
                      <th className="text-left py-2 text-xs tracking-wide uppercase text-text-secondary font-semibold">Hip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLOTHING_GUIDE.map((row) => (
                      <tr key={row.size} className="border-b border-border/50 hover:bg-surface transition-colors duration-100">
                        <td className="py-2.5 pr-4 font-medium text-text-primary">{row.size}</td>
                        <td className="py-2.5 pr-4 text-text-secondary">{row.chest}</td>
                        <td className="py-2.5 pr-4 text-text-secondary">{row.waist}</td>
                        <td className="py-2.5 text-text-secondary">{row.hip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="text-[11px] font-sans text-text-secondary">
            Size guide is for reference only. Fit may vary by style and cut.
            {/* Replace this placeholder with real brand fit information. */}
          </p>
        </div>
      </div>
    </>
  )
}
