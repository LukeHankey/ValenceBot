import { neostandard } from 'neostandard'

export default [
	// Prettier does the formatting (see .prettierrc), so neostandard's style rules are off.
	...neostandard({ env: ['node'], noStyle: true }),
	{ rules: { 'no-unused-vars': 'warn' } }
]
