# Contribution Guidelines / コントリビューションガイドライン

Thank you for considering contributing to this project! We appreciate your efforts to make it better.

このプロジェクトへの貢献をご検討いただきありがとうございます！より良いプロジェクトにするためのご協力に感謝いたします。

---

## Table of Contents / 目次

- [Reporting Issues / 問題の報告](#reporting-issues--問題の報告)
- [Feature Requests / 機能リクエスト](#feature-requests--機能リクエスト)
- [Submitting Changes / 変更の提出](#submitting-changes--変更の提出)
- [Commit Message Convention / コミットメッセージ規約](#commit-message-convention--コミットメッセージ規約)
- [Coding Conventions / コーディング規約](#coding-conventions--コーディング規約)
- [Documentation / ドキュメント](#documentation--ドキュメント)

---

## Reporting Issues / 問題の報告

**English:**
If you encounter any problems or bugs while using this project, please report them by opening a GitHub issue. Before creating a new issue, please check if a similar one already exists to avoid duplicates. When reporting issues, provide a clear and concise description of the problem, including steps to reproduce it, expected behavior, and any relevant screenshots or error messages.

**日本語:**
このプロジェクトを使用中に問題やバグに遭遇した場合は、GitHub Issueを開いて報告してください。新しいIssueを作成する前に、重複を避けるために類似のIssueが既に存在しないか確認してください。問題を報告する際は、再現手順、期待される動作、関連するスクリーンショットやエラーメッセージを含め、問題を明確かつ簡潔に説明してください。

---

## Feature Requests / 機能リクエスト

**English:**
If you have ideas for new features or improvements, you can submit a GitHub issue as well. Clearly describe the feature or improvement you would like to see and provide any additional context or examples that might be helpful. Feature requests help us understand your needs and prioritize the project's development.

**日本語:**
新機能や改善のアイデアがある場合は、GitHub Issueとして提出できます。希望する機能や改善を明確に説明し、役立つ可能性のある追加のコンテキストや例を提供してください。機能リクエストは、ニーズを理解し、プロジェクトの開発の優先順位を決めるのに役立ちます。

---

## Submitting Changes / 変更の提出

**English:**
To contribute code changes, follow these steps:

1. Fork the repository and create a new branch for your changes.
2. Ensure that your code follows the project's coding conventions and style guide.
3. Make commits with clear and descriptive messages following the [Commit Message Convention](#commit-message-convention--コミットメッセージ規約).
4. Push your branch to your forked repository.
5. Open a pull request (PR) from your branch to the original repository's `main` branch.
6. Provide a detailed description of your changes in the PR, including any related issues or feature requests.

A project maintainer will review your PR, provide feedback if necessary, and merge it once it meets the project's standards.

**日本語:**
コードの変更を提出するには、以下の手順に従ってください：

1. リポジトリをフォークし、変更用の新しいブランチを作成します。
2. コードがプロジェクトのコーディング規約とスタイルガイドに従っていることを確認します。
3. [コミットメッセージ規約](#commit-message-convention--コミットメッセージ規約)に従って、明確で説明的なメッセージでコミットを作成します。
4. ブランチをフォークしたリポジトリにプッシュします。
5. ブランチから元のリポジトリの`main`ブランチへプルリクエスト（PR）を開きます。
6. PRに変更の詳細な説明を記載し、関連するIssueや機能リクエストがあれば含めてください。

プロジェクトのメンテナーがPRをレビューし、必要に応じてフィードバックを提供し、プロジェクトの基準を満たしたらマージします。

---

## Commit Message Convention / コミットメッセージ規約

This project uses [Conventional Commits](https://www.conventionalcommits.org/) specification. All commit messages are validated automatically using commitlint.

このプロジェクトは[Conventional Commits](https://www.conventionalcommits.org/)仕様を使用しています。すべてのコミットメッセージはcommitlintによって自動的に検証されます。

### Format / フォーマット

```
<type>: <subject>

[optional body]

[optional footer(s)]
```

### Commit Types / コミットタイプ

| Type       | Description (EN)                                                                                        | 説明 (JP)                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `feat`     | A new feature                                                                                           | 新機能                                                                 |
| `fix`      | A bug fix                                                                                               | バグ修正                                                               |
| `docs`     | Documentation only changes                                                                              | ドキュメントのみの変更                                                 |
| `style`    | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.) | コードの意味に影響を与えない変更（空白、フォーマット、セミコロンなど） |
| `refactor` | A code change that neither fixes a bug nor adds a feature                                               | バグ修正や機能追加ではないコード変更                                   |
| `perf`     | A code change that improves performance                                                                 | パフォーマンス改善                                                     |
| `test`     | Adding missing tests or correcting existing tests                                                       | テストの追加や修正                                                     |
| `build`    | Changes that affect the build system or external dependencies                                           | ビルドシステムや外部依存関係に影響する変更                             |
| `ci`       | Changes to CI configuration files and scripts                                                           | CI設定ファイルやスクリプトの変更                                       |
| `chore`    | Other changes that don't modify src or test files                                                       | その他の変更（ソースコードやテストの変更を伴わない）                   |
| `revert`   | Reverts a previous commit                                                                               | 以前のコミットを取り消す                                               |

### Examples / 例

```bash
# Good examples / 良い例
feat: add user authentication
fix: resolve memory leak in image loader
docs: update API documentation
style: format code with prettier
refactor: simplify database query logic
perf: optimize image rendering performance
test: add unit tests for message parser
build: update svelte to v5
ci: add GitHub Actions workflow
chore: update dependencies
revert: revert "feat: add user authentication"

# Bad examples / 悪い例
added new feature          # Missing type prefix / タイプのプレフィックスがない
Fix: bug                   # Type should be lowercase / タイプは小文字でなければならない
feat:add feature           # Missing space after colon / コロンの後にスペースがない
```

### Pre-commit Hooks / プリコミットフック

**English:**
This project uses Husky to run the following checks before each commit:

- **lint-staged**: Runs ESLint and Prettier on staged files
- **commitlint**: Validates commit message format

If your commit message doesn't follow the convention or your code has linting errors, the commit will be rejected.

**日本語:**
このプロジェクトはHuskyを使用して、各コミット前に以下のチェックを実行します：

- **lint-staged**: ステージングされたファイルに対してESLintとPrettierを実行
- **commitlint**: コミットメッセージの形式を検証

コミットメッセージが規約に従っていない場合や、コードにlintエラーがある場合、コミットは拒否されます。

---

## Coding Conventions / コーディング規約

**English:**
Please adhere to the existing coding conventions and style guide used in this project. Consistent coding styles improve code readability and maintainability. If you're unsure about any aspect of the coding conventions, feel free to ask for clarification in your PR.

- Use **ESLint** for JavaScript/TypeScript linting
- Use **Prettier** for code formatting
- Run `pnpm lint` to check for linting errors
- Run `pnpm format` to format your code

**日本語:**
このプロジェクトで使用されている既存のコーディング規約とスタイルガイドに従ってください。一貫したコーディングスタイルは、コードの可読性と保守性を向上させます。コーディング規約について不明な点がある場合は、PRで遠慮なくお尋ねください。

- **ESLint**を使用してJavaScript/TypeScriptのlintを行います
- **Prettier**を使用してコードをフォーマットします
- `pnpm lint`を実行してlintエラーを確認します
- `pnpm format`を実行してコードをフォーマットします

---

## Documentation / ドキュメント

**English:**
Improvements to documentation are always welcome. If you find any inaccuracies, missing information, or have suggestions for improving the documentation, you can contribute by submitting a PR with your changes. Make sure to clearly explain the purpose of the documentation update and provide relevant examples, if applicable.

**日本語:**
ドキュメントの改善は常に歓迎されます。不正確な情報、不足している情報を見つけた場合、またはドキュメントの改善に関する提案がある場合は、変更を含むPRを提出してください。ドキュメント更新の目的を明確に説明し、該当する場合は関連する例を提供してください。

---

Thank you for contributing! / ご協力ありがとうございます！
