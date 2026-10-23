/**
 * Kayıt sırasında otomatik yazılan yer tutucu adlar ("YükleGel Kullanıcısı", "Nakliye Cepte Kullanıcısı" gibi)
 * gerçek bir firma adı değildir. Bunları boş sayarız.
 */
export function realName(name?: string | null): string {
  const n = (name ?? "").trim()
  if (!n) return ""
  if (/kullan[ıi]c[ıi]s[ıi]\s*$/i.test(n)) return ""
  return n
}
