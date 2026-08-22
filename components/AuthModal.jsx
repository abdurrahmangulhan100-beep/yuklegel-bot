import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase istemciniz (index.js veya supabaseClient.js dosyanızdaki ile aynı)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://fkcmlkbpwpjgdamhtegn.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Giriş başarılı! Yönlendiriliyorsunuz...' });
        setTimeout(() => {
          onLoginSuccess(data.user);
          onClose();
        }, 1000);
      } 
      else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
        setMode('login');
      } 
      else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
        
        <h2>
          {mode === 'login' && '🔑 Giriş Yap'}
          {mode === 'register' && '📝 Kayıt Ol'}
          {mode === 'forgot' && '🔒 Şifremi Unuttum'}
        </h2>

        {message.text && (
          <div style={{ ...messageBoxStyle, backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7', color: message.type === 'error' ? '#991b1b' : '#166534' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
          <input
            type="email"
            placeholder="E-posta Adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          )}

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Sıfırlama Linki Gönder'}
          </button>
        </form>

        <div style={{ marginTop: '15px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
          {mode === 'login' && (
            <>
              <span onClick={() => setMode('forgot')} style={linkStyle}>Şifremi Unuttum?</span>
              <span onClick={() => setMode('register')} style={linkStyle}>Hesabın yok mu? <b>Kayıt Ol</b></span>
            </>
          )}
          {mode === 'register' && (
            <span onClick={() => setMode('login')} style={linkStyle}>Zaten hesabın var mı? <b>Giriş Yap</b></span>
          )}
          {mode === 'forgot' && (
            <span onClick={() => setMode('login')} style={linkStyle}> Giriş Ekranına Dön</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Basit CSS Stilleri
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalCardStyle = { background: '#fff', padding: '25px', borderRadius: '12px', width: '360px', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const closeButtonStyle = { position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' };
const primaryButtonStyle = { padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const messageBoxStyle = { padding: '10px', borderRadius: '6px', fontSize: '13px', margin: '10px 0' };
const linkStyle = { color: '#2563eb', cursor: 'pointer' };
