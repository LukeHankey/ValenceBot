const gsheet = require('../../gsheets');
const { google } = require('googleapis');
const func = require('../../functions')
const colors = require('../../colors.json')

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

module.exports = {
name: "lotto",
description: ["Shows a list of everyone in the current months lottery.", "Shows information about the <user> lottery entry.", "Adds a clanmate's lottery entry to google sheet.\nExample:\n```js\n;lotto add 1000000 clan bank / J ulian\n;lotto add 500000 clan bank / Guys / double```"],
aliases: ["lottery"],
usage: ["", "<user>", "add <amount> <collector> / <clanmate> / double (optional)"],
guildSpecific: ["472448603642920973", "733164313744769024", "668330890790699079"],
permissions: ["Mod"],
run: async (client, message, args, perms) => {
    gsheet.googleClient.authorize(err => {
        if (err) console.error(err)
        googleSheets(gsheet.googleClient)
    })

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "December", "December"]
    const monthIndex = (new Date()).getUTCMonth()

    async function googleSheets(gClient) {
        const gsapi = google.sheets({ version: "v4", auth: gClient })
        const opt = { // READ ONLY OPTIONS
            spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY",
            range: "December 2020!A2:C100",
        }

        let userData = []; // Holds all fields in specified range
        let data = await gsapi.spreadsheets.values.get(opt);
        let dataArr = data.data.values
        let found = [];
        let newArr = [];

        const optW = { // WRITE OPTIONS
            spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY",
            range: "December 2020!A1:F100",
            valueInputOption: "USER_ENTERED",
            resource: { values: newArr }
        }

        const optC = { // READ ONLY COLLECTORS
            spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY",
            range: "December 2020!H5:H17",
        }
        let dataColl = await gsapi.spreadsheets.values.get(optC);
        let dataC = dataColl.data.values.filter(val => val.length !== 0).flat()

        for (values of dataArr) {
            let index = dataArr.indexOf(values) + 1;
            if (values.length !== 1) {
                let fields = { name: `${index}. ${values[1]}`, value: `${values[2]}`, inline: true }
                userData.push(fields)
            }
        }

        let [colNameArgs, rsn] = args.slice(2).join(" ").split("/")
        colNameArgs = colNameArgs.trim()
        let tag = args.slice(-1).join("")
        let colName = dataC.find(val => val.toLowerCase() == colNameArgs.toLowerCase())

        switch (args[0]) {
            case "add":
                let lottoEmbed = func.nEmbed("Lotto entry added successfully!", "", colors.green_light, message.author.displayAvatarURL(), client.user.displayAvatarURL())
                .addFields(
                    { name: `RuneScape Name:`, value: `${rsn || undefined}`, inline: true },
                    { name: `Amount:`, value: `500,000`, inline: true },
                    { name: `To:`, value: `${colName}`, inline: true }, 
                    { name: `Donations Updated:`, value: `N/A`, inline: true },
                )
                if (perms.mod) {
                    switch (args[1]) {
                        case "500000":
                            if (!args[2]) {
                                message.channel.send(`Add who's entry?\nFormat: <amount> <collector name> <clanmate>`)
                            } else if (colName === undefined) {
                                message.channel.send(
                                    func.nEmbed("Lottery Collectors", `**${colNameArgs}** is not a Lottery Collector.`, colors.red_dark, message.author.displayAvatarURL(), client.user.displayAvatarURL())
                                    .addField("Current Collectors", dataC.join(", "))
                                )
                            } else {
                                if (!rsn) {
                                    return message.channel.send("Please provide the RSN of the lottery entree.")
                                } else { // If there is an rsn
                                    if (dataArr.length > userData.length) {
                                        let ranges = `December 2020!A${userData.length + 2}:F${dataArr.length + 1}`
                                        await gsapi.spreadsheets.values.clear({
                                            spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY",
                                            range: ranges
                                        })
                                    }
                                    if (tag && tag === "double") {
                                        newArr.push([userData.length + 1, rsn.trim().split(/ /g).join(" "), "500,000", colName, "N/A", "Double Entry"])
                                        await gsapi.spreadsheets.values.append(optW)
                                        return message.channel.send(lottoEmbed
                                        .spliceFields(0, 1, { name: `RuneScape Name:`, value: `${rsn.split(/ /g).slice(0, -1).join(" ")}`, inline: true })
                                        .addField("Double Entry:", "Yes", true))
                                    }
                                    newArr.push([userData.length + 1, rsn.trim(), "500,000", colName, "N/A"])
                                    await gsapi.spreadsheets.values.append(optW)
                                    return message.channel.send(lottoEmbed
                                    .spliceFields(2, 1, { name: `To:`, value: `${colName}`, inline: true })
                                    )
                                }
                            }
                        break;
                    default:
                        if (isNaN(parseInt(args[1]))) {
                            return message.channel.send("Please make sure you give the amount as a number only, without any formatting.")
                        } else {
                            if (!args[2]) {
                                message.channel.send(`Add who's entry?\nFormat: <amount> <collector name> <clanmate>`)
                            } else if (colName === undefined) {
                                message.channel.send(
                                    func.nEmbed("Lottery Collectors", `**${colNameArgs}** is not a Lottery Collector.`, colors.red_dark, message.author.displayAvatarURL(), client.user.displayAvatarURL())
                                    .addField("Current Collectors", dataC.join(", "))
                                )
                            } else {
                                if (!rsn) {
                                    return message.channel.send("Please provide the RSN of the lottery entree.")
                                } else { // If there is an rsn
                                    if (dataArr.length > userData.length) {
                                        let ranges = `December 2020!A${userData.length + 2}:F${dataArr.length + 1}`
                                        await gsapi.spreadsheets.values.clear({
                                            spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY",
                                            range: ranges
                                        })
                                    }
                                    if (tag && tag === "double") {
                                        newArr.push([userData.length + 1, rsn.trim().split(/ /g).join(" "), args[1], colName, "No", "Double Entry"])
                                        await gsapi.spreadsheets.values.append(optW)
                                        return message.channel.send(lottoEmbed
                                        .spliceFields(1, 1, { name: 'Amount:', value: `${args[1]}`, inline: true } )
                                        .spliceFields(0, 1, { name: `RuneScape Name:`, value: `${rsn.split(/ /g).slice(0, -1).join(" ")}`, inline: true })
                                        .addField("Double Entry:", "Yes", true))
                                    }
                                    newArr.push([userData.length + 1, rsn.trim(), args[1], colName, "No"])
                                    await gsapi.spreadsheets.values.append(optW)
                                    return message.channel.send(lottoEmbed
                                    .spliceFields(1, 1, { name: 'Amount:', value: `${args[1]}`, inline: true } )
                                    .spliceFields(2, 1, { name: `To:`, value: `${colName}`, inline: true })
                                    .spliceFields(3, 1, { name: `Donations Updated:`, value: `No`, inline: true })
                                    )
                                }
                            }
                        }
                    }
                }
                else {
                    message.channel.send(perms.errorM)
                }
            break;
            case "total":
                const optTotal = { // READ ONLY OPTIONS
                    spreadsheetId: "1ZView14HaimCuCUg_durvI-3wiOn4Pf5mZRKYVwrHlY", // Test Sheet
                    range: "December 2020!H1:N2",
                }
                let dataTotals = await gsapi.spreadsheets.values.get(optTotal);
                let arrTotal = dataTotals.data.values
                let totalArr = []
                let totalValues = []
                let totalEmbed = func.nEmbed(`Total Prize Pool for month of ${months[monthIndex]}!`, "This is the current prize pool so far with dividends for 1st, 2nd and 3rd place!", colors.gold, message.author.displayAvatarURL(), client.user.displayAvatarURL())
                
                for (values of arrTotal) {
                    values = values.filter(x => x !== "")
                    totalArr.push(values)
                }
                for (let i = 0; i < totalArr[0].length; i++) {
                    totalArr.push([totalArr[0][i], totalArr[1][i]])
                }
                for (values of totalArr.slice(2)) {
                    let fields = { name: values[0], value: values[1], inline: true }
                    totalValues.push(fields)
                }
                message.channel.send(totalEmbed.addFields(totalValues).spliceFields(2, 0, { name: `\u200B`, value: `\u200B`, inline: true }))
            break;
            default:
                let username = args.join(" ")

                if (username) {
                let nameFound = dataArr.filter(name => {
                    return name[1] !== undefined && (name[1].toLowerCase() === username.toLowerCase())
                })
                for (values of nameFound) {
                    let fields = { name: `${values[1]}`, value: `${values[2]}`, inline: true}
                    found.push(fields)
                }

                if (nameFound && nameFound.length === 1) {
                        message.channel.send(func.nEmbed(
                        `Lottery Entrance`,
                        `You are in the lottery only once for this month!`,
                        colors.green_dark,
                        message.author.displayAvatarURL(),
                        client.user.displayAvatarURL()
                        )
                        .addFields(found)
                        .addField("Want to enter twice for double the chance of winning?", `It only costs 30 Clan Points! Let the Admins know in <#640641467798519808>!`)
                        )}
                    else if (nameFound && nameFound.length === 2) {
                        message.channel.send(func.nEmbed(
                            `Lottery Entrance`,
                            `You are in the lottery ${nameFound.length} times for this month!`,
                            colors.green_dark,
                            message.author.displayAvatarURL(),
                            client.user.displayAvatarURL()
                            )
                            .addFields(found))
                            // .addField(`\u200B`, `\u200B`)
                    }
                    else if (nameFound && nameFound.length > 2) {
                        message.channel.send(func.nEmbed(
                            `Lottery Entrance - Error`,
                            `You have been entered in the lottery more than two times! (Total of ${nameFound.length})`,
                            colors.red_light,
                            message.author.displayAvatarURL(),
                            client.user.displayAvatarURL()
                        )
                        .addField("Solution:", "Please let an Admin know to fix your entries!"))
                    }
                    else {
                        message.channel.send(func.nEmbed(
                            `Lottery Entrance`,
                            `You are **Not** in the lottery for this month!`,
                            colors.red_dark,
                            message.author.displayAvatarURL(),
                            client.user.displayAvatarURL()
                            )
                            .addField("Get your lotto entry in!", `Message any Admin in game to pay the 500k entry fee!`))           
                    }
                }
                else if (!username) {
                    let page = 0
                    const embeds = paginate(userData)

                    function paginate(data) {
                        const embeds = [];
                        let k = 24;
                        for (let i = 0; i < data.length; i += 24) {
                            const current = data.slice(i, k);
                            k += 24;
                            const info = current;
                            let gEmbed = func.nEmbed(
                                `Lottery Entrants for the month of ${months[monthIndex]}`,
                                `Those that appear twice in the list have paid for a double entry.`,
                                colors.green_light,
                                message.author.displayAvatarURL()
                                )
                                .addFields(info)
                            embeds.push(gEmbed)
                        }
                        return embeds;
                    }
                    message.channel.startTyping()
                    message.channel.send(embeds[page].setFooter(`Page ${page+1} of ${embeds.length}`))
                    .then(async msg => {
                        await msg.react('◀️')
                        await msg.react('▶️')

                        const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === message.author.id
                        const collect = msg.createReactionCollector(react)

                        collect.on('collect', (r, u) => {
                            if (r.emoji.name === '▶️') {
                                if (page < embeds.length) {
                                    msg.reactions.resolve('▶️').users.remove(u.id)
                                    page++
                                    if (page === embeds.length) --page
                                    msg.edit(embeds[page].setFooter(`Page ${page+1} of ${embeds.length}`))
                                }
                            } else if (r.emoji.name === '◀️') {
                                if (page !== 0) {
                                    msg.reactions.resolve('◀️').users.remove(u.id)
                                    --page;
                                    msg.edit(embeds[page].setFooter(`Page ${page+1} of ${embeds.length}`))
                                } else msg.reactions.resolve('◀️').users.remove(u.id)
                            }
                        })
                    })
                    message.channel.stopTyping()
                }
            }
        }
    }
}
