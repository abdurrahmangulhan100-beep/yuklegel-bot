// components/ui/user-listings-view.tsx
import React from 'react';

export function UserListingsView() {
  // Buradaki veri durumunu (state/supabase query) projenin veri yapısına göre bağlayabilirsin
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sizden Gelen İlanlar</h1>
        <p className="text-slate-500 text-sm">
          Kullanıcılar ve nakliyeciler tarafından eklenen güncel yük ve araç ilanları.
        </p>
      </div>

      {/* İlan kartlarının listeleneceği grid / liste alanı */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Örnek İlan Kartı */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded">
              Yük İlanı
            </span>
            <span className="text-xs text-slate-400">Bugün</span>
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">İstanbul ➔ Ankara</h3>
          <p className="text-sm text-slate-600 mt-1">Paletli / Tır 13.60 • 24 Ton</p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
            <span className="font-bold text-blue-600">18.500 TL (KDV Dahil)</span>
            <span className="text-xs text-slate-500">Firma Adı</span>
          </div>
        </div>
      </div>
    </div>
  );
}
