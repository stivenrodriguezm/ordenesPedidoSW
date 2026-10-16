import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node ≥ 22 expone un `localStorage` global propio (vacío sin
// --localstorage-file) que tapa el de jsdom; la app usa el del navegador.
const storage = globalThis.jsdom?.window?.localStorage
if (storage && globalThis.localStorage !== storage) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}

afterEach(() => {
  cleanup()
  globalThis.localStorage?.clear()
})
