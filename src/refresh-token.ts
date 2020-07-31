/* eslint-disable no-console */
import { requestInput } from './cli-util';

import axios from 'axios';
import querystring from 'querystring';

const ecobeeAPIKey = 'LvHbdQIXI5zoGoZW2uyWk2Ejfb1vtQWq';

export async function acquireRefreshToken() {
	const pinRequest = await axios.get('https://api.ecobee.com/authorize', { params: { response_type: 'ecobeePin', client_id: ecobeeAPIKey, scope: 'smartWrite' } });
	const pinData = pinRequest.data;

	const pin = pinData.ecobeePin;
	const code = pinData.code;
	const pollInterval = pinData.interval;

	// Tell user their PIN and give instructions
	console.log(`\nYour Ecobee PIN: ${pin}`);
	console.log('\nNavigate to http://www.ecobee.com and log in to the web interface, login to the web portal and click on the \'My Apps\' tab. This will bring you to a page where you can add an application by authorizing your Ecobee PIN. To do this, paste your Ecobee PIN and click \'Validate\'. The next screen will display any permissions the app requires and will ask you to click \'Authorize\' to add the application.\n');
	console.log('Waiting for response from Ecobee API. This may take a minute or two...');

	// Loop the auth API until we get a result, this will re-schedule itself and will resolve when we have an actual result
	const tokenData = await checkForTokenResult(code, pollInterval);

	return tokenData;
}

async function checkForTokenResult(authCode: string, interval: number) {
	const keepTrying = true;
	while (keepTrying) {
		try {
			const authRequest = await axios.post('https://api.ecobee.com/token', querystring.stringify({
				grant_type: 'ecobeePin',
				code: authCode,
				client_id: ecobeeAPIKey,
			}));
			const authData = authRequest.data;

			// Successful auth
			const accessToken = authData.access_token;
			const refreshToken = authData.refresh_token;

			return { accessToken: accessToken, refreshToken: refreshToken };
		} catch (error) {
			if (!error.isAxiosError) {
				// Can't get out of this one
				throw error;
			}
			// Check error info, likely waiting for user or expired
			const errorData = error.response.data;
			if (errorData.error === 'authorization_pending') {
				// Wait duration and try again
				await new Promise(resolve => setTimeout(resolve, (interval + 1) * 1000));
				console.log('...');
			} else if (errorData.error === 'authorization_expired') {
				// No longer valid. End and tell the user to start again
				console.log('Ecobee PIN expired. Please start over if you would like to proceed.');
				throw 'Ecobee PIN expired. Please start over if you would like to proceed.';
			} else {
				console.log('Unknown error: ' + errorData.error);
				throw 'Unknown error';
			}
		}
	}
}

export async function logRefreshToken() {
	console.log('This CLI will provide you with a refresh token which you can use to configure homebridge-ecobee-away.');

	const token = await acquireRefreshToken();

	console.log('\nSuccessfully logged in to Ecobee. Please add the following to your config:\n');
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	console.log(`"refreshToken": "${token.refreshToken}"`);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
process.on('unhandledRejection', () => {});
