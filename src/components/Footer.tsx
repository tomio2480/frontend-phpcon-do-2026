export default function Footer() {
  return (
    <footer class="mt-12 border-t border-text/10 pt-6 pb-8 text-xs text-text-2 space-y-4">
      <h2 class="text-sm font-semibold text-text">データ出典</h2>

      <ul class="space-y-2 list-none">
        <li>
          <span class="font-medium">市区町村コード</span>：
          総務省「全国地方公共団体コード」（2024年6月26日現在）所管．
          一覧の参照元：地方税共同機構 eLTAX（地方税ポータルシステム）．
          {' '}<a
            href="https://www.eltax.lta.go.jp/documents/10705"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >参照先（eLTAX）</a>
        </li>
        <li>
          <span class="font-medium">面積</span>：
          公開されている GeoJSON（hokkaido.geojson）のジオメトリから算出した近似値．
          ±20% 程度の誤差を含む目安値です．
          参考原典：国土地理院「全国都道府県市区町村別面積調」令和5年（2023年）10月1日現在．
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
          総務省「ふるさと納税に関する現況調査結果」令和6年度実施（令和5年度実績）．
        </li>
      </ul>

      <div class="mt-4 p-3 rounded-lg bg-text/5 space-y-1">
        <p class="font-medium text-text">北方領土に置かれた6村について</p>
        <p>
          色丹村（色丹郡）・泊村（国後郡）・留夜別村（国後郡）・留別村（択捉郡）・
          紗那村（紗那郡）・蘂取村（蘂取郡）の6村は，歯舞群島を除く国後島・択捉島・
          色丹島に置かれた北方領土の自治体です．
          総務省所管の全国地方公共団体コード一覧に正式に登録されているため，
          本アプリでも選択対象に含めています（
          {' '}<a
            href="https://www.eltax.lta.go.jp/documents/10705"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-text transition-colors"
          >参照：全国地方公共団体コード一覧</a>
          ）．面積は GeoJSON ジオメトリから算出した近似値です．
          人口・ふるさと納税は現在行政機能が停止しているためゼロとしています．
        </p>
      </div>

      <p class="text-text/50 mt-4">
        本アプリは学習・発表目的で作成されたものです．
        掲載データの正確性は保証しません．
      </p>
    </footer>
  )
}
