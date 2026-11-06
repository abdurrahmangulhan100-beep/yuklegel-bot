import Link from "next/link"
import { notFound } from "next/navigation"
import { ContentPage } from "@/components/ContentPage"
import { AdSlot } from "@/components/AdSlot"
import { GUIDES, getGuide } from "@/lib/guides"

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug)
  return g ? { title: `${g.title} | Nakliye Cepte`, description: g.description } : {}
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug)
  if (!guide) notFound()
  const others = GUIDES.filter((g) => g.slug !== guide.slug)
  const mid = Math.ceil(guide.sections.length / 2)

  return (
    <ContentPage title={guide.title} subtitle={`Son güncelleme: ${guide.updated}`}>
      {guide.sections.map((s, i) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.paragraphs?.map((p) => <p key={p} className="mt-3">{p}</p>)}
          {s.bullets && <ul className="mt-3">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {/* Reklam yalnızca makale gövdesinin ortasında, yeterli içerikten sonra */}
          {i === mid - 1 && <AdSlot className="my-6" />}
        </section>
      ))}

      <h2>Diğer rehberler</h2>
      <ul>
        {others.map((g) => (
          <li key={g.slug}><Link href={`/rehber/${g.slug}`} className="font-semibold text-[#315d83] underline">{g.title}</Link></li>
        ))}
      </ul>
    </ContentPage>
  )
}
