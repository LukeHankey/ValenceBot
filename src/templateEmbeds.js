import { MessageEmbed, Formatters } from 'discord.js'
import Color from './colors.js'

export const modAppEmbed = (message) => {
	return new MessageEmbed()
		.setTitle('New Twitch Mod Application')
		.setThumbnail(message.guild.bannerURL() ?? message.guild.iconURL())
		.setAuthor(message.guild.name, 'https://cdn.discordapp.com/attachments/913562644542267443/913562787987468328/Twitch_Chat_Mod.png')
		.setColor(Color.greenLight)
		.addFields([
			{ name: 'Submitted By:', value: message.member.nickname ?? message.author.usename },
			{ name: 'Application', value: Formatters.blockQuote(message.content) }
		])
		.setTimestamp()
		.setFooter('Mod Application', message.guild.bannerURL() ?? message.guild.iconURL())
}

export const defaultEmbed = (message) => {
	return new MessageEmbed()
		.setTitle('New Message')
		.setThumbnail(message.guild.bannerURL() ?? message.guild.iconURL())
		.setColor(Color.greenLight)
		.addFields([
			{ name: 'Message By:', value: message.member.nickname ?? message.author.usename },
			{ name: 'Content', value: Formatters.blockQuote(message.content) }
		])
		.setTimestamp()
		.setFooter('New Message', message.guild.bannerURL() ?? message.guild.iconURL())
}
