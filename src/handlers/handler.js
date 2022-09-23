import { readdirSync } from 'fs'

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
				const name = file.split('.')[0]
				if (name === 'rateLimit') {
					this.client.rest.on(name, files_.default.bind(null, this.client))
				} else {
					this.client.on(name, files_.default.bind(null, this.client))
				}
			}
		}
	}
}
