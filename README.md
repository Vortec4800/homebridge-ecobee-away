
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Homebridge Ecobee Away
[![npm](https://img.shields.io/npm/v/homebridge-ecobee-away.svg)](https://www.npmjs.com/package/homebridge-ecobee-away)

This Homebridge plugin is designed to expose a switch in your Home that controls the Ecobee thermostat home/away status.

Useful for automations where you want to control when your thermostat is in home or away mode. Works best when auto home/away is disabled.

## Installation

Assuming a global installation of `homebridge`:

`npm i -g --unsafe-perm homebridge-ecobee-away`

## Homebridge Configuration

Add the `EcobeeAway` platform in your homebridge `config.json` file.

 ```json
{
  "platforms": [
    {
      "name": "Ecobee Away",
      "platform": "EcobeeAway",
      "refreshToken": "token generated with ecobee-auth-cli.",
      "thermostatIds": "100904852660,654234216036"
    }
  ]
}
```

### Refresh Token

To get a refresh token, if you have the plugin installed globally, run ecobee-auth-cli from a terminal. It should be available globally via your npm bin directory.

The command will walk you through the process to generate a token. Log in to your Ecobee web portal and enter the PIN given under the "Apps" tab. When the tool gives you a token, enter that into the config file.

Note that the config file will automatically be updated as new refresh tokens are loaded from the server.

### Thermostat Ids (Optional)

This is a list of thermostat serial numbers to control. You can leave this blank if you only have a single thermostat. You can find your thermostat's serial number in the app or on the website under the thermostat's "About" page.
