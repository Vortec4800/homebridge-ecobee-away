import { readFileSync, writeFileSync } from 'fs';

export interface EcobeeAwayPlatformConfig {
	refreshToken: string
}

export function updateHomebridgeConfig(homebridge: any, update: (config: string) => string) {
	const configPath = homebridge.user.configPath();
	const config = readFileSync(configPath).toString();
	const updatedConfig = update(config);

	if (config !== updatedConfig) {
		writeFileSync(configPath, updatedConfig);
		//console.log('updated config');
		return true;
	}

	return false;
}
