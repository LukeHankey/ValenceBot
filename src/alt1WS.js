import { overrideEventTimer } from './dsf/calls/eventTimers.js'
import { v4 as uuid } from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

class WebSocketClient {
	socket = null
	url
	sessionID

	constructor(url) {
		url = `${url}&discord_id=${this.discordID}`
		this.url = url
		this.sessionID = uuid()
	}

	get discordID() {
		return process.env.NODE_ENV === 'DEV' ? process.env.DEV_BOT_ID : process.env.BOT_ID
	}

	connect() {
		/* eslint-disable no-undef */
		this.socket = new WebSocket(this.url)

		this.socket.onopen = async () => {
			console.log('✅ Connected to WebSocket!')
		}

		this.socket.onmessage = async (event) => {
			await this.handleMessage(event.data)
		}

		this.socket.onerror = (error) => {
			console.error('❌ WebSocket Error:', error)
		}

		this.socket.onclose = (event) => {
			console.log(`❌ WebSocket Disconnected (code: ${event.code}, reason: ${event.reason})`)
			this.reconnect()
		}
	}

	async handleMessage(data) {
		try {
			const parsedData = JSON.parse(data)
			// Ensure we only get the event records
			if (!('type' in parsedData)) return

			// Ensure we get only the editEvents and only events where mistyUpdate is true
			if (parsedData.type !== 'editEvent' || !parsedData.mistyUpdate) return
			console.log('📨 Received:', parsedData)

			await overrideEventTimer(parsedData.id, Math.max(parsedData.duration * 1000, 0), parsedData.mistyUpdate)
		} catch (error) {
			console.error('⚠️ Failed to parse WebSocket message:', error)
		}
	}

	reconnect() {
		console.log('🔄 Reconnecting WebSocket in 5 seconds...')
		this.url = this.url.replace(/discord_id=[^&\s]*/, `discord_id=${this.discordID}`)
		setTimeout(() => this.connect(), 5000)
	}
}

export const wsClient = new WebSocketClient(
	process.env.NODE_ENV === 'DEV' ? 'ws://localhost:8000/ws?room=development' : 'wss://ws.dsfeventtracker.com/ws?room=production'
)
