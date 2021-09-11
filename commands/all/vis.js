/* eslint-disable no-inline-comments */
const { SlashCommandBuilder } = require('@discordjs/builders');
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const colors = require('../../colors.json');

const description = ['Shows the current Vis Wax combinations.', 'Upload an image of the current Vis wax combinations or a message link which includes an attachment.', 'Force reset of image.'];

module.exports = {
	name: 'vis',
	description,
	aliases: [],
	usage: ['', '<image URL or discord message link>', 'new'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('vis')
		.setDescription(description[0])
		.addSubcommand(subcommand =>
			subcommand
				.setName('wax')
				.setDescription('Todays Vis Wax combinations.')),
	// 	.addSubcommand(subcommand =>
	// 		subcommand
	// 			.setName('other_commands')
	// 			.setDescription('Shows other vix wax commands')
	// 			.addIntegerOption(option =>
	// 				option.setName('reset')
	// 					.setDescription(`${description[2]} [ADMIN]`)
	// 					.addChoice('True', 1))),
	// // Add back when files are allowed to be uploaded with slash commands
	// .addStringOption(option =>
	// 	option.setName('upload')
	// 		.setDescription(`${description[1]}`)
	// 		.addChoice('File', 'file_upload')
	// 		.addChoice('Message Link', 'message_link')
	// 		.addChoice('Image URL', 'image_url')));
	slash: async (interaction, perms, channels) => {
		const db = getDb();
		const settings = db.collection('Settings');
		const { visTime, vis } = await settings.findOne({ _id: 'Globals' }, { projection: { visTime: 1, vis: 1 } });
		if (!interaction.options.getInteger('reset')) {
			let currentDate = new Date().toUTCString();
			currentDate = currentDate.split(' ');
			// eslint-disable-next-line no-unused-vars
			const [day, month, year, ...rest] = currentDate.slice(1);
			const savedDate = visTime.toString().split(' ');

			if (year !== savedDate[3] || month !== savedDate[1] || day !== savedDate[2]) {
				interaction.reply({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
				return await settings.updateOne({ _id: 'Globals' }, {
					$set: {
						vis: null,
					},
				});
			}
			if (vis === null) {
				return await interaction.reply({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
			}
			else {
				return await interaction.reply({ content: `**Image uploaded at:** <t:${(Math.round(Date.parse(visTime)) / 1000)}>`, files: [vis] });
			}
		}
		else if (interaction.options.getInteger('reset')) {
			console.log(interaction.options.getInteger('reset'));
			if (!perms.owner) return await interaction.reply(perms.errorO);
			if (vis === null) {
				return interaction.reply({ content: 'There currently isn\'t any Vis Wax image uploaded.', ephemeral: true });
			}
			else {
				await settings.updateOne({ _id: 'Globals' }, {
					$set: {
						vis: null,
					},
				});
				return channels.vis.send(`${interaction.member.user.tag} reset the Vis command in **${interaction.channel.guild.name}.**`);
			}
		}
		else {
			return;
		}

	},
	run: async (client, message, args, perms, channels) => {
		const db = getDb();
		const settings = db.collection('Settings');
		const [...attachment] = args;

		const embed = new MessageEmbed()
			.setTitle('New Vis Wax Upload')
			.setDescription(`**${message.member.nickname ?? message.author.tag}** uploaded a new Vis Wax Image from Server:\n**${message.channel.guild.name}** - ${message.channel.guild.id}.`)
			.setTimestamp()
			.setThumbnail(message.author.displayAvatarURL())
			.setColor(colors.cream);

		const { visTime, vis } = await settings.findOne({ _id: 'Globals' }, { projection: { visTime: 1, vis: 1 } });
		if (!args.length && !message.attachments.size) {
			try {
				let currentDate = new Date().toUTCString();
				currentDate = currentDate.split(' ');
				// eslint-disable-next-line no-unused-vars
				const [day, month, year, ...rest] = currentDate.slice(1);
				const savedDate = visTime.toString().split(' ');

				if (year !== savedDate[3] || month !== savedDate[1] || day !== savedDate[2]) {
					message.channel.send({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
					return await settings.updateOne({ _id: 'Globals' }, {
						$set: {
							vis: null,
						},
					});
				}
				if (vis === null) {
					return message.channel.send({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
				}
				return message.channel.send({ content: `**Image uploaded at:** <t:${(Math.round(Date.parse(visTime)) / 1000)}> | Try out the slash command: \`/vis wax\``, files: [`${vis}`] });
			}
			catch (err) {
				return message.channel.send({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
			}
		}
		else { // Image URL
			const array = ['gif', 'jpeg', 'tiff', 'png', 'webp', 'bmp', 'prnt.sc', 'gyazo.com'];
			if (message.attachments.size) {
				message.react('✅');
				return channels.vis.send({ embeds: [ embed.setImage(message.attachments.first().url) ] })
					.then(async () => {
						return await settings.updateOne({ _id: 'Globals' }, {
							$set: {
								vis: message.attachments.first().url,
								visTime: message.createdAt,
							},
						});
					})
					.catch(err => {
						channels.errors.send(err, module);
					});
			}
			else if (array.some(x => attachment[0].includes(x))) {
				message.react('✅');
				return channels.vis.send({ embeds: [ embed.setImage(attachment[0]) ] })
					.then(async () => {
						return await settings.updateOne({ _id: 'Globals' }, {
							$set: {
								vis: attachment[0],
								visTime: message.createdAt,
							},
						});
					})
					.catch(err => {
						channels.errors.send(err, module);
					});
			}
			else if (attachment[0].includes('discord.com')) { // Discord message link
				const split = attachment[0].split('/');
				const [g, c, m] = split.slice(4);

				try {
					const guildFetch = await client.guilds.fetch(g);
					const channelFetch = await guildFetch.channels.cache.get(c);
					const messageFetch = await channelFetch.messages.fetch(m);
					const newEmbed = embed.setImage(`${messageFetch.attachments.first().attachment}`);
					channels.vis.send({ embeds: [ newEmbed ] });
					message.react('✅');
					return await settings.updateOne({ _id: 'Globals' }, {
						$set: {
							vis: messageFetch.attachments.first().attachment,
							visTime: message.createdAt,
						},
					});
				}
				catch (e) {
					// Catch errors for a guild where the bot isn't in. Same for channel or message
					if (e.code === 50001) {
						if (e.path.includes('guilds')) {
							return message.channel.send({ content: 'I am not in that server so I cannot access that message link.' });
						}
						else {
							return message.channel.send({ content: 'I do not have access to that channel to view the message.' });
						}
					}
					else if (e.code === 10008) {
						if (e.message === 'Unknown Message') {
							return message.channel.send({ content: 'I am unable to find that message. Maybe it has been deleted?' });
						}
					}
					else {
						channels.errors.send(e, module);
					}
				}
			}
			else {
				return message.channel.send({ content: 'Couldn\'t find attachment/image.' });
			}
		}
	},
};