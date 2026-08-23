function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPushNotifications(selectedCities: string[], userId?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Tarayıcınız bildirim özelliğini desteklemiyor.')
    return false
  }

  try {
    // Service Worker Kaydı
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // İzin İste
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      alert('Bildirim izni vermeniz gerekmektedir.')
      return false
    }

    // Subscription Oluştur
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('VAPID Public Key eksik!')
      return false
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    // API'ye Kaydet
    const response = await fetch('/api/save-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        cities: selectedCities.map((c) => c.toLowerCase()),
        userId,
      }),
    })

    if (response.ok) {
      alert('Bildirim alarmınız başarıyla açıldı!')
      return true
    } else {
      alert('Abonelik kaydedilirken bir hata oluştu.')
      return false
    }
  } catch (error) {
    console.error('Push abonelik hatası:', error)
    alert('Bildirim izni alınamadı.')
    return false
  }
}
