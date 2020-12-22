const { MessageEmbed } = require("discord.js");
const colors = require('../../colors.json')

module.exports = {
	name: "vote",
	description: ["Provides a voting message in which people can react with ✅ or ❌."],
	aliases: [],
	usage: ["<question>"],
	guildSpecific: 'all',
	run: async (client, message, args) => {
        const content = args.join(" ")
        
        const embed = new MessageEmbed()
            .setTitle('New Vote!')
            .setDescription(`${content}`)
            .setColor(colors.orange)
            .setTimestamp()

        message.delete()
        message.channel.send(embed).then(async m => {
            await m.react('✅')
            await m.react('❌')
        })
	},
};