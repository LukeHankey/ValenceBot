module.exports = async (client, member) => {
	if (
		member.user.username.toLowerCase().includes('twitter')
        || member.user.username.toLowerCase().includes('honde')
	) {
		member.ban({ days: 7, reason: 'Spam account' });
		console.log(`${member.user.username} was banned in ${member.guild.name}`);
		if (member.guild.id === '472448603642920973') {
			const channel = member.guild.channels.cache.get('492075320565039145');
			const getMessageCollection = await channel.messages.fetch({ limit: 2 });
			const ids = getMessageCollection.map(m => m.id);
			ids.forEach(id => {
				channel.messages.delete(id);
			});
		}
		else if (member.guild.id === '420803245758480405') {
			const channel = member.guild.channels.cache.get('421843065049841670');
			const getMessageCollection = await channel.messages.fetch({ limit: 1 });
			const getMessage = getMessageCollection.first();
			await getMessage.delete();
		}
		else { return;}
	}
};
