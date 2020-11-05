const func = require("../../functions.js")
const colors = require('../../colors.json')
const Discord = require('discord.js');
const getDb = require('../../mongodb').getDb

module.exports = {
    name: "send",
    description: ["Sends a message to a channel.", "Creates a new embed for the Ban/Friends List.", "Adds an RSN to the ban list with a reason.", "Edits an rsn or reason by finding the given rsn. Example:\n```css\n;send edit ban 1 Guys Reason: Is a noob.```"],
    aliases: [""],
    usage: ["<channel ID> <message content>", "embed <ban/friend> <number>", "info <ban/friend> <num> RSN: <rsn> Reason: <reason>", "edit <ban/friend> <num> <rsn> <RSN:/Reason:> <value>"],
    permissions: [false],
    run: async (client, message, args, perms) => {

        const myID = "212668377586597888";
        let content = args.slice(1).join(" ");
        const code = "```";
        if (!perms.admin) {
            return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
                .addField("Only the following Roles & Users can:", perms.joinA, true)
                .addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
        }

        const db = getDb();
        const settings = db.collection("Settings")

        const [param, num, ...rest] = args.slice(1)
        const reasonRegex = /(:^|reason)+/gi
        const rsnRegex = /(:^|rsn)+/gi
        const paramRegex = /(:^|rsn|reason)+/gi
        const reasonSlice = rest.join(" ").search(reasonRegex)
        let rsn = rest.join(" ").slice(4, reasonSlice).trim()
        let reason = rest.join(" ").slice(reasonSlice + 7).trim()


        switch (args[0]) {
            case 'embed': {
                const [param, num] = args.slice(1)
                const banEmbed = new Discord.MessageEmbed()
                    .setColor(colors.red_dark)
                    .setTitle(`${num}. Ban List for WhirlpoolDnD`)
                    .setDescription('A comprehensive list of all members that are banned with reasons.')
                    .setThumbnail('https://i.imgur.com/bnNTU4Z.png')
                    .setTimestamp()
                    .setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL())

                const friendEmbed = new Discord.MessageEmbed()
                    .setColor(colors.green_light)
                    .setTitle(`${num}. Friends List for WhirlpoolDnD`)
                    .setDescription('A comprehensive list of all members that are friends with reasons.')
                    .setThumbnail('https://i.imgur.com/nidMjPr.png')
                    .setTimestamp()
                    .setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL())

                if (!param) return message.channel.send('Please provide a parameter.')
                if (!num || isNaN(num)) return message.channel.send(`Please provide a number to order the embeds.`)

                // if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
                //     return
                // } else {
                    param === 'ban'
                        ? message.channel.send(banEmbed).then(async m => {
                            await settings.findOneAndUpdate({ '_id': message.guild.id }, {
                                $push: {
                                    'logs': { 'id': num, 'messageID': m.id, 'type': param }
                                }
                            })
                        })
                        : param === 'friend'
                            ? message.channel.send(friendEmbed).then(async m => {
                                await settings.findOneAndUpdate({ '_id': message.guild.id }, {
                                    $push: {
                                        'logs': { 'id': num, 'messageID': m.id, 'type': param }
                                    }
                                })
                            })
                            : message.channel.send('Parameter must be either: \`ban\` or \`friend\`.')
                }
            // }
                break;
            case 'info': {
                // if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
                //     return
                // } else {
                    settings.findOne({ '_id': message.guild.id })
                        .then(async res => {
                            const find = await res.logs.find(log => log.id === num && log.type === param)
                            const embedPost = await message.channel.messages.fetch(find.messageID)

                            if (!param || !num) return message.channel.send('Please specify the type (\`ban\` or \`friend\`) and the number of the embed.')
                            if (!rsn || message.content.match(rsnRegex) === null) return message.channel.send('Please enter the RSN as \`RSN: <rsn>\`.')
                            if (!reason || message.content.match(reasonRegex) === null) return message.channel.send('Please enter the reason. If there is no reason, use "Unknown".')

                            let infoEditPost = new Discord.MessageEmbed(embedPost.embeds[0])
                                .addField(`${rsn}`, `${reason}`, true)

                            embedPost.edit(infoEditPost)
                        })
                        .catch(async err => {
                            if (err.code === 10008) {
                                const identifiers = err.path.split("/")
                                const found = await settings.findOne({ '_id': message.guild.id })
                                const findID = await found.logs.find(log => log.messageID === identifiers[4])

                                message.channel.send(`Unable to find the embed to add to. - It must have been deleted! Removing it from the DataBase...`)
                                    .then(async m => await m.delete({ timeout: 10000 }))

                                await settings.updateOne({ '_id': message.guild.id }, {
                                    $pull: {
                                        logs: { messageID: findID.messageID }
                                    }
                                })
                            }
                            else console.log(err)
                        })
                // }
            }
                break;
            case 'edit': {
                if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
                    return
                } else {
                    settings.findOne({ '_id': message.guild.id })
                        .then(async res => {
                            const find = await res.logs.find(log => log.id === num && log.type === param)

                            const embedPost = await message.channel.messages.fetch(find.messageID)
                            const paramSlice = rest.join(" ").search(paramRegex)
                            const editRsn = rest.join(" ").slice(0, paramSlice).trim()
                            const matched = message.content.match(paramRegex)
                            const fieldsParams = ["rsn", "reason"]
                            const parameter = fieldsParams.indexOf(matched[0].toLowerCase())
                            const changeRsn = rest.join(" ").slice(paramSlice + 4).trim()
                            const changeReason = rest.join(" ").slice(paramSlice + 7).trim()
                            let editPost = new Discord.MessageEmbed(embedPost.embeds[0])
                            let fields = embedPost.embeds[0].fields
                            let field = []

                            if (!param || !num) return message.channel.send(`Please specify the type (\`ban\` or \`friend\`) and the number of the embed.`)
                            if (!editRsn) return message.channel.send('Please enter the RSN to find.')
                            if (matched === null) return message.channel.send('Please enter a valid parameter to change. Either `RSN:` or `Reason:`.')
                            if (!changeReason || !changeRsn) return message.channel.send(`Please provide the value to change ${editRsn}'s ${parameter} to.`)

                            for (let i = 0; i < fields.length; i++) {
                                if (fields[i].name === editRsn) {
                                    field.push(i, fields[i])
                                }
                            }
                            if (fieldsParams[0] === fieldsParams[parameter]) {
                                if (field[1] === undefined) return message.channel.send('Make sure you type the RSN correctly, including any capitals.')
                                field[1].name = changeRsn;
                                editPost.spliceFields(field[0], 1, field[1])
                                return embedPost.edit(editPost)
                            }
                            if (fieldsParams[1] === fieldsParams[parameter]) {
                                if (field[1] === undefined) return message.channel.send('Make sure you type the RSN correctly, including any capitals.')
                                field[1].value = changeReason;
                                editPost.spliceFields(field[0], 1, field[1])
                                return embedPost.edit(editPost)
                            }
                        })
                }
            }
            break;
            case 'remove': {
                // if (message.guild.id !== '420803245758480405' && message.channel.id !== '773285098069426227') {
                //     return
                // } else {
                    settings.findOne({ '_id': message.guild.id })
                        .then(async res => {
                            const find = await res.logs.find(log => log.id === num && log.type === param)
                            const rsn = rest.join(" ")

                            if (!param || !num || !find) return message.channel.send(`Please specify the type (\`ban\` or \`friend\`) and the number of the embed.`)

                            const embedPost = await message.channel.messages.fetch(find.messageID)
                            let editPost = new Discord.MessageEmbed(embedPost.embeds[0])
                            let fields = embedPost.embeds[0].fields
                            let field = []

                            for (let i = 0; i < fields.length; i++) {
                                if (fields[i].name === rsn) {
                                    field.push(i, fields[i])
                                }
                            }
                            field[1] === undefined
                                ? message.channel.send('Make sure you type the RSN correctly, including any capitals.')
                                : editPost.spliceFields(field[0], 1)
                            embedPost.edit(editPost)
                        })
                // }
            }   
            break; 
            default: {
                if (func.checkNum(args[0], 1, Infinity)) { // Has valid ID
                    if (message.guild.channels.cache.has(args[0]) && content && message.author.id !== myID) { // Has content and channel is in same server
                        message.guild.channels.cache.get(args[0]).send(content);
                    }
                    if (message.author.id === myID && content) {
                        client.channels.cache.get(args[0]).send(content);
                    }
                    else if (message.author.id !== myID && content && !message.guild.channels.cache.has(args[0])) { // Checks for non-owner, message content and if ID is not in same server
                        message.channel.send("You are not able to send a message to a channel in another server.");
                        client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: ${code}Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}${code}`);
                    }
                }
                else { // No valid ID
                    return message.channel.send("You must provide a channel ID.");
                }

                if (args[0] && !content) {
                    return message.channel.send("You must provide a message to send.");
                }
            }
        }
    },
};
