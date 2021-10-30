import { readdirSync } from 'fs'

const commands = client => {
	const load = async dirs => {
		const commandFiles = readdirSync(`./commands/${dirs}/`)
			.filter(d => d.endsWith('.js'))

		for (const file of commandFiles) {
			const command = await import(`../commands/${dirs}/${file}`)
			client.commands.set(command.default.name, command.default)
		}
	};
	['all'].forEach(x => load(x))
}

export default commands
