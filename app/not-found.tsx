import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/60 px-6 text-center">
      <p className="text-5xl font-extrabold text-[#d64526]">404</p>
      <h1 className="mt-2 text-xl font-extrabold text-foreground/80">Sayfa bulunamadı</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/" className="mt-6 flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-[#122c4a] text-sm font-bold text-white">
        Ana sayfaya dön
      </Link>
    </div>
  )
}
