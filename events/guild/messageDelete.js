const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const colors = require('../../colors.json');

module.exports = async (client, message) => {
	if (process.env.NODE_ENV === 'DEV') {
		if (message.guild.id !== '668330890790699079') return;
	}
	else if (message.guild.id === '668330890790699079') {return;}

	const db = getDb();
	const settingsColl = db.collection('Settings');
	const fullDB = await settingsColl.findOne({ _id: message.channel.guild.id, merchChannel: { $exists: true } });
	if (!fullDB) return;
	const { messages, channelID } = fullDB.merchChannel;
	const merchChannelID = message.channel.guild.channels.cache.get(channelID);

	const botServerWebhook = await client.channels.cache.get('784543962174062608').fetchWebhooks();
	const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();

	const sendAndUpdate = async (webhook, embed, data) => {
		const webhookDetails = webhook.first();
		const sentWebhook = await webhookDetails.send({ embeds: [ embed ] });
		const { userID } = data;
		if (sentWebhook.guild.id === message.channel.guild.id) {
			await settingsColl.updateOne({ _id: message.channel.guild.id }, {
				$pull: { 'merchChannel.messages': { messageID: data.messageID } },
				$addToSet: { 'merchChannel.deletions.messages': { messageID: sentWebhook.id, authorID: userID } },
			})
				.then(() => {
					sentWebhook.react('✅');
				});
		}
		else {return;}
	};

	// Cached messages only show the message object without null //

	// No DMs and only in merch channels
	if (!message.channel.guild || channelID !== message.channel.id) return;
	const fetchedLogs = await message.channel.guild.fetchAuditLogs({
		limit: 1,
		type: 'MESSAGE_DELETE',
	});

	const deletionLog = fetchedLogs.entries.first();

	if (!deletionLog) return console.log(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`);
	const { executor, target } = deletionLog;

	const messageDeletion = (document) => {
		const embed = new MessageEmbed()
			.setTitle('Message Deleted')
			.setColor(colors.red_dark)
			.addField('Message ID:', `${document.messageID}`, true)
			.addField('Message Content:', `${document.content}`, true)
			.addField('\u200B', '\u200B', true)
			.addField('Author ID:', `${document.userID}`, true)
			.addField('Author Tag:', `<@!${document.userID}>`, true)
			.addField('\u200B', '\u200B', true)
			.addField('Message Timestamp:', `${new Date(document.time).toString().split(' ').slice(0, -4).join(' ')}`, false);
		return embed;
	};

	if (message.channel.guild === null || message.author === null) return console.log('Failed to fetch data for an uncached message.');

	// Self deletion
	if (target.id !== message.author.id) {
		// Bot self delete
		console.log('Message deleted:', message.content, message.author.id);
		if (message.author.id === '668330399033851924') return;

		const checkDB = messages.find(entry => entry.messageID === message.id);
		if (checkDB === undefined) {return console.log('Deleted message was not uploaded to the DataBase.');}
		else {
			const user = await message.channel.guild.members
				.fetch(checkDB.userID)
				.catch(err => console.error('message delete', err));

			const embed = messageDeletion(checkDB)
				.setDescription('This message was deleted by the message author - remove merch count.')
				.setThumbnail(user.user.displayAvatarURL())
				.setFooter('Click the ✅ or use the command to remove merch count.');

			await sendAndUpdate(botServerWebhook, embed, checkDB);
			await sendAndUpdate(dsfServerWebhook, embed, checkDB);

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID);
			if (getPerms) {
				console.log(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`);
				return getPerms.delete();
			}
			else { return; }
		}
	}
	// Someone else deleted message
	else {
		// Bot deleting own posts
		if (target.id === '668330399033851924') return;

		const checkDB = messages.find(entry => entry.messageID === message.id);
		if (checkDB === undefined) {return console.log('Deleted message was not uploaded to the DataBase.');}
		else {
			const user = await message.channel.guild.members
				.fetch(checkDB.userID)
				.catch(err => console.error('message delete own', err));

			const embed = messageDeletion(checkDB)
				.setDescription(`This message was deleted by ${executor.username} - remove merch count.`)
				.setThumbnail(user.user.displayAvatarURL());

			// Remove count by posting or bot to remove
			await sendAndUpdate(botServerWebhook, embed, checkDB);
			await sendAndUpdate(dsfServerWebhook, embed, checkDB);

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID);
			if (getPerms) {
				console.log(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`);
				return getPerms.delete();
			}
			else { return; }
		}
	}
};