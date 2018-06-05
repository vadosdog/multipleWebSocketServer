const EventEmitter = require('events').EventEmitter;
const WsClient = require('./WsClient');

class WsChannel extends EventEmitter {

	/**
	 *
	 * @param app
	 * @param {string} path
	 * @param {object} opts
	 * @param {WsAuth} opts.auth
	 */
	constructor(app, path, opts = {}) {
		super();
		this.app = app;
		this.path = path;
		this.clients = {};
		this.auth = opts.auth;
		this.opts = opts;
		const splitPath = path.split('/:');
		this.name = splitPath[0].replace(/^\//g, "").replace(/\/$/g, "");
		this.params = splitPath.slice(1);

		if (this.auth) {
			this.on('connection', this.auth.handleConnection)
		}

		app.ws(this.path, (ws, req) => this.addClient(ws, req));
	}

	/**
	 * Add client
	 * @param {WebSocket} ws
	 * @param {IncomingMessage} req
	 */
	addClient(ws, req) {
		const client = new WsClient(ws, req, this);
		this.clients[client.clientId] = client;
		this.emit('connection', client);

		client.on('message', msg => {
			this.emit('message', msg, client);
		}).on('close', () => {
			this._removeClient(client);
			this.emit('close', client);
			//TODO уничтожать объект клиента?
		}).on('auth', () => {
			this.emit('auth', client);
		});
	}

	/**
	 * Remove client
	 * @param {WsClient} client
	 * @private
	 */
	_removeClient(client) {
		delete this.clients[client.clientId];
	}

	/**
	 * Filter function like Array.prototype.filter().
	 *
	 * @callback filterFunction
	 * @param {WsClient} client
	 * @returns {boolean}
	 */
	/**
	 * The method applies filterFunction each client of all channels to push their to a single array
	 * @param {filterFunction} filterFunction - The function that handles filter like Array.prototype.filter(). Accepted WsClient, returns boolean
	 * @returns {WsClient[]}
	 */
	filterClients(filterFunction) {
		return this.getClients().filter(filterFunction);
	}

	/**
	 * Returns an array of clients, who listen to the relevant channel
	 * @param {string|string[]} params - params, which the client has connected
	 * @param {boolean} authOnly - filter only authorized clients
	 * @returns {WsClient[]}
	 */
	findClients(params, authOnly = false) {
		const findParams = Array.isArray(params) ? params : params.split('/');
		return this.getClients().filter(client => {
			let isIt = true;
			this.params.forEach((property, i) => {
				if (!findParams[i]) {
					return;
				}
				isIt = isIt && client.params[property] === findParams[i];
			});
			return isIt && (!authOnly || client.isAuthorized);
		})
	}

	/**
	 * @returns {WsClient[]}
	 */
	getClients() {
		return Object.values(this.clients);
	}

	/**
	 * Returns an array of only authorized clients
	 * @returns {WsClient[]}
	 */
	getAuthorizedClients() {
		return this.filterClients(client => client.isAuthorized)
	}

	/**
	 * Close all channel connections
	 */
	close() {
		this.getClients().forEach(client => {
			client.close();
		});
	}

}

module.exports = WsChannel;
