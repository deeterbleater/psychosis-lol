import React from 'react'

type LabelProps = React.HTMLAttributes<HTMLDivElement>

export function Label(props: LabelProps): JSX.Element {
  const { children, className, style, ...rest } = props
  return (
    <div {...rest} className={`font-mono text-[12px] tracking-[0.1em] uppercase opacity-80 ${className ?? ''}`} style={style}>
      {children}
    </div>
  )
}


