import Color from '../colors.js'
import { nEmbed, checkNum } from '../functions.js'

export default {
	name: 'settings',
	description: ['Displays the db.collection that you can change.', 'Shows the current prefix.', 'Sets the new prefix in the server.', 'Shows the current admin role.', 'Sets the new admin role in the server.', 'Shows the current mod role.', 'Sets the new mod role in the server.', 'Shows the current admin channel.', 'Sets the current admin channel.'],
	aliases: ['s'],
	usage: ['', 'prefix', 'prefix set <new prefix>', 'adminRole', 'adminRole set <new role>', 'modRole', 'modRole set <new role>', 'adminChannel', 'adminChannel set <channel>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	run: async (client, message, args, perms, db) => {
		const dbChannels = await db.channels
		if (!perms.admin) return message.channel.send(perms.errorA)
		const { prefix, roles: { modRole, adminRole }, channels: { adminChannel, events, mod } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { prefix: 1, roles: 1, channels: 1 } })
		const [...rName] = args.slice(2)
		const roleName = message.guild.roles.cache.find(role => role.name === rName.join(' '))
		const channelTag = []

		switch (args[0]) {
		case 'prefix':
			switch (args[1]) {
			case 'set':
				args[2]
					? db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { prefix: args[2] } }, { returnOriginal: true })
						.then(async r => {
							message.channel.send({ content: `Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\`` })
							dbChannels.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n\`\`\`diff\n- ${r.value.prefix}\n+ ${args[2]}\`\`\``)
						})
						.catch(async err => {
							dbChannels.errors.send(err)
						})
					: message.channel.send({ content: 'What do you want to set the prefix to?' })
				break
			default:
				if (!args[1]) {
					message.channel.send({ content: `Your prefix is set as: \`${prefix}\`` })
				}
			}
			break
		case 'adminRole':
			switch (args[1]) {
			case 'set':
				if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has('Administrator')) { // Setting role by ID
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': `<@&${args[2]}>` } }, { returnOriginal: true })
					message.channel.send({ content: `The Admin Role has been changed to: <@&${args[2]}>`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ <@&${args[2]}>\`\`\``)
				} else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has('Administrator')) { // Setting role by name
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': `<@&${roleName.id}>` } }, { returnOriginal: true })
					message.channel.send({ content: `The Admin Role has been changed to: <@&${roleName.id}>`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ ${roleName.id}\`\`\``)
				} else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has('Administrator')) { // Setting role by mention
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': args[2] } }, { returnOriginal: true })
					message.channel.send({ content: `The Admin Role has been changed to: ${args[2]}`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ ${args[2]}\`\`\``)
				} else {
					message.channel.send({ content: 'What do you want to set the Admin Role to? Acceptable values:' })
					message.channel.send({ content: '```diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the ADMINISTRATOR permission set.```' })
				}
				break
			default:
				if (!args[1]) {
					message.channel.send({ content: `Your Admin Role is set as: ${adminRole}`, allowedMentions: false })
				}
			}
			break
		case 'modRole':
			switch (args[1]) {
			case 'set':
				if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has(['KickMembers', 'BanMembers'])) { // Setting role by ID
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': `<@&${args[2]}>` } }, { returnOriginal: true })
					message.channel.send({ content: `The Mod Role has been changed to: <@&${args[2]}>`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ <@&${args[2]}>\`\`\``)
				} else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has(['KickMembers', 'BanMembers'])) { // Setting role by name
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': `<@&${roleName.id}>` } }, { returnOriginal: true })
					message.channel.send({ content: `The Mod Role has been changed to: <@&${roleName.id}>`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ ${roleName}\`\`\``)
				} else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has(['KickMembers', 'BanMembers'])) { // Setting role by mention
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': args[2] } }, { returnOriginal: true })
					message.channel.send({ content: `The Mod Role has been changed to: ${args[2]}`, allowedMentions: false })
					dbChannels.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ ${args[2]}\`\`\``)
				} else {
					message.channel.send({ content: 'What do you want to set the Mod Role to? Acceptable values:' })
					message.channel.send({ content: '```diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the KICK_MEMBERS & BAN_MEMBERS permission set.```' })
				}
				break
			default:
				if (!args[1]) {
					message.channel.send({ content: `Your Mod Role is set as: ${modRole}`, allowedMentions: false })
				}
			}
			break
		case 'adminChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false')
				} else {
					channelTag.push(args[2].slice(2, 20))
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.adminChannel': args[2] } }, { returnOriginal: true })
					message.channel.send({ content: `The Admin Channel has been set to: <#${args[2]}>` })
					dbChannels.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${found.value.channels.adminChannel}> to <#${args[2]}>`)
				} else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.adminChannel': channelTag[0] } }, { returnOriginal: true })
					message.channel.send({ content: `The Admin Channel has been set to: <#${channelTag[0]}>` })
					dbChannels.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${found.value.channels.adminChannel}> to <#${channelTag[0]}>`)
				} else {
					message.channel.send({ content: 'What do you want to set the Admin Channel to? Acceptable values:' })
					message.channel.send({ content: '```diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)```' })
				}
				break
			default:
				if (!args[1]) {
					adminChannel === null
						? message.channel.send({ content: 'Your Admin Channel is set as: `Null`' })
						: message.channel.send({ content: `Your Admin Channel is set as: <#${adminChannel}>` })
				} else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', Color.redDark))
				}
			}
			break
		case 'eventsChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false')
				} else {
					channelTag.push(args[2].slice(2, 20))
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.events': args[2] } }, { returnOriginal: true })
					message.channel.send({ content: `The Events Channel has been set to: <#${args[2]}>` })
					dbChannels.send(`<@${message.author.id}> set the Events Channel in server: **${message.guild.name}** from <#${found.value.channels.events}> to <#${args[2]}>`)
				} else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.events': channelTag[0] } }, { returnOriginal: true })
					message.channel.send({ content: `The Events Channel has been set to: <#${channelTag[0]}>` })
					dbChannels.send(`<@${message.author.id}> set the Events Channel in server: **${message.guild.name}** from <#${found.value.channels.events}> to <#${channelTag[0]}>`)
				} else {
					message.channel.send({ content: 'What do you want to set the Events Channel to? Acceptable values:' })
					message.channel.send({ content: '```diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)```' })
				}
				break
			default:
				if (!args[1]) {
					events === null || events === undefined
						? message.channel.send({ content: 'Your events Channel is set as: `Null`' })
						: message.channel.send({ content: `Your events Channel is set as: <#${events}>` })
				} else {
					message.channel.send({ embeds: [nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', Color.redDark)] })
				}
			}
			break
		case 'modChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false')
				} else {
					channelTag.push(args[2].slice(2, 20))
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.mod': args[2] } }, { returnOriginal: true })
					message.channel.send({ content: `The Mod Channel has been set to: <#${args[2]}>` })
					dbChannels.send(`<@${message.author.id}> set the Mod Channel in server: **${message.guild.name}** from <#${found.value.channels.mod}> to <#${args[2]}>`)
				} else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await db.collection.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.mod': channelTag[0] } }, { returnOriginal: true })
					message.channel.send({ content: `The Mod Channel has been set to: <#${channelTag[0]}>` })
					dbChannels.send(`<@${message.author.id}> set the Mod Channel in server: **${message.guild.name}** from <#${found.value.channels.mod}> to <#${channelTag[0]}>`)
				} else {
					message.channel.send({ content: 'What do you want to set the Mod Channel to? Acceptable values:' })
					message.channel.send({ content: '```diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)```' })
				}
				break
			default:
				if (!args[1]) {
					mod === null || mod === undefined
						? message.channel.send({ content: 'Your Mod Channel is set as: `Null`' })
						: message.channel.send({ content: `Your Mod Channel is set as: <#${mod}>` })
				} else {
					message.channel.send({ embeds: [nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', Color.redDark)] })
				}
			}
			break
		default:
			if (!args[0]) {
				message.channel.send({
					embeds: [nEmbed(
						'**Settings List**',
						'Here\'s a list of all the db.collection you can change:',
						Color.cyan,
						client.user.displayAvatarURL()
					)
						.addFields([
							{ name: '**Settings**', value: '`prefix`\n`adminRole`\n`modRole`\n`adminChannel`\n`eventsChannel`\n`modChannel`', inline: false }
						])]
				})
			}
		}
	}
}
