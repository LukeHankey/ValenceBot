/* eslint-disable no-inner-declarations */
/* eslint-disable no-inline-comments */
const colors = require('../../colors.json');
const gsheet = require('../../gsheets');
const { google } = require('googleapis');
const { nEmbed } = require('../../functions');
const { MessageEmbed } = require('discord.js');
const getDb = require('../../mongodb').getDb;

module.exports = {
	name: 'wish',
	description: ['Posts the embed and populates with wish data.'],
	aliases: [],
	usage: [''],
	guildSpecific: ['733164313744769024', '420803245758480405'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, channels) => {
		if (message !== 'readyEvent') {
			if (!perms.owner) return message.channel.send(perms.errorO);
		}
		const db = getDb();
		const settings = db.collection('Settings');
		const { merchantWishes } = await settings.findOne({ _id: '420803245758480405' });
		const splitIntoX = (arr, x) => {
			arr = arr.flat();
			return new Array(Math.ceil(arr.length / x))
				.fill()
				.map(() => arr.splice(0, x));
		};

		try {
			gsheet.googleClient.authorize(err => {
				if (err) console.error(err);
				googleSheets(gsheet.googleClient);
			});

			const rangeName = 'TM Coupon';

			async function googleSheets(gClient) {
				const gsapi = google.sheets({ version: 'v4', auth: gClient });
				const opt = { // READ ONLY OPTIONS
					spreadsheetId: '1c1LBKEYKE3N3lgYLByQo4MZRp2FqMEPHMGxuS7Ozxvw',
					range: `${rangeName}!${merchantWishes.range}`,
				};

				const embedData = [];
				const data = await gsapi.spreadsheets.values.get(opt);
				let dataArr = data.data.values;

				dataArr.flatMap(innerArr => {
					innerArr[0] = `${innerArr[0]} (${innerArr[4]})`;
					innerArr.splice(2, 0, '\u200B');
					innerArr.splice(4, 0, '\u200B');
					innerArr.splice(6, 1);
				});
				dataArr = splitIntoX(dataArr, 2);

				for (const values of dataArr) {
					const fields = { name: `${values[0]}`, value: `${values[1]}`, inline: true };
					embedData.push(fields);
				}
				const dsfServer = client.guilds.cache.get('420803245758480405');

				const first = embedData.slice(0, 24);
				const second = embedData.slice(24, 48);
				const third = embedData.slice(48, 72);
				const fourth = embedData.slice(72, 96);
				const botUser = await dsfServer.members.fetch(client.user.id);

				const embedMaker = (num, dates) => {
					return nEmbed(dates, 'The last 30 days of stock for the Entrepreneurial wish: Travelling Merchant coupon.', colors.cream, '', client.user.displayAvatarURL())
						.setFooter(`${botUser.nickname || client.user.username} created by Luke_#8346`, client.user.displayAvatarURL())
						.addFields(num);
				};

				const channelToPush = client.channels.cache.get('844416432258285578');
				const openMessage = '**Travelling Merchant Wishes**\n\nWith the release of the wishes that came out on Monday 24th May, we thought we would compile the last 30 days of stock for you so you are able to see which items and on which days the different stock was available. Please note that you will only be able to purchase the stock if you had not already purchased it on that specific day.';

				const firstDate = `${dataArr[0][0]} - ${dataArr[21][0]}`;
				const secondDate = `${dataArr[24][0]} - ${dataArr[45][0]}`;
				const thirdDate = `${dataArr[48][0]} - ${dataArr[69][0]}`;
				const fourthDate = `${dataArr[72][0]} - ${dataArr[90][0]}`;

				const firstEmbed = embedMaker(first, `Dates: ${firstDate}`);
				const secondEmbed = embedMaker(second, `Dates: ${secondDate}`);
				const thirdEmbed = embedMaker(third, `Dates: ${thirdDate}`);
				const fourthEmbed = embedMaker(fourth, `Dates: ${fourthDate}`);

				if (message !== 'readyEvent') {
					message.delete();
					const opening = await channelToPush.send(openMessage);
					const firstID = await channelToPush.send(firstEmbed);
					const secondID = await channelToPush.send(secondEmbed);
					const thirdID = await channelToPush.send(thirdEmbed);
					const fourthID = await channelToPush.send(fourthEmbed);

					const sendLinks = async (msgToEdit = opening) => {
						const msgCollection = await channelToPush.messages.fetch({ limit: 4 });
						const baseURL = `https://discord.com/channels/${channelToPush.guild.id}/${channelToPush.id}`;
						const editFormat = msgCollection.map(item => {
							const title = item.embeds[0].title.slice(7);
							return `- [${title}](${baseURL}/${item.id})`;
						});
						const embed = new MessageEmbed()
							.setColor(colors.aqua)
							.setDescription(editFormat.reverse().join('\n'));
						await msgToEdit.edit(`${openMessage}\n\n`, { embed });
						const after = await channelToPush.send('**Links**', embed);
						await settings.updateOne({ _id: message.guild.id }, {
							$set: {
								'merchantWishes.messages.links.opening': msgToEdit.id,
								'merchantWishes.messages.links.after': after.id,
							},
						});
					};
					sendLinks();

					settings.updateOne({ _id: message.guild.id }, {
						$set: {
							'merchantWishes.messages.first': firstID.id,
							'merchantWishes.messages.second': secondID.id,
							'merchantWishes.messages.third': thirdID.id,
							'merchantWishes.messages.fourth': fourthID.id,
						},
					});
				}


				const grabIDAndEdit = async () => {
					const postData = [
						{ links: false, date: firstDate, messageID: merchantWishes.messages.first, embed: firstEmbed },
						{ links: false, date: secondDate, messageID: merchantWishes.messages.second, embed: secondEmbed },
						{ links: false, date: thirdDate, messageID: merchantWishes.messages.third, embed: thirdEmbed },
						{ links: false, date: fourthDate, messageID: merchantWishes.messages.fourth, embed: fourthEmbed },
						{ links: true, messageID: merchantWishes.messages.links.opening },
						{ links: true, messageID: merchantWishes.messages.links.after },
					];
					const embedEditor = (info) => {
						const embed = new MessageEmbed(info);
						return embed;
					};
					const channel = client.channels.cache.get(merchantWishes.channelID);

					const editStockPosts = (dataArray, links = false) => {
						if (links) {
							const baseURL = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;
							const format = postData.filter(prop => prop.links === false).map(obj => {
								return `- [${obj.date}](${baseURL}/${obj.messageID})`;
							});
							const embed = new MessageEmbed().setDescription(format).setColor(colors.aqua);
							return dataArray.filter(prop => prop.links === true).forEach(async arrData => {
								const msg = await channel.messages.fetch(arrData.messageID);
								await msg.edit(embed);
							});
						}
						else {
							dataArray.filter(prop => prop.links === false).forEach(async arrData => {
								const msg = await channel.messages.fetch(arrData.messageID);
								await msg.edit(embedEditor(arrData.embed));
							});
						}
					};
					editStockPosts(postData);
					editStockPosts(postData, true);

				};
				grabIDAndEdit();
			}
		}
		catch (e) {
			channels.errors.send('Unknown error in wish.js', `\`\`\`${err}\`\`\``);
		}

	},
};