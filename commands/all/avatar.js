module.exports = {
	name: "avatar",
	description: ["Provides a link to your own or a mentioned users avatar. \n**NOTE:** No user mentions will provide your own avatar."],
	aliases: ["icon"],
	usage: ["@user"],
	run: async (client, message) => {
		console.log(message.author);
		if (!message.mentions.users.size) {
			return message.channel.send({ files: [
				{
					attachment: message.author.displayAvatarURL({ format: "png", dynamic: true }),
					name: "avatar.png",
				},
			],
			});
		}

		const avatarList = message.mentions.users.map(user => {
			return `${user.username}'s avatar: <${user.displayAvatarURL({ format: "png", dynamic: true })}>`;
		});

		message.channel.send(avatarList);
	},
};