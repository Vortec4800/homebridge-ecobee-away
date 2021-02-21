import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import axios from 'axios';

import { EcobeeAPIPlatform } from './platform';

import { AuthTokenManager } from './auth-token-refresh';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AwaySwitchAccessory {
	private service: Service;

	constructor(
		private readonly platform: EcobeeAPIPlatform,
		private readonly accessory: PlatformAccessory,
	) {

		// set accessory information
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Ecobee')
			.setCharacteristic(this.platform.Characteristic.Model, 'Away')
			.setCharacteristic(this.platform.Characteristic.SerialNumber, 'ECOBEEAWAY1');

		// get the service if it exists, otherwise create a new service
		// you can create multiple services for each accessory
		this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

		// To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
		// when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
		// this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

		// set the service name, this is what is displayed as the default name on the Home app
		// in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
		this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

		// each service must implement at-minimum the "required characteristics" for the given service type
		// see https://developers.homebridge.io/#/service/Lightbulb

		// register handlers for the On/Off Characteristic
		this.service.getCharacteristic(this.platform.Characteristic.On)
			.on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
			.on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

		// This can be used to poll the server and update the status of our switch without waiting
		// for the getter to be called
		setInterval(async () => {
			const apiStatus = await this.checkStatusFromAPI();
			// implement your own code to check if the device is on
			const isOn = apiStatus === 'away';

			// push the new value to HomeKit
			this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);

			this.platform.log.debug('Pushed updated current state to HomeKit: ', apiStatus);
		}, 30 * 60 * 1000);
	}

	/**
	 * Handle "SET" requests from HomeKit
	 * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
	 */
	async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
		try {
			const targetValue = value as boolean;
			const needsRefresh = AuthTokenManager.getInstance().isExpired();
			if (needsRefresh) {
				await AuthTokenManager.getInstance().renewAuthToken();
			}
			const authToken = AuthTokenManager.getInstance().authToken;
			if (targetValue) {
				// away
				const awayBody = {
					'selection': {
						'selectionType': 'registered',
						'selectionMatch': '',
					},
					'functions': [
						{
							'type': 'setHold',
							'params': {
								'holdType': 'indefinite',
								'holdClimateRef': 'away',
							},
						},
					],
				};
				const awaySetRequest = await axios.post('https://api.ecobee.com/1/thermostat?format=json', awayBody, {headers: {'Authorization': 'Bearer ' + authToken}});
				const awayData = awaySetRequest.data;

				this.platform.log.info(`Set Ecobee to away with result: ${JSON.stringify(awayData)}`);
			} else {
				// home
				const homeBody = {
					'selection': {
						'selectionType': 'registered',
						'selectionMatch': '',
					},
					'functions': [
						{
							'type': 'resumeProgram',
							'params': {
								'resumeAll': false,
							},
						},
					],
				};
				const homeSetRequest = await axios.post('https://api.ecobee.com/1/thermostat?format=json', homeBody, {headers: {'Authorization': 'Bearer ' + authToken}});
				const homeData = homeSetRequest.data;

				this.platform.log.info(`Set Ecobee to home with result: ${JSON.stringify(homeData)}`);
			}

			this.platform.log.debug('Set Characteristic On ->', value);

			callback(null);
		} catch(error){
			callback(error);
		}
	}

	/**
	 * Handle the "GET" requests from HomeKit
	 * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
	 *
	 * GET requests should return as fast as possbile. A long delay here will result in
	 * HomeKit being unresponsive and a bad user experience in general.
	 *
	 * If your device takes time to respond you should update the status of your device
	 * asynchronously instead using the `updateCharacteristic` method instead.

	 * @example
	 * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
	 */
	async getOn(callback: CharacteristicGetCallback) {
		const apiStatus = await this.checkStatusFromAPI();
		// implement your own code to check if the device is on
		const isOn = apiStatus === 'away';

		this.platform.log.debug('Get Characteristic On ->', isOn);

		// you must call the callback function
		// the first argument should be null if there were no errors
		// the second argument should be the value to return
		callback(null, isOn);
	}

	private async checkStatusFromAPI() {
		const needsRefresh = AuthTokenManager.getInstance().isExpired();
		if (needsRefresh) {
			await AuthTokenManager.getInstance().renewAuthToken();
		}
		const authToken = AuthTokenManager.getInstance().authToken;

		const queryRequest = await axios.get('https://api.ecobee.com/1/thermostat?format=json&body={"selection":{"selectionType":"registered","selectionMatch":"","includeEvents":true}}', {headers: {'Authorization': 'Bearer ' + authToken}});
		const queryData = queryRequest.data;
		//console.log(JSON.stringify(queryData));
		const events = queryData.thermostatList[0].events;

		if(events.length > 0){
			const mostRecentEvent = events[0];
			const awayMode = mostRecentEvent.holdClimateRef === 'away';
			return (awayMode) ? 'away' : 'home';
		} else {
			// No events means normal program, or "home"
			return 'home';
		}
	}

}
