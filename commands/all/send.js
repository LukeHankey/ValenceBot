/* eslint-disable no-inline-comments */
/* eslint-disable no-useless-escape */
const { checkNum } = require('../../functions.js');
const colors = require('../../colors.json');
const { MessageEmbed } = require('discord.js');
const getDb = require('../../mongodb').getDb;

module.exports = {
	name: 'send',
	description: ['Sends a message to a channel.', 'Edits a message by providing the channel and message ID and overwrite the previous post with new content.', 'Creates a new embed for the Ban/Friends List.', 'Adds an RSN to the ban list with a reason.', 'Edits an rsn or reason by finding the given rsn. Example:\n```css\n;send edit ban 1 Guys Reason: Is a noob.```', 'Removes a member from the ban or friends list by specifying their rsn and which embed they are in. Alternatively removes all info from the embed if the rsn is replaced with \'clear\'.'],
	aliases: [''],
	usage: ['<channel Tag/ID> <message content>', 'edit <channel Tag/ID> <message ID> <new message content>', 'embed <ban/friend/affiliate> <number>', 'info <ban/friend/affiliate> <num> RSN: <rsn> Reason: <reason>', 'edit <ban/friend/affiliate> <num> <rsn> <RSN:/Reason:> <value>', 'remove <ban/friend/affiliate> <num> <rsn/clear>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	run: async (client, message, args, perms, channels) => {

		const myID = '212668377586597888';
		const content = args.slice(1).join(' ');
		if (!perms.admin) return message.channel.send(perms.errorA);

		const db = getDb();
		const settings = db.collection('Settings');
		const { logs } = await settings.findOne({ _id: message.guild.id }, { projection: { logs: 1 } });

		const checkAndGetID = (id) => {
			if (checkNum(id, 0, Infinity) && id.length === 18) {
				return { value: true, id };
			}
			else if (message.mentions.has(id.slice(2, -1))) {
				return { value: true, id: id.slice(2, -1) };
			}
			else { return { value: false, id: null }; }
		};

		const [param, num, ...rest] = args.slice(1);
		const reasonRegex = /(:^|reason)+/gi;
		const rsnRegex = /(:^|rsn)+/gi;
		const paramRegex = /(:^|rsn|reason)+/gi;
		const reasonSlice = rest.join(' ').search(reasonRegex);
		let rsn = rest.join(' ').slice(4, reasonSlice).trim();
		const reason = rest.join(' ').slice(reasonSlice + 7).trim();

		switch (args[0]) {
		case 'embed': {
			// eslint-disable-next-line no-shadow
			const [param, num] = args.slice(1);
			const banEmbed = new MessageEmbed()
				.setColor(colors.red_dark)
				.setTitle(`${num}. Ban List for WhirlpoolDnD`)
				.setDescription('A comprehensive list of all members that are banned with reasons.')
				.setThumbnail('https://i.imgur.com/bnNTU4Z.png')
				.setTimestamp()
				.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL());

			const friendEmbed = new MessageEmbed()
				.setColor(colors.green_light)
				.setTitle(`${num}. Friends List for WhirlpoolDnD`)
				.setDescription('A comprehensive list of all members that are friends with reasons.')
				.setThumbnail('https://i.imgur.com/nidMjPr.png')
				.setTimestamp()
				.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL());

			const affiliateEmbed = new MessageEmbed()
				.setColor(colors.orange)
				.setTitle(`${num}. Affiliate List for WhirlpoolDnD`)
				.setDescription('A comprehensive list of all members that are affiliates with reasons (Discord/FC name).')
				.setThumbnail('https://cdn.discordapp.com/attachments/734477320672247869/776507717602115644/group.png')
				.setTimestamp()
				.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL());

			if (!param) return message.channel.send('Please provide a parameter.');
			if (!num || isNaN(num)) return message.channel.send('Please provide a number to order the embeds.');

			if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
				return;
			}
			else {
				param === 'ban'
					? message.channel.send(banEmbed).then(async m => {
						await settings.findOneAndUpdate({ '_id': message.guild.id }, {
							$push: {
								'logs': { 'id': num, 'messageID': m.id, 'type': param },
							},
						});
					})
						.catch(err => {
							channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
						})
					: param === 'friend'
						? message.channel.send(friendEmbed).then(async m => {
							await settings.findOneAndUpdate({ '_id': message.guild.id }, {
								$push: {
									'logs': { 'id': num, 'messageID': m.id, 'type': param },
								},
							});
						})
							.catch(err => {
								channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							})
						: param === 'affiliate'
							? message.channel.send(affiliateEmbed).then(async m => {
								await settings.findOneAndUpdate({ '_id': message.guild.id }, {
									$push: {
										'logs': { 'id': num, 'messageID': m.id, 'type': param },
									},
								});
							})
								.catch(err => {
									channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
								})
							: message.channel.send('Parameter must be either: \`ban\`, \`friend\` or \`affiliate\`.');
			}
		}
			break;
		case 'info':
			if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
				return;
			}
			else {
				try {
					const find = logs.find(log => log.id === num && log.type === param);

					if (!param) return message.channel.send('Please specify the type (\`ban\`, \`friend\` or \`affiliate\`).');
					if (!num || isNaN(num)) return message.channel.send('Please provide a number to specify which embed you want to send information to.');
					if (!rsn || message.content.match(rsnRegex) === null) return message.channel.send('Please enter the RSN as \`RSN: <rsn>\`.');
					if (!reason || message.content.match(reasonRegex) === null) return message.channel.send('Please enter the reason. If there is no reason, use "Unknown".');
					const embedPost = await message.channel.messages.fetch(find.messageID);

					const infoEditPost = new MessageEmbed(embedPost.embeds[0])
						.addField(`${rsn}`, `${reason}`, true);

					embedPost.edit(infoEditPost);
					return message.react('✅');
				}
				catch (err) {
					if (err.code === 10008) {
						const identifiers = err.path.split('/');
						const findID = await logs.find(log => log.messageID === identifiers[4]);

						message.channel.send('Unable to find the embed to add to. - It must have been deleted! Removing it from the DataBase...')
							.then(async m => await m.delete({ timeout: 10000 }))
							.catch(err => {
								channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							});

						await settings.updateOne({ '_id': message.guild.id }, {
							$pull: {
								logs: { messageID: findID.messageID },
							},
						});
					}
					else { channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``); }
				}
			}

			break;
		case 'edit': {
			if (message.guild.id === '420803245758480405' && message.channel.id === '773285098069426227') {
				const find = await logs.find(log => log.id === num && log.type === param);
				const embedPost = await message.channel.messages.fetch(find.messageID);
				const paramSlice = rest.join(' ').search(paramRegex);
				const editRsn = rest.join(' ').slice(0, paramSlice).trim();
				const matched = message.content.match(paramRegex);
				const fieldsParams = ['rsn', 'reason'];
				const parameter = fieldsParams.indexOf(matched[0].toLowerCase());
				const changeRsn = rest.join(' ').slice(paramSlice + 4).trim();
				const changeReason = rest.join(' ').slice(paramSlice + 7).trim();
				const editPost = new MessageEmbed(embedPost.embeds[0]);
				const fields = embedPost.embeds[0].fields;
				const field = [];

				if (!param || !num) return message.channel.send('Please specify the type (`ban`, `friend` or `affiliate`) and the number of the embed.');
				if (!editRsn) return message.channel.send('Please enter the RSN to find.');
				if (matched === null) return message.channel.send('Please enter a valid parameter to change. Either `RSN:` or `Reason:`.');
				if (!changeReason || !changeRsn) return message.channel.send(`Please provide the value to change ${editRsn}'s ${parameter} to.`);

				for (let i = 0; i < fields.length; i++) {
					if (fields[i].name === editRsn) {
						field.push(i, fields[i]);
					}
				}
				if (fieldsParams[0] === fieldsParams[parameter]) { // RSN
					if (field[1] === undefined) return message.channel.send('Make sure you type the RSN correctly, including any capitals.');
					field[1].name = changeRsn;
					editPost.spliceFields(field[0], 1, field[1]);
					embedPost.edit(editPost);
					return message.react('✅');
				}
				if (fieldsParams[1] === fieldsParams[parameter]) { // Reason
					if (field[1] === undefined) return message.channel.send('Make sure you type the RSN correctly, including any capitals.');
					field[1].value = changeReason;
					editPost.spliceFields(field[0], 1, field[1]);
					embedPost.edit(editPost);
					return message.react('✅');
				}
			}
			else {
				const [channelID, messageID, ...messageContent] = args.slice(1);
				const { value, id } = checkAndGetID(channelID);
				const messageCheck = checkAndGetID(messageID);
				console.log(channelID, messageID, ...messageContent);
				if (value) {
					if (messageCheck.value && message.author.id !== myID && messageContent.length) {
						if (message.guild.channels.cache.has(id)) {
							const getChannel = message.guild.channels.cache.get(id);
							try {
								const msg = await getChannel.messages.fetch(messageCheck.id);
								await msg.edit(messageContent.join(' '));
								return message.react('✅');
							}
							catch (err) {
								channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							}
						}
						else {
							return message.channel.send('You are not able to edit a message in another server.');
						}
					}
					else {
						if (!messageContent.length) return message.channel.send('You must provide a message to send and a channel to send it to.');
						if (!messageCheck.value) return message.channel.send(`Make sure the messageID is valid and in <#${id}>`);
						if (message.author.id === myID && messageCheck.value && messageContent.length) {
							const getChannel = client.channels.cache.get(id);
							try {
								const msg = await getChannel.messages.fetch(messageCheck.id);
								await msg.edit(messageContent.join(' '));
								return message.react('✅');
							}
							catch (err) {
								channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							}
						}
					}
				}
				else {
					return message.channel.send('You must have a valid channel ID.');
				}
			}
		}
			break;
		case 'remove': {
			if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
				return;
			}
			else {
				const find = await logs.find(log => log.id === num && log.type === param);
				rsn = rest.join(' ');

				if (!param || !num || !find) return message.channel.send('Please specify the type (`ban`, `friend` or `affiliate`) and the number of the embed.');

				const embedPost = await message.channel.messages.fetch(find.messageID);
				const editPost = new MessageEmbed(embedPost.embeds[0]);
				if (rsn === 'clear') {
					editPost.spliceFields(0, 25);
					embedPost.edit(editPost);
					return message.react('✅');
				}
				const fields = embedPost.embeds[0].fields;
				const field = [];

				for (let i = 0; i < fields.length; i++) {
					if (fields[i].name === rsn) {
						field.push(i, fields[i]);
					}
				}
				field[1] === undefined
					? message.channel.send('Make sure you type the RSN correctly, including any capitals.') && message.react('❌')
					: editPost.spliceFields(field[0], 1) && message.react('✅');
				embedPost.edit(editPost);
			}
		}
			break;
		default: {
			if (checkAndGetID(args[0]).value) { // Has valid channel ID
				if (message.guild.channels.cache.has(checkAndGetID(args[0]).id) && content && message.author.id !== myID) { // Has content and channel is in same server
					message.guild.channels.cache.get(checkAndGetID(args[0]).id).send(content, { split: true })
						.catch(err => {
							if (err.code === 50013) {
								return message.channel.send(`I am missing some permissions to post in <#${checkAndGetID}>.`);
							}
							else {
								return channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							}
						});
				}
				if (message.author.id === myID && content) {
					client.channels.cache.get(checkAndGetID(args[0]).id).send(content, { split: true })
						.catch(err => {
							if (err.code === 50013) {
								return message.channel.send(`I am missing some permissions to post in <#${checkAndGetID}>.`);
							}
							else {
								return channels.errors.send('Unknown error in send.js', `\`\`\`${err}\`\`\``);
							}
						});
				}
				else if (message.author.id !== myID && content && !message.guild.channels.cache.has(checkAndGetID(args[0]).id)) { // Checks for non-owner, message content and if ID is not in same server
					message.channel.send('You are not able to send a message to a channel in another server.');
					channels.logs.send(`<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: \`\`\`Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}\`\`\``);
				}
			}
			else { // No valid ID
				return message.channel.send('You must provide a valid channel ID.');
			}

			if (args[0] && !content) {
				return message.channel.send('You must provide a message to send and a channel to send it to.');
			}
		}
		}
	},
};
