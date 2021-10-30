import { readdirSync } from 'fs'

const events = client => {
	const load = async dirs => {
		const events = readdirSync(`./events/${dirs}/`)
			.filter(d => d.endsWith('.js'))

		for (const file of events) {
			const evt = await import(`../events/${dirs}/${file}`)
			const name = file.split('.')[0]
			client.on(name, evt.default.bind(null, client))
		}
	};
	['client', 'guild'].forEach(x => load(x))
}

export default events
