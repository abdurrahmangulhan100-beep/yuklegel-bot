export type IlanTuru = 'yuk' | 'arac'

export type YukCinsi =
  | 'Paletli'
  | 'Dökme'
  | 'Çuval'
  | 'Tenteli'
  | 'Frigo'
  | 'Konteyner'
  | 'Kırkayak / Lowbed'
  | 'Diğer'

export interface Ilan {
  id: string
  tur: IlanTuru
  kalkis_il: string
  kalkis_ilce: string
  varis_il: string
  varis_ilce: string
  yuk_cinsi: YukCinsi
  tonaj: number // ton
  hacim?: number // m3 (opsiyonel)
  fiyat: number // TL, teklif edilen navlun
  aciklama: string
  ilan_sahibi: string
  telefon: string // 5xxxxxxxxx formatı
  ilan_tarihi: string // ISO string
}

export interface Not {
  id: string
  baslik: string
  icerik: string
  kategori: NotKategori
  hatirlatma_km?: number
  hatirlatma_tarihi?: string
  olusturma_tarihi: string
}

export type NotKategori = 'genel' | 'lastik' | 'muayene' | 'sigorta' | 'bakim'
