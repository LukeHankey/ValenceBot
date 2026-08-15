import test from 'node:test'
import assert from 'node:assert/strict'

import { emojiForKey, customEmojiId } from '../src/dsf/calls/worlds.js'
import { listIcon, buildListSections, FALLBACK_LIST_ICON } from '../src/commands/worlds.js'

// Stands in for client.emojis.cache: only ids in `available` resolve.
const resolver = (available = []) => ({
	get: (id) => (available.includes(id) ? { id, toString: () => `<:e:${id}>` } : null)
})

const special = (key, enabled, worlds = [1]) => ({ key, label: key, enabled, worlds })

test('emojiForKey returns the mapped emoji', () => {
	assert.match(emojiForKey('leagues'), /^<:leagues:\d+>$/)
})

test('emojiForKey returns a unicode emoji unchanged', () => {
	assert.equal(emojiForKey('dsf'), '🎣')
})

test('emojiForKey returns undefined for an unmapped key', () => {
	assert.equal(emojiForKey('brand_new_thing'), undefined)
})

test('customEmojiId extracts the id from a custom emoji', () => {
	assert.equal(customEmojiId('<:leagues:1417397814899642399>'), '1417397814899642399')
})

test('customEmojiId returns null for a unicode emoji', () => {
	assert.equal(customEmojiId('🎣'), null)
})

test('listIcon uses the custom emoji when the bot can resolve it', () => {
	assert.match(listIcon(special('leagues', true), resolver(['1417397814899642399'])), /^<:/)
})

test('listIcon uses a unicode emoji without needing to resolve anything', () => {
	assert.equal(listIcon(special('dsf', true), resolver()), '🎣')
})

test('listIcon falls back when the custom emoji is not in the cache', () => {
	assert.equal(listIcon(special('leagues', true), resolver([])), FALLBACK_LIST_ICON)
})

test('listIcon falls back for a key with no emoji mapped at all', () => {
	assert.equal(listIcon(special('brand_new_thing', true), resolver()), FALLBACK_LIST_ICON)
})

test('listIcon survives a missing emoji cache', () => {
	assert.equal(listIcon(special('leagues', true), undefined), FALLBACK_LIST_ICON)
})

test('listIcon does not depend on the enabled state', () => {
	assert.equal(listIcon(special('dsf', false), resolver()), listIcon(special('dsf', true), resolver()))
})

test('buildListSections puts enabled groups under an Enabled heading', () => {
	const fields = buildListSections([special('dsf', true)], resolver())

	assert.equal(fields[0].name, 'Enabled')
	assert.match(fields[1].name, /dsf/)
})

test('buildListSections puts disabled groups under a Disabled heading', () => {
	const fields = buildListSections([special('leagues', false)], resolver())

	assert.equal(fields[0].name, 'Disabled')
})

test('buildListSections orders enabled before disabled', () => {
	const fields = buildListSections([special('leagues', false), special('dsf', true)], resolver())
	const headings = fields.filter((field) => ['Enabled', 'Disabled'].includes(field.name)).map((field) => field.name)

	assert.deepEqual(headings, ['Enabled', 'Disabled'])
})

test('buildListSections omits the disabled heading when everything is enabled', () => {
	const fields = buildListSections([special('dsf', true)], resolver())

	assert.ok(!fields.some((field) => field.name === 'Disabled'))
})

test('buildListSections omits the enabled heading when everything is disabled', () => {
	const fields = buildListSections([special('leagues', false)], resolver())

	assert.ok(!fields.some((field) => field.name === 'Enabled'))
})

test('buildListSections returns nothing for a registry with no groups', () => {
	assert.deepEqual(buildListSections([], resolver()), [])
})

test('each group field names the key and its world count', () => {
	const fields = buildListSections([special('dsf', true, [116, 117])], resolver())

	assert.match(fields[1].name, /`dsf`/)
	assert.match(fields[1].value, /2 worlds/)
})

test('group fields keep the registry order within a section', () => {
	const fields = buildListSections([special('dsf', true), special('vip', true)], resolver())

	assert.match(fields[1].name, /dsf/)
	assert.match(fields[2].name, /vip/)
})

test('a group field value stays inside the Discord field limit', () => {
	const manyWorlds = Array.from({ length: 300 }, (_, i) => i * 3 + 1)
	const fields = buildListSections([special('leagues', true, manyWorlds)], resolver())

	assert.ok(fields[1].value.length <= 1024)
})

test('buildListSections stays within the Discord 25-field embed limit', () => {
	const many = Array.from({ length: 40 }, (_, i) => special(`group_${i}`, i % 2 === 0))

	assert.ok(buildListSections(many, resolver()).length <= 25)
})

test('buildListSections says how many groups it had to omit', () => {
	const many = Array.from({ length: 40 }, (_, i) => special(`group_${i}`, i % 2 === 0))
	const fields = buildListSections(many, resolver())

	assert.match(fields.at(-1).value, /more/)
})

test('buildListSections does not add an omission notice when everything fits', () => {
	const fields = buildListSections([special('dsf', true)], resolver())

	assert.ok(!fields.some((field) => /more/.test(field.value)))
})

test('a single-world group is not described as "1 worlds"', () => {
	const fields = buildListSections([special('dsf', true, [116])], resolver())

	assert.match(fields[1].value, /^1 world:/)
})
