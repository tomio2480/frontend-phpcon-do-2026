import ExternalLink from './ExternalLink'

export const LT_VIDEO_URL = 'https://www.youtube.com/watch?v=OJ7slgITqt8'
export const LT_VIDEO_TITLE =
  '実践！春の上川空知駆動開発〜旭川・東川・美瑛・上富良野・富良野・芦別・赤平・滝川・深川編 - YouTube'

export default function AboutTool() {
  return (
    <div class="mt-12 border-t border-text/10 pt-6 text-sm text-text-2 space-y-6">
      {/* 関連する LT 動画 */}
      <div class="space-y-2">
        <h2 class="text-sm font-semibold text-text">関連する LT 動画</h2>
        <p>
          本ツールは，#frontend_phpcon_do で紹介した下記の LT 動画で映している
          「草原駆動開発」の取り組みのなかで生まれたものです．
        </p>
        <p>
          <span aria-hidden="true">▶️</span>{' '}
          <ExternalLink href={LT_VIDEO_URL} text={LT_VIDEO_TITLE} />
        </p>
      </div>

      {/* Claude からのおすすめポイント */}
      <div class="space-y-2">
        <h2 class="text-sm font-semibold text-text">Claude からのおすすめポイント</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li>
            #frontend_phpcon_do は，フロントエンドカンファレンス北海道と
            PHP カンファレンス北海道の合同開催です．その双方にちなみ，
            ブラウザ（フロントエンド）上で PHP の集計処理を
            php-wasm（WebAssembly）として実行しています．
          </li>
          <li>
            集計ロジックの本体は 1 枚の PHP ファイルです．
            サーバを持たず，利用者の手元（ブラウザ）だけで計算が完結します．
          </li>
          <li>
            計算がクライアントで閉じるため，GitHub Pages のような静的ホスティングだけで
            PHP の集計が動きます．選んだ市町村のデータは外部へ送信しません．
          </li>
        </ul>
      </div>

      {/* tomio2480 のおすすめポイント */}
      <div class="space-y-2">
        <h2 class="text-sm font-semibold text-text">tomio2480 のおすすめポイント</h2>
        <p>自分と北海道がどれだけ一体となれているのかを定量的に感じてください．</p>
      </div>
    </div>
  )
}
