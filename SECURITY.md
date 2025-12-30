# Security Policy / セキュリティポリシー

## Supported Versions / サポート対象バージョン

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability / 脆弱性の報告

**English:**

If you discover a security vulnerability in this project, please report it responsibly. **Do not** create a public GitHub issue for security vulnerabilities.

Instead, please contact the maintainer directly through one of the following methods:

- **GitHub Security Advisories**: Use GitHub's private vulnerability reporting feature by going to the "Security" tab of this repository
- **Email**: If you need to reach out privately, please mention it in a GitHub issue and we will provide a secure contact method

When reporting a vulnerability, please include:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact of the vulnerability
4. Any suggestions for fixing the issue (optional)

We will acknowledge receipt of your report within 48 hours and aim to provide a fix within a reasonable timeframe based on the severity of the issue.

---

**日本語:**

このプロジェクトでセキュリティ上の脆弱性を発見した場合は、責任ある方法で報告してください。セキュリティ上の脆弱性について公開のGitHub Issueを作成**しないでください**。

代わりに、以下の方法でメンテナーに直接連絡してください：

- **GitHub Security Advisories**: このリポジトリの「Security」タブからGitHubのプライベート脆弱性報告機能を使用してください
- **メール**: プライベートに連絡が必要な場合は、GitHub Issueでその旨を記載いただければ、安全な連絡方法を提供いたします

脆弱性を報告する際は、以下の情報を含めてください：

1. 脆弱性の説明
2. 問題を再現する手順
3. 脆弱性の潜在的な影響
4. 修正の提案（任意）

報告を受け取ってから48時間以内に受領確認を行い、問題の深刻度に基づいて妥当な期間内に修正を提供することを目指します。

## Security Considerations / セキュリティに関する考慮事項

**English:**

This tool processes sensitive chat data entirely in the browser:

- ✅ All data processing occurs client-side only
- ✅ No data is sent to external servers
- ✅ Data is stored in browser's IndexedDB (can be cleared at any time)
- ✅ Works offline after initial load

Users should be aware that:

- Chat backup data may contain sensitive personal information
- The data stored in IndexedDB persists until manually cleared
- Sharing your browser profile may expose stored chat data

---

**日本語:**

このツールは、機密性の高いチャットデータをすべてブラウザ内で処理します：

- ✅ すべてのデータ処理はクライアントサイドでのみ行われます
- ✅ 外部サーバーへのデータ送信はありません
- ✅ データはブラウザのIndexedDBに保存されます（いつでも削除可能）
- ✅ 初回読み込み後はオフラインで動作します

ユーザーは以下の点に注意してください：

- チャットバックアップデータには機密性の高い個人情報が含まれている可能性があります
- IndexedDBに保存されたデータは手動で削除するまで保持されます
- ブラウザプロファイルを共有すると、保存されたチャットデータが公開される可能性があります
