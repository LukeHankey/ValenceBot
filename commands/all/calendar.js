const colors = require('../../colors.json')
const Discord = require("discord.js");
const func = require('../../functions.js')
const getDb = require("../../mongodb").getDb;

/**
 * 472448603642920973 - Valence
 * 668330890790699079 - Valence Bot Test
 * 733164313744769024 - Test Server
 */

module.exports = {
    name: "calendar",
    description: ["Creates an embed for a calender - defaults to the current month.", "Add an event to the current or specified calendar month. Position defaults to the end of the calendar. \nExample:\n ```css\n;calendar add 4 Date: 13th Event: New Event Title! Time: 20:00 - 21:00 Announcement: <link> Host: @everyone```", "Edit the current or specified calendar month by field name:\n Date: / Event: / Time: / Announcement: / Host:", "Removes 1 or more events from the current or specified calendar month.", "Moves one event from x position to y position in the current or specified calendar month."],
    aliases: ["cal"],
    usage: ["create <month (optional)>", "add <month (optional)> <position (optional)> Date: <Date> Event: <event text> Time: <time> Announcement: <link> Host: <@member(s)/role>", "edit <month (optional)> <starting field> <event field> <new value>", "remove <month (optional)> <starting field> <delete count>", "move <month (optional)> <from position> <to position>"],
    guildSpecific: ["472448603642920973", "733164313744769024", "668330890790699079"],
    run: async (client, message, args, perms, channels) => {
        if (!perms.mod) {
            return message.channel.send(perms.errorM)
        }
        let db = getDb()
        let settings = db.collection("Settings")

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const monthIndex = (new Date()).getUTCMonth()
        const currentMonth = months[monthIndex]
        const code = "```";
        const calChannel = message.guild.channels.cache.find(ch => ch.name === "calendar")

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
                        client.channels.cache.get(channels.logs).send(`<@${message.author.id}> created a new Calendar embed.`);
                        message.channel.send(embed(`Calendar for ${currentMonth}`))
                        .then(msg => {
                            settings.findOneAndUpdate({ _id: message.guild.id },
                            {
                                $push: {
                                    calendarID: {
                                        $each: [
                                            { messageID: msg.id, month: `${currentMonth}`, year: new Date().getUTCFullYear() }
                                        ]
                                    }
                                }
                            })
                        })
                    }
                    else {
                        client.channels.cache.get(channels.logs).send(`<@${message.author.id}> created a new Calendar embed.`);
                        message.channel.send(embed(`Calendar for ${func.capitalise(args[1])}`))
                        .then(msg => {
                            settings.findOneAndUpdate({ _id: message.guild.id },
                            {
                                $push: {
                                    calendarID: {
                                        $each: [
                                            { messageID: msg.id, month: `${func.capitalise(args[1])}`, year: new Date().getUTCFullYear() }
                                        ]
                                    }
                                }
                            })
                        })
                    }
                } else {
                    return message.channel.send(perms.errorA)
                }
                break;
            case "add":
                settings.findOne({ _id: message.guild.id }).then(async r => {
                    const monthInc = r.calendarID.filter(obj => obj.month.toLowerCase() === args[1].toLowerCase() || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                    if (monthInc && monthInc.length !== 0) {
                        if (args[1].toLowerCase() === monthInc[0].month.toLowerCase() || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                            // Adding to a specified month \\
                            try {
                                let [...rest] = args.slice(2)

                                let m = await message.channel.messages.fetch(monthInc[0].messageID)
                                const date = rest.slice(rest.indexOf("Date:") + 1, rest.indexOf("Event:")).join(" ")
                                const event = rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")
                                const time = rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")
                                const link = rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ") || ""
                                const hostCollection = message.mentions.members.keyArray().map(id => `<@${id}>`)
                                const host = hostCollection.join(" ") || message.mentions.roles.first()

                                if (!date || !event || !time || !link || !host) {
                                    message.channel.send(`Please provide the content that you would like to add to the calendar. Acceptable format below:\n${code}\nDate: 21st - 24th Event: New Event! Time: 22:00 - 23:00 Announcement: <link> Host: @<member or role>\n\nNOTE: You must include Date: / Event: / Time: / Announcement: / Host: \nStarting with capitals and including the colon.${code}`)
                                }
                                else {
                                    let editEmbed = new Discord.MessageEmbed(m.embeds[0])
                                    if (args[2] !== "Date:" && func.checkNum(args[2], 1)) {
                                        editEmbed.spliceFields(args[2] - 1, 0, { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}` })
                                        m.edit(editEmbed)
                                    }
                                    else {
                                        editEmbed.addFields(
                                            { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}` }
                                        )
                                        m.edit(editEmbed)
                                    }
                                    client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} added an event: ${code}${message.content}${code}`);
                                }
                            }
                            catch (err) {
                                if (calChannel.id !== message.channel.id) {
                                    message.channel.send("Try again in the <#626172209051860992> channel.")
                                } else {
                                    if (err.message === "Unknown Message") {
                                        return message.channel.send(`Calendar not found. - It may have been deleted. Attempting to remove all calendars for the month of ${args[1]}...`)
                                        .then(mes => {
                                            settings.findOne({ _id: message.guild.id })
                                                .then(async re => {
                                                    let mObj = await re.calendarID.filter(x => x.month === args[1])
                                                    let mID = mObj[mObj.length - 1].messageID

                                                    settings.findOneAndUpdate({ _id: message.guild.id }, { $pull: { calendarID: { month: args[1] } } })
                                                    message.channel.messages.fetch(mID)
                                                        .then(m => m.delete())
                                                })
                                            setTimeout(() => {
                                                mes.edit(`Calendars for ${args[1]} have been removed. Recreate a new calendar.`)
                                            }, 5000)
                                        })
                                    }
                                }
                            }
                        }
                    }
                    else {
                        const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                        try {
                            let [...rest] = args.slice(1)
                            let m = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                            const date = rest.slice(rest.indexOf("Date:") + 1, rest.indexOf("Event:")).join(" ")
                            const event = rest.slice(rest.indexOf("Event:") + 1, rest.indexOf("Time:")).join(" ")
                            const time = rest.slice(rest.indexOf("Time:") + 1, rest.indexOf("Announcement:")).join(" ")
                            const link = rest.slice(rest.indexOf("Announcement:") + 1, rest.indexOf("Host:")).join(" ") || ""
                            const hostCollection = message.mentions.members.keyArray().map(id => `<@${id}>`)
                            const host = hostCollection.join(" ") || message.mentions.roles.first()

                            if (!date || !event || !time || !link || !host) {
                                message.channel.send(`Please provide the content that you would like to add to the calendar. Acceptable format below:\n${code}\n21st - 24th Event: New Event! Time: 22:00 - 23:00 Announcement: <link> Host: @<member or role>\n\nNOTE: You must include <Date> Event: / Time: / Announcement: / Host: \nStarting with capitals and including the colon.${code}`)
                            }
                            else {
                                let editEmbed = new Discord.MessageEmbed(m.embeds[0])
                                if (args[2] !== "Date:" && func.checkNum(args[2], 1)) {
                                    editEmbed.spliceFields(args[1] - 1, 0, { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}` })
                                    m.edit(editEmbed)
                                }
                                else {
                                    editEmbed.addFields(
                                        { name: date, value: `Event: ${event}\nTime: ${time}\n[Announcement](${link})\nHost: ${host}` }
                                    )
                                    m.edit(editEmbed)
                                }
                                client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} added an event: ${code}${message.content}${code}`);
                            }
                        }
                        catch (err) {
                            if (calChannel.id !== message.channel.id) {
                                message.channel.send("Try again in the <#626172209051860992> channel.")
                            } else {
                                if (err.message === "Unknown Message") {
                                    return message.channel.send(`Calendar not found. - It may have been deleted. Attempting to remove all calendars for the month of ${currentMonth}...`)
                                    .then(mes => {
                                        settings.findOne({ _id: message.guild.id })
                                            .then(async re => {
                                                let mObj = await re.calendarID.filter(x => x.month === currentMonth)
                                                let mID = mObj[mObj.length - 1].messageID

                                                settings.findOneAndUpdate({ _id: message.guild.id }, { $pull: { calendarID: { month: currentMonth } } })
                                                message.channel.messages.fetch(mID)
                                                    .then(m => m.delete())
                                            })
                                        setTimeout(() => {
                                            mes.edit(`Calendars for ${currentMonth} have been removed. Recreate a new calendar.`)
                                        }, 5000)
                                    })
                                }
                            }
                        }
                    }
                })
                break
            case "edit":
                settings.findOne({ _id: message.guild.id }).then(async r => {
                    const monthInc = r.calendarID.filter(obj => obj.month === args[1] || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                    // Editing a specific month \\
                    if (monthInc && monthInc.length !== 0) {
                        if (args[1] === monthInc[0].month || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                            let [...rest] = args.slice(3)
                            let fieldParams = ["date:", "event:", "time:", "announcement:", "host:"]
                            let parameter = fieldParams.indexOf(args[3].toLowerCase())

                            let editE = await message.channel.messages.fetch(monthInc[0].messageID)
                                .catch(err => {
                                    return message.channel.send("Try again in the <#626172209051860992> channel.")
                                })
                            let n = new Discord.MessageEmbed(editE.embeds[0])

                            let fields = n.fields[args[2] - 1]
                            if (fieldParams.includes(args[2].toLowerCase())) {
                                if (fieldParams[0] === rest[0].toLowerCase()) {
                                    n.spliceFields(args[2] - 1, 1, { name: rest.slice(1).join(" "), value: fields.value })
                                    editE.edit(n)
                                }
                                else if (fieldParams[parameter] === rest[0].toLowerCase() && rest[0].toLowerCase() !== fieldParams[0]) {
                                    let values = fields.value.split("\n")
                                    let newValue = ` ${rest.slice(1).join(" ")}`
                                    if (fieldParams[parameter] !== fieldParams[3]) {
                                        let value = values.filter(value => value.toLowerCase().includes(fieldParams[parameter]))
                                        let fieldValue = value.join(" ").split(`${func.capitalise(fieldParams[parameter])}`) // Doesn't work for announcement
                                        n.spliceFields(args[2] - 1, 1, { name: fields.name, value: fields.value.replace(fieldValue[1], newValue) })
                                        editE.edit(n)
                                    }
                                    else {
                                        let annVal = values[2].split("](")
                                        newValue = ` ${rest.slice(1).join(" ")})`
                                        n.spliceFields(args[2] - 1, 1, { name: fields.name, value: fields.value.replace(annVal[1], newValue) })
                                        editE.edit(n)
                                    }
                                }
                                client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} edited an event: ${code}${message.content}${code}`);
                            }
                            else {
                                message.channel.send(`You must provide the event number you want to edit as well as the field. Examples: ${code}1 Time: 14:00 - 15:00. - Gets the 1st event and edits the Time field to the new value.\n3 Date: 5th. - Gets the 3rd event and edits the Date field to the new value.${code}`)
                            }
                        }
                    }
                    else {
                        const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                        let [...rest] = args.slice(2)
                        let fieldParams = ["date:", "event:", "time:", "announcement:", "host:"]
                        let parameter = fieldParams.indexOf(args[2].toLowerCase())

                        let editE = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                            .catch(err => {
                                return message.channel.send("Try again in the <#626172209051860992> channel.")
                            })
                        let n = new Discord.MessageEmbed(editE.embeds[0])

                        let fields = n.fields[args[1] - 1]
                        if (fieldParams.includes(args[2].toLowerCase())) {
                            if (fieldParams[0] === rest[0].toLowerCase()) {
                                n.spliceFields(args[1] - 1, 1, { name: rest.slice(1).join(" "), value: fields.value })
                                editE.edit(n)
                            }
                            else if (fieldParams[parameter] === rest[0].toLowerCase() && rest[0].toLowerCase() !== fieldParams[0]) {
                                let values = fields.value.split("\n")
                                let newValue = ` ${rest.slice(1).join(" ")}`
                                if (fieldParams[parameter] !== fieldParams[3]) {
                                    let value = values.filter(value => value.toLowerCase().includes(fieldParams[parameter]))
                                    let fieldValue = value.join(" ").split(`${func.capitalise(fieldParams[parameter])}`) // Doesn't work for announcement
                                    n.spliceFields(args[1] - 1, 1, { name: fields.name, value: fields.value.replace(fieldValue[1], newValue) })
                                    editE.edit(n)
                                }
                                else {
                                    let annVal = values[2].split("](")
                                    newValue = ` ${rest.slice(1).join(" ")})`
                                    n.spliceFields(args[1] - 1, 1, { name: fields.name, value: fields.value.replace(annVal[1], newValue) })
                                    editE.edit(n)
                                }
                            }
                            client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} edited an event: ${code}${message.content}${code}`);
                        }
                        else {
                            message.channel.send(`You must provide the event number you want to edit as well as the field. Examples: ${code}1 Time: 14:00 - 15:00. - Gets the 1st event and edits the Time field to the new value.\n3 Date: 5th. - Gets the 3rd event and edits the Date field to the new value.${code}`)
                        }
                    }
                })
                break;
            case "remove":
                settings.findOne({ _id: message.guild.id }).then(async r => {
                    const monthInc = r.calendarID.filter(obj => obj.month === args[1] || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                    if (monthInc && monthInc.length !== 0) {
                        if (args[1] === monthInc[0].month || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                            let removeE = await message.channel.messages.fetch(monthInc[0].messageID)
                                .catch(err => {
                                    return message.channel.send("Try again in the <#626172209051860992> channel.")
                                })
                            let n = new Discord.MessageEmbed(removeE.embeds[0])
                            n.spliceFields(args[2] - 1, args[3])
                            removeE.edit(n)

                            let log = removeE.embeds[0].fields.splice(args[2] - 1, args[3])
                            let logValues = log.map(values => `${values.name}\n${values.value}\n`)
                            let remaining = n.fields.map(values => `${values.name}\n${values.value}\n`)
                            client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} removed event: ${code}diff\n- Removed\n${logValues.join("\n")}\n+ Remaining\n ${remaining.join("\n")}${code}`);
                        }
                    }
                    else {
                        const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                        let removeE = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                            .catch(err => {
                                return message.channel.send("Try again in the <#626172209051860992> channel.")
                            })
                        let n = new Discord.MessageEmbed(removeE.embeds[0])
                        n.spliceFields(args[1] - 1, args[2])
                        removeE.edit(n)

                        let log = removeE.embeds[0].fields.splice(args[1] - 1, args[2])
                        let logValues = log.map(values => `${values.name}\n${values.value}\n`)
                        let remaining = n.fields.map(values => `${values.name}\n${values.value}\n`)
                        client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} removed event: ${code}diff\n- Removed\n${logValues.join("\n")}\n+ Remaining\n ${remaining.join("\n")}${code}`);
                    }
                })
                break;
            case "move":
                settings.findOne({ _id: message.guild.id }).then(async r => {
                    const monthInc = r.calendarID.filter(obj => obj.month === args[1] || obj.month.substring(0, 3).toLowerCase() === args[1].substring(0, 3).toLowerCase())
                    if (monthInc && monthInc.length !== 0) {
                        if (args[1] === monthInc[0].month || args[1].toLowerCase() === monthInc[0].month.substring(0, 3).toLowerCase()) {
                            let moveE = await message.channel.messages.fetch(monthInc[0].messageID)
                                .catch(err => {
                                    return message.channel.send("Try again in the <#626172209051860992> channel.")
                                })
                            let n = new Discord.MessageEmbed(moveE.embeds[0])
                            let fields = n.fields[args[2] - 1]
                            n.spliceFields(args[2] - 1, 1)
                                .spliceFields(args[3] - 1, 0, { name: fields.name, value: fields.value })
                            moveE.edit(n)
                        }
                    }
                    else {
                        const currentMonthMessage = r.calendarID.filter(obj => obj.month === currentMonth)
                        let moveE = await message.channel.messages.fetch(currentMonthMessage[0].messageID)
                            .catch(err => {
                                return message.channel.send("Try again in the <#626172209051860992> channel.")
                            })
                        let n = new Discord.MessageEmbed(moveE.embeds[0])
                        let fields = n.fields[args[1] - 1]
                        n.spliceFields(args[1] - 1, 1)
                            .spliceFields(args[2] - 1, 0, { name: fields.name, value: fields.value })
                        moveE.edit(n)
                    }
                })
        }
    },
};