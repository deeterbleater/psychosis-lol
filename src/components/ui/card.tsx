import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card(props: CardProps): JSX.Element {
  const { children, style, ...rest } = props
  return (
    <div {...rest} className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-[inset_0_0_0_1px_var(--background),0_2px_0_var(--background)] p-3" style={style}>
      {children}
    </div>
  )
}

export function CardTitle(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  const { children, style, ...rest } = props
  return (
    <div {...rest} className="font-mono text-[12px] tracking-[0.1em] uppercase opacity-80" style={style}>
      {children}
    </div>
  )
}

export function CardValue(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  const { children, style, ...rest } = props
  return (
    <div {...rest} className="font-mono text-[28px] font-extrabold" style={style}>
      {children}
    </div>
  )
}


