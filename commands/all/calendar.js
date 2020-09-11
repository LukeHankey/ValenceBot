const colors = require('../../colors.json')
const Discord = require("discord.js");

module.exports = {
	name: "calendar",
	description: ["Creates an embed for a calender.", "Add to the current calendar embed by specifying specific parameters.", "Edit the current calendar to remove or add events in a specific position."],
	aliases: ["cal"],
	usage: ["create", "add <messageID> <Date> Event: <event text> Time: <time> Announcement: <link> Host: <@member/role>", "edit <messageID> <starting field> <delete count> <addfields (same as add but adding to a specific position)>"],
	run: async (client, message, args, perms) => {
		if (!perms.mod) {
            return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
            .addField("Only the following Roles & Users can:", perms.joinM, true)
            .addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
        }

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const monthIndex = (new Date()).getUTCMonth()

        switch (args[0]) {
            case "create":
            function embed(title = `Calendar for ${months[monthIndex]}`, description = "This months events are as follows:",) {
                const embed = new Discord.MessageEmbed()
                .setTitle(title)
                .setDescription(description)
                .setColor(colors.purple_medium)
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp()
                .setFooter(`Valence Bot created by Luke_#8346`, client.user.displayAvatarURL())
            return embed;
            }
            message.channel.send(embed())
            break;
            case "add": {
                let [id, ...rest] = args.slice(1)
                let m = await message.channel.messages.fetch(id)
                const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                const event = rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")
                const time = rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")
                const link = rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")
                const host = message.mentions.members.first() || message.mentions.roles.first()
                
                if (!id) message.channel.send("You must provide the message ID of the calendar to add to it.")
                else if (id && !date || !event || !time || !link || !host) {
                    message.channel.send("Please provide the content that you would like to add to the calendar. Acceptable format below:\n\`\`\`\n<messageID> 21st - 24th Event: New Event! Time: 22:00 - 23:00 Announcement: <link> Host: @<member or role>\n\nNOTE: You must include <Date> Event: / Time: / Announcement: / Host: \nStarting with capitals and including the colon.\`\`\`")
                }
                else {
                    let editEmbed = new Discord.MessageEmbed(m.embeds[0])
                    .addFields(
                        { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}`}
                    )
                m.edit(editEmbed)
                } 
            }
            break
            case "edit": {
                let [...rest] = args.slice(4)
                const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                const event = `Event: ${rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")}`
                const time = `Time: ${rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")}`
                const link = `[Announcement](${rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")})`
                const host = `Host: ${message.mentions.members.first() || message.mentions.roles.first()}`

                let [...params] = [event, time, link, host]

                let removeE = await message.channel.messages.fetch(args[1])
                let n = new Discord.MessageEmbed(removeE.embeds[0])

                if (args[1] && args[2] && args[3] != 0) {
                    n.spliceFields(args[2] - 1, args[3])
                    removeE.edit(n)
                } else if (!args[1]) {
                    message.channel.send("You must provide the message ID of the calendar to edit it.")
                } else if (!args[2] || !args[3]) {
                    message.channel.send("You must provide the starting field and a delete count. Examples: \`\`\`<messageID> 1 1 - This will start at the first field and delete 1 (Removing the first).\n<messageID> 3 2 - Starts at the 3rd field and removes the 3rd and 4th field.\`\`\`")
                }
                else {
                    n.spliceFields(args[2] - 1, args[3], { name: date, value: `${params.join("\n")}`})
                    removeE.edit(n)
                }
            }
        }
	},
};