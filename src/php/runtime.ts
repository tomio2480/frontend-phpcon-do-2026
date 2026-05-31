import { PHP } from '@php-wasm/universal'
import { loadWebRuntime } from '@php-wasm/web'

let instance: PHP | null = null

export async function getPhp(): Promise<PHP> {
  if (instance) return instance
  instance = new PHP(await loadWebRuntime('8.5'))
  return instance
}