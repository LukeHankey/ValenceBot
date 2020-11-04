const func = require("../../functions.js")
const colors = require('../../colors.json')
const Discord = require('discord.js');
const e = require("express");

module.exports = {
	name: "send",
	description: ["Sends a message to a channel.", "Creates a new embed for the Ban/Friends List.", "Adds an RSN to the ban list with a reason.", "Edits an rsn or reason by finding the given rsn. Example:\n```css\n;send edit <message ID> Guys Reason: Is a noob.```"],
	aliases: [""],
	usage: ["<channel ID> <message content>", "embed <ban/friend> <number>", "info <message ID> RSN: <rsn> Reason: <reason>", "edit <message ID> <rsn> <RSN:/Reason:> <value>"],
	permissions: [false],
	run: async (client, message, args, perms) => {

		const myID = "212668377586597888";
		let content = args.slice(1).join(" ");
		const code = "```";
		if (!perms.admin) {
			return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
				.addField("Only the following Roles & Users can:", perms.joinA, true)
				.addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
		}

		const [messageID, ...rest] = args.slice(1)
		const reasonRegex = /(:^|reason)+/gi
		const rsnRegex = /(:^|rsn)+/gi
		const paramRegex = /(:^|rsn|reason)+/gi
		const reasonSlice = rest.join(" ").search(reasonRegex)
		let rsn = rest.join(" ").slice(4, reasonSlice).trim()
		let reason = rest.join(" ").slice(reasonSlice + 7).trim()

		// if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
		// 	return
		// } else {
			switch (args[0]) {
				case 'embed':
					const banEmbed = new Discord.MessageEmbed()
						.setColor(colors.red_dark)
						.setTitle(`${args[2]}. Ban List for WhirlpoolDnD`)
						.setDescription('A comprehensive list of all members that are banned with reasons.')
						.setThumbnail('https://i.imgur.com/bnNTU4Z.png')
						.setTimestamp()
						.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL())

					const friendEmbed = new Discord.MessageEmbed()
						.setColor(colors.green_light)
						.setTitle(`${args[2]}. Friends List for WhirlpoolDnD`)
						.setDescription('A comprehensive list of all members that are friends with reasons.')
						.setThumbnail('https://i.imgur.com/nidMjPr.png')
						.setTimestamp()
						.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL())

					if (!args[2] || isNaN(args[2])) return message.channel.send(`Please provide a number to order the embeds.`)
					args[1] === 'ban'
						? message.channel.send(banEmbed)
						: args[1] === 'friend'
						? message.channel.send(friendEmbed)
						: message.channel.send('Parameter must be either: \`ban\` or \`friend\`.')
				break;
				case 'info': {
					const banPost = await message.channel.messages.fetch(messageID)

					if (!messageID) return message.channel.send('Please specify a message ID to add the information.')

					if (!rsn || message.content.match(rsnRegex) === null) return message.channel.send('Please enter the RSN.')
					if (!reason || message.content.match(reasonRegex) === null) return message.channel.send('Please enter the reason. If there is no reason, use "Unknown".')
					let infoEditPost = new Discord.MessageEmbed(banPost.embeds[0])
					.addField(`${rsn}`, `${reason}`, true)

					banPost.edit(infoEditPost)
				}
				break;
				case 'edit': {
					const banPost = await message.channel.messages.fetch(messageID)
					const paramSlice = rest.join(" ").search(paramRegex)
					const editRsn = rest.join(" ").slice(0, paramSlice).trim()
					const matched = message.content.match(paramRegex)
					const fieldsParams = ["rsn", "reason"]
					const parameter = fieldsParams.indexOf(matched[0].toLowerCase())
					const changeRsn = rest.join(" ").slice(paramSlice + 4).trim()
					const changeReason = rest.join(" ").slice(paramSlice + 7).trim()
					let editPost = new Discord.MessageEmbed(banPost.embeds[0])
					let fields = banPost.embeds[0].fields
					let field = []

					if (!messageID) return message.channel.send('Please specify a message ID to edit the information.')
					if (!editRsn) return message.channel.send('Please enter the RSN to find.')
					if (matched === null) return message.channel.send('Please enter a valid parameter to change. Either `RSN:` or `Reason:`.')
					if (!changeReason || !changeRsn) return message.channel.send(`Please provide the value to change ${editRsn}'s ${parameter} to.`)

					for (let i = 0; i < fields.length; i++) {
						if (fields[i].name === editRsn) {
							field.push(i, fields[i])
						}
					}
					if (fieldsParams[0] === fieldsParams[parameter]) {
						field[1].name = changeRsn;
						editPost.spliceFields(field[0], 1, field[1])
						return banPost.edit(editPost)
					}
					if (fieldsParams[1] === fieldsParams[parameter]) {
						field[1].value = changeReason;
						editPost.spliceFields(field[0], 1, field[1])
						return banPost.edit(editPost)
					}
				}
				break;
			}
		// }

		if (func.checkNum(args[0], 1, Infinity)) { // Has valid ID
			if (message.guild.channels.cache.has(args[0]) && content && message.author.id !== myID) { // Has content and channel is in same server
				message.guild.channels.cache.get(args[0]).send(content);
			}
			if (message.author.id === myID && content) {
				client.channels.cache.get(args[0]).send(content);
			}
			else if (message.author.id !== myID && content && !message.guild.channels.cache.has(args[0])) { // Checks for non-owner, message content and if ID is not in same server
				message.channel.send("You are not able to send a message to a channel in another server.");
				client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: ${code}Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}${code}`);
			}
		}
		else { // No valid ID
			message.channel.send("You must provide a channel ID.");
		}

		if (args[0] && !content) {
			message.channel.send("You must provide a message to send.");
		}
		
	},
};
