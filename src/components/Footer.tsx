import ExternalLink from './ExternalLink'

export const REPO_URL = 'https://github.com/tomio2480/frontend-phpcon-do-2026'
export const SPONSORS_URL = 'https://github.com/sponsors/tomio2480'
export const HATENA_BLOG_URL = 'https://tomio2480.hatenablog.com/'

export default function Footer() {
  return (
    <footer class="mt-12 border-t border-text/10 pt-6 pb-8 text-xs text-text-2 space-y-4">
      <h2 class="text-sm font-semibold text-text">データ出典</h2>

      <p>
        本アプリは政府・自治体が公開する公式データを利用しています．
        利用データの一次出典は以下のとおりです．
      </p>

      <ul class="space-y-2 list-none">
        <li>
          <span class="font-medium">市区町村コード</span>：
          総務省「全国地方公共団体コード」（2024年6月26日現在）．
          {' '}<ExternalLink href="https://www.soumu.go.jp/denshijiti/code.html" text="総務省 全国地方公共団体コード（Excel／PDF）" />
        </li>
        <li>
          <span class="font-medium">行政区域・面積</span>：
          区域形状は国土交通省「国土数値情報 行政区域データ（N03，2024年）」の
          GeoJSON を使用．面積はそのジオメトリから算出した近似値（±20% 程度の誤差を含む目安値）です．
          {' '}<ExternalLink href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2024.html" text="国土数値情報 行政区域データ" />
          {'，参考：'}<ExternalLink href="https://www.gsi.go.jp/KOKUJYOHO/MENCHO-title.htm" text="国土地理院 全国都道府県市区町村別面積調" />
        </li>
        <li>
          <span class="font-medium">人口</span>：
          総務省「住民基本台帳に基づく人口，人口動態及び世帯数」2024年1月1日現在．
          {' '}<ExternalLink href="https://www.soumu.go.jp/main_sosiki/jichi_gyousei/daityo/jinkou_jinkoudoutai-setaisuu.html" text="総務省 住民基本台帳人口" />
        </li>
        <li>
          <span class="font-medium">ふるさと納税</span>：
          総務省「ふるさと納税に関する現況調査結果」令和7年度実施（令和6年度実績）．
          市町村別の受入額・受入件数の Excel を使用．
          {' '}<ExternalLink href="https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/furusato/archive/" text="総務省 ふるさと納税 関連資料" />
        </li>
      </ul>

      <div class="mt-4 p-3 rounded-lg bg-text/5 space-y-1">
        <p class="font-medium text-text">北方領土に置かれた6村について</p>
        <p>
          色丹村（色丹郡，01695）・泊村（国後郡，01696）・留夜別村（国後郡，01697）・
          留別村（択捉郡，01698）・紗那村（紗那郡，01699）・蘂取村（蘂取郡，01700）の6村は，
          歯舞群島を除く国後島・択捉島・色丹島に置かれた北方領土の自治体です．
          いずれも総務省の全国地方公共団体コードに正式なコードが割り当てられているため，
          本アプリでも選択対象に含めています．
          {' '}<ExternalLink href="https://www.soumu.go.jp/denshijiti/code.html" text="参照：全国地方公共団体コード" />
          ．面積は GeoJSON ジオメトリから算出した近似値です．
          人口・ふるさと納税は，本アプリが用いた公式統計
          （住民基本台帳人口・ふるさと納税現況調査）に6村が含まれないため，ゼロとしています．
        </p>
      </div>

      <p class="text-text-2 mt-4">
        本アプリは学習・発表目的で作成されたものです．
        面積は近似値であり，掲載データの正確性は保証しません．
      </p>

      <section class="mt-6 space-y-2">
        <h2 class="text-sm font-semibold text-text">ソースコード</h2>
        <p>
          本アプリのソースコードは GitHub で公開しています．
          {' '}<ExternalLink href={REPO_URL} text="GitHub リポジトリ" />
        </p>
        <p>ライセンスは GPL v2 です．詳細はリポジトリ内の LICENSE を参照してください．</p>
      </section>

      <section class="mt-6 space-y-2">
        <h2 class="text-sm font-semibold text-text">tomio2480 を支援する</h2>
        <p>
          旅費でお金を使い込んでしまって本当に貧しい tomio2480 へ，
          恵みの支援をいただけるとうれしいです．
        </p>
        <ul class="space-y-2 list-disc pl-5">
          <li>
            <ExternalLink href={SPONSORS_URL} text="GitHub Sponsors" />
            {' '}から継続・単発の支援ができます．
          </li>
          <li>
            <ExternalLink href={HATENA_BLOG_URL} text="はてなブログ" />
            {' '}のトップページ右カラム2つめに，Codoc の寄付ボタンを置いています．
          </li>
        </ul>
      </section>

      <p class="mt-6 text-center text-text-2">© 2026 tomio2480</p>
    </footer>
  )
}
