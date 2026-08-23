// Dynamically fix phone number (Force 91 prefix even if old number stored)
export function formatPhoneWithCountryCode(phone: string): string {
  let clean = (phone || '').replace(/[^0-9]/g, '')

  // If 10 digits (e.g. 9905740936), automatically convert to 919905740936
  if (clean.length === 10) {
    clean = '91' + clean
  }

  return clean || '919876543210'
}

// Android Native Intent Launcher (Bypasses api.whatsapp.com web page completely!)
export function triggerDirectWhatsApp(phone: string, text: string) {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)

  // 1. Android Direct Native Intent (Opens WhatsApp App instantly without web page)
  const androidIntent = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;end`

  // 2. Direct URI scheme fallback
  const whatsappScheme = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`

  // 3. Web URL fallback
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`

  const isAndroid = /Android/i.test(navigator.userAgent)

  try {
    if (isAndroid) {
      window.location.href = androidIntent
    } else {
      window.location.href = whatsappScheme
    }
  } catch (e) {
    window.open(webUrl, '_blank')
  }
}

// Direct Phone Native SMS Trigger (Works Without Internet!)
export function triggerDirectSMS(phone: string, text: string) {
  const cleanPhone = formatPhoneWithCountryCode(phone)
  const encodedText = encodeURIComponent(text)
  window.location.href = `sms:+${cleanPhone}?body=${encodedText}`
}