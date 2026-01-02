<div align="center">

<img src="static/web-app-manifest-192x192.png" alt="LIME Viewer" width="120" />

# LIME Viewer

**LINEのバックアップデータをブラウザで安全にプレビュー**

[LIMEs](https://github.com/areteruhiro/LIMEs) から出力されたバックアップデータを、<br>
完全オフラインで閲覧できる Web アプリケーションです。

[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## ✨ 特徴

<table>
  <tr>
    <td>🔒 <strong>完全オフライン動作</strong></td>
    <td>すべてのデータはブラウザ内でのみ処理され、外部サーバーには一切送信されません</td>
  </tr>
  <tr>
    <td>📱 <strong>レスポンシブ対応</strong></td>
    <td>PC・スマートフォン両方で快適に閲覧できます</td>
  </tr>
  <tr>
    <td>🖼️ <strong>メディア表示</strong></td>
    <td>画像・スタンプ・絵文字などのメディアファイルに対応しています</td>
  </tr>
  <tr>
    <td>📋 <strong>連絡先表示</strong></td>
    <td>CSV ファイルをインポートして連絡先名を表示できます</td>
  </tr>
  <tr>
    <td>🔍 <strong>メッセージ検索</strong></td>
    <td>チャット内のメッセージをキーワードで検索できます</td>
  </tr>
  <tr>
    <td>📸 <strong>スクリーンショット</strong></td>
    <td>チャット画面を画像として保存できます</td>
  </tr>
  <tr>
    <td>📤 <strong>トーク履歴出力</strong></td>
    <td>トーク履歴をテキストファイルとしてエクスポートできます</td>
  </tr>
  <tr>
    <td>💾 <strong>データ永続化</strong></td>
    <td>ブラウザに保存して、再読み込みなしで利用できます</td>
  </tr>
  <tr>
    <td>📲 <strong>PWA 対応</strong></td>
    <td>ホーム画面に追加して、ネイティブアプリのように使用できます</td>
  </tr>
</table>

---

## 📖 使い方

### Step 1: バックアップデータの準備

[LIMEs](https://github.com/areteruhiro/LIMEs) を使用して LINE のバックアップを取得してください。  
以下のファイルが出力されます。

| ファイル                | 説明                                     | 必須 |
| :---------------------- | :--------------------------------------- | :--: |
| `naver_line_backup.db`  | メッセージデータベース                   |  ✅  |
| `contacts_XXXXXXXX.csv` | 連絡先リスト                             |  −   |
| `chats_backup/`         | メディアファイル（画像・音声ファイル等） |  −   |

### Step 2: ファイルのアップロード

1. **LIME Viewer** にアクセスします
2. **データベースファイル**: `naver_line_backup.db` を選択します（必須）
3. **連絡先ファイル**: CSV ファイルを選択します（任意）
4. **メディアファイル**: 以下の方法で選択します（任意）
   - **PC**: `chats_backup` フォルダをそのまま選択
   - **スマートフォン**: `chats_backup` フォルダを ZIP 圧縮してアップロード
5. **「プレビューを開始」** をクリックします

---

## 🔐 プライバシーとセキュリティ

このツールは **完全にクライアントサイドで動作** します。  
あなたのデータは安全に保護されています。

| 項目                                  |  状態   |
| :------------------------------------ | :-----: |
| すべてのデータ処理はブラウザ内で完結  |   ✅    |
| サーバーへのデータ送信                | ❌ なし |
| オフライン動作（初回読み込み後）      |   ✅    |
| データは IndexedDB に保存（削除可能） |   ✅    |

---

## ⚠️ 注意事項

> [!WARNING]
> 本ツールは **非公式** のツールです。  
> LINE の仕様変更により、予告なく使用できなくなる可能性があります。

> [!CAUTION]
> **免責事項**
>
> - 本ツールは **LY Corporation（旧 LINE 株式会社）とは一切関係がありません**
> - 本ツールは **学習・研究目的** で開発されています
> - 本ツールの使用により生じたいかなる損害についても、開発者は **一切の責任を負いません**
> - ご利用は **自己責任** でお願いいたします

- オープンチャットや一部のコンテンツタイプには対応していない場合があります
- 破壊的変更への対応には時間をいただく可能性があります

バグや「Unknown Contents」などの問題を発見された場合は、[Issues](https://github.com/Nich87/LIME-Viewer/issues) への報告、または [Pull Request](https://github.com/Nich87/LIME-Viewer/pulls) をお待ちしております。

---

## 🚀 開発者向け情報

### 必要な環境

| ツール                         | バージョン |
| :----------------------------- | :--------- |
| [Node.js](https://nodejs.org/) | v24.x      |
| [pnpm](https://pnpm.io/)       | v10.x      |

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/Nich87/LIME-Viewer.git
cd LIME-Viewer

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
```

### ビルド

```bash
# 本番用ビルド
pnpm build

# ビルド結果をプレビュー
pnpm preview
```

---

## 📦 技術スタック

| カテゴリ         | 技術                                                     |
| :--------------- | :------------------------------------------------------- |
| フレームワーク   | [SvelteKit](https://kit.svelte.dev/) (Svelte 5)          |
| スタイリング     | [Tailwind CSS](https://tailwindcss.com/) v4              |
| データベース     | [SQL.js](https://sql.js.org/) (SQLite in WebAssembly)    |
| アイコン         | [Iconify](https://iconify.design/)                       |
| ZIP ファイル処理 | [JSZip](https://stuk.github.io/jszip/)                   |
| 画像エクスポート | [html-to-image](https://github.com/bubkoo/html-to-image) |

---

## 🤝 コントリビューション

コントリビューションを歓迎します！  
バグ報告、機能リクエスト、プルリクエストなど、どのような形での貢献も大歓迎です。

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

---

## 📄 ライセンス

[MIT License](LICENSE)
