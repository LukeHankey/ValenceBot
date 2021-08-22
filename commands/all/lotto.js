import { googleClient } from '../../gsheets.js'
import { google } from 'googleapis'
import { nEmbed } from '../../functions.js'
import { greenLight, redDark, gold, greenDark, redLight } from '../../colors.js'
import { getDb } from '../../mongodb.js'

/**
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

module.exports = {
	name: 'lotto',
	description: ['Shows a list of everyone in the current months lottery.', 'Displays the current total pot for the Lottery!', 'Updates the google sheet name.', 'Shows information about the <user> lottery entry.', 'Adds a clanmate\'s lottery entry to google sheet.\nExample:\n```js\n;lotto add 1000000 clan bank / J ulian\n;lotto add 500000 clan bank / Guys / double```'],
	aliases: ['lottery'],
	usage: ['', 'total', 'sheet <Google Sheet Name>', '<user>', 'add <amount> <collector> / <clanmate> / double (optional)'],
	guildSpecific: ['472448603642920973', '668330890790699079'],
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, channels) => {
		const db = getDb();
		const settingsColl = db.collection('Settings');
		const database = await settingsColl.findOne({ _id: message.channel.guild.id });

		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const altMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
		const monthIndex = (new Date()).getUTCMonth();
		try {
			googleClient.authorize(err => {
				if (err) console.error(err)
				googleSheets(googleClient)
			})
			let rangeName
			if (database.lottoSheet === null) {
				rangeName = `${altMonths[monthIndex]} ${new Date().getUTCFullYear()} Lotto`;
			}
			else {
				rangeName = database.lottoSheet;
			}

			// eslint-disable-next-line no-inner-declarations
			async function googleSheets(gClient) {
				const gsapi = google.sheets({ version: 'v4', auth: gClient });
				const opt = { // READ ONLY OPTIONS
					spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY',
					range: `${rangeName}!A2:C100`,
				};

				const userData = []; // Holds all fields in specified range
				const data = await gsapi.spreadsheets.values.get(opt);
				const dataArr = data.data.values;
				const found = [];
				const newArr = [];

				const optW = { // WRITE OPTIONS
					spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY',
					range: `${rangeName}!A1:F100`,
					valueInputOption: 'USER_ENTERED',
					resource: { values: newArr },
				};

				const optTotal = { // READ ONLY OPTIONS
					spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY', // Test Sheet
					range: `${rangeName}!H1:N2`,
				};

				const optC = { // READ ONLY COLLECTORS
					spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY',
					range: `${rangeName}!H5:H17`,
				};
				const dataColl = await gsapi.spreadsheets.values.get(optC);
				const dataC = dataColl.data.values.filter(val => val.length !== 0).flat();

				for (const values of dataArr) {
					const index = dataArr.indexOf(values) + 1;
					if (values.length !== 1) {
						const fields = { name: `${index}. ${values[1]}`, value: `${values[2]}`, inline: true };
						userData.push(fields);
					}
				}

				// eslint-disable-next-line prefer-const
				let [colNameArgs, rsn] = args.slice(2).join(' ').split('/');
				colNameArgs = colNameArgs.trim();
				const tag = args.slice(-1).join('');
				const colName = dataC.find(val => val.toLowerCase() == colNameArgs.toLowerCase());

				const lottoEmbed = { embeds: [ func.nEmbed('Lotto entry added successfully!', '', colors.green_light, message.author.displayAvatarURL(), client.user.displayAvatarURL())
					.addFields(
						{ name: 'RuneScape Name:', value: `${rsn || undefined}`, inline: true },
						{ name: 'Amount:', value: '500,000', inline: true },
						{ name: 'To:', value: `${colName}`, inline: true },
						{ name: 'Donations Updated:', value: 'N/A', inline: true },
					)],
				};

				switch (args[0]) {
				case 'add':
					if (perms.mod) {
						switch (args[1]) {
						case '500000':
							if (!args[2]) {
								message.channel.send({ content: 'Add who\'s entry?\nFormat: <amount> <collector name> <clanmate>' });
							}
							else if (colName === undefined) {
								message.channel.send({ embeds: [
									func.nEmbed('Lottery Collectors', `**${colNameArgs}** is not a Lottery Collector.`, colors.red_dark, message.author.displayAvatarURL(), client.user.displayAvatarURL())
										.addField('Current Collectors', dataC.join(', '))],
								});
							}
							else if (!rsn) {
								return message.channel.send({ content: 'Please provide the RSN of the lottery entree.' });
							}
							else { // If there is an rsn
								if (dataArr.length > userData.length) {
									const ranges = `${rangeName}!A${userData.length + 2}:F${dataArr.length + 1}`;
									await gsapi.spreadsheets.values.clear({
										spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY',
										range: ranges,
									});
								}
								if (tag && tag === 'double') {
									newArr.push([userData.length + 1, rsn.trim().split(/ /g).join(' '), '500,000', colName, 'N/A', 'Double Entry']);
									await gsapi.spreadsheets.values.append(optW);
									return message.channel.send(lottoEmbed
										.spliceFields(0, 1, { name: 'RuneScape Name:', value: `${rsn.split(/ /g).slice(0, -1).join(' ')}`, inline: true })
										.addField('Double Entry:', 'Yes', true));
								}
								newArr.push([userData.length + 1, rsn.trim(), '500,000', colName, 'N/A']);
								await gsapi.spreadsheets.values.append(optW);
								return message.channel.send(lottoEmbed
									.spliceFields(2, 1, { name: 'To:', value: `${colName}`, inline: true }),
								);
							}
							break;
						default:
							if (isNaN(parseInt(args[1]))) {
								return message.channel.send({ content: 'Please make sure you give the amount as a number only, without any formatting.' });
							}
							else if (!args[2]) {
								message.channel.send({ content: 'Add who\'s entry?\nFormat: <amount> <collector name> <clanmate>' });
							}
							else if (colName === undefined) {
								message.channel.send({ embeds: [
									func.nEmbed('Lottery Collectors', `**${colNameArgs}** is not a Lottery Collector.`, colors.red_dark, message.author.displayAvatarURL(), client.user.displayAvatarURL())
										.addField('Current Collectors', dataC.join(', '))],
								});
							}
							else if (!rsn) {
								return message.channel.send({ content: 'Please provide the RSN of the lottery entree.' });
							}
							else { // If there is an rsn
								if (dataArr.length > userData.length) {
									const ranges = `${rangeName}!A${userData.length + 2}:F${dataArr.length + 1}`;
									await gsapi.spreadsheets.values.clear({
										spreadsheetId: '1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY',
										range: ranges,
									});
								}
								if (tag && tag === 'double') {
									newArr.push([userData.length + 1, rsn.trim().split(/ /g).join(' '), args[1], colName, 'No', 'Double Entry']);
									await gsapi.spreadsheets.values.append(optW);
									return message.channel.send(lottoEmbed
										.spliceFields(1, 1, { name: 'Amount:', value: `${args[1]}`, inline: true })
										.spliceFields(0, 1, { name: 'RuneScape Name:', value: `${rsn.split(/ /g).slice(0, -1).join(' ')}`, inline: true })
										.addField('Double Entry:', 'Yes', true));
								}
								newArr.push([userData.length + 1, rsn.trim(), args[1], colName, 'No']);
								await gsapi.spreadsheets.values.append(optW);
								return message.channel.send(lottoEmbed
									.spliceFields(1, 1, { name: 'Amount:', value: `${args[1]}`, inline: true })
									.spliceFields(2, 1, { name: 'To:', value: `${colName}`, inline: true })
									.spliceFields(3, 1, { name: 'Donations Updated:', value: 'No', inline: true }),
								);
							}
						}
					}
					else {
						message.channel.send(perms.errorM);
					}
					break;
				case 'total':
					const dataTotals = await gsapi.spreadsheets.values.get(optTotal);
					const arrTotal = dataTotals.data.values;
					const totalArr = [];
					const totalValues = [];
					const totalEmbed = func.nEmbed(`Total Prize Pool for month of ${months[monthIndex]}!`, 'This is the current prize pool so far with dividends for 1st, 2nd and 3rd place!', colors.gold, message.author.displayAvatarURL(), client.user.displayAvatarURL());

					for (let values of arrTotal) {
						values = values.filter(x => x !== '');
						totalArr.push(values);
					}
					for (let i = 0; i < totalArr[0].length; i++) {
						totalArr.push([totalArr[0][i], totalArr[1][i]]);
					}
					for (const values of totalArr.slice(2)) {
						const fields = { name: values[0], value: values[1], inline: true };
						totalValues.push(fields);
					}
					message.channel.send({ embeds: [ totalEmbed.addFields(totalValues).spliceFields(2, 0, { name: '\u200B', value: '\u200B', inline: true }) ] });
					break;
				case 'sheet':
					if (perms.mod) {
						const newSheet = args.slice(1).join(' ');
						if (newSheet) {
							await settingsColl.findOneAndUpdate({ _id: message.channel.guild.id }, { $set: { lottoSheet: newSheet } });
							await message.react('✅');
						}
						else {
							const newName = await settingsColl.findOne({ _id: message.channel.guild.id });
							return message.channel.send({ content: `The current Lotto Sheet name is : \`${newName.lottoSheet}\`` });
						}
					}
					else {
						message.channel.send(perms.errorM);
					}
					break;
				default:
					const username = args.join(' ');

					if (username) {
						const nameFound = dataArr.filter(name => {
							return name[1] !== undefined && (name[1].toLowerCase() === username.toLowerCase());
						});
						for (const values of nameFound) {
							const fields = { name: `${values[1]}`, value: `${values[2]}`, inline: true };
							found.push(fields);
						}

						if (nameFound && nameFound.length === 1) {
							message.channel.send({ embeds: [ func.nEmbed(
								'Lottery Entrance',
								'You are in the lottery only once for this month!',
								colors.green_dark,
								message.author.displayAvatarURL(),
								client.user.displayAvatarURL(),
							)
								.addFields(found)
								.addField('Want to enter twice for double the chance of winning?', 'It only costs 30 Clan Points! Let the Admins know in <#640641467798519808>!'),
							] });
						}
						else if (nameFound && nameFound.length === 2) {
							message.channel.send({ embeds: [ func.nEmbed(
								'Lottery Entrance',
								`You are in the lottery ${nameFound.length} times for this month!`,
								colors.green_dark,
								message.author.displayAvatarURL(),
								client.user.displayAvatarURL(),
							)
								.addFields(found),
							] });
						// .addField(`\u200B`, `\u200B`)
						}
						else if (nameFound && nameFound.length > 2) {
							message.channel.send({ embeds: [ func.nEmbed(
								'Lottery Entrance - Error',
								`You have been entered in the lottery more than two times! (Total of ${nameFound.length})`,
								colors.red_light,
								message.author.displayAvatarURL(),
								client.user.displayAvatarURL(),
							)
								.addField('Solution:', 'Please let an Admin know to fix your entries!'),
							] });
						}
						else {
							message.channel.send({ embeds: [ func.nEmbed(
								'Lottery Entrance',
								'You are **Not** in the lottery for this month!',
								colors.red_dark,
								message.author.displayAvatarURL(),
								client.user.displayAvatarURL(),
							)
								.addField('Get your lotto entry in!', 'Message any Admin in game to pay the 500k entry fee!'),
							] });
						}
					}
					else if (!username) {
						let page = 0;
						const embeds = paginate(userData);

						// eslint-disable-next-line no-inner-declarations
						function paginate(pageData) {
							const pageEmbeds = [];
							let k = 24;
							for (let i = 0; i < pageData.length; i += 24) {
								const current = pageData.slice(i, k);
								k += 24;
								const info = current;
								const gEmbed = func.nEmbed(
									`Lottery Entrants for the month of ${months[monthIndex]}`,
									'Those that appear twice in the list have paid for a double entry.',
									colors.green_light,
									message.author.displayAvatarURL(),
								)
									.addFields(info);
								pageEmbeds.push(gEmbed);
							}
							return pageEmbeds;
						}
						message.channel.send({ embeds: [ embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`) ] })
							.then(async msg => {
								await msg.react('◀️');
								await msg.react('▶️');

								const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === message.author.id;
								const collect = msg.createReactionCollector({ filter: react });

								collect.on('collect', (r, u) => {
									if (r.emoji.name === '▶️') {
										if (page < embeds.length) {
											msg.reactions.resolve('▶️').users.remove(u.id);
											page++;
											if (page === embeds.length) --page;
											msg.edit({ embeds: [ embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`) ] });
										}
									}
									else if (r.emoji.name === '◀️') {
										if (page !== 0) {
											msg.reactions.resolve('◀️').users.remove(u.id);
											--page;
											msg.edit({ embeds: [ embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`) ] });
										}
										else {msg.reactions.resolve('◀️').users.remove(u.id);}
									}
								});
							})
							.catch(err => channels.errors.send(err, module));
					}
				}
			}
		}
		catch(err) {
			channels.errors.send(err, module);
		}
	},
};
