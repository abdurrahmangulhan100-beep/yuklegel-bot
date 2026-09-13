"use client"

import { Truck, Package, Clock, ShieldCheck, ArrowUpRight, PlusCircle, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Load } from "@/components/LoadCard"

type OverviewProps = {
  loads: Load[];
  onOpenCreate: () => void;
  setActiveTab: (tab: string) => void;
}

export function OverviewView({ loads, onOpenCreate, setActiveTab }: OverviewProps) {
  const userLoads = loads.filter(l => l.source === "user")
  const urgentLoads = loads.filter(l => l.urgent)

  return (
    <div className="space-y-6">
      {/* Üst Karşılama Alanı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#122c4a] p-6 text-white shadow-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">YükleGel Operasyon Paneline Hoş Geldiniz</h1>
          <p className="mt-1 text-sm text-gray-300">Günlük lojistik akışınızı yönetin, yeni seferler ekleyin ve piyasa verilerini takip edin.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onOpenCreate} className="bg-[#d64526] hover:bg-[#b93820] text-white cursor-pointer gap-2">
            <PlusCircle className="size-4" /> Yeni İlan Ver
          </Button>
          <Button onClick={() => setActiveTab("calc")} variant="outline" className="border-gray-600 bg-transparent text-white hover:bg-white/10 cursor-pointer gap-2">
            <Calculator className="size-4" /> Sefer Hesapla
          </Button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#718397]">
            <span className="text-sm font-medium">Toplam Aktif İlan</span>
            <Package className="size-5 text-[#315d83]" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#122c4a]">{loads.length}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Sistemde anlık yayında</div>
        </div>

        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#718397]">
            <span className="text-sm font-medium">Seferlerim</span>
            <Truck className="size-5 text-[#d64526]" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#122c4a]">{userLoads.length}</div>
          <div className="mt-1 text-xs text-[#718397]">Oluşturduğunuz aktif ilanlar</div>
        </div>

        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#718397]">
            <span className="text-sm font-medium">Acil Yükler</span>
            <Clock className="size-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#122c4a]">{urgentLoads.length}</div>
          <div className="mt-1 text-xs text-amber-600 font-medium">Öncelikli sevkiyatlar</div>
        </div>

        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#718397]">
            <span className="text-sm font-medium">Sistem Durumu</span>
            <ShieldCheck className="size-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-bold text-emerald-600">Aktif</div>
          <div className="mt-1 text-xs text-[#718397]">Supabase bağlantısı stabil</div>
        </div>
      </div>

      {/* Hızlı Erişim ve Son Eklenenler */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#122c4a]">Son Seferlerim</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("trips")} className="text-[#315d83] cursor-pointer text-xs">
              Tümünü Gör <ArrowUpRight className="size-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {userLoads.slice(0, 3).length > 0 ? (
              userLoads.slice(0, 3).map((load) => (
                <div key={load.id} className="flex items-center justify-between border-b border-[#edf0f3] pb-3 last:border-0">
                  <div>
                    <div className="font-semibold text-sm text-[#122c4a]">{load.from} → {load.to}</div>
                    <div className="text-xs text-[#718397]">{load.cargo}</div>
                  </div>
                  <div className="text-right font-bold text-[#d64526] text-sm">{load.price}</div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-[#718397]">Henüz size ait bir sefer bulunmuyor.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e4e9ef] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#122c4a]">Hızlı İşlemler</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onOpenCreate} className="flex flex-col items-center justify-center rounded-xl border border-[#e4e9ef] bg-[#f8fafc] p-4 text-center hover:bg-[#edf2f7] cursor-pointer transition-all">
              <PlusCircle className="size-6 text-[#d64526] mb-2" />
              <span className="text-sm font-semibold text-[#122c4a]">İlan Oluştur</span>
            </button>
            <button onClick={() => setActiveTab("calc")} className="flex flex-col items-center justify-center rounded-xl border border-[#e4e9ef] bg-[#f8fafc] p-4 text-center hover:bg-[#edf2f7] cursor-pointer transition-all">
              <Calculator className="size-6 text-[#315d83] mb-2" />
              <span className="text-sm font-semibold text-[#122c4a]">Sefer Hesapla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
