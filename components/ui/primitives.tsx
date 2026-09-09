'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// ---------- Button ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-md shadow-accent/20',
  secondary: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
  ghost: 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
  danger: 'bg-danger/10 text-danger dark:text-danger-light',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-xs',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold min-h-[48px] active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------- IconButton ----------
type IconButtonSize = 'header' | 'action'

const iconButtonSizes: Record<IconButtonSize, string> = {
  header: 'size-10', // ikincil header aksiyonları (arama, tema)
  action: 'size-12', // birincil dokunmatik aksiyonlar — min 48px
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  size?: IconButtonSize
  tone?: 'default' | 'plain'
}

export function IconButton({ className, children, size = 'action', tone = 'default', ...props }: IconButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'flex items-center justify-center rounded-xl active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        iconButtonSizes[size],
        tone === 'default' && 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300',
        tone === 'plain' && 'text-zinc-400',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------- Card ----------
// Bilinçli olarak varsayılan padding taşımaz — her kullanım kendi p-* değerini
// verir, böylece Tailwind sınıf çakışması (specificity) riski oluşmaz.
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 dark:border-ink-600 bg-white dark:bg-ink-800 shadow-xs',
        className
      )}
      {...props}
    />
  )
}

// ---------- Badge ----------
type BadgeTone = 'accent' | 'trust' | 'finance' | 'danger' | 'neutral'

const badgeTones: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent',
  trust: 'bg-trust-soft text-trust dark:text-trust-light',
  finance: 'bg-finance-soft text-finance',
  danger: 'bg-danger-soft text-danger dark:text-danger-light',
  neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

// ---------- Input ----------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-zinc-200 dark:border-ink-600 bg-zinc-50 dark:bg-ink-700/60 p-3 text-xs min-h-[44px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
