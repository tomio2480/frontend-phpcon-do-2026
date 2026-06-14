import { render } from 'preact'
import App from './App'
import './styles/tokens.css'

const container = document.getElementById('app')
if (!container) {
  throw new Error('mount target #app not found in index.html')
}

let mounted = false
function mount() {
  if (mounted) return
  mounted = true
  render(<App />, container!)
}

// coi-serviceworker による Cross-Origin Isolation 確立前に描画すると，
// 直後の自動リロードで画面が点滅する．分離が済むまで静的スプラッシュを保ち，
// 確立後（＝リロード後の読み込み）に初めてアプリを描画する．
// SW 非対応等で分離できない環境では一定時間後にフォールバック描画する．
if (window.crossOriginIsolated) {
  mount()
} else {
  window.setTimeout(mount, 2500)
}
