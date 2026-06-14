export default function Footer() {
  return (
    <footer class="mt-12 border-t border-text/10 pt-6 pb-8 text-xs text-text-2 space-y-4">
      <h2 class="text-sm font-semibold text-text">データ出典</h2>

      <ul class="space-y-2 list-none">
        <li>
          <span class="font-medium">市区町村コード</span>：
          総務省・地方税共同機構「全国地方公共団体コード」（2024年6月26日現在）。
          {' '}<a
            href="https://www.eltax.lta.go.jp/documents/10705"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >出典ページ（eLTAX）</a>
        </li>
        <li>
          <span class="font-medium">面積</span>：
          国土地理院「全国都道府県市区町村別面積調」令和5年（2023年）10月1日現在を
          原典とし，hokkaido.geojson のジオメトリから算出した近似値（±20% 程度の誤差を含む）．
          {' '}<a
            href="https://www.gsi.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >国土地理院</a>
        </li>
        <li>
          <span class="font-medium">人口</span>：
          総務省「住民基本台帳に基づく人口，人口動態及び世帯数」2024年1月1日現在．
          {' '}<a
            href="https://www.soumu.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >総務省</a>
        </li>
        <li>
          <span class="font-medium">ふるさと納税</span>：
          総務省「ふるさと納税に関する現況調査結果」令和6年度実施分．
        </li>
      </ul>

      <div class="mt-4 p-3 rounded-lg bg-text/5 space-y-1">
        <p class="font-medium text-text">北方領土6村について</p>
        <p>
          色丹村・泊村・留夜別村・留別村・紗那村・蘂取村の6村は，
          総務省の全国地方公共団体コード一覧に正式に登録されているため，
          本アプリでも選択対象に含めています．
          面積は GeoJSON ジオメトリから算出．
          人口・ふるさと納税は行政上の集計値が存在しないためゼロとしています．
          {' '}<a
            href="https://www.eltax.lta.go.jp/documents/10705"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >参照：全国地方公共団体コード（eLTAX）</a>
        </p>
      </div>

      <p class="text-text/50 mt-4">
        本アプリは学習・発表目的で作成されたものです．
        掲載データの正確性は保証しません．
      </p>
    </footer>
  )
}
