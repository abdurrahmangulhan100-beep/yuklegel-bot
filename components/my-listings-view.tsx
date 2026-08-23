'use client'

import { useState } from 'react'
import { MapPin, Truck, Calendar, Trash2, Tag, Image as ImageIcon } from 'lucide-react'

export function MyListingsView() {
  const [listings, setListings] = useState([
    {
      id: '1',
      title: 'İstanbul → Ankara Paletli Yük',
      type: 'Yük İlanı',
      from: 'İstanbul / Hadımköy',
      to: 'Ankara / Sincan',
      weight: '24 Ton',
      volume: '86 m³',
      price: '18.500 ₺',
      date: 'Bugün, 14:20',
      images: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop']
    }
  ])

  const handleDelete = (id: string) => {
    if (confirm('Bu ilanı silmek istediğinize emin misiniz?')) {
      setListings((prev) => prev.filter((item) => item.id !== id))
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Yayınladığım İlanlar ({listings.length})</h2>
      </div>

      {listings.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-2">
          <p className="text-muted-foreground text-sm">Henüz aktif bir ilanınız bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {listings.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row gap-4 transition-all hover:border-primary/40">
              {/* İlan Fotoğrafı */}
              <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                {item.images.length > 0 ? (
                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-8 opacity-40" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {item.type}
                </span>
              </div>

              {/* Bilgiler */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                    {item.price}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <MapPin className="size-3.5 text-primary" />
                  <span>{item.from}</span>
                  <span>→</span>
                  <span>{item.to}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Truck className="size-3 text-muted-foreground" /> {item.weight}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Tag className="size-3 text-muted-foreground" /> {item.volume}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Calendar className="size-3 text-muted-foreground" /> {item.date}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    title="İlanı Sil"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
