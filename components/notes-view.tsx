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

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Genel')
  const [content, setContent] = useState('')
  const [reminderKm, setReminderKm] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  const fetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (err: any) {
      console.error('Veri yükleme hatası:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user, fetchNotes])

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

      if (error) throw error

      if (data && data.length > 0) {
        setNotes((prev) => [data[0], ...prev])
        setTitle('')
        setContent('')
        setReminderKm('')
        setReminderDate('')
        setCategory('Genel')
      }
    } catch (err: any) {
      console.error('Beklenmeyen Hata:', err)
      alert(`Not eklenemedi: ${err?.message || 'Bir sorun oluştu'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('user_notes').delete().eq('id', id)
      if (error) throw error
      setNotes((prev) => prev.filter((note) => note.id !== id))
    } catch (err: any) {
      console.error('Silme işleminde hata:', err?.message || err)
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
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
        <NotebookPen className="mx-auto size-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Not Bölümü Kilitli</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Bakım, muayene, araç ve kişisel hatırlatmalarınızı güvenle kaydedip takip edebilmek için hesabınıza giriş yapın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal('Notlarınıza erişmek için giriş yapın.')}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <form onSubmit={handleAddNote} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-5 text-blue-600" />
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
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Not Ekle
          </button>
        </form>

        <div className="md:col-span-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-blue-600" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Henüz kaydedilmiş bir notunuz bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((note) => (
                <div key={note.id} className="relative rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                        {note.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-foreground">{note.title}</h4>
                    {note.content && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {(note.reminder_km || note.reminder_date) && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
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
