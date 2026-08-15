import test from 'node:test'
import assert from 'node:assert/strict'

import { originFromStack, buildErrorEmbed } from '../src/errorEmbed.js'

const errorWithStack = (stack) => {
	const error = new Error('something broke')
	error.stack = stack
	return error
}

const STACK = `Error: something broke
    at worldReaction (file:///home/ubuntu/ValenceBot/src/dsf/calls/worlds.js:81:9)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Client.emit (/home/ubuntu/ValenceBot/node_modules/discord.js/src/client.js:12:3)`

test('originFromStack names the file the error came from', () => {
	assert.equal(originFromStack(errorWithStack(STACK)).file, 'worlds.js')
})

test('originFromStack reports the line number', () => {
	assert.equal(originFromStack(errorWithStack(STACK)).line, '81')
})

test('originFromStack keeps the path relative to src', () => {
	assert.equal(originFromStack(errorWithStack(STACK)).path, 'src/dsf/calls/worlds.js')
})

test('originFromStack skips node internals', () => {
	const stack = `Error: boom
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at handler (file:///home/ubuntu/ValenceBot/src/handlers/interactions/buttons.js:12:1)`

	assert.equal(originFromStack(errorWithStack(stack)).file, 'buttons.js')
})

test('originFromStack skips node_modules frames', () => {
	const stack = `Error: boom
    at REST.request (/home/ubuntu/ValenceBot/node_modules/@discordjs/rest/dist/index.js:1:1)
    at sendCall (file:///home/ubuntu/ValenceBot/src/dsf/calls/merchFunctions.js:20:4)`

	assert.equal(originFromStack(errorWithStack(stack)).file, 'merchFunctions.js')
})

test('originFromStack falls back when every frame is external', () => {
	const stack = `Error: boom
    at REST.request (/home/ubuntu/ValenceBot/node_modules/@discordjs/rest/dist/index.js:1:1)`

	assert.equal(originFromStack(errorWithStack(stack)).file, 'unknown')
})

test('originFromStack survives an error with no stack', () => {
	const error = new Error('no stack here')
	delete error.stack

	assert.equal(originFromStack(error).file, 'unknown')
})

test('originFromStack survives a non-Error value', () => {
	assert.equal(originFromStack('just a string').file, 'unknown')
})

test('the embed title names the originating file, not DataBase.js', () => {
	const embed = buildErrorEmbed(errorWithStack(STACK)).toJSON()

	assert.match(embed.title, /worlds\.js/)
	assert.doesNotMatch(embed.title, /DataBase/)
})

test('the embed title includes the line number', () => {
	const embed = buildErrorEmbed(errorWithStack(STACK)).toJSON()

	assert.match(embed.title, /81/)
})

test('the embed description carries the error message', () => {
	const embed = buildErrorEmbed(errorWithStack(STACK)).toJSON()

	assert.match(embed.description, /something broke/)
})

test('the embed names the error type', () => {
	const error = new TypeError('bad type')
	const embed = buildErrorEmbed(error).toJSON()

	assert.match(JSON.stringify(embed), /TypeError/)
})

test('the stack field drops node_modules frames', () => {
	const embed = buildErrorEmbed(errorWithStack(STACK)).toJSON()

	assert.doesNotMatch(JSON.stringify(embed), /node_modules/)
})

test('a long stack is truncated to fit a Discord field', () => {
	const longStack = 'Error: boom\n' + '    at fn (file:///home/ubuntu/ValenceBot/src/a.js:1:1)\n'.repeat(200)
	const embed = buildErrorEmbed(errorWithStack(longStack)).toJSON()

	for (const field of embed.fields ?? []) assert.ok(field.value.length <= 1024)
})

test('a very long message is truncated rather than rejected by Discord', () => {
	const error = new Error('x'.repeat(6000))
	const embed = buildErrorEmbed(error).toJSON()

	assert.ok(embed.description.length <= 4096)
})

test('a non-Error value still produces an embed instead of throwing', () => {
	const embed = buildErrorEmbed('just a string').toJSON()

	assert.match(embed.description, /just a string/)
})

test('a null value still produces an embed', () => {
	assert.doesNotThrow(() => buildErrorEmbed(null))
})

test('context is shown when the caller provides it', () => {
	const embed = buildErrorEmbed(errorWithStack(STACK), { command: 'worlds', user: 'luke#0001' }).toJSON()

	assert.match(JSON.stringify(embed), /worlds/)
	assert.match(JSON.stringify(embed), /luke#0001/)
})

test('context is optional', () => {
	assert.doesNotThrow(() => buildErrorEmbed(errorWithStack(STACK)))
})
