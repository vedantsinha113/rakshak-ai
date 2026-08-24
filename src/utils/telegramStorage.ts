const TOKEN_KEY = 'rakshak_telegram_token'
const CHAT_KEY = 'rakshak_telegram_chatid'

export function saveTelegramConfig(token: string, chatId: string) {
  localStorage.setItem(TOKEN_KEY, token.trim())
  localStorage.setItem(CHAT_KEY, chatId.trim())
}

export function getTelegramConfig(): { token: string; chatId: string } {
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    chatId: localStorage.getItem(CHAT_KEY) || '',
  }
}

export function isTelegramConfigured(): boolean {
  const { token, chatId } = getTelegramConfig()
  return token.length > 10 && chatId.length > 3
}