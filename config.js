const CONFIG = {
  // ─── Google OAuth ───────────────────────────────────────────────────────────
  // 取得方法: https://console.cloud.google.com/
  //   APIs & Services → 認証情報 → 「OAuth 2.0 クライアント ID」を作成
  //   アプリの種類: ウェブアプリケーション
  //   承認済みの JavaScript 生成元にデプロイ先URLを追加
  GOOGLE_CLIENT_ID: '998001267537-ot3ai9b5qhl91slni0b7d1fc1ldt7bht.apps.googleusercontent.com',

  // ─── ブログ一覧 ──────────────────────────────────────────────────────────────
  // id: メール件名・フロントマターに使われるキー（英数字・ハイフンのみ）
  // name: ドロップダウンに表示される名前
  BLOGS: [
    { id: 'tech', name: '技術ブログ' },
    { id: 'diary', name: '日記' },
  ],
};
