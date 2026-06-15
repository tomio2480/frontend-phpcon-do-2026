// 選択した市区町村コードの集合を，全コードの並び順に対するビットセットへ変換し，
// base64url 文字列へ圧縮する．X 共有 URL の ?m= パラメータに用いる．
// allCodes は encode・decode の双方で同一かつ安定した並び順を渡す前提とする．

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(token: string): Uint8Array {
  let b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  // 厳格な atob 実装でも復号できるよう不足分のパディングを補う
  const pad = (4 - (b64.length % 4)) % 4
  b64 += '='.repeat(pad)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// 選択コードを base64url のビットセットへ符号化する．未選択なら空文字列を返す．
export function encodeSelection(
  selectedCodes: readonly string[],
  allCodes: readonly string[],
): string {
  if (selectedCodes.length === 0) return ''
  const index = new Map(allCodes.map((code, i) => [code, i]))
  const bytes = new Uint8Array(Math.ceil(allCodes.length / 8))
  for (const code of selectedCodes) {
    const i = index.get(code)
    if (i === undefined) continue
    bytes[i >> 3] |= 1 << (i & 7)
  }
  return bytesToBase64Url(bytes)
}

// ビットセットを復号し，選択された市区町村コードの配列を返す．
// 不正なトークンは空配列として扱い，例外を投げない．
export function decodeSelection(
  token: string,
  allCodes: readonly string[],
): string[] {
  if (!token) return []
  let bytes: Uint8Array
  try {
    bytes = base64UrlToBytes(token)
  } catch {
    return []
  }
  const result: string[] = []
  // トークンが切り詰められていても範囲外参照しないよう上限を絞る
  const maxLen = Math.min(allCodes.length, bytes.length * 8)
  for (let i = 0; i < maxLen; i++) {
    const byte = bytes[i >> 3]
    if (byte !== undefined && (byte & (1 << (i & 7)))) {
      result.push(allCodes[i])
    }
  }
  return result
}
