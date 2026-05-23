# Mail2Blog

Googleアカウントでサインインして記事を書き、Gmail API でメール送信してブログに投稿するUI。  
サーバー不要の完全静的サイト。

## 機能

- Google OAuth ログイン（テストユーザーのみアクセス可）
- 投稿先ブログをドロップダウンで選択
- 記事フォーム（タイトル・タグ・Markdown本文）
- Gmail API で直接送信（フッターなし）
- 下書き自動保存・復元（ブラウザのlocalStorage）
- ダーク/ライト/自動テーマ切り替え（端末設定に追従）

## 仕組み

```
ブラウザ（Mail2Blog）
  → Google サインイン（OAuth）
  → 記事フォーム送信
  → Gmail API で自分宛にメール送信
  → blog-gs がメールを受信・パース → ブログに投稿
```

## セットアップ

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **APIs & Services → ライブラリ** → `Gmail API` を有効化
3. **APIs & Services → 認証情報** → OAuth 2.0 クライアント ID を作成
   - アプリケーションの種類: **ウェブアプリケーション**
   - 「承認済みの JavaScript 生成元」にデプロイ先URLを追加
   - ローカル確認時は `http://localhost:PORT` も追加
4. **OAuth 同意画面** → スコープを追加 → `gmail.send` を追加
5. **OAuth 同意画面** → テストユーザーに自分のGmailアドレスを追加

### 2. config.js の編集

```js
const CONFIG = {
  GOOGLE_CLIENT_ID: 'xxxxxxxx.apps.googleusercontent.com',

  BLOGS: [
    { id: 'tech', name: '技術ブログ' },
    { id: 'diary', name: '日記' },
  ],
};
```

### 3. デプロイ

**GitHub Pages**: Settings → Pages → Source を `main` ブランチに設定。

**Cloudflare Pages**: ビルドコマンドなし、出力ディレクトリ `/`。

## メール形式（blog-gs 向け）

- **件名**: `[blog-id] タイトル`
- **本文**: Markdown テキスト

`blog-id` は `config.js` の `BLOGS[].id` と一致します。

## ローカル確認

```bash
npx serve .
```

## 関連リポジトリ

メール受信・ブログ投稿処理は [blog-gas](https://github.com/azimicat/blog-gas) が担当。
