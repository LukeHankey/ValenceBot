import Color from '../../colors.js'
import { Permissions } from '../../classes.js'
import { EmbedBuilder } from 'discord.js'
import { recordCommandUse } from '../../dsf/commandUsage.js'

export default async (client, message) => {
	const channels = await client.database.channels
	const db = client.database.settings

	// Handling DMs
	if (message.guild === null || message.channel.type === 'DM') {
		if (message.partial) await message.fetch()
		const dm = message.channel
		let dmMessages = await dm.messages.fetch({ limit: 1 })
		const dmPerson = dm.recipient // User object
		const dmMsg = []
		dmMessages = [...dmMessages.values()]

		for (const val in dmMessages) {
			if (dmMessages[val].author.id === '668330399033851924') return
			dmMsg.push(dmMessages[val].content)
		}

		const embed = new EmbedBuilder()
			.setTitle('New DM Recieved')
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(Color.blueDark)
			.addFields(
				{ name: 'User ID', value: `${dmPerson.id}`, inline: false },
				{ name: 'Message contents', value: `${dmMsg.join('\n')}` }
			)
			.setTimestamp()

		return client.channels.cache.get('788525524782940187').send({ embeds: [embed] })
	}

	// #dsf-calls is handled by DSFMessaging (src/messaging), which can read it.

	if (message.author.bot) return

	// Valence
	if (message.guild.id === '472448603642920973' || message.guild.id === '668330890790699079') {
		// Valence - Filter
		const filterWords = ['retard', 'nigger']
		const blocked = filterWords.filter((word) => {
			return message.content.toLowerCase().includes(word)
		})

		if (blocked.length > 0) message.delete()
	}

	try {
		const commandDB = await db.findOne({ _id: message.guild.id }, { projection: { prefix: 1, roles: 1 } })
		if (!message.content.startsWith(commandDB.prefix)) return

		const args = message.content.slice(commandDB.prefix.length).split(/ +/g)
		const commandName = args.shift().toLowerCase()

		const command =
			client.commands.get(commandName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName)) // Command object

		const aR = new Permissions('adminRole', commandDB, message)
		const mR = new Permissions('modRole', commandDB, message)
		const owner = new Permissions('owner', commandDB, message)
		const bot = new Permissions('bot', commandDB, message)

		const perms = {
			owner: owner.botOwner(),
			bot: bot.botUser(),
			admin:
				message.member.roles.cache.has(aR.memberRole()[0]) ||
				message.member.roles.cache.has(aR.roleId) ||
				message.author.id === message.guild.ownerId,
			mod:
				message.member.roles.cache.has(mR.memberRole()[0]) ||
				message.member.roles.cache.has(mR.roleId) ||
				mR.modPlusRoles() >= mR._role.rawPosition ||
				message.author.id === message.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error()
		}

		try {
			if (!command) return // No valid command found, or alias
			if (!command.run) return // Must be a slash command
			command.guildSpecific === 'all' || command.guildSpecific.includes(message.guild.id)
				? command.run(client, message, args, perms)
				: message.channel.send({ content: 'You cannot use that command in this server.' })

			await recordCommandUse(db, commandName)
		} catch (error) {
			channels.errors.send(error)
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
