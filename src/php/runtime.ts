import { PHP } from '@php-wasm/universal'
import { loadWebRuntime } from '@php-wasm/web'

let instance: PHP | null = null
let initPromise: Promise<PHP> | null = null

export function getPhp(): Promise<PHP> {
  if (instance) return Promise.resolve(instance)
  if (!initPromise) {
    initPromise = loadWebRuntime('8.5')
      .then(runtime => {
        instance = new PHP(runtime)
        return instance
      })
      .catch(err => {
        initPromise = null
        throw err
      })
  }
  return initPromise
}

export function _resetForTesting(): void {
  instance = null
  initPromise = null
}