import test from 'node:test'
import assert from 'node:assert/strict'

import { FALLBACK_REGISTRY, loadRegistry, saveRegistry, REGISTRY_DOCUMENT_ID } from '../src/dsf/calls/worldRegistry.js'

const collectionReturning = (document) => ({
	calls: [],
	async findOne(query) {
		this.calls.push(['findOne', query])
		return document
	},
	async replaceOne(query, doc, options) {
		this.calls.push(['replaceOne', query, doc, options])
		return { acknowledged: true }
	}
})

const validRegistry = () => ({
	_id: REGISTRY_DOCUMENT_ID,
	version: 3,
	baseWorlds: Array.from({ length: 60 }, (_, i) => i + 1),
	specials: [{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [211] }]
})

test('loadRegistry returns the stored document', async () => {
	const collection = collectionReturning(validRegistry())

	const registry = await loadRegistry(collection)

	assert.equal(registry.version, 3)
	assert.deepEqual(collection.calls[0], ['findOne', { _id: REGISTRY_DOCUMENT_ID }])
})

test('loadRegistry falls back to the bundled defaults when nothing is stored', async () => {
	const registry = await loadRegistry(collectionReturning(null))

	assert.equal(registry.version, 0)
	assert.deepEqual(registry.baseWorlds, FALLBACK_REGISTRY.baseWorlds)
})

test('loadRegistry falls back when the stored document is invalid', async () => {
	const registry = await loadRegistry(collectionReturning({ ...validRegistry(), baseWorlds: [] }))

	assert.equal(registry.version, 0)
})

test('the bundled defaults are themselves valid', async () => {
	const registry = await loadRegistry(collectionReturning(null))

	assert.ok(registry.specials.length > 0)
	assert.ok(registry.baseWorlds.length >= 50)
})

test('leagues ship disabled by default so a stale list cannot go live on its own', () => {
	const leagues = FALLBACK_REGISTRY.specials.find((special) => special.key === 'leagues')

	assert.equal(leagues.enabled, false)
})

test('saveRegistry writes the whole document', async () => {
	const collection = collectionReturning(validRegistry())

	await saveRegistry(collection, validRegistry(), '12345')

	const [operation, query, document] = collection.calls[0]
	assert.equal(operation, 'replaceOne')
	assert.deepEqual(query, { _id: REGISTRY_DOCUMENT_ID })
	assert.equal(document._id, REGISTRY_DOCUMENT_ID)
})

test('saveRegistry bumps the version', async () => {
	const collection = collectionReturning(validRegistry())

	await saveRegistry(collection, validRegistry(), '12345')

	assert.equal(collection.calls[0][2].version, 4)
})

test('saveRegistry records who changed it and when', async () => {
	const collection = collectionReturning(validRegistry())

	await saveRegistry(collection, validRegistry(), '12345')

	const document = collection.calls[0][2]
	assert.equal(document.updatedBy, '12345')
	assert.ok(document.updatedAt instanceof Date)
})

test('saveRegistry upserts so the first write creates the document', async () => {
	const collection = collectionReturning(null)

	await saveRegistry(collection, validRegistry(), '12345')

	assert.deepEqual(collection.calls[0][3], { upsert: true })
})

test('saveRegistry refuses to write an invalid registry', async () => {
	const collection = collectionReturning(validRegistry())

	await assert.rejects(() => saveRegistry(collection, { ...validRegistry(), baseWorlds: [] }, '12345'), /at least 50/)
	assert.equal(collection.calls.length, 0)
})
