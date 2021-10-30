import { getDb } from '../../mongodb.js'
import { redDark, blueDark } from '../../colors.js'
import { Permissions } from '../../classes.js'
import { MessageEmbed } from 'discord.js'
import vEvents from '../../valence/valenceEvents.js'
import dsf from '../../dsf/merch/main.js'

export default async (client, message) => {
	const db = getDb()
	const settingsColl = await db.collection('Settings')
	const { channels: { vis, errors, logs } } = await settingsColl.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } })

	const channels = {
		vis: {
			id: vis,
			// content could be both embed or content
			send: function (content) {
				const channel = client.channels.cache.get(this.id)
				return channel.send(content)
			}
		},
		errors: {
			id: errors,
			embed: function (err) {
				const filePath = import.meta.url.split('/')
				const fileName = filePath[filePath.length - 1]
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(redDark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``)
				return embed
			},
			send: function (...args) {
				const channel = client.channels.cache.get(this.id)
				return channel.send({ embeds: [this.embed(...args)] })
			}
		},
		logs: {
			id: logs,
			send: function (content) {
				const channel = client.channels.cache.get(this.id)
				return channel.send({ content })
			}
		}
	}

	// Handling DMs
	if (message.guild === null) {
		const dm = message.channel
		let dmMessages = await dm.messages.fetch({ limit: 1 })
		const dmPerson = dm.recipient // User object
		const dmMsg = []
		dmMessages = [...dmMessages.values()]

		for (const val in dmMessages) {
			if (dmMessages[val].author.id === '668330399033851924') return
			dmMsg.push(dmMessages[val].content)
		}

		const embed = new MessageEmbed()
			.setTitle('New DM Recieved')
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(blueDark)
			.addField('User ID', `${dmPerson.id}`, false)
			.addField('Message contents', `${dmMsg.join('\n')}`)
			.setTimestamp()

		return client.channels.cache.get('788525524782940187').send({ embeds: [embed] })
	}

	// Deep Sea Fishing
	if (message.guild.id === '420803245758480405' || message.guild.id === '668330890790699079') {
		const { merchChannel: { channelID, otherChannelID }, channels: { adminChannel } } = await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1, channels: 1 } })

		const scamDetect = /(glft|steamcom|dlsco|dlisco|disour|cord-gi|\/gif)\w+/gi
		if (scamDetect.test(message.content)) {
			const bannedMember = message.member
			// Check for permissions
			const perms = message.guild.me.permissions.has('BAN_MEMBERS')
			if (perms) {
				await bannedMember.ban({ days: 7, reason: 'Posted a scam link' })
				const bChannel = message.guild.channels.cache.get('624655664920395786')
				return await bChannel.send({ content: `Banned: ${bannedMember.displayName} - ${bannedMember.id} -- Posting a scam link.` })
			} else {
				const aChannel = message.guild.channels.cache.get(adminChannel)
				return aChannel.send({ content: `I am unable to ban ${message.member.displayName} as I do not have the \`BAN_MEMBERS\` permission.` })
			}
		}

		const [stockChannel, merchCalls, otherCalls, suggestions, boosters] = ['770307127557357648', channelID, otherChannelID, '872164630322118686', '586267152152002562']

		switch (message.channel.id) {
		case stockChannel:
			if (message.author.bot && message.crosspostable) {
				message.crosspost()
			}
			break
		case merchCalls:
		case otherCalls:
			return await dsf(client, message, channels)
		case suggestions: {
			const up_arrow = message.guild.emojis.cache.get('872175822725857280')
			const down_arrow = message.guild.emojis.cache.get('872175855223337060')
			await message.react(up_arrow)
			await message.react(down_arrow)
			await message.startThread({ name: `Suggestion from ${message.member.nickname ?? message.author.username}`, autoArchiveDuration: 4320 })
		}
			break
		case boosters:
			// await newBoost(message, boosters);
		}
	}

	if (message.author.bot) return

	// Dealing with scams
	if (message.guild.id === '668330890790699079') {
		const scamDetect = /(glft|steamcom|dlsco|csord-)\w+/gi
		if (scamDetect.test(message.content)) {
			const bannedMember = message.member
			// Check for permissions
			const perms = message.guild.me.permissions.has('BAN_MEMBERS')
			if (perms) {
				bannedMember.ban({ days: 1, reason: 'Posted a scam link' })
				const banChannel = '732014449182900247' // Change
				const channel = message.guild.channels.cache.get(banChannel)
				await channel.send({ content: `Banned: ${bannedMember.displayName} - ${bannedMember.id} -- Posting a scam link.` })
			} else {
				const { channels: { adminChannel } } = await settingsColl.findOne({ _id: message.guild.id }, { projection: { channels: 1 } })
				const channel = message.guild.channels.cache.get(adminChannel)
				channel.send({ content: `I am unable to ban ${message.member.displayName} as I do not have the \`BAN_MEMBERS\` permission.` })
			}
		}
	}

	// Valence Events Channel
	if (message.channel.guild.id === '472448603642920973' || message.channel.guild.id === '668330890790699079') {
		// Valence - Filter
		const filterWords = ['retard', 'nigger']
		const blocked = filterWords.filter(word => {
			return message.content.toLowerCase().includes(word)
		})

		if (blocked.length > 0) message.delete()
		await vEvents(client, message, channels)
	}

	try {
		const commandDB = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { prefix: 1, roles: 1 } })
		if (!message.content.startsWith(commandDB.prefix)) return

		const args = message.content.slice(commandDB.prefix.length).split(/ +/g)
		const commandName = args.shift().toLowerCase()

		const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases &&
			cmd.aliases.includes(commandName)) // Command object

		const aR = new Permissions('adminRole', commandDB, message)
		const mR = new Permissions('modRole', commandDB, message)
		const owner = new Permissions('owner', commandDB, message)

		const perms = {
			owner: owner.botOwner(),
			admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID) || message.author.id === message.channel.guild.ownerId,
			mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.channel.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error()
		}

		try {
			command.guildSpecific === 'all' || command.guildSpecific.includes(message.channel.guild.id)
				? command.run(client, message, args, perms, channels)
				: message.channel.send({ content: 'You cannot use that command in this server.' })
		} catch (error) {
			if (commandName !== command) return
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
