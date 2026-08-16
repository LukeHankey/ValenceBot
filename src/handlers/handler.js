import { readdirSync } from 'fs'
import { RESTEvents } from 'discord.js'

/** Events that belong to the REST client rather than the gateway client. */
const REST_EVENTS = new Set(Object.values(RESTEvents))

export class Load {
	constructor(client) {
		this.client = client
		this.init('events', 'client')
		this.init('events', 'guild')
		this.init('commands')
	}

	async init(handler, sub) {
		handler = sub ? `${handler}/${sub}/` : `${handler}`
		const files = readdirSync(`./src/${handler}`).filter((d) => d.endsWith('.js'))

		for (const file of files) {
			const files_ = await import(`../${handler}/${file}`)
			if (handler === 'commands') {
				this.client.commands.set(files_.default.name, files_.default)
			} else {
				// The filename is the event name, so a file has to be named after a
				// real event to ever fire. tests/eventNames.test.js checks that.
				const name = file.split('.')[0]
				if (REST_EVENTS.has(name)) {
					this.client.rest.on(name, files_.default.bind(null, this.client))
				} else {
					this.client.on(name, files_.default.bind(null, this.client))
				}
			}
		}
	}
}
