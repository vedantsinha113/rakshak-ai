// Keeps sensors and phone awake in the background
let wakeLock: any = null

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
      console.log('⚡ Background Sensor WakeLock Active')
    }
  } catch (err) {
    console.log('WakeLock not supported or denied')
  }
}

export function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release()
    wakeLock = null
  }
}