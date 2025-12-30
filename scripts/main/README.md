# LIME Viewer デバッグスクリプト

LINEバックアップデータベースのデバッグ・分析用スクリプト集です。

## 前提条件

- Node.js がインストールされていること
- プロジェクトのルートディレクトリから実行すること
- データベースファイル (例: `./db/naver_line_backup3.db`) が存在すること

## スクリプト一覧

### 1. db-schema.mjs - データベーススキーマ確認

```bash
node scripts/main/db-schema.mjs [db_path]
```

データベースの全テーブル構造とサンプルデータを表示します。

### 2. list-chats.mjs - チャット一覧表示

```bash
node scripts/main/list-chats.mjs [db_path]
```

全チャットの一覧と統計情報を表示します。

### 3. chat-messages.mjs - 特定チャットのメッセージ確認

```bash
node scripts/main/chat-messages.mjs <chat_name_or_id> [limit] [db_path]
```

例:

```bash
node scripts/main/chat-messages.mjs User
node scripts/main/chat-messages.mjs User 50
```

### 4. message-types.mjs - メッセージタイプ分析

```bash
node scripts/main/message-types.mjs [db_path]
```

メッセージタイプと添付タイプの分布を分析します。

### 5. find-messages.mjs - メッセージ検索

```bash
node scripts/main/find-messages.mjs <query> [options]
```

オプション:

- `--type=<n>` : メッセージタイプでフィルタ
- `--att=<n>` : 添付タイプでフィルタ
- `--chat=<id>` : チャットIDでフィルタ

例:

```bash
node scripts/main/find-messages.mjs "hello"           # テキスト検索
node scripts/main/find-messages.mjs --type=5          # スタンプのみ
node scripts/main/find-messages.mjs --att=3           # ボイスメッセージのみ
node scripts/main/find-messages.mjs --att=19          # LINE Musicのみ
node scripts/main/find-messages.mjs --att=14          # ファイル添付のみ
```

## メッセージタイプ一覧

### message.type (メッセージタイプ)

| Type | 説明                       |
| ---- | -------------------------- |
| 1    | テキストメッセージ         |
| 2    | 画像                       |
| 3    | 動画                       |
| 4    | 通話履歴                   |
| 5    | スタンプ                   |
| 8    | 投稿通知 (アルバム/ノート) |
| 13   | グループイベント           |
| 17   | システムメッセージ         |
| 27   | リンクプレビュー           |
| 33   | 不明                       |

### attachement_type (添付タイプ)

| Type | 説明                   | パラメータ例                                  |
| ---- | ---------------------- | --------------------------------------------- |
| 0    | なし/テキストのみ      | web_page_preview_type (リンク含む場合)        |
| 1    | 画像                   | SID=emi, FILE_SIZE                            |
| 3    | ボイスメッセージ       | SID=ema, DURATION                             |
| 6    | 通話                   | TYPE (A/V), RESULT, DURATION                  |
| 7    | スタンプ               | STKPKGID, STKID                               |
| 13   | 連絡先共有             | mid, displayName                              |
| 14   | ファイル添付           | FILE_NAME, FILE_SIZE                          |
| 15   | 位置情報               | location_address, location_latitude/longitude |
| 16   | 投稿 (アルバム/ノート) | serviceType (AB/NT), albumName, text          |
| 18   | グループイベント       | LOC_KEY, LOC_ARGS                             |
| 19   | LINE Music             | previewUrl, duration, subText                 |
| 22   | Flex メッセージ        | FLEX_JSON                                     |

## パラメータのパース

`parameter`カラムはタブ区切りのキーバリューペアです:

```
KEY1\tVALUE1\tKEY2\tVALUE2\t...
```

例:

```
STKPKGID\t18160913\tSTKID\t469167027\tseq\t587684394429317275
```

## 注意事項

- 位置情報の緯度経度は1,000,000倍されて格納されています
- タイムスタンプはミリ秒のUNIX時間です
- `attachement_type`のスペルミス（attachement）はLINEのオリジナルスキーマです
