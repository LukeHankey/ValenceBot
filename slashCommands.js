/* eslint-disable no-inline-comments */
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { readdirSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const commands = []
const commandFiles = readdirSync('./commands/all').filter(file => file.endsWith('.js'))

const clientId = '668330399033851924';
const clientIdDev = '869942134873161798'

// const guildId = '420803245758480405'; // DSF
// const guildId = '472448603642920973'; // Valence
const guildId = '668330890790699079' // Test

for (const file of commandFiles) {
	// Import all command files
	const command = await import(`./commands/all/${file}`)
	if (!command.default.data) continue

	/**
	 * Some of the commands are done with SlashCommandBuilder so need to use the .toJSON() method
	 * 
	 * Context menu: ['Mark event as dead.', 'Affiliate Events']
	 * Slash commands: ['calendar', 'delete', 'events', 'invite', 'move', 'permissions', 'send', 'vis']
	 * 
	 * Global: ['delete', 'invite', 'move', 'permissions', 'send', 'vis']
	 * Specific: ['calendar', 'events]
	 */
	if (['nick'].includes(command.default.name)) commands.push(command.default.data)
}

const rest = new REST({ version: '9' }).setToken(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.')

		/**
		 * GET - No body parameter included.
		 * PUT - Overwrite all existing commands. Must be an array.
		 * POST - Add new ones without overwriting. Must be an object, not an array of objects. Loop over if an array.
		 * DELETE - Delete specific global/guild commands.
		 */

		console.log(commands)

		const gcoms = await rest.post(
			Routes.applicationGuildCommands(clientIdDev, guildId),
			{ body: commands[0] }
		)
		console.log(1, gcoms)

		// for (const command of commands) {
		// 	const gcoms = await rest.post(
		// 		Routes.applicationGuildCommands(clientIdDev, guildId),
		// 		{ body: command }
		// 	)
		// 	console.log(1, gcoms)
		// }		

		// await rest.delete(
		// 	Routes.applicationGuildCommand(clientIdDev, guildId, gcoms.find(c => c.name === 'delete').id)
		// )

		// const coms = await rest.get(
		// 	Routes.applicationCommands(clientId),
			// { body: commands[0] },
		// );
		// console.log(2, coms);

		console.log('Successfully reloaded application (/) commands.')
	} catch (error) {
		console.error(error)
	}
})()
