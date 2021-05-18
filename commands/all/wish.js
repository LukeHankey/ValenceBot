/* eslint-disable no-inner-declarations */
/* eslint-disable no-inline-comments */
const { MessageEmbed } = require('discord.js');
const colors = require('../../colors.json');
const gsheet = require('../../gsheets');
const { google } = require('googleapis');

module.exports = {
	name: 'wish',
	description: ['Posts the embed and populates with wish data.'],
	aliases: [],
	usage: ['<question>'],
	guildSpecific: '733164313744769024',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);

		try {
			gsheet.googleClient.authorize(err => {
				if (err) console.error(err);
				googleSheets(gsheet.googleClient);
			});

			const rangeName = 'TM Coupon0';

			async function googleSheets(gClient) {
				const gsapi = google.sheets({ version: 'v4', auth: gClient });
				const opt = { // READ ONLY OPTIONS
					spreadsheetId: '1c1LBKEYKE3N3lgYLByQo4MZRp2FqMEPHMGxuS7Ozxvw',
					range: `${rangeName}!A1:D33`,
				};

				const userData = []; // Holds all fields in specified range
				const data = await gsapi.spreadsheets.values.get(opt);
				const dataArr = data.data.values;

				for (const values of dataArr) {
					const index = dataArr.indexOf(values) + 1;
					if (values.length !== 1) {
						const fields = { name: `${index}. ${values[1]}`, value: `${values[2]}`, inline: true };
						userData.push(fields);
					}
					console.log(values);
				}
			}
		}
		catch (e) {
			console.error(e);
		}

	},
};