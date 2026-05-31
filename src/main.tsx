import { render } from 'preact'
import App from './App'
import './styles/tokens.css'

const container = document.getElementById('app')
if (!container) {
  throw new Error('mount target #app not found in index.html')
}
render(<App />, container)
