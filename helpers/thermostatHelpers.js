const axios = require("axios");
class ThermostatHelpers {

    static async changeMode(mode, thermostatAccessToken, SMART_DEVICES_URL, PROJECT_ID, DEVICE_ID) {

        const data = {
            "command": "sdm.devices.commands.ThermostatMode.SetMode",
            "params": {
                "mode": mode
            }
        }

        const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
        const result = await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });
        return result;
    }



    static async changeTemperature(thermostatAccessToken, temperature, command, SMART_DEVICES_URL, PROJECT_ID, DEVICE_ID) {


        if (command === "SetHeat") {

            const data = {
                "command": "sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat",
                "params": {
                    "heatCelsius": temperature
                }
            }

            const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
            await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });

        } else if (command === "SetCool") {

            const data = {
                "command": "sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool",
                "params": {
                    "coolCelsius": temperature
                }
            }

            const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
            await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });
        }
    }

    static convertCelsiusToFahrenheit(cel) {
        return (cel * (9 / 5) + 32);
    }

    static convertFahrenheitToCelsius(far) {
        return (far - 32) * 5 / 9;
    }

    //check the current thermostat mode: if it is off, break, otherwise, check the outside temp and compare to the inside temp
    static async compareWithWeather(thermostatAccessToken, SMART_DEVICES_URL, WEATHER_API_ID, PROJECT_ID, DEVICE_ID, BASE_WEATHER_API_URL, LAT, LON, TEMP_MAX, TEMP_MIN, TEMP_PREF) {
        try {

            //check current thermostat mode:
            const thermostatResponse = await this.getBasicInfo(thermostatAccessToken, SMART_DEVICES_URL, PROJECT_ID);
            //get the current weather
            const weatherResponse = await axios.get(`${BASE_WEATHER_API_URL}?lat=${LAT}&lon=${LON}&appid=${WEATHER_API_ID}&units=imperial`);
            const weatherTemp = weatherResponse.data.main.feels_like;
            console.log(weatherResponse.data);

            if (thermostatResponse.data.devices[0].traits['sdm.devices.traits.ThermostatMode'].mode === "COOL") {
                //if ac is running & climate inside is warmer than outside, turn it off

                console.log("checking current weather data...");

                let thermoTemp = this.convertCelsiusToFahrenheit(thermostatResponse.data.devices[0].traits['sdm.devices.traits.ThermostatTemperatureSetpoint'].coolCelsius);
                if (thermoTemp && thermoTemp > weatherTemp) {
                    console.log("temp outside is lower than the house temp, powering off the ac");

                    const data = {
                        "command": "sdm.devices.commands.ThermostatMode.SetMode",
                        "params": {
                            "mode": "OFF"
                        }
                    }
                    const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
                    await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });
                } else {
                    console.log('temp outside is warmer than it is inside')
                }
            } else {
                //if ac is not running & climate outside is warmer than the preferred max, turn it on
                //currently not checking the last temp, just if its over 72
                if (weatherTemp > TEMP_MAX) {
                    console.log("powering on the ac");

                    const data = {
                        "command": "sdm.devices.commands.ThermostatMode.SetMode",
                        "params": {
                            "mode": "COOL"
                        }
                    }
                    const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
                    await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });
                } else if (weatherTemp < TEMP_MIN) {
                    //the weather temp is less than what is set to be the min temp pref
                    console.log("powering on the heater")
                    const data = {
                        "command": "sdm.devices.commands.ThermostatMode.SetMode",
                        "params": {
                            "mode": "HEAT"
                        }
                    }
                    const headerContent = { Authorization: `Bearer ${thermostatAccessToken}` };
                    await axios.post(`${SMART_DEVICES_URL}/${PROJECT_ID}/devices/${DEVICE_ID}:executeCommand`, data, { headers: headerContent });
                } else {
                    console.log("thermostat is already off, no changes made");
                }
            }
        } catch (e) {
            console.log(e);
        }
    }


    static async getNewToken(refreshToken, BASE_THERMOSTAT_URL, OAUTH_ID, OAUTH_PASSWORD) {
        const result = await axios.post(`${BASE_THERMOSTAT_URL}?client_id=${OAUTH_ID}&client_secret=${OAUTH_PASSWORD}&refresh_token=${refreshToken}&grant_type=refresh_token`);
        return result.data.access_token;
    }

    static async getBasicInfo(thermostatAccessToken, SMART_DEVICES_URL, PROJECT_ID) {

        let url = `${SMART_DEVICES_URL}/${PROJECT_ID}/devices`;
        const result = await axios.get(url,
            {
                headers: {
                    "Authorization": `Bearer ${thermostatAccessToken}`
                }
            });

        return result;
    }


}
module.exports = ThermostatHelpers;