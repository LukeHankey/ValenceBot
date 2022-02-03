import { MongoCollection } from '../../DataBase.js'
import Color from '../../colors.js'
import { modAppEmbed, defaultEmbed } from '../../templateEmbeds.js'
import { Permissions } from '../../classes.js'
import { MessageEmbed } from 'discord.js'
import { vEvents } from '../../valence/valenceEvents.js'
import dsf from '../../dsf/merch/main.js'
const db = new MongoCollection('Settings')

export default async (client, message) => {
	const channels = await db.channels

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

		const embed = new MessageEmbed()
			.setTitle('New DM Recieved')
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(Color.blueDark)
			.addField('User ID', `${dmPerson.id}`, false)
			.addField('Message contents', `${dmMsg.join('\n')}`)
			.setTimestamp()

		return client.channels.cache.get('788525524782940187').send({ embeds: [embed] })
	}

	const { messageList } = await db.collection.findOne({ _id: message.guild.id }, { projection: { messageList: 1 } })

	if (messageList && messageList.length) {
		for (const list of messageList) {
			const moveToChannel = message.guild.channels.cache.get(list.to)
			if (message.channel.id === list.from) {
				try {
					if (list.template === 'Mod Application') await moveToChannel.send({ embeds: [modAppEmbed(message)] })
					else await moveToChannel.send({ embeds: [defaultEmbed(message)] })
					await message.delete()
				} catch (err) {
					channels.errors.send(err)
				}
			}
		}
	}

	// Deep Sea Fishing
	if (message.guild.id === '420803245758480405' || message.guild.id === '668330890790699079') {
		const { merchChannel: { channelID, otherChannelID }, channels: { adminChannel } } = await db.collection.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1, channels: 1 } })

		// eslint-disable-next-line no-useless-escape
		const scamLinkRegex = /((?!.*discord)(?=.*\b(d\w{5,8}[dcl]){1}[-\./]?(give|gift|nitro))\b.*)/gi
		const scamWordMatchRegex = /((.*? )?(discord|nitro|free|@everyone|steam)){3}/gi
		if (scamLinkRegex.test(message.content) || scamWordMatchRegex.test(message.content)) {
			const bannedMember = message.member
			// Check for permissions
			try {
				const perms = message.guild.me.permissions.has('BAN_MEMBERS')
				if (perms) {
					console.log(message.content)
					await bannedMember.ban({ days: 7, reason: 'Bang bang I gotcha, I gotcha in my scope' })
					const bChannel = message.guild.channels.cache.get('624655664920395786')
					return await bChannel.send({ content: `Banned: ${bannedMember.displayName} - ${bannedMember.id} -- Posting a scam link. Bang bang I gotcha, I gotcha in my scope.` })
				} else {
					const aChannel = message.guild.channels.cache.get(adminChannel)
					return aChannel.send({ content: `I am unable to ban ${message.member.displayName} as I do not have the \`BAN_MEMBERS\` permission.` })
				}
			} catch (err) {
				channels.logs.send(`Unable to ban ${bannedMember} because they have higher permissions.`)
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
			return await dsf(client, message, db)
		case suggestions: {
			const upArrow = message.guild.emojis.cache.get('872175822725857280')
			const downArrow = message.guild.emojis.cache.get('872175855223337060')
			await message.react(upArrow)
			await message.react(downArrow)
			await message.startThread({ name: `Suggestion from ${message.member.nickname ?? message.author.username}`, autoArchiveDuration: 'MAX' })
		}
			break
		case boosters:
			// await newBoost(message, boosters);
		}
	}

	// Daily Vis Wax
	if (message.guild.id === '668330890790699079' && message.channel.id === '732014449182900247') {
		if (message.reference?.guildId === '388042222710554624') {
			// Then msg is from Vis wax server.
			console.log('Vis Wax Combinations: ', message.content)
			const contentArr = message.content.split('\n')
			await db.collection.updateOne({ _id: 'Globals' }, {
				$set: {
					vis: null,
					visContent: contentArr,
					visTime: message.createdAt
				}
			})
			const { visCache, visContent } = await db.collection.findOne({ _id: 'Globals' }, { projection: { visCache: 1, visContent: 1 } })
			const channels = new Set()
			const guilds = new Set()
			visCache.forEach(obj => {
				channels.add(obj.channel)
				guilds.add(obj.guild)
			})

			const content = visContent.flat()
			const slotOneIndex = content.findIndex(el => el.match(/slot/i))
			const newContent = content.slice(slotOneIndex).map(el => {
				const match = el.match(/<:[\w_]{1,14}:\d{1,18}>/g)
				if (match) {
					el = el.trim().slice(match[0].length)
					return `\t${el}`
				}
				return el
			})

			for (const guild of guilds) {
				const g = client.guilds.cache.get(guild)
				for (const channel of channels) {
					const c = g.channels.cache.get(channel)
					if (!c) continue

					const usersWithSameChannel = visCache.map(o => { if (o.channel === c.id) return `<@!${o.user}>` }).filter(Boolean)
					await c.send({ content: `${usersWithSameChannel.join(', ')}\nSource: Vis Wax Server | <https://discord.gg/wv9Ecs4>\n${newContent.join('\n')}` })
				}
			}

			await db.collection.updateOne({ _id: 'Globals' }, {
				$set: {
					visCache: []
				}
			})
		}
	}

	if (message.author.bot) return

	// Valence Events Channel
	if (message.guild.id === '472448603642920973' || message.guild.id === '668330890790699079') {
		// Valence - Filter
		const filterWords = ['retard', 'nigger']
		const blocked = filterWords.filter(word => {
			return message.content.toLowerCase().includes(word)
		})

		if (blocked.length > 0) message.delete()
		await vEvents(client, message, await db.channels)
	}

	try {
		const commandDB = await db.collection.findOne({ _id: message.guild.id }, { projection: { prefix: 1, roles: 1 } })
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
			admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID) || message.author.id === message.guild.ownerId,
			mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error()
		}

		try {
			if (command?.menu === 'menu') return
			command.guildSpecific === 'all' || command.guildSpecific.includes(message.guild.id)
				? command.run(client, message, args, perms, db)
				: message.channel.send({ content: 'You cannot use that command in this server.' })
		} catch (error) {
			if (commandName !== command) return
		}
	} catch (err) {
		channels.errors.send(err)
	}
}