import { PHP } from '@php-wasm/universal'
import { loadWebRuntime } from '@php-wasm/web'

let instance: PHP | null = null
let initPromise: Promise<PHP> | null = null

export function getPhp(): Promise<PHP> {
  if (instance) return Promise.resolve(instance)
  if (!initPromise) {
    const promise = loadWebRuntime('8.5')
      .then(runtime => {
        const phpInstance = new PHP(runtime)
        if (initPromise === promise) {
          instance = phpInstance
        }
        return phpInstance
      })
      .catch(err => {
        if (initPromise === promise) {
          initPromise = null
        }
        throw err
      })
    initPromise = promise
  }
  return initPromise
}

export function _resetForTesting(): void {
  instance = null
  initPromise = null
}
