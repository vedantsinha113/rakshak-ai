// Strictly formats any phone number to 91XXXXXXXXXX format required by WhatsApp
export function formatPhoneWithCountryCode(phone: string): string {
  if (!phone) return '919876543210'
  
  // Remove all non-numeric characters (spaces, dashes, +, etc.)
  let digits = phone.replace(/\D/g, '')

  // If 10-digit number, add 91 prefix
  if (digits.length === 10) {
    digits = '91' + digits
  }

  return digits
}

// Generates Direct Native WhatsApp Deep Link
export function getWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
}

// Generates Direct Phone SMS Deep Link (Offline)
export function getSMSDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `sms:+${cleanPhone}?body=${encodedText}`
}

export function triggerDirectWhatsApp(phone: string, text: string): void {
  const link = getWhatsAppDeepLink(phone, text)
  window.location.href = link
}

export function triggerDirectSMS(phone: string, text: string): void {
  const link = getSMSDeepLink(phone, text)
  window.location.href = link
}

export function sendSOS(location: { lat: number; lng: number } | null): void {
  if (!location) return alert('Location not available')
  const msg = `🚨 EMERGENCY ALERT!\n\nI may be in danger.\n\n📍 Live Location:\nhttps://maps.google.com/?q=${location.lat},${location.lng}\n\nSent from Rakshak AI.`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}