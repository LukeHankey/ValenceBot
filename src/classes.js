/* eslint-disable no-async-promise-executor */
import { EmbedBuilder } from 'discord.js'
import Color from './colors.js'
import { nEmbed, paginate, paginateFollowUP } from './functions.js'
import ms from 'pretty-ms'

class Permissions {
	constructor(name, db, msg) {
		this.name = name
		this.db = db
		this.msg = msg
		this._role = this.msg.guild.roles.cache.find((role) => role.id === this.roleId)
		this._position = this.msg.guild.roles.cache.filter((roles) => {
			return roles.rawPosition >= this._role?.rawPosition
		})
	}

	// eslint-disable-next-line getter-return
	get roleId() {
		if (this.db?.roles[this.name]) {
			return this.db?.roles[this.name].match(/\d{18,19}/)[0]
		}
	}

	memberRole() {
		// abovePermModArray
		const memberRoleArray = []
		this._position
			.map((role) => role.id)
			.forEach((id) => {
				if (this.msg.member.roles.cache.has(id)) return memberRoleArray.push(id)
			})
		return memberRoleArray
	}

	higherRoles() {
		// availPermMod
		const higherRoleArray = []
		this._position
			.map((role) => role.id)
			.forEach((id) => {
				if (!this.msg.member.roles.cache.has(id)) return higherRoleArray.push(id)
			})
		return higherRoleArray.map((id) => `<@&${id}>`)
	}

	modPlusRoles(num = 0) {
		const aboveMod = []
		this.memberRole().forEach((id) => {
			const abovePermRawMod = this.msg.guild.roles.cache.find((role) => role.id === id)
			const aboveRpMod = abovePermRawMod.rawPosition + ''
			aboveRpMod.split().forEach((rp) => {
				aboveMod.push(rp)
			})
		})
		return aboveMod[num]
	}

	get owner() {
		const id = '212668377586597888'
		return id
	}

	botOwner() {
		return this.msg.member.id === this.owner
	}

	botUser() {
		return this.msg.member.id === '668330399033851924'
	}

	ownerError() {
		const embed = nEmbed('Permission Denied', 'You do not have permission to use this command!', Color.redDark).addFields({
			name: 'Only the bot owner can:',
			value: `<@!${this.owner}>`
		})
		return { embeds: [embed] }
	}

	error() {
		const embed = nEmbed('Permission Denied', 'You do not have permission to use this command!', Color.redDark).addFields(
			{
				name: 'Only the following Roles & Users can:',
				value: `${this.higherRoles().length > 0 ? this.higherRoles().join(', ') : '0'}`,
				inline: true
			},
			{ name: '\u200b', value: `<@${this.msg.guild.ownerId}>`, inline: true }
		)
		return { embeds: [embed] }
	}
}
class ScouterCheck {
	constructor(roleName, value) {
		this.month = 1000 * 60 * 60 * 24 * 31
		this.week = 1000 * 60 * 60 * 24 * 7
		this.roleName = roleName
		this.value = value
	}

	set _client(c) {
		this.client = c
	}

	set _db(db) {
		this.db = db
	}

	set _guildName(name) {
		this.guild_name = name
	}

	set _scouters(scouts) {
		this.scouts = scouts
	}

	get _scouters() {
		return this.scouts
	}

	get _client() {
		return this.client
	}

	get _db() {
		return this.db
	}

	get _guildName() {
		return this.guild_name
	}

	get guildID() {
		return this._client.guilds.cache.mapValues((x) => {
			if (x.name === this._guildName) return x.id
		})
	}

	get guild() {
		return this._client.guilds.fetch(this.guildID.filter((g) => g).first())
	}

	get potentialScouts() {
		const roleId = this._db?.roles?.[this.roleName]?.match(/\d{18,19}/)?.[0]
		let scout
		if (this.roleName.toLowerCase() === 'scouter') {
			scout = this._scouters.filter((val) => {
				return this._checkScouts(val, this.value ?? 100, this.week) || val.assigned?.includes(roleId)
			})
		} else if (this.roleName.toLowerCase() === 'verified scouter') {
			scout = this._scouters.filter((val) => {
				return this._checkVerifiedScouts(val, this.value ?? 250, this.month) || val.assigned?.includes(roleId)
			})
		} else {
			// If another role
			return undefined
		}
		return scout
	}

	get role() {
		return new Promise(async (resolve) => {
			const guild = await this.guild
			return resolve(guild.roles.cache.find((r) => r.name.toLowerCase() === this.roleName.toLowerCase())) // Find the guild and then find the role
		})
	}

	_checkScouts(filter, num, time) {
		const totalCount =
			(filter.count ?? 0) +
			(filter.otherCount ?? 0) +
			(filter.alt1?.merchantCount ?? 0) +
			(filter.alt1First?.merchantCount ?? 0) +
			(filter.alt1?.otherCount ?? 0) +
			(filter.alt1First?.otherCount ?? 0)

		if (totalCount >= num && filter.lastTimestamp - filter.firstTimestamp >= time && filter.assigned.length === 0) {
			return filter
		}
	}

	_checkVerifiedScouts(filter, num, time) {
		const totalCount =
			(filter.count ?? 0) +
			(filter.otherCount ?? 0) +
			(filter.alt1?.merchantCount ?? 0) +
			(filter.alt1First?.merchantCount ?? 0) +
			(filter.alt1?.otherCount ?? 0) +
			(filter.alt1First?.otherCount ?? 0)

		if (totalCount >= num) {
			if (filter.lastTimestamp - filter.firstTimestamp >= time) {
				if (filter.assigned.length > 0 && filter.assigned.length < 2) {
					return filter
				} else if (filter.assigned.length >= 2) {
					return undefined
				}
			}
		}
	}

