"use strict";

//Routes for controlling the thermometer

const express = require("express");
const ThermostatHelpers = require("../helpers/thermostatHelpers");
let OAUTH_ID, OAUTH_PASSWORD, PROJECT_ID, DEVICE_ID, REFRESH_TOKEN, LAT, LON, WEATHER_API_ID, TEMP_MIN, TEMP_MAX, TEMP_PREF;
try {

    const pws = require("../configSecret");

    OAUTH_ID = pws.OAUTH_ID;
    OAUTH_PASSWORD = pws.OAUTH_PASSWORD;
    PROJECT_ID = pws.PROJECT_ID;
    DEVICE_ID = pws.DEVICE_ID;
    REFRESH_TOKEN = pws.REFRESH_TOKEN;
    LAT = pws.LAT;
    LON = pws.LON;
    WEATHER_API_ID = pws.WEATHER_API_ID;

} catch (e) {

    OAUTH_ID = process.env.OAUTH_ID;
    OAUTH_PASSWORD = process.env.OAUTH_PASSWORD;
    PROJECT_ID = process.env.PROJECT_ID;
    DEVICE_ID = process.env.DEVICE_ID;
    REFRESH_TOKEN = process.env.REFRESH_TOKEN;
    LAT = process.env.LAT;
    LON = process.env.LON;
    WEATHER_API_ID = process.env.WEATHER_API_ID;
    TEMP_MIN = process.env.TEMP_MIN;
    TEMP_MAX = process.env.TEMP_MAX;
    TEMP_PREF = process.env.TEMP_PREF;

}

const BASE_WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const BASE_THERMOSTAT_URL = `https://www.googleapis.com/oauth2/v4/token`;
const SMART_DEVICES_URL = `https://smartdevicemanagement.googleapis.com/v1/enterprises`;

const axios = require("axios");
const { BadRequestError, ExpressError, NotFoundError } = require("../expressError");
const router = new express.Router();

let thermostatAccessToken;
let intervalId;

/*change the temperature
Body: {
    temperature: int,
    command: <SetHeat>, <SetCool>
}
*/
router.post("/temperature", async (req, res, next) => {

    try {

        if (!thermostatAccessToken) thermostatAccessToken = await ThermostatHelpers.getNewToken(REFRESH_TOKEN, BASE_THERMOSTAT_URL, OAUTH_ID, OAUTH_PASSWORD);
        let { temperature, command } = req.body;
        temperature = ThermostatHelpers.convertFahrenheitToCelsius(temperature);

        ThermostatHelpers.changeTemperature(thermostatAccessToken, temperature, command, SMART_DEVICES_URL, PROJECT_ID, DEVICE_ID);
        return res.json({})
    } catch (e) {
        return next(e);
    }
});


/**
 * Start the automatic timer to check the weather every 30 minutes and compare
 * the results with the inside temperature
 * 
 * START TIMER: {mode: "start"}
 * END TIMER: {mode: "stop"}
 * GET CUR STATUS: {mode: ""}
 * 
 * RETURN: {response: status}
 * 
 */
router.post("/timer", async (req, res, next) => {
    try {
        const mode = req.body.mode;

        if (mode === "start" && !intervalId) {
            await ThermostatHelpers.compareWithWeather(thermostatAccessToken, SMART_DEVICES_URL, WEATHER_API_ID, PROJECT_ID, DEVICE_ID, BASE_WEATHER_API_URL, LAT, LON, TEMP_MAX, TEMP_MIN, TEMP_PREF);
            intervalId = setInterval(async () => {
                await ThermostatHelpers.compareWithWeather(thermostatAccessToken, SMART_DEVICES_URL, WEATHER_API_ID, PROJECT_ID, DEVICE_ID, BASE_WEATHER_API_URL, LAT, LON, TEMP_MAX, TEMP_MIN, TEMP_PREF);
            }, 1800000);
            // }, 10000);

        } else if (mode === "stop" && intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
        }

        const status = intervalId !== undefined ? "on" : "off";
        const response = {
            status
        }

        return res.json(response);

    } catch (e) {
        console.log("error");
        return next(e);
    }
});

//Get a new access token
router.post("/token", async (req, res, next) => {
    try {
        const refreshToken = req.query.refreshToken || REFRESH_TOKEN;
        thermostatAccessToken = await ThermostatHelpers.getNewToken(refreshToken, BASE_THERMOSTAT_URL, OAUTH_ID, OAUTH_PASSWORD);
        return res.json({ token: thermostatAccessToken });
    } catch (e) {
        return next(e);
    }

});

//Route to change the thermostat's current mode
//Must pass in the desired mode into the query parameters
//Returns desired mode on success
router.post("/mode", async (req, res, next) => {
    try {
        if (!thermostatAccessToken) thermostatAccessToken = await ThermostatHelpers.getNewToken(REFRESH_TOKEN, BASE_THERMOSTAT_URL, OAUTH_ID, OAUTH_PASSWORD);

        const mode = req.body.mode;
        // console.log(mode);
        await ThermostatHelpers.changeMode(mode, thermostatAccessToken, SMART_DEVICES_URL, PROJECT_ID, DEVICE_ID);
        return res.json({ mode });
    } catch (e) {
        // console.log(e);
        return next(e);
    }
});

//Get basic info about the thermometer (mainly its status [OFF, COOL, HEAT])
router.get("/", async (req, res, next) => {

    try {
        if (!thermostatAccessToken) thermostatAccessToken = await ThermostatHelpers.getNewToken(REFRESH_TOKEN, BASE_THERMOSTAT_URL, OAUTH_ID, OAUTH_PASSWORD);
        const result = await ThermostatHelpers.getBasicInfo(thermostatAccessToken, SMART_DEVICES_URL, PROJECT_ID);

        return res.json(result.data);

    } catch (e) {
        // console.log(e);
        return next(e);
    }

});

module.exports = router;
