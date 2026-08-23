// Strictly clean phone number (ONLY numbers, no +, no spaces)
export function formatPhoneWithCountryCode(phone: string): string {
  if (!phone) return '919876543210'
  let clean = phone.replace(/[^0-9]/g, '')

  // Force 91 prefix if 10-digit Indian number
  if (clean.length === 10) {
    clean = '91' + clean
  }

  return clean
}

// DIRECT NATIVE APP SCHEME (Bypasses api.whatsapp.com web page completely!)
export function getWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
}

// DIRECT SMS SCHEME (Works offline)
export function getSMSDeepLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  return `sms:+${cleanPhone}?body=${encodedText}`
}

export function triggerDirectWhatsApp(phone: string, text: string) {
  const link = getWhatsAppDeepLink(phone, text)
  window.location.href = link
}