import Color from '../colors.js'
import { googleClient } from '../gsheets.js'
import { google } from 'googleapis'
import { nEmbed } from '../functions.js'
import { EmbedBuilder } from 'discord.js'

export default {
	name: 'wish',
	description: ['Posts the embed and populates with wish data.'],
	aliases: [],
	usage: [''],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		if (message !== 'readyEvent') {
			if (!perms.owner) return message.channel.send(perms.errorO)
		}
		const { merchantWishes } = await db.collection.findOne({ _id: '420803245758480405' })
		const splitIntoX = (arr, x) => {
			arr = arr.flat()
			return new Array(Math.ceil(arr.length / x)).fill().map(() => arr.splice(0, x))
		}

		try {
			googleClient.authorize((err) => {
				if (err) client.logger.error(err)
				googleSheets(googleClient)
			})

			const rangeName = 'TM Coupon'

			// eslint-disable-next-line no-inner-declarations
			async function googleSheets(gClient) {
				const gsapi = google.sheets({ version: 'v4', auth: gClient })
				const opt = {
					// READ ONLY OPTIONS
					spreadsheetId: '1WjVboaTCj_HfJFoJRF86ZgnrTXfZLS21',
					range: `${rangeName}!${merchantWishes.range}`
				}

				const embedData = []
				const data = await gsapi.spreadsheets.values.get(opt)
				let dataArr = data.data.values

				dataArr = dataArr.flatMap((innerArr) => {
					innerArr[0] = `${innerArr[0]} (${innerArr[4]})`
					innerArr.splice(2, 0, '\u200B')
					innerArr.splice(4, 0, '\u200B')
					innerArr.splice(6, 1)
					return innerArr
				})
				dataArr = splitIntoX(dataArr, 2)

				for (const values of dataArr) {
					const fields = { name: `${values[0]}`, value: `${values[1]}`, inline: true }
					embedData.push(fields)
				}
				const dsfServer = client.guilds.cache.get('420803245758480405')

				const first = embedData.slice(0, 24)
				const second = embedData.slice(24, 48)
				const third = embedData.slice(48, 72)
				const fourth = embedData.slice(72, 96)
				const botUser = await dsfServer.members.fetch(client.user.id)

				const embedMaker = (num, dates) => {
					return nEmbed(
						dates,
						'The last 31 days of stock for the Entrepreneurial wish: Travelling Merchant coupon.',
						Color.cream,
						null,
						client.user.displayAvatarURL()
					)
						.setFooter({
							text: `${botUser.nickname || client.user.username} created by Luke_#1838`,
							iconURL: client.user.displayAvatarURL()
						})
						.addFields(num)
				}

				const channelToPush = client.channels.cache.get(merchantWishes.channelID)
				const openMessage =
					'**Travelling Merchant Wishes**\n\nWith the release of the wishes that came out on Monday 24th May, we thought we would compile the last 31 days of stock for you so you are able to see which items and on which days the different stock was available. Please note that you will only be able to purchase the stock if you had not already purchased it on that specific day.'

				const firstDate = `${dataArr[0][0]} - ${dataArr[21][0]}`
				const secondDate = `${dataArr[24][0]} - ${dataArr[45][0]}`
				const thirdDate = `${dataArr[48][0]} - ${dataArr[69][0]}`
				const fourthDate = `${dataArr[72][0]} - ${dataArr[90][0]}`

				const firstEmbed = embedMaker(first, `Dates: ${firstDate}`)
				const secondEmbed = embedMaker(second, `Dates: ${secondDate}`)
				const thirdEmbed = embedMaker(third, `Dates: ${thirdDate}`)
				const fourthEmbed = embedMaker(fourth, `Dates: ${fourthDate}`)

				if (message !== 'readyEvent') {
					message.delete()
					const opening = await channelToPush.send({ content: openMessage })
					const firstID = await channelToPush.send({ embeds: [firstEmbed] })
					const secondID = await channelToPush.send({ embeds: [secondEmbed] })
					const thirdID = await channelToPush.send({ embeds: [thirdEmbed] })
					const fourthID = await channelToPush.send({ embeds: [fourthEmbed] })

					const sendLinks = async (msgToEdit = opening) => {
						const msgCollection = await channelToPush.messages.fetch({ limit: 4 })
						const baseURL = `https://discord.com/channels/${channelToPush.guild.id}/${channelToPush.id}`
						const editFormat = msgCollection.map((item) => {
							const title = item.embeds[0].title.slice(7)
							return `- [${title}](${baseURL}/${item.id})`
						})
						const embed = new EmbedBuilder().setColor(Color.aqua).setDescription(editFormat.reverse().join('\n'))
						await msgToEdit.edit({ content: `${openMessage}\n\n`, embeds: [embed] })
						const after = await channelToPush.send({ content: '**Links**', embeds: [embed] })
						await db.collection.updateOne(
							{ _id: message.guild.id },
							{
								$set: {
									'merchantWishes.messages.links.opening': msgToEdit.id,
									'merchantWishes.messages.links.after': after.id
								}
							}
						)
					}
					sendLinks()

					db.collection.updateOne(
						{ _id: message.guild.id },
						{
							$set: {
								'merchantWishes.messages.first': firstID.id,
								'merchantWishes.messages.second': secondID.id,
								'merchantWishes.messages.third': thirdID.id,
								'merchantWishes.messages.fourth': fourthID.id
							}
						}
					)
				}

				const grabIDAndEdit = async () => {
					const postData = [
						{
							links: false,
							date: firstDate,
							messageID: merchantWishes.messages.first,
							embed: firstEmbed
						},
						{
							links: false,
							date: secondDate,
							messageID: merchantWishes.messages.second,
							embed: secondEmbed
						},
						{
							links: false,
							date: thirdDate,
							messageID: merchantWishes.messages.third,
							embed: thirdEmbed
						},
						{
							links: false,
							date: fourthDate,
							messageID: merchantWishes.messages.fourth,
							embed: fourthEmbed
						},
						{ links: true, messageID: merchantWishes.messages.links.opening },
						{ links: true, messageID: merchantWishes.messages.links.after }
					]
					const embedEditor = (info) => {
						const embed = new EmbedBuilder(info)
						return { embeds: [embed] }
					}
					const channel = client.channels.cache.get(merchantWishes.channelID)

					const editStockPosts = (dataArray, links = false) => {
						if (links) {
							const baseURL = `https://discord.com/channels/${channel.guild.id}/${channel.id}`
							const format = postData
								.filter((prop) => prop.links === false)
								.map((obj) => {
									return `- [${obj.date}](${baseURL}/${obj.messageID})`
								})
							const embed = new EmbedBuilder().setDescription(format.join('\n')).setColor(Color.aqua)
							return dataArray
								.filter((prop) => prop.links === true)
								.forEach(async (arrData) => {
									const msg = await channel.messages.fetch(arrData.messageID)
									await msg.edit({ embeds: [embed] })
								})
						} else {
							dataArray
								.filter((prop) => prop.links === false)
								.forEach(async (arrData) => {
									const msg = await channel.messages.fetch(arrData.messageID)
									await msg.edit(embedEditor(arrData.embed.data))
								})
						}
					}
					editStockPosts(postData)
					editStockPosts(postData, true)
				}
				grabIDAndEdit()
			}
		} catch (e) {
			channels.errors.send(e)
		}
	}
}
