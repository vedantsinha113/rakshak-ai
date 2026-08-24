import { getTelegramConfig } from '../utils/telegramStorage'

export async function sendTelegramAlert(message: string): Promise<boolean> {
  const { token, chatId } = getTelegramConfig()
  if (!token || !chatId) return false

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    const data = await response.json()
    return data.ok
  } catch {
    return false
  }
}

export async function sendTelegramLocationAlert(
  lat: number,
  lng: number,
  emergencyType: string
): Promise<boolean> {
  const { token, chatId } = getTelegramConfig()
  if (!token || !chatId) return false

  try {
    const textUrl = `https://api.telegram.org/bot${token}/sendMessage`
    await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 <b>EMERGENCY ALERT - RAKSHAK AI</b>

⚠️ Emergency: <b>${emergencyType.replace(/_/g, ' ')}</b>
🆘 Victim is <b>UNRESPONSIVE</b>
📍 Live GPS: https://maps.google.com/?q=${lat},${lng}
🕒 Time: ${new Date().toLocaleString('en-IN')}

<i>Sent automatically via Rakshak AI</i>`,
        parse_mode: 'HTML',
      }),
    })

    const locationUrl = `https://api.telegram.org/bot${token}/sendLocation`
    await fetch(locationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        latitude: lat,
        longitude: lng,
      }),
    })

    return true
  } catch {
    return false
  }
}

export async function testTelegramConnection(): Promise<boolean> {
  const { token, chatId } = getTelegramConfig()
  if (!token || !chatId) return false

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ <b>Rakshak AI Connected!</b>

🛡️ Your Telegram is now linked to Rakshak AI Safety System.

In case of emergency, you will receive:
• 🚨 Emergency Alert Message
• 📍 Live GPS Location Pin
• 🕒 Exact Time of Incident

Stay Safe! 🙏`,
        parse_mode: 'HTML',
      }),
    })
    const data = await response.json()
    return data.ok
  } catch {
    return false
  }
}