class WsAuth {
	/**
	 * @param {number} authDelay - The time, in milliseconds (thousandths of a second),
	 *      the timer should wait before the connection is closed.
	 */
	constructor(authDelay) {
		this.authDelay = authDelay
	}

	/**
	 * Verify auth
	 * @param payload
	 * @param client
	 * @returns {boolean}
	 */
	check(payload, client) {
		return true;
	}

	/**
	 * Extend client object
	 * @param {WsClient} client
	 */
	handleConnection(client) {
		const auth = client.channel.auth;
		if (auth.authDelay) {
			client.timer = setTimeout(() => {
				client.close();
			}, auth.authDelay);
		}
		client.isAuthorized = false;


		client.on('message', async (msg) => {
			if (msg.type === 'auth') {
				client.authPayload = msg.payload;
				client.isAuthorized = await auth.check(client.authPayload, client);
				client.emit('auth');
			}
			if (client.isAuthorized) {
				clearTimeout(client.timer);
			}
		});

		client.on('close', () => {
			client.isAuthorized = false;
			clearTimeout(client.timer);
		})
	}
}

module.exports = WsAuth;
