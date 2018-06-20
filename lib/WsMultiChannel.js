const EventEmitter = require('events').EventEmitter;
const express = require('express');
const app = express();
const https = require('https');
const http = require('http');
const expressWs = require('express-ws');
const WsChannel = require('./WsChannel');

class WsMultiChannel extends EventEmitter {

	/**
	 *
	 * @param {Object} opts
	 * @param {boolean} opts.https
	 * @param {Object} opts.serverOpts
	 * @returns {WsMultiChannel}
	 */
	constructor(opts = {}) {
		super();
		this.channels = {};
		this.opts = opts;
		this.server = this.opts.ssl ? https.createServer(this.opts.serverOpts, app) : http.createServer(app);

		expressWs(app, this.server);

		return this;
	}

	/**
	 * Create new channel
	 * @param {string} path - the path is passed without change to the WsChannel constructor
	 * @param {object} opts - the option is passed without change to the WsChannel constructor
	 * @returns {WsChannel}
	 */
	addChannel(path, opts) {
		const channel = new WsChannel(app, path, opts);
		this.channels[channel.name] = channel;
		channel.on('connection', client => this.emit('connection', client, channel))
			.on('message', client => this.emit('message', client, channel))
			.on('close', client => this.emit('close', client, channel))
			.on('auth', client => this.emit('auth', client, channel))
			.on('error', client => this.emit('error', client, channel));
		return this.channels[channel.name];
	}

	/**
	 * Destroy channel
	 * @param {string} name - channel name
	 * @returns {boolean}
	 */
	closeChannel(name) {
		if (this.channels[name]) {
			this.channels[name].close();
			delete this.channels[name];
		}
		return true;
	}

	/**
	 * Run ws server
	 * @param {number} port
	 * @returns {WsMultiChannel}
	 */
	listen(port) {
		this.server.listen(port);
		return this;
	}

	/**
	 * The function filtered channel clients
	 *
	 * @callback reduceFunction
	 * @param {WsChannel} channel
	 * @returns {WsClient[]}
	 */
	/**
	 * The method applies reduceFunction each channel to push their to a single array
	 * @param {reduceFunction} reduceFunction
	 * @returns {WsClient[]}
	 * @private
	 */
	_reduceChannels(reduceFunction) {
		return Object.values(this.channels).reduce((acc, channel) => {
			acc.push(...reduceFunction(channel));
			return acc;
		}, []);
	}

	/**
	 * Returns an array of all clients
	 * @returns {WsClient[]}
	 */
	getClients() {
		return this._reduceChannels(channel => Object.values(channel.clients));
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
		return this._reduceChannels(channel => channel.filterClients(filterFunction));
	}

	/**
	 * Returns an array of only authorized clients of all channels
	 * @returns {WsClient[]}
	 */
	getAuthorizedClients() {
		return this.filterClients(client => client.isAuthorized)
	}

	/**
	 * Returns an array of clients, who listen to the relevant channel
	 * @param {string} channelName - channel name or path, which the client has connected
	 * @param {boolean} authOnly - filter only authorized clients
	 * @returns {WsClient[]}
	 */
	getChannelClients(channelName, authOnly = false) {
		const findParams = channelName.replace(/^\//g, "").replace(/\/$/g, "").split('/');
		const channel = this.channels[findParams[0]];
		if (!channel) {
			return [];
		}
		return channel.findClients(findParams.slice(1), authOnly)
	}
}

module.exports = WsMultiChannel;
