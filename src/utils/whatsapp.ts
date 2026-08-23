// Clean phone number and ensure country code (+91)
export function formatPhoneWithCountryCode(phone: string): string {
  if (!phone) return '919876543210'
  let clean = phone.replace(/[^0-9]/g, '')

  if (clean.length === 10) {
    clean = '91' + clean
  }

  return clean
}

// Android Kernel Intent (Forces Android to bypass Chrome Web Redirect & open WhatsApp directly)
export function triggerDirectWhatsApp(phone: string, text: string) {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)

  // Official Android Package Intent
  const androidIntent = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;end`
  const fallbackScheme = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`

  const isAndroid = /Android/i.test(navigator.userAgent)

  if (isAndroid) {
    window.location.href = androidIntent
  } else {
    window.location.href = fallbackScheme
  }
}

// Direct Native SMS Trigger (Works 100% Offline, ZERO Web Pages!)
export function triggerDirectSMS(phone: string, text: string) {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  window.location.href = `sms:+${cleanPhone}?body=${encodedText}`
}