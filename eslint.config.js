import { neostandard } from 'neostandard'

export default [
	// A local script for registering slash commands; it is gitignored.
	{ ignores: ['src/slashCommands.js'] },
	// Prettier does the formatting (see .prettierrc), so neostandard's style rules are off.
	...neostandard({ env: ['node'], noStyle: true }),
	{ rules: { 'no-unused-vars': 'warn' } }
]
