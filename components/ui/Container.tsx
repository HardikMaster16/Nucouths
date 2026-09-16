import React from 'react'

interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  size?: 'full' | 'xl' | 'lg' | 'md' | 'sm'
  className?: string
  as?: React.ElementType
}

const sizeClasses = {
  full: 'max-w-full',
  xl: 'max-w-container',     // 1440px
  lg: 'max-w-container-sm',  // 1280px
  md: 'max-w-container-xs',  // 1024px
  sm: 'max-w-2xl',           // 672px
}

export function Container({
  children,
  size = 'xl',
  className = '',
  as: Tag = 'div',
  ...rest
}: ContainerProps) {
  return (
    <Tag
      {...rest}
      className={[
        'w-full mx-auto px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}
