export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'feat', // New feature
				'fix', // Bug fix
				'docs', // Documentation only changes
				'style', // Changes that do not affect the meaning of the code (whitespace, formatting, etc.)
				'refactor', // Code change that neither fixes a bug nor adds a feature
				'perf', // Performance improvement
				'test', // Adding or modifying tests
				'build', // Changes affecting build system or external dependencies
				'ci', // Changes to CI configuration files or scripts
				'chore', // Other changes (no source or test changes)
				'revert' // Reverts a previous commit
			]
		]
	}
};
