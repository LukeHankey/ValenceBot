const colors = require('../../colors.json')
const Discord = require("discord.js");
const func = require('../../functions.js')
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "calendar",
	description: ["Creates an embed for a calender, with an optional <Month> parameter.", "Add to the current calendar embed by specifying specific parameters. Also add to a specific calendar by specifying the", "Edit the current calendar to remove or add events in a specific position."],
	aliases: ["cal"],
	usage: ["create <month>", "add <month> <Date> Event: <event text> Time: <time> Announcement: <link> Host: <@member/role>", "edit <starting field> <delete count> <addfields (same as add but adding to a specific position)>"],
	run: async (client, message, args, perms) => {
		if (!perms.mod) {
            return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
            .addField("Only the following Roles & Users can:", perms.joinM, true)
            .addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
        }

        let db = getDb()
        let settings = db.collection("Settings")

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const monthIndex = (new Date()).getUTCMonth()
        const currentMonth = months[monthIndex]
        const code = "```";

        switch (args[0]) {
            case "create":
            if (perms.admin) {
                function embed(title, description = "This months events are as follows:",) {
                const embed = new Discord.MessageEmbed()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(colors.purple_medium)
                    .setThumbnail(client.user.displayAvatarURL())
                    .setTimestamp()
                    .setFooter(`Valence Bot created by Luke_#8346`, client.user.displayAvatarURL())
                    return embed;
                }

                if (!args[1]) {
                    client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> created a new Calendar embed.`);
                    message.channel.send(embed(`Calendar for ${currentMonth}`))
                    .then(msg => {
                        settings.findOneAndUpdate({ _id: message.guild.name }, 
                        { $push: { calendarID: { $each: [
                            { messageID: msg.id, month: `${currentMonth}`, year: new Date().getUTCFullYear() }
                        ]}}})
                    })
                }
                else {
                    client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> created a new Calendar embed.`);
                    message.channel.send(embed(`Calendar for ${func.capitalise(args[1])}`))
                    .then(msg => {
                        settings.findOneAndUpdate({ _id: message.guild.name }, 
                        { $push: { calendarID: { $each: [
                            { messageID: msg.id, month: `${func.capitalise(args[1])}`, year: new Date().getUTCFullYear() }
                        ]}}})
                    })
                }
            } else {
                return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
                .addField("Only the following Roles & Users can:", perms.joinA, true)
                .addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
            }
            break;
            case "add": 
            settings.findOne({ _id: message.guild.name }).then(async r => {
                const monthInc = r.calendarID.filter(obj => obj.month.toLowerCase() === args[1].toLowerCase() || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                if (monthInc && monthInc.length !== 0) {
                    if (args[1].toLowerCase() === monthInc[0].month.toLowerCase() || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                        
                        try {
                            let [...rest] = args.slice(2)
                            let m = await message.channel.messages.fetch(monthInc[0].messageID)
                            const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                            const event = rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")
                            const time = rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")
                            const link = rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")
                            const host = message.mentions.members.first() || message.mentions.roles.first()
                            
                            if (!date || !event || !time || !link || !host) {
                                message.channel.send(`Please provide the content that you would like to add to the calendar. Acceptable format below:\n${code}\n21st - 24th Event: New Event! Time: 22:00 - 23:00 Announcement: <link> Host: @<member or role>\n\nNOTE: You must include <Date> Event: / Time: / Announcement: / Host: \nStarting with capitals and including the colon.${code}`)
                            }
                            else {
                                let editEmbed = new Discord.MessageEmbed(m.embeds[0])
                                .addFields(
                                    { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}`}
                                )
                            m.edit(editEmbed)
                            client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} added an event: ${code}${message.content}${code}`);
                            }
                        }
                        catch (err) {
                            if (err.message === "Unknown Message") {
                                message.channel.send("Calendar not found. - It may have been deleted.")
                                .then(m => m.delete({ timeout: 5000 }))
                            } else {
                                message.channel.send("Try again in the <#626172209051860992> channel.")
                            }
                        }
                    }
                }
                else {
                    const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                    try {
                        let [...rest] = args.slice(1)
                        let m = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                        const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                        const event = rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")
                        const time = rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")
                        const link = rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")
                        const hostCollection = message.mentions.members.keyArray().map(id => `<@${id}>`)
                        const host = hostCollection.join(" ") || message.mentions.roles.first()

                        if (!date || !event || !time || !link || !host) {
                            message.channel.send(`Please provide the content that you would like to add to the calendar. Acceptable format below:\n${code}\n21st - 24th Event: New Event! Time: 22:00 - 23:00 Announcement: <link> Host: @<member or role>\n\nNOTE: You must include <Date> Event: / Time: / Announcement: / Host: \nStarting with capitals and including the colon.${code}`)
                        }
                        else {
                            let editEmbed = new Discord.MessageEmbed(m.embeds[0])
                            .addFields(
                                { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}`}
                            )
                        m.edit(editEmbed)
                        client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} added an event: ${code}${message.content}${code}`);
                        } 
                    }
                    catch (err) {
                        if (err.message === "Unknown Message") {
                            return message.channel.send(`Calendar not found. - It may have been deleted. Attempting to remove all calendars for the month of ${currentMonth}...`)
                            .then(mes => {
                                settings.findOne({ _id: message.guild.name })
                                .then(async re => {
                                let mObj = await re.calendarID.filter(x => x.month === currentMonth)
                                let mID = mObj[mObj.length - 1].messageID

                                settings.findOneAndUpdate({ _id: message.guild.name }, { $pull: { calendarID: { month: currentMonth } } })
                                message.channel.messages.fetch(mID)
                                .then(m => m.delete())
                            })
                            setTimeout(() => {
                                mes.edit(`Calendars for ${currentMonth} have been removed. Recreate a new calendar.`)
                            }, 5000)
                            })
                        }
                        message.channel.send("Try again in the <#626172209051860992> channel.")
                    }
                }
            })
            break
            case "edit": 
            settings.findOne({ _id: message.guild.name }).then(async r => {
                const monthInc = r.calendarID.filter(obj => obj.month === args[1] || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                if (monthInc && monthInc.length !== 0) {
                    if (args[1] === monthInc[0].month || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                    let [...rest] = args.slice(4)
                        const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                        const event = `Event: ${rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")}`
                        const time = `Time: ${rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")}`
                        const link = `[Announcement](${rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")})`
                        const host = `Host: ${message.mentions.members.first() || message.mentions.roles.first()}`

                        let [...params] = [event, time, link, host]

                        let removeE = await message.channel.messages.fetch(monthInc[0].messageID)
                        .catch(err => {
                            return message.channel.send("Try again in the <#626172209051860992> channel.")
                        })
                        let n = new Discord.MessageEmbed(removeE.embeds[0])

                        if (func.checkNum(args[2]) && func.checkNum(args[3], 0) && args[2] !== undefined && args[3] !== undefined && params[3].includes("undefined")) {
                            n.spliceFields(args[2] - 1, args[3])
                            let log = removeE.embeds[0].fields.splice(args[2] - 1, args[3])
                            let logValues = log.map(values => `${values.name}\n${values.value}\n`)
                            let remaining = n.fields.map(values => `${values.name}\n${values.value}\n`)
                            client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} removed event: ${code}diff\n- Removed\n${logValues.join("\n")}\n+ Remaining\n ${remaining.join("\n")}${code}`);
                            removeE.edit(n)
                        } else if (func.checkNum(args[2]) === false || func.checkNum(args[3], 0) === false || args[2] === undefined || args[3] === undefined) {
                            message.channel.send(`You must provide the starting field and a delete count. Examples: ${code}1 1 - This will start at the first field and delete 1 (Removing the first).\n3 2 - Starts at the 3rd field and removes the 3rd and 4th field.${code}`)
                        }
                        else {
                            n.spliceFields(args[2] - 1, args[3], { name: date, value: `${params.join("\n")}`})
                            removeE.edit(n)
                            client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} edited an event: ${code}${message.content}${code}`);
                        }
                    }
                }
                else {
                    const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                    let [...rest] = args.slice(3)
                    const date = rest.slice(0, rest.indexOf("Event:")).join(" ")
                    const event = `Event: ${rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")}`
                    const time = `Time: ${rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")}`
                    const link = `[Announcement](${rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ")})`
                    const host = `Host: ${message.mentions.members.first() || message.mentions.roles.first()}`

                    let [...params] = [event, time, link, host]

                    let removeE = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                    .catch(err => {
                        return message.channel.send("Try again in the <#626172209051860992> channel.")
                    })
                    let n = new Discord.MessageEmbed(removeE.embeds[0])

                    if (func.checkNum(args[1]) && func.checkNum(args[2], 0) && args[1] !== undefined && args[2] !== undefined && params[3].includes("undefined")) {
                        n.spliceFields(args[1] - 1, args[2])
                        let log = removeE.embeds[0].fields.splice(args[1] - 1, args[2])
                        let logValues = log.map(values => `${values.name}\n${values.value}\n`)
                        let remaining = n.fields.map(values => `${values.name}\n${values.value}\n`)
                        client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} removed event: ${code}diff\n- Removed\n${logValues.join("\n")}\n+ Remaining\n ${remaining.join("\n")}${code}`);
                        removeE.edit(n)
                    } else if (func.checkNum(args[1]) === false || func.checkNum(args[2], 0) === false || args[1] === undefined || args[2] === undefined) {
                        message.channel.send(`You must provide the starting field and a delete count. Examples: ${code}1 1 - This will start at the first field and delete 1 (Removing the first).\n3 2 - Starts at the 3rd field and removes the 3rd and 4th field.${code}`)
                    }
                    else {
                        n.spliceFields(args[1] - 1, args[2], { name: date, value: `${params.join("\n")}`})
                        removeE.edit(n)
                        client.channels.cache.get("731997087721586698").send(`Calendar updated - ${message.author} edited an event: ${code}${message.content}${code}`);
                    }
                }
            })
        }
	},
};