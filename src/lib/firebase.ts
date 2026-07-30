import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD0fLoEOwLw2BvkN7donkS8t0KDPl_FNRc',
  authDomain: 'rakshak-ai-a2151.firebaseapp.com',
  projectId: 'rakshak-ai-a2151',
  storageBucket: 'rakshak-ai-a2151.firebasestorage.app',
  messagingSenderId: '594524130372',
  appId: '1:594524130372:web:232d6847971e801f9dc011',
  measurementId: 'G-HLRY3KQVF2',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)