import moment from 'moment';
import _ from 'underscore';
import axios from 'axios';
import querystring from 'querystring';
import { updateHomebridgeConfig } from './config';

export class AuthTokenManager {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	constructor() {
	}

	public static authToken = '';
	private static expiration = moment();

	private static ecobeeAPIKey = 'LvHbdQIXI5zoGoZW2uyWk2Ejfb1vtQWq';

	static isExpired() {
		const now = moment();
		return this.authToken === '' || this.expiration.isBefore(now);
	}

	static async renewAuthToken(refreshToken: string, homebridge: any) {
		try {
			console.log('renewing auth token');
			const authRequest = await axios.post('https://api.ecobee.com/token', querystring.stringify({
				grant_type: 'refresh_token',
				code: refreshToken,
				client_id: this.ecobeeAPIKey,
			}));
			const authData = authRequest.data;

			const loadedAuthToken = authData.access_token;
			const loadedExpiresIn = authData.expires_in;
			const loadedUpdatedRefreshToken = authData.refresh_token;

			this.authToken = loadedAuthToken;
			this.expiration = moment().add(loadedExpiresIn, 'seconds');

			//console.log(`Updated auth token ${loadedAuthToken} with expiration ${this.expiration}`);

			updateHomebridgeConfig(homebridge, (currentConfig) => {
				return currentConfig.replace(refreshToken, loadedUpdatedRefreshToken);
			});

			return { authToken: loadedAuthToken, expiresIn: loadedExpiresIn, refreshToken: loadedUpdatedRefreshToken };
		} catch(error){
			console.error(`Error refreshing token: ${JSON.stringify(error.response.data)}`);
		}
	}
}
