/* eslint-disable no-inline-comments */
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { readdirSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const commands = []
const commandFiles = readdirSync('./commands/all').filter(file => file.endsWith('.js'))

// Place your client and guild ids here
// const clientId = '668330399033851924';
const clientIdDev = '869942134873161798'
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-inline-comments
// const guildId = '420803245758480405'; // DSF
// const guildId = '472448603642920973'; // Valence
const guildId = '668330890790699079' // Test

// Comment out to remove all guild-specific commands
for (const file of commandFiles) {
	const command = await import(`./commands/all/${file}`)
	if (!command.default.data) continue
	// if (['nick', 'events', 'calendar'].includes(command.name)) continue;
	if (!['permissions', 'nick'].includes(command.default.name)) continue
	commands.push(command.default.data)
}
console.log(3, commands)

// Context Menu

// eslint-disable-next-line no-unused-vars
const menuData = {
	name: 'Mark event as dead.',
	type: 3
}

// commands.push(menuData);

const rest = new REST({ version: '9' }).setToken(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.')

		// Valence done
		// Add menu to dsf when its gone
		const gcoms = await rest.put(
			Routes.applicationGuildCommands(clientIdDev, guildId),
			{ body: commands }
		)
		console.log(1, gcoms)

		// const coms = await rest.put(
		// 	Routes.applicationCommands(clientId),
		// 	{ body: commands },
		// );
		// console.log(2, coms);

		console.log('Successfully reloaded application (/) commands.')
	} catch (error) {
		console.error(error)
	}
})()
