import { createLogger, transports, format } from 'winston'
const { combine, timestamp, printf, colorize } = format

// eslint-disable-next-line new-cap
export const logger = new createLogger({
	transports: [new transports.Console(), new transports.File({ filename: 'combined.log', level: 'debug' })],
	format: combine(
		timestamp({ format: 'YYYY-MM-DD HH:mm:ssa' }),
		printf(({ level, message, timestamp }) => {
			return `${timestamp} [${level.toUpperCase()}]: ${message}`
		}),
		colorize()
	)
})
