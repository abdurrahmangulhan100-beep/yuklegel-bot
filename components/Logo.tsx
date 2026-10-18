import { useId } from "react"

type LogoMarkProps = {
  /** Piksel cinsinden kenar uzunluğu */
  size?: number
  /** true: lacivert yuvarlak kare zemin (açık arka planlar için). false: sadece konum işareti (koyu arka planlar için) */
  tile?: boolean
  className?: string
}

/**
 * Nakliye Cepte logosu: konum iğnesi içinde kamyon.
 * public/icon.svg, public/logo.svg ve Play Store ikonlarıyla aynı çizimdir.
 */
export function LogoMark({ size = 40, tile = false, className }: LogoMarkProps) {
  const uid = useId().replace(/:/g, "")
  const bg = `lg-bg-${uid}`
  const pin = `lg-pin-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Nakliye Cepte"
      className={className}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b4373" />
          <stop offset="1" stopColor="#0b1d33" />
        </linearGradient>
        <linearGradient id={pin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a42" />
          <stop offset="1" stopColor="#c13a1c" />
        </linearGradient>
      </defs>

      {tile && (
        <>
          <rect width="512" height="512" rx="112" fill={`url(#${bg})`} />
          <path d="M-10 452 C120 410 250 470 380 430 S500 420 530 430" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="30" strokeLinecap="round" />
          <path d="M30 462 C140 430 250 478 370 444 S470 436 500 442" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="5" strokeDasharray="22 20" strokeLinecap="round" />
        </>
      )}

      <path d="M256 432 C256 432 124 318 124 226 A132 132 0 1 1 388 226 C388 318 256 432 256 432 Z" fill={`url(#${pin})`} />
      <circle cx="256" cy="226" r="92" fill="#fff" />
      <g fill="#122c4a">
        <rect x="196" y="186" width="74" height="50" rx="7" />
        <path d="M276 200 h26 q8 0 13 7 l12 17 q3 4 3 9 v3 h-54 z" />
        <rect x="190" y="236" width="140" height="9" rx="4.5" />
      </g>
      <path d="M290 207 h10 q4 0 6 3 l9 12 h-25 z" fill="#fff" />
      <g fill="#122c4a" stroke="#fff" strokeWidth="4">
        <circle cx="222" cy="247" r="11" />
        <circle cx="302" cy="247" r="11" />
      </g>
      <circle cx="222" cy="247" r="3.6" fill="#fff" />
      <circle cx="302" cy="247" r="3.6" fill="#fff" />
    </svg>
  )
}

