import { useState } from 'preact/hooks'
import { usePhp } from './hooks/usePhp'

export default function App() {
  const { status, error, run } = usePhp()
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setRunError(null)
    setOutput(null)
    try {
      const result = await run('<?php echo 1+1; ?>')
      setOutput(result)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <main>
      <h1>あなたの北海道は何 %？</h1>
      <section>
        <p>PHP WASM ステータス: {status}</p>
        {status === 'error' && <p>エラー: {error?.message}</p>}
        {status === 'ready' && (
          <button type="button" onClick={handleRun} disabled={running}>
            {running ? '実行中…' : 'PHP を実行（1+1）'}
          </button>
        )}
        {runError !== null && <p>実行エラー: {runError}</p>}
        {output !== null && runError === null && (
          <p>
            <code>{'<?php echo 1+1; ?>'}</code> の出力: <strong>{output}</strong>
          </p>
        )}
      </section>
    </main>
  )
}
