const gsheet = require('../../gsheets');
const { google } = require('googleapis');
const { GoogleSheet } = require('../../classes');
const { pink } = require('../../colors.json');
const { MessageEmbed } = require('discord.js');

module.exports = async (client, oldMember, newMember) => {
	// DSF: 420803245758480405
	// Test: 668330890790699079
	if (oldMember.guild.id !== '420803245758480405') return;
	/**
     * Update the sheet, check the Discord ID column to see if each member is still a booster.
     * If they are, check and confirm boostingSince and monthsBoosted.
     * If not, send message to adminChannel confirming they are no longer boosting the server.
     *  - Move them to a previous booster column
     */

	// DSF: 586267152152002562
	// Test: 869877392603234324
	const boostChannel = newMember.guild.channels.cache.get('586267152152002562');
	const boostRoleId = '585606009603620875';
	const monthDiff = (dateFrom, dateTo) => {
		return dateTo.getMonth() - dateFrom.getMonth() +
          (12 * (dateTo.getFullYear() - dateFrom.getFullYear()));
	};

	const nitros = [];
	const writeOptions = {
		spreadsheetId: '11wnRWnYVhiY0DEFJqZMFDVZO2TOr_VQ_XySJgTGeyfA',
		range: 'Boosters!A2:E30',
		valueInputOption: 'USER_ENTERED',
		resource: {
			values: nitros,
		},
	};

	const readOptions = {
		spreadsheetId: '11wnRWnYVhiY0DEFJqZMFDVZO2TOr_VQ_XySJgTGeyfA',
		ranges: 'Boosters!A2:E30',
	};

	try {
		if (oldMember.premiumSince !== newMember.premiumSince) {
			gsheet.googleClient.authorize(err => {
				if (err) console.error(err);
				googleSheets(gsheet.googleClient);
			});
			const googleSheets = async (gClient) => {
				const gsapi = google.sheets({ version: 'v4', auth: gClient });
				const sheet = new GoogleSheet(gsapi, readOptions);

				// Read
				const boosterDataSet = await sheet.data('Boosters');
				const boosterData = boosterDataSet.values;

				// Write
				// Update All
				const updateExisting = async () => {
					for (const boosters of boosterData) {
						const discordID = boosters[3];
						const fetched = newMember.guild.members.cache.get(discordID) ?? await newMember.guild.members.fetch(discordID);
						const roleCheck = fetched.roles.cache.has(boostRoleId);
						if (discordID === '430229790369382400') continue;
						if (roleCheck) { nitros.push([boosters[0], fetched.premiumSince, monthDiff(fetched.premiumSince, new Date()), discordID, fetched.displayName]); }
						else { return; }
					}
				// return await gsapi.spreadsheets.batchUpdate(updateOptions);
				};

				// Fetch All
				// const allMembers = await newMember.guild.members.fetch();
				// const nitroBoosterCollection = allMembers.filter(member => member.roles.cache.find(role => role.name === 'Nitro Booster'));
				// nitroBoosterCollection.forEach(nitro => {
				// console.log(nitro.displayName, nitro.roles.cache.has(boostRoleId));
				// const premiumSince = nitro.premiumSince.toString().split(' ').slice(0, 4).join(' ');
				// nitros.push(['Unknown', premiumSince, monthDiff(nitro.premiumSince, new Date()), nitro.id, nitro.displayName]);
				// });
				// await gsapi.spreadsheets.values.append(writeOptions);

				// Add new member
				nitros.push(['Unknown', new Date().toString().split(' ').slice(0, 4).join(' '), 0, newMember.id, newMember.displayName]);
				await gsapi.spreadsheets.values.append(writeOptions);

				const nitroEmbed = new MessageEmbed()
					.setAuthor(`${newMember.displayName}`, `${newMember.user.displayAvatarURL()}`)
					.setTitle('New Booster!')
					.setColor(pink)
					.setThumbnail('https://cdn.discordapp.com/attachments/869877392603234324/879052719225200680/discord_nitro.png')
					.setTimestamp()
					.setDescription(`${newMember}, thank you for boosting this server! Please check out the pins to check on any updated information and if you would like the rank in the FC, please provide us with your RSN.`);

				await boostChannel.send({ embeds: [ nitroEmbed ] });
				return await updateExisting();

			};
		}
	}
	catch(err) {
		console.error(err);
	}
};
