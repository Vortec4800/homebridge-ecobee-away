import { EcobeeAPIPlatform } from './platform';

import moment from 'moment';
import axios from 'axios';
import querystring from 'querystring';
import { updateHomebridgeConfig } from './config';

export class AuthTokenManager {
	private static instance: AuthTokenManager;

	constructor(private readonly platform: EcobeeAPIPlatform) {
		this.refreshToken = platform.config.refreshToken;
	}

	static configureForPlatform(homebridge: EcobeeAPIPlatform) {
		if (!AuthTokenManager.instance) {
			AuthTokenManager.instance = new AuthTokenManager(homebridge);
		}
	}

	static getInstance(): AuthTokenManager {
		return AuthTokenManager.instance;
	}

	public authToken = '';
	private refreshToken = '';
	private expiration = moment();

	private ecobeeAPIKey = 'LvHbdQIXI5zoGoZW2uyWk2Ejfb1vtQWq';

	isExpired() {
		const now = moment();
		return this.authToken === '' || this.expiration.isBefore(now);
	}

	async renewAuthToken() {
		if(this.refreshToken === ''){
			this.platform.log.error('Error: No refresh token in config file');
			throw 'Error: No refresh token in config file';
		}
		try {
			const oldRefreshToken = this.refreshToken;
			this.platform.log.info('Renewing auth token');
			this.platform.log.debug('Old refresh token: ' + oldRefreshToken);
			const authRequest = await axios.post('https://api.ecobee.com/token', querystring.stringify({
				grant_type: 'refresh_token',
				code: oldRefreshToken,
				client_id: this.ecobeeAPIKey,
			}));
			const authData = authRequest.data;

			const loadedAuthToken = authData.access_token;
			const loadedExpiresIn = authData.expires_in;

			// In the event we get an invalid response, keep the old refresh token
			const loadedUpdatedRefreshToken = authData.refresh_token ?? oldRefreshToken;

			this.authToken = loadedAuthToken;
			this.refreshToken = loadedUpdatedRefreshToken;
			this.expiration = moment().add(loadedExpiresIn, 'seconds');

			//console.log(`Updated auth token ${loadedAuthToken} with expiration ${this.expiration}`);

			updateHomebridgeConfig(this.platform.api, (currentConfig) => {
				return currentConfig.replace(oldRefreshToken, loadedUpdatedRefreshToken);
			});

			this.platform.log.debug('Updating refresh token to ' + loadedUpdatedRefreshToken);

			return loadedAuthToken;
		} catch(error){
			this.platform.log.error(`Error refreshing token: ${JSON.stringify(error)}`);
		}
	}
}
