const checkMemberRole = async (user, message) => {
	const mem = message.guild.members.cache.get(user) ?? await message.guild.members.fetch(user);
	const allowedRoles = ['Scouter', 'Verified Scouter', 'Staff', 'Moderator (Bronze Star)', 'Administrator (Silver Star)'];
	const collectionTotal = mem.roles.cache.filter(r => allowedRoles.includes(r.name));
	if (collectionTotal.size) { return true; }
	else { return false; }
};

const arrIncludesString = (array, msg) => {
	return !array.some(value => msg.includes(value));
};
const alreadyCalled = (message, messages) => {
	const result = messages.filter(obj => {
		const str = obj.content;
		const numFromDb = str.replace(/^\D+|\D.*$/g, '');
		const numFromContent = message.content.replace(/^\D+|\D.*$/g, '');
		if (numFromDb === numFromContent) {
			return obj;
		}
	});
	// If already called, result.length > 0. Return false to delete the message.
	if (result.length) { return false; }
	else { return true; }
};

module.exports = {
	checkMemberRole,
	arrIncludesString,
	alreadyCalled,
};