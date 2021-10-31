/* eslint-disable no-inner-declarations */
/* eslint-disable no-inline-comments */
import { cream, aqua } from '../../colors.js'
import gsheet from '../../gsheets.js'
import { google } from 'googleapis'
import { nEmbed } from '../../functions.js'
import { MessageEmbed } from 'discord.js'
import { getDb } from '../../mongodb.js'

export default {
	name: 'future',
	description: ['Posts the embed and populates with future stock data.'],
	aliases: [],
	usage: [''],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, channels) => {
		if (message !== 'readyEvent') {
			if (!perms.owner) return message.channel.send(perms.errorO)
		}
		const db = getDb()
		const settings = db.collection('Settings')
		const { futureStock } = await settings.findOne({ _id: '420803245758480405' })
		const splitIntoX = (arr, x) => {
			arr = arr.flat()
			return new Array(Math.ceil(arr.length / x))
				.fill()
				.map(() => arr.splice(0, x))
		}

		try {
			gsheet.googleClient.authorize(err => {
				if (err) console.error(err)
				googleSheets(gsheet.googleClient)
			})

			const rangeName = 'TM Coupon'

			async function googleSheets (gClient) {
				const gsapi = google.sheets({ version: 'v4', auth: gClient })
				const opt = { // READ ONLY OPTIONS
					spreadsheetId: '1c1LBKEYKE3N3lgYLByQo4MZRp2FqMEPHMGxuS7Ozxvw',
					range: `${rangeName}!${futureStock.range}`
				}

				const embedData = []
				const data = await gsapi.spreadsheets.values.get(opt)
				let dataArr = data.data.values

				dataArr.flatMap(innerArr => {
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
					return nEmbed(dates, 'The next 30 days of stock for the Travelling Merchant.', cream, '', client.user.displayAvatarURL())
						.setFooter(`${botUser.nickname || client.user.username} created by Luke_#8346`, client.user.displayAvatarURL())
						.addFields(num)
				}

				const futureChannel = client.channels.cache.get(futureStock.channelID)
				const openMessage = '**Travelling Merchant Future Stock**\n\n'

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
					const opening = await futureChannel.send({ content: openMessage })
					const firstID = await futureChannel.send({ embeds: [firstEmbed] })
					const secondID = await futureChannel.send({ embeds: [secondEmbed] })
					const thirdID = await futureChannel.send({ embeds: [thirdEmbed] })
					const fourthID = await futureChannel.send({ embeds: [fourthEmbed] })

					const sendLinks = async (msgToEdit = opening) => {
						const msgCollection = await futureChannel.messages.fetch({ limit: 4 })
						const baseURL = `https://discord.com/channels/${futureChannel.guild.id}/${futureChannel.id}`
						const editFormat = msgCollection.map(item => {
							const title = item.embeds[0].title.slice(7)
							return `- [${title}](${baseURL}/${item.id})`
						})
						const embed = new MessageEmbed()
							.setColor(aqua)
							.setDescription(editFormat.reverse().join('\n'))
						await msgToEdit.edit({ content: `${openMessage}\n\n`, embeds: [embed] })
						const after = await futureChannel.send({ content: '**Links**', embeds: [embed] })
						await settings.updateOne({ _id: message.channel.guild.id }, {
							$set: {
								'futureStock.messages.links.opening': msgToEdit.id,
								'futureStock.messages.links.after': after.id
							}
						})
					}
					sendLinks()

					settings.updateOne({ _id: message.channel.guild.id }, {
						$set: {
							'futureStock.messages.first': firstID.id,
							'futureStock.messages.second': secondID.id,
							'futureStock.messages.third': thirdID.id,
							'futureStock.messages.fourth': fourthID.id
						}
					})
				} else {
					const grabIDAndEdit = async () => {
						const postData = [
							{ links: false, date: firstDate, messageID: futureStock.messages.first, embed: firstEmbed },
							{ links: false, date: secondDate, messageID: futureStock.messages.second, embed: secondEmbed },
							{ links: false, date: thirdDate, messageID: futureStock.messages.third, embed: thirdEmbed },
							{ links: false, date: fourthDate, messageID: futureStock.messages.fourth, embed: fourthEmbed },
							{ links: true, messageID: futureStock.messages.links.opening },
							{ links: true, messageID: futureStock.messages.links.after }
						]
						const embedEditor = (info) => {
							const embed = new MessageEmbed(info)
							return embed
						}

						const editStockPosts = (dataArray, links = false) => {
							if (links) {
								const baseURL = `https://discord.com/channels/${futureChannel.guild.id}/${futureChannel.id}`
								const format = dataArray.filter(prop => prop.links === false).map(obj => {
									return `- [${obj.date}](${baseURL}/${obj.messageID})`
								})
								const embed = new MessageEmbed().setDescription(format.join('\n')).setColor(aqua)
								return dataArray.filter(prop => prop.links === true).forEach(async arrData => {
									const msg = await futureChannel.messages.fetch(arrData.messageID)
									await msg.edit({ embeds: [embed] })
								})
							} else {
								dataArray.filter(prop => prop.links === false).forEach(async arrData => {
									const msg = await futureChannel.messages.fetch(arrData.messageID)
									await msg.edit({ embeds: [embedEditor(arrData.embed)] })
								})
							}
						}
						editStockPosts(postData)
						editStockPosts(postData, true)
					}
					grabIDAndEdit()
				}
			}
		} catch (err) {
			channels.errors.send(err)
		}
	}
}