	async _checkForScouts() {
		const scouts = await this.potentialScouts
		const fields = []

		for (const values of scouts) {
			fields.push({
				name: `${values.author}`,
				value: `ID: ${values.userID}\nMerch Count: ${values?.count ?? 0}\nAlt1 Merch Count: ${
					(values.alt1?.merchantCount ?? 0) + (values.alt1First?.merchantCount ?? 0)
				}\nOther Count: ${values?.otherCount ?? 0}\nAlt1 Other Count: ${
					(values.alt1?.otherCount ?? 0) + (values.alt1First?.otherCount ?? 0)
				}\nActive for: ${ms((values.lastTimestamp ?? 0) - (values.firstTimestamp ?? 0))}`,
				inline: true
			})
		}
		return fields
	}

	async send(chan = this._db.channels.adminChannel, message = null) {
		const role = await this.role

		const fields = await this._checkForScouts()

		const sendChannel = this._client.channels.cache.get(chan)
		if (fields.length) {
			const buildEmbed = (pageFields, pageNumber = 1, totalPages = 1) =>
				new EmbedBuilder()
					.setTitle(`Potential Scouters - ${this.roleName}`)
					.setDescription(`List of members who have met the minimum to obtain the <@&${role.id}> role.`)
					.setColor(Color.orange)
					.setFooter({
						text: `Page ${pageNumber} of ${totalPages} - Review these members and manually assign the role to them.`,
						iconURL: this._client.user.displayAvatarURL()
					})
					.setTimestamp()
					.addFields(pageFields)

			if (fields.length > 24 && message) {
				const embeds = paginate(fields, message, this.roleName)
				const sentMessage = await sendChannel.send({
					embeds: [
						embeds[0].setFooter({
							text: `Page 1 of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`,
							iconURL: this._client.user.displayAvatarURL()
						})
					]
				})
				await paginateFollowUP(sentMessage, message, 0, embeds, this._client)
				return sentMessage
			}

			if (fields.length > 24) {
				const pagedEmbeds = paginate(
					fields,
					{ author: { displayAvatarURL: () => this._client.user.displayAvatarURL() } },
					this.roleName
				)
				const sendGroups = []
				for (let i = 0; i < pagedEmbeds.length; i += 10) {
					sendGroups.push(pagedEmbeds.slice(i, i + 10))
				}

				let lastMessage = null
				for (let i = 0; i < sendGroups.length; i += 1) {
					const group = sendGroups[i]
					const pageOffset = i * 10
					const embedsToSend = group.map((pageEmbed, index) =>
						buildEmbed(pageEmbed.data.fields, pageOffset + index + 1, pagedEmbeds.length)
					)
					lastMessage = await sendChannel.send({ embeds: embedsToSend })
				}
				return lastMessage
			}

			return sendChannel.send({
				embeds: [buildEmbed(fields)]
			})
		} else {
			return sendChannel.send({ content: `No ${this.roleName} found.` })
		}
	}

	async checkRolesAdded() {
		const guild = await this.guild
		const scouts = await this.potentialScouts
		const role = await this.role

		return new Promise(async (resolve) => {
			const userID = scouts.map((doc) => doc.userID)
			const memberFetch = await guild.members.fetch({ user: userID })
			const membersArray = []
			memberFetch.forEach((mem) => {
				if (mem.roles.cache.has(role.id)) {
					membersArray.push(mem)
				}
			})
			return resolve(membersArray)
		})
	}

	async checkRolesRemoved() {
		const guild = await this.guild
		const role = await this.role

		return new Promise(async (resolve) => {
			const userID = await this._scouters.map((doc) => doc.userID)
			const memberFetch = await guild.members.fetch({ user: userID })
			const membersArray = []
			memberFetch.forEach((mem) => {
				if (!mem.roles.cache.has(role.id)) {
					membersArray.push(mem)
				}
			})
			return resolve(membersArray)
		})
	}
}
class GoogleSheet {
	constructor(gsapi, { spreadsheetId, ranges, valueInputOption = 'USER_ENTERED', resource = {} }) {
		this.gsapi = gsapi
		this.spreadsheetId = spreadsheetId
		this.ranges = ranges
		this.valueInputOption = valueInputOption
		this.resource = resource
		this.readRequest = { spreadsheetId, ranges }
		this.fullData = this._getData()
	}

	async _getData() {
		const data = await this.gsapi.spreadsheets.values.batchGet(this.readRequest)
		return data.data
	}

	async data(range = null) {
		const full = await this.fullData
		if (!range) {
			return full
		} else {
			const ranges = ['Friends', 'Boosters', 'Affiliates', 'Ranks', 'Banned']
			if (!ranges.includes(range)) {
				throw new Error(`Invalid range name '${range}'. Must be one of: ${ranges.join(', ')}`)
			}
			const rangeNames = await full.valueRanges.filter((sheet) => {
				const name = sheet.range.split('!')
				if (range.toLowerCase() === name[0].toLowerCase()) return sheet
				else return undefined
			})
			if (rangeNames.length) {
				return rangeNames[0]
			}
		}
	}
}

export { Permissions, ScouterCheck, GoogleSheet }
