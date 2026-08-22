import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://fkcmlkbpwpjgdamhtegn.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function NotesTab({ user, onOpenAuthModal }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Kullanıcı giriş yaptıysa notları yükle
  useEffect(() => {
    if (user) {
      notlariGetir();
    }
  }, [user]);

  const notlariGetir = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const notEkle = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    if (!user) {
      alert('Not eklemek için lütfen önce giriş yapın.');
      onOpenAuthModal();
      return;
    }

    const { data, error } = await supabase
      .from('user_notes')
      .insert([{ content: newNote, user_id: user.id }])
      .select();

    if (!error && data) {
      setNotes([data[0], ...notes]);
      setNewNote('');
    }
  };

  const notSil = async (id) => {
    const { error } = await supabase.from('user_notes').delete().eq('id', id);
    if (!error) {
      setNotes(notes.filter((n) => n.id !== id));
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>🔒 Notlarım Özelliğini Kullanmak İçin Giriş Yapın</h3>
        <p style={{ color: '#666', marginBottom: '15px' }}>Notlarınız güvenle bulutta saklanır, sayfa yenilendiğinde silinmez.</p>
        <button onClick={onOpenAuthModal} style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>📝 Notlarım</h2>
      <form onSubmit={notEkle} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Yeni not ekleyin (Örn: Gebze yükü için Ahmet Bey aranacak)..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Ekle
        </button>
      </form>

      {loading ? (
        <p>Notlar yükleniyor...</p>
      ) : notes.length === 0 ? (
        <p style={{ color: '#888' }}>Henüz kaydedilmiş bir notunuz yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notes.map((note) => (
            <div key={note.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span>{note.content}</span>
              <button onClick={() => notSil(note.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
