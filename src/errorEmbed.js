import { EmbedBuilder } from 'discord.js'

import Color from './colors.js'

/**
 * Error embeds for the errors channel.
 *
 * This used to live inline in DataBase.js and titled every embed with
 * `import.meta.url`, which is the file the *logging code* lives in — so every
 * error was reported as coming from DataBase.js. The origin has to come from
 * the error's own stack instead.
 *
 * Everything here tolerates rubbish input on purpose: this runs inside catch
 * blocks, and an error handler that throws loses the original error.
 */

// Discord's limits. Exceeding any of them rejects the whole message.
const MAX_TITLE = 256
const MAX_DESCRIPTION = 4096
const MAX_FIELD_VALUE = 1024

const truncate = (text, limit) => (text.length <= limit ? text : `${text.slice(0, limit - 1)}…`)

/** Frames from this project, ignoring dependencies and node internals. */
const isProjectFrame = (frame) => frame.includes('/src/') && !frame.includes('node_modules') && !frame.includes('node:')

/**
 * Where an error actually came from, read from the first project frame in its
 * stack. Returns `unknown` rather than throwing when there is nothing usable.
 */
export const originFromStack = (error) => {
	const stack = typeof error?.stack === 'string' ? error.stack : ''
	const frame = stack.split('\n').find(isProjectFrame)

	if (!frame) return { file: 'unknown', line: '?', path: 'unknown' }

	// "    at fn (file:///.../src/dsf/calls/worlds.js:81:9)" -> path, line, column
	const match = /([^\s(]+):(\d+):(\d+)\)?\s*$/.exec(frame)
	if (!match) return { file: 'unknown', line: '?', path: 'unknown' }

	const fullPath = match[1].replace(/^file:\/\//, '')
	const srcIndex = fullPath.indexOf('/src/')

	return {
		file: fullPath.split('/').pop(),
		line: match[2],
		path: srcIndex === -1 ? fullPath : fullPath.slice(srcIndex + 1)
	}
}

/** The stack with dependency noise removed, trimmed to fit a Discord field. */
const cleanStack = (error) => {
	const stack = typeof error?.stack === 'string' ? error.stack : ''
	const lines = stack
		.split('\n')
		.filter((line) => !line.includes('node_modules'))
		.join('\n')

	if (!lines) return null
	return truncate(`\`\`\`${truncate(lines, MAX_FIELD_VALUE - 8)}\`\`\``, MAX_FIELD_VALUE)
}

/**
 * Build the embed sent to the errors channel.
 *
 * `context` is optional and free-form — a command name, the user who triggered
 * it, whatever the call site knows. Without it the embed still reports where
 * the error came from, which is the part that was broken.
 */
export const buildErrorEmbed = (error, context = {}) => {
	const origin = originFromStack(error)
	const name = error?.name ?? typeof error
	const message = error?.message ?? String(error)

	const embed = new EmbedBuilder()
		.setTitle(truncate(`${name} in ${origin.file}:${origin.line}`, MAX_TITLE))
		.setColor(Color.redDark)
		.setDescription(truncate(message || 'No error message.', MAX_DESCRIPTION))
		.setTimestamp()

	if (origin.path !== 'unknown') embed.setFooter({ text: origin.path })

	const contextEntries = Object.entries(context).filter(([, value]) => value !== undefined && value !== null)
	if (contextEntries.length) {
		embed.addFields({
			name: 'Context',
			value: truncate(contextEntries.map(([key, value]) => `**${key}:** ${value}`).join('\n'), MAX_FIELD_VALUE)
		})
	}

	const stack = cleanStack(error)
	if (stack) embed.addFields({ name: 'Stack', value: stack })

	return embed
}
