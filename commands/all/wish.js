/* eslint-disable no-inner-declarations */
/* eslint-disable no-inline-comments */
const colors = require('../../colors.json');
const gsheet = require('../../gsheets');
const { google } = require('googleapis');
const { nEmbed } = require('../../functions');
const { MessageEmbed } = require('discord.js');


module.exports = {
	name: 'wish',
	description: ['Posts the embed and populates with wish data.'],
	aliases: [],
	usage: ['<question>'],
	guildSpecific: '733164313744769024',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);

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
					range: `${rangeName}!A2:D33`,
				};

				const embedData = [];
				const data = await gsapi.spreadsheets.values.get(opt);
				let dataArr = data.data.values;

				dataArr.flatMap(innerArr => {
					innerArr.splice(2, 0, '\u200B');
					innerArr.splice(4, 0, '\u200B');
				});
				dataArr = splitIntoX(dataArr, 2);

				for (const values of dataArr) {
					const fields = { name: `${values[0]}`, value: `${values[1]}`, inline: true };
					embedData.push(fields);
				}
				const first = embedData.slice(0, 24);
				const second = embedData.slice(24, 48);
				const third = embedData.slice(48, 72);
				const fourth = embedData.slice(72, 96);

				const embedMaker = (num, dates) => {
					return nEmbed(dates, 'The last 30 days of stock for the Entrepreneurial wish: Travelling Merchant coupon.', colors.cream, '', client.user.displayAvatarURL())
						.addFields(num);
				};

				const channelToPush = client.channels.cache.get('844416432258285578');
				message.delete();
				const openMessage = '**Travelling Merchant Wishes**\n\nWith the release of the wishes out on Monday 24th May, we thought we would compile the last 30 days of stock for you so you are able to see which items and on which days the different stock was available. Please note that you will only be able to purchase the stock if you had not already purchased it on that specific day.';
				const opening = await channelToPush.send(openMessage);
				await channelToPush.send(embedMaker(first, 'Dates: Friday 23rd April - Friday 30th April'));
				await channelToPush.send(embedMaker(second, 'Dates: Saturday 1st May - Saturday 8th May'));
				await channelToPush.send(embedMaker(third, 'Dates: Sunday 9th May - Sunday 16th May'));
				await channelToPush.send(embedMaker(fourth, 'Dates: Monday 17th May - Monday 24th May'));

				const grabIdAndEdit = async (msgToEdit = opening) => {
					const msgCollection = await channelToPush.messages.fetch({ limit: 4 });
					const baseURL = `https://discord.com/channels/${channelToPush.guild.id}/${channelToPush.id}`;
					const editFormat = msgCollection.map(item => {
						const title = item.embeds[0].title.slice(7);
						return `- [${title}](${baseURL}/${item.id})`;
					});
					console.log(editFormat);
					const embed = new MessageEmbed()
						.setColor(colors.aqua)
						.setDescription(editFormat.reverse().join('\n'));
					await msgToEdit.edit(`${openMessage}\n\n`, { embed });
					await channelToPush.send('**Links**', embed);
				};
				grabIdAndEdit();


			}
		}
		catch (e) {
			console.error(e);
		}

	},
};