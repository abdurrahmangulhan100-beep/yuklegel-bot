import Link from "next/link"
import { SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f5f7fa] p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#e8eef5] text-[#315d83]">
        <SearchX className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-[#122c4a]">Sayfa bulunamadı</h2>
      <p className="max-w-xs text-sm leading-relaxed text-[#718397]">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link href="/" className="rounded-xl bg-[#d64526] px-5 py-3 text-sm font-semibold text-white active:scale-95">
        İlanlara Dön
      </Link>
    </div>
  )
}
