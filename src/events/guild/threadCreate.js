export default async (_, thread) => {
	// Just join all threads
	await thread.join()
}
