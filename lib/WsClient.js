const EventEmitter = require('events').EventEmitter;

class WsClient extends EventEmitter {
	/**
	 *
	 * @param {WebSocket} ws
	 * @param {IncomingMessage} req
	 * @param {WsChannel} channel
	 */
	constructor(ws, req, channel) {
		super();
		this.ws = ws;
		this.req = req;
		this.params = req.params;
		this.clientId = ws._socket._handle.fd;
		this.channel = channel;

		ws.on('message', async (msg) => {
			try {
				msg = JSON.parse(msg);
			} catch (error) {
				this.close();
				return;
			}
			this.emit('message', msg);
		});

		ws.on('close', () => {
			//TODO уничтожать объекст клиента?
			this.emit('close');
		});
	}

	/**
	 * Send data to client
	 * @param data
	 */
	send(data) {
		//TODO ??
		this.ws.send(JSON.stringify(data))
	}

	/**
	 * Close connection
	 */
	close() {
		this.ws.close();
	}
}

module.exports = WsClient;
