import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const NAV = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/rehber", label: "Rehber" },
  { href: "/privacy", label: "Gizlilik Politikası" },
  { href: "/delete-account", label: "Hesap Silme" },
]

/** Herkese açık (giriş gerektirmeyen) içerik sayfalarının ortak iskeleti. */
export function ContentPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-10 text-[#122c4a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#122c4a]">Nakliye Cepte</Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7fa] px-3 py-2 text-xs font-semibold text-[#315d83] hover:text-[#122c4a]">
            <ArrowLeft className="size-4" /> Uygulamaya git
          </Link>
        </div>
        <article className="rounded-2xl border border-[#e4e9ef] bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-[#627d98]">{subtitle}</p>}
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#334e68] [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#122c4a] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
            {children}
          </div>
        </article>
        <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-[#627d98]">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:underline">{n.label}</Link>)}
        </nav>
      </div>
    </div>
  )
}
