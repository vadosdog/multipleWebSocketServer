const WsMultiChannel = require('./index.js');
const fs = require('fs');
const TokenAuth = require('./TokenAuth');
const JWT = require('jsonwebtoken');
const wsConfig = {
	ssl: false,
	ssl_key: false,
	ssl_cert: false,
	authDelay: 10000,
	port: 8888
};

const multiChannelConfig = wsConfig.ssl ? {
	ssl: wsConfig.ssl,
	serverOpts: {
		key: wsConfig.ssl && fs.readFileSync(wsConfig.ssl_key),
		cert: wsConfig.ssl && fs.readFileSync(wsConfig.ssl_cert)
	}
} : {};
const wsMultiChannel = new WsMultiChannel(multiChannelConfig);

wsMultiChannel.addChannel('/mobile/', {
	auth: new TokenAuth(wsConfig.authDelay, () => ({
		url: 'localhost:7771',
		formData: {
			module: 'jwt',
			method: 'check'
		}
	}))
}).on('auth', client => {
	if (client.isAuthorized) {
		const decode = JWT.decode(client.authPayload);
		client.userId = decode.user_id;
	}
});

wsMultiChannel.addChannel('/systems/:system_name', {
	auth: new TokenAuth(wsConfig.authDelay, (payload) => ({
		url: payload.iss + '/api/',
		formData: {
			module: 'users',
			method: 'get'
		}
	}))
}).on('auth', client => {
	if (client.isAuthorized) {
		const decode = JWT.decode(client.authPayload);
		if (decode.system_name !== client.params.system_name) {
			client.close();
		}
		client.userId = decode.user_id;
	}
});

wsMultiChannel.listen(wsConfig.port);


function log() {
	console.log('connected: ', wsMultiChannel.getClients().length);
	console.log('authorized: ', wsMultiChannel.getAuthorizedClients().length);
	console.log('systems all: ', wsMultiChannel.getChannelClients('systems').length);
	console.log('systems auth: ', wsMultiChannel.getChannelClients('systems', true).length);
	console.log('mobile all: ', wsMultiChannel.getChannelClients('mobile').length);
	console.log('mobile auth: ', wsMultiChannel.getChannelClients('mobile', true).length);
	console.log('bristol all: ', wsMultiChannel.getChannelClients('systems/ls2_bristol').length);
	console.log('bristol auth: ', wsMultiChannel.getChannelClients('systems/ls2_bristol', true).length);
	console.log('---------------------------------');
}

wsMultiChannel
	.on('connection', () => {
		console.log('new connection');
		log();
		wsMultiChannel.getAuthorizedClients().forEach(client => client.send('hi'))
	})
	.on('close', () => {
		console.log('close connection');
		log();
	})
	.on('auth', () => {
		console.log('auth');
		log();
	});
