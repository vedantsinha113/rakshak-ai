// 🔐 Apna Bot Token aur Chat ID yahan daalo
const TELEGRAM_BOT_TOKEN = '8875330643:AAFDhOedVfIXBOmJOBceHg_7uUCGYQIJufw'
const TELEGRAM_CHAT_ID = '5688832303'

export async function sendTelegramAlert(
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()

    if (data.ok) {
      console.log('✅ Telegram alert sent successfully!')
      return true
    } else {
      console.error('Telegram error:', data)
      return false
    }
  } catch (error) {
    console.error('Telegram dispatch failed:', error)
    return false
  }
}

export async function sendTelegramLocationAlert(
  lat: number,
  lng: number,
  emergencyType: string
): Promise<boolean> {
  try {
    // 1. Send Text Message
    const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: `🚨 <b>EMERGENCY ALERT - RAKSHAK AI</b>

⚠️ Emergency Type: <b>${emergencyType.replace(/_/g, ' ')}</b>

🆘 Victim is <b>UNRESPONSIVE</b>

📍 <b>Live GPS Location:</b>
https://maps.google.com/?q=${lat},${lng}

🕒 Time: ${new Date().toLocaleString('en-IN')}

<i>Sent automatically via Rakshak AI Safety System</i>`,
        parse_mode: 'HTML',
      }),
    })

    // 2. Send Location Pin (Map Preview in Telegram!)
    const locationUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`
    await fetch(locationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        latitude: lat,
        longitude: lng,
      }),
    })

    console.log('✅ Telegram location alert sent!')
    return true
  } catch (error) {
    console.error('Telegram location failed:', error)
    return false
  }
}