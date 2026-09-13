"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Load } from "@/components/LoadCard"
import { supabase } from "@/lib/supabase"

type CreateListingModalProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAddLoad: (newLoad: Load) => void;
}

export function CreateListingModal({ isOpen, setIsOpen, onAddLoad }: CreateListingModalProps) {
  const [form, setForm] = useState({
    company: "",
    from: "",
    to: "",
    cargo: "",
    vehicle: "Tır",
    distance: "500 km",
    price: "15.000 ₺",
    phone: "05551234567",
    urgent: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.from || !form.to) return;
    
    setLoading(true);
    const initials = form.company.substring(0, 2).toUpperCase();
    const colors = ["bg-[#315d83]", "bg-[#d64526]", "bg-[#67c587]", "bg-[#806c41]"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      if (supabase) {
        await supabase.from("loads").insert([{
          company: form.company,
          initials,
          from_city: form.from,
          to_city: form.to,
          cargo: form.cargo,
          vehicle: form.vehicle,
          distance: form.distance,
          price: form.price,
          phone: form.phone,
          urgent: form.urgent,
          source: "user",
          color: randomColor,
          time: "Şimdi"
        }]);
      }
    } catch (err) {
      console.error("Supabase ekleme hatası:", err);
    }

    const newLoad: Load = {
      id: Date.now(),
      company: form.company,
      initials,
      from: form.from,
      to: form.to,
      cargo: form.cargo,
      vehicle: form.vehicle,
      distance: form.distance,
      price: form.price,
      urgent: form.urgent,
      time: "Şimdi",
      color: randomColor,
      source: "user",
      phone: form.phone
    };

    onAddLoad(newLoad);
    setLoading(false);
    setIsOpen(false);
    setForm({ company: "", from: "", to: "", cargo: "", vehicle: "Tır", distance: "500 km", price: "15.000 ₺", phone: "05551234567", urgent: false });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yeni İlan Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Firma Adı</Label>
              <Input placeholder="Örn: YükleGel Nakliyat" value={form.company} onChange={e => setForm({...form, company: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Telefon Numarası</Label>
              <Input placeholder="05xx xxx xx xx" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Çıkış Şehri</Label>
              <Input placeholder="İstanbul" value={form.from} onChange={e => setForm({...form, from: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Varış Şehri</Label>
              <Input placeholder="Ankara" value={form.to} onChange={e => setForm({...form, to: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yük Cinsi</Label>
              <Input placeholder="Paletli Malzeme" value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Araç Tipi</Label>
              <Input placeholder="Tır / Kamyon" value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tahmini Fiyat</Label>
              <Input placeholder="15.000 ₺" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Mesafe</Label>
              <Input placeholder="500 km" value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} required />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="urgent" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} className="size-4 rounded border-gray-300 text-[#d64526]" />
            <Label htmlFor="urgent" className="cursor-pointer text-sm font-medium">Acil İlan Olarak İşaretle</Label>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>İptal</Button>
            <Button type="submit" disabled={loading} className="bg-[#d64526] text-white hover:bg-[#b93820]">
              {loading ? "Ekleniyor..." : "İlanı Yayınla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
