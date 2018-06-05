const JWT = require('jsonwebtoken');
const WsAuth = require('./WsAuth');
const request = require('request-promise');

class TokenAuth extends WsAuth {
	/**
	 *
	 * @param {number} authDelay - The time, in milliseconds (thousandths of a second),
	 *      the timer should wait before the connection is closed.
	 * @param {getRequestParams} getRequestParams - extend local method getRequestParams
	 */
	constructor(authDelay, getRequestParams) {
		super(authDelay);
		this.getRequestParams = getRequestParams;
	}

	/**
	 * Verify auth
	 * @param payload
	 * @param client
	 * @returns {boolean}
	 */
	async check(payload, client) {
		this.payload = payload;
		let jwtDecode = {};

		try {
			jwtDecode = JWT.decode(payload);
		} catch (error) {
			return false;
		}

		if (!jwtDecode) {
			return false;
		}

		const response = await request(Object.assign({
			method: 'POST',
			auth: {
				'bearer': payload
			}
		}, this.getRequestParams(jwtDecode)));
		try {
			if (JSON.parse(response).error) {
				return false;
			}
		} catch (error) {
			return false;
		}
		return true;
	}

	/**
	 * @callback getRequestParams
	 * @param payload
	 * @returns {{uri: string, ?formData: *}}
	 */
	getRequestParams(payload) {
		return {
			uri: 'localhost',
			formData: {}
		};
	}
}

module.exports = TokenAuth;
