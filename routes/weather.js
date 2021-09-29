"use strict";

//Routes for getting the weather info

const express = require("express");
let LAT, LON, WEATHER_API_ID;
try {
    const config = require("../configSecret");
    LAT = config.LAT;
    LON = config.LON;
    WEATHER_API_ID = config.WEATHER_API_ID;
} catch (e) {
    LAT = process.env.LAT;
    LON = process.env.LON;
    WEATHER_API_ID = process.env.WEATHER_API_ID;
}
const axios = require("axios");
const { BadRequestError, ExpressError, NotFoundError } = require("../expressError");
const router = new express.Router();

const BASE_WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

router.post("/", async (req, res, next) => {
    try {
        const result = await axios.get(`${BASE_WEATHER_API_URL}?lat=${LAT}&lon=${LON}&appid=${WEATHER_API_ID}&units=imperial`);
        console.log(result.data);
        return res.json({ weather: result.data });
    } catch (e) {
        return next(e);
    }

});

module.exports = router;