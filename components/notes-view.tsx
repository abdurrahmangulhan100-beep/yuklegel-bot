'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, NotebookPen, Loader2 } from 'lucide-react'

interface UserNote {
  id: string
  user_id: string
  title: string
  category: string
  content?: string | null
  reminder_km?: number | null
  reminder_date?: string | null
  created_at: string
}

export function NotesView() {
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [notes, setNotes] = useState<UserNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State'leri
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Genel')
  const [content, setContent] = useState('')
  const [reminderKm, setReminderKm] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  // 1. Supabase'den Notları Çekme
  const fetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Notlar çekilirken hata oluştu:', error.message)
        throw error
      }
      setNotes(data || [])
    } catch (err) {
      console.error('Veri yükleme hatası:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user, fetchNotes])

  // 2. Supabase'e Yeni Not Ekleme
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return

    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        category: category || 'Genel',
        content: content.trim() || null,
        reminder_km: reminderKm ? Number(reminderKm) : null,
        reminder_date: reminderDate || null,
      }

      const { data, error } = await supabase
        .from('user_notes')
        .insert([payload])
        .select()

      if (error) {
        console.error('Supabase Kayıt Hatası:', error.message, error.details)
        alert(`Not veritabanına kaydedilemedi: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        setNotes((prev) => [data[0], ...prev])
        setTitle('')
        setContent('')
        setReminderKm('')
        setReminderDate('')
        setCategory('Genel')
      }
    } catch (err) {
      console.error('Beklenmeyen Hata:', err)
      alert('Not eklenirken beklenmeyen bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  // 3. Supabase'den Not Silme
  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('user_notes').delete().eq('id', id)
      if (error) {
        console.error('Not silme hatası:', error.message)
        alert('Not silinemedi.')
        return
      }
      setNotes((prev) => prev.filter((note) => note.id !== id))
    } catch (err) {
      console.error('Silme işleminde hata:', err)
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <NotebookPen className="mx-auto size-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-bold text-foreground">Not Bölümü Kilitli</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Bakım, muayene, araç ve kişisel hatırlatmalarınızı güvenle kaydetip takip edebilmek için hesabınıza giriş yapın.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('Notlarınıza erişmek için giriş yapın.')}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sol Taraf: Not Ekleme Formu */}
        <form onSubmit={handleAddNote} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-5 text-primary" />
            <div>
              <h3 className="font-bold text-foreground text-sm">Yeni Not</h3>
              <p className="text-xs text-muted-foreground">Bakım, muayene ve hatırlatmalar</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Başlık</label>
            <input
              type="text"
              placeholder="Örn: Ön lastik değişimi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Genel">Genel</option>
              <option value="Bakım">Bakım</option>
              <option value="Lastik">Lastik</option>
              <option value="Muayene">Muayene</option>
              <option value="Sigorta">Sigorta</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Not</label>
            <textarea
              placeholder="Detay ekleyin..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Hatırlatma Km</label>
              <input
                type="number"
                placeholder="285000"
                value={reminderKm}
                onChange={(e) => setReminderKm(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Opsiyonel</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Hatırlatma Tarihi</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Opsiyonel</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            <span>{saving ? 'Kaydediliyor...' : 'Not Ekle'}</span>
          </button>
        </form>

        {/* Sağ Taraf: Not Listesi */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henüz kaydedilmiş bir notunuz bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((note) => (
                <div key={note.id} className="relative rounded-xl border border-border bg-card p-4 shadow-sm space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {note.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{note.title}</h4>
                    {note.content && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {(note.reminder_km || note.reminder_date) && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      {note.reminder_km ? <span>Km: {note.reminder_km}</span> : <span />}
                      {note.reminder_date ? <span>Tarih: {note.reminder_date}</span> : <span />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
