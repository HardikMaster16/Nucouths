'use client'

import React, { useState } from 'react'

export interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

interface ProductAccordionProps {
  items: AccordionItem[]
  defaultOpen?: string
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ProductAccordion({ items, defaultOpen }: ProductAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null)

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id))
  }

  return (
    <div className="divide-y divide-border" role="list">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} role="listitem">
            <h3>
              <button
                type="button"
                id={`accordion-btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`accordion-panel-${item.id}`}
                onClick={() => toggle(item.id)}
                className="flex items-center justify-between w-full py-4 text-left text-sm font-sans font-medium text-text-primary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1 rounded-sm"
              >
                <span>{item.title}</span>
                <span
                  className={[
                    'shrink-0 text-text-secondary transition-transform duration-200',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                >
                  <ChevronDownIcon />
                </span>
              </button>
            </h3>

            {/* Panel — CSS height transition */}
            <div
              id={`accordion-panel-${item.id}`}
              role="region"
              aria-labelledby={`accordion-btn-${item.id}`}
              className={[
                'overflow-hidden transition-all duration-300 ease-in-out',
                isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <div className="pb-4 text-sm font-sans text-text-secondary leading-relaxed">
                {item.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
