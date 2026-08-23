// Format phone number to clean Indian format (+91)
export function formatPhoneWithCountryCode(phone: string): string {
  if (!phone) return '919876543210'
  let clean = phone.replace(/[^0-9]/g, '')

  if (clean.length === 10) {
    clean = '91' + clean
  }

  return clean
}

export function getWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `https://wa.me/${cleanPhone}?text=${encodedText}`
}

export function getSMSDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `sms:+${cleanPhone}?body=${encodedText}`
}

export function triggerDirectWhatsApp(phone: string, text: string): void {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`
  window.open(url, '_blank')
}

export function triggerDirectSMS(phone: string, text: string): void {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  window.location.href = `sms:+${cleanPhone}?body=${encodedText}`
}

export function sendSOS(location: { lat: number; lng: number } | null): void {
  if (!location) return alert('Location not available')
  const msg = `🚨 EMERGENCY ALERT!\n\nI may be in danger.\n\n📍 Live Location:\nhttps://maps.google.com/?q=${location.lat},${location.lng}\n\nSent from Rakshak AI.`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}