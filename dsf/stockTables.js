const updateStockTables = async (client, settings) => {
	const commandCollection = client.commands.filter(cmd => cmd.name === 'wish' || cmd.name === 'future')
	const commands = commandCollection.first(2)
	const { merchantWishes: { range }, futureStock } = await settings.findOne({ _id: '420803245758480405' }, { projection: { 'merchantWishes.range': 1, futureStock: 1 } })

	const increaseRange = (oldRange) => {
		const split = oldRange.split(':')
		const newNum = split.map(val => {
			const valueStr = val.slice(1)
			return Number(valueStr) + 1
		})
		return `A${newNum[0]}:E${newNum[1]}`
	}

	console.log('Running reset tasks.', `old wish range: ${range}`, `new wish range: ${increaseRange(range)}`, `old future range: ${futureStock.range}`, `new future range: ${increaseRange(futureStock.range)}`)
	await settings.updateOne({ _id: '420803245758480405' }, {
		$set: {
			'merchantWishes.range': increaseRange(range)
		}
	})
	await settings.updateOne({ _id: '420803245758480405' }, {
		$set: {
			'futureStock.range': increaseRange(futureStock.range)
		}
	})
	// Future
	await commands[0].run(client, 'readyEvent')
	// Wish
	await commands[1].run(client, 'readyEvent')
}

export default updateStockTables
