const request = require("supertest");
const app = require("../app");

describe("Basic", () => {

    test("can get a token, POST /thermostat/token", async () => {
        const res = await request(app).post("/thermostat/token");
        expect(res.body).toEqual({
            token: expect.any(String)
        });
    });

    test("can get basic info about the thermostat, GET /thermostat/", async () => {
        const res = await request(app).get("/thermostat/");
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({
            devices: expect.any(Array),
        });
    });

});

describe("Mode switching", () => {

    test("can change the thermostat mode", async () => {
        const modeRes = await request(app).post("/thermostat/mode").send({ mode: "COOL" });
        expect(modeRes.status).toEqual(200);
        expect(modeRes.body.mode).toEqual("COOL");

        const thermoRes = await request(app).get("/thermostat/");
        expect(thermoRes.body.devices[0]["traits"]["sdm.devices.traits.ThermostatMode"].mode).toEqual("COOL");
    });

});



describe("Temp change", () => {

    test("can change AC temp", async () => {
        jest.setTimeout(150000);
        const cToF = (c) => {
            return Math.round((c * (9 / 5) + 32));
        }

        const modeRes = await request(app).post("/thermostat/mode").send({ mode: "COOL" });
        expect(modeRes.status).toEqual(200);
        const tempRes = await request(app).post("/thermostat/temperature").send({ temperature: 74, command: "SetCool" });
        console.log(tempRes.body);
        const infoRes = await request(app).get("/thermostat/");
        console.log(infoRes.body.devices[0]['traits']['sdm.devices.traits.ThermostatTemperatureSetpoint']);
        const celsius = infoRes.body.devices[0]['traits']["sdm.devices.traits.ThermostatTemperatureSetpoint"]['coolCelsius'];
        // console.log(celsius);
        const resultTemp = cToF(celsius);
        expect(resultTemp).toEqual(74);

    });

});

