"use client"

import { MessageCircle, Phone } from "lucide-react"
import { Load } from "@/components/LoadCard"

export function CompaniesView({ loads }: { loads: Load[] }) {
  const companiesMap = new Map();
  loads.forEach(l => {
    if (!companiesMap.has(l.company)) {
      companiesMap.set(l.company, { name: l.company, phone: l.phone || "05551234567", count: 1 });
    } else {
      companiesMap.get(l.company).count += 1;
    }
  });
  const companyList = Array.from(companiesMap.values());

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Lojistik Rehberi</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Firmalar</h1>
        <p className="mt-2 text-sm text-[#718397]">Ağımızda aktif ilan veren ve kayıtlı tüm firmaları keşfedin.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companyList.map((comp: any, idx: number) => (
          <div key={idx} className="rounded-xl border border-[#e4e9ef] bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="grid size-10 place-items-center rounded-lg bg-[#eef4f8] text-[#315d83] font-bold">{comp.name.substring(0, 2).toUpperCase()}</div>
                <div>
                  <div className="text-base font-bold">{comp.name}</div>
                  <div className="text-xs text-[#8da0b2]">{comp.count} Aktif İlan / Kayıt</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#edf0f3] pt-4 mt-4">
              <span className="text-sm font-medium text-[#315d83]">{comp.phone}</span>
              <div className="flex gap-2">
                <a href={`https://wa.me/${comp.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-2 border rounded-lg text-[#3b8068] hover:bg-[#e7f5ed]"><MessageCircle className="size-4" /></a>
                <a href={`tel:${comp.phone}`} className="p-2 border rounded-lg text-[#315d83] hover:bg-[#eef4f8]"><Phone className="size-4" /></a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
