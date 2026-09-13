"use client"

import { Truck, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Load } from "@/components/LoadCard"

export function TripsView({ loads }: { loads: Load[] }) {
  const userLoads = loads.filter(l => l.source === "user");
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Operasyon Yönetimi</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Seferlerim</h1>
        <p className="mt-2 text-sm text-[#718397]">Oluşturduğunuz ve onay bekleyen aktif seferlerinizi takip edin.</p>
      </div>
      <div className="grid gap-4">
        {userLoads.length > 0 ? userLoads.map((trip) => (
          <div key={trip.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#e4e9ef] bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-[#eef4f8] text-[#315d83]"><Truck /></div>
              <div>
                <div className="text-base font-bold">{trip.from} ➔ {trip.to}</div>
                <div className="text-xs text-[#8da0b2] mt-1">{trip.cargo} · <span className="font-semibold text-[#122c4a]">{trip.vehicle}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
              <Badge className="bg-[#e7f5ed] text-[#3b8068] font-medium"><CheckCircle2 className="size-3 mr-1" /> Aktif Sefer</Badge>
              <div className="text-lg font-bold text-[#d64526]">{trip.price}</div>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-[#ccd6e0] bg-white py-16 text-center text-sm text-[#718397]">Henüz kayıtlı seferiniz bulunmuyor. İlanlar sayfasından ilan oluşturabilirsiniz.</div>
        )}
      </div>
    </div>
  )
}
