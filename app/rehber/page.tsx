import Link from "next/link"
import { ContentPage } from "@/components/ContentPage"
import { GUIDES } from "@/lib/guides"

export const metadata = {
  title: "Rehber | Nakliye Cepte",
  description: "Yük taşıma, araç tipleri, navlun hesabı, takograf kuralları ve güvenli ilan verme üzerine rehber yazıları.",
}

export default function GuideIndex() {
  return (
    <ContentPage title="Nakliye Rehberi" subtitle="Sürücüler, nakliye firmaları ve yük sahipleri için pratik bilgiler.">
      <ul className="!list-none !pl-0 space-y-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/rehber/${g.slug}`} className="block rounded-xl border border-[#e4e9ef] p-4 transition-colors hover:bg-[#f8fafc]">
              <span className="block font-bold text-[#122c4a]">{g.title}</span>
              <span className="mt-1 block text-sm text-[#627d98]">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  )
}
