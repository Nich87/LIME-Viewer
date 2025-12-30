# LIME Viewer 💬

[LIMEs](https://github.com/areteruhiro/LIMEs) から出力されたバックアップデータをブラウザでプレビューできるツールです。

<p align="center">
  <img src="https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

## ✨ 特徴

- 🔒 **完全オフライン動作** - すべてのデータはブラウザ内でのみ処理され、外部サーバーには一切送信されません
- 📱 **レスポンシブ対応** - PC・スマートフォン両方で快適に閲覧可能
- 🖼️ **メディア表示** - 画像・スタンプ・絵文字などのメディアファイルに対応
- 📋 **連絡先表示** - CSVファイルをインポートして連絡先名を表示
- 🔍 **メッセージ検索** - チャット内のメッセージを検索
- 📸 **スクリーンショット** - チャット画面をスクリーンショットとして保存
- 💾 **データ永続化** - ブラウザに保存して再読み込み不要

## 🚀 Getting Started

### 必要な環境

- [Node.js](https://nodejs.org/) v24.x
- [pnpm](https://pnpm.io/) v10.x

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

## 📖 Usage

### 1. バックアップデータの準備

[LIMEs](https://github.com/areteruhiro/LIMEs) を使用してLINEのバックアップを取得してください。以下のファイルが出力されます：

| ファイル                | 説明                                    | 必須 |
| ----------------------- | --------------------------------------- | ---- |
| `naver_line_backup.db`  | メッセージデータベース                  | ✅   |
| `contacts_XXXXXXXX.csv` | 連絡先リスト                            | 任意 |
| `chats_backup/`         | メディアファイル (画像・音声ファイル等) | 任意 |

### 2. ファイルのアップロード

1. LIME Viewer にアクセス
2. `naver_line_backup.db` を選択（必須）
3. 連絡先CSVを選択（任意 - 相手の名前を表示するために使用）
4. メディアファイルを選択（任意）
   - **PCの場合**: `chats_backup` フォルダをそのまま選択
   - **スマートフォンの場合**: `chats_backup` フォルダをZIP圧縮してアップロード
5. 「プレビューを開始」をクリック

## ⚠️ 注意事項

本ツールは**非公式**のツールとなります。
そのため各種実装変更により使用不可となる可能性があります。
出来る限り破壊的変更などにも対応していきますが、時間をいただく可能性があります。

オープンチャットや一部のコンテンツタイプには対応できていない可能性があります。

バグやUnknown Contentsなどの問題を発見された場合は、[Issues](https://github.com/Nich87/LIME-Viewer/issues) への報告、または [Pull Request](https://github.com/Nich87/LIME-Viewer/pulls) をお待ちしております。

## 🔐 プライバシー

このツールは**完全にクライアントサイドで動作**します。

- ✅ すべてのデータ処理はブラウザ内で完結
- ✅ サーバーへのデータ送信なし
- ✅ インターネット接続なしでも動作（初回読み込み後）
- ✅ データはブラウザの IndexedDB に保存（必要に応じて削除可能）

## 📦 Tech stack

- **フレームワーク**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/) v4
- **データベース**: [SQL.js](https://sql.js.org/) (SQLite in WebAssembly)
- **アイコン**: [Iconify](https://iconify.design/)
- **ZIPファイル処理**: [JSZip](https://stuk.github.io/jszip/)
- **画像エクスポート**: [html-to-image](https://github.com/bubkoo/html-to-image)

## 🤝 Contributing

コントリビューションを歓迎します！バグ報告、機能リクエスト、プルリクエストなど、どのような形での貢献も大歓迎です。

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 📄 ライセンス

MIT License
