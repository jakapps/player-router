const request = require('supertest');
const express = require('express');
const routes = require("../../dist/routes/routes");
const { GameServersService } = require('../../dist/services/game-servers');

describe('Routes', () => {
    let app;
    let service;

    beforeAll(() => {
        app = express();

        service = new GameServersService();
        service.addUnauthorisedServer('testSocketID', () => {});
        service.addUnauthorisedServer('testSocketID2', () => {});
        service.addUnauthorisedServer('testSocketID3', () => {});
        service.upgradeServerToAuthorised('testSocketID', {
            gameServerURL: "2.3.4.5",
            labels: {
                exampleLabel: "exampleValue"
            }
        });
        service.upgradeServerToAuthorised('testSocketID2', {
            gameServerURL: "1.2.3.4",
            labels: {
                differentLabel: "anotherValue"
            }
        });
        service.upgradeServerToAuthorised('testSocketID3', {
            gameServerURL: "5.6.7.8",
            labels: {
                stage: "dev"
            }
        });
    });

    test('adds a getGameServer route', () => {

        let expressMock = {
            get: jest.fn()
        };

        let gameServersService = new GameServersService();
        routes.getGameServer(expressMock, gameServersService);

        expect(expressMock.get).toHaveBeenCalledWith(
            '/getGameServer/:stage?',
            expect.any(Function)
        );
    });

    test('getGameServer route will use stage label by default', async () => {

        routes.getGameServer(app, service);

        let res = await request(app)
        .get('/getGameServer/dev');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            gameServerURL: "5.6.7.8",
            msg: ""
        });

        res = await request(app)
        .get('/getGameServer/prod');

        expect(res.status).toBe(503);
        expect(res.body).toEqual({
            gameServerURL: "",
            msg: "No game servers available"
        });
    });

    test('getGameServer route can retrieve game server from arbitrary labels', async () => {

        routes.getGameServer(app, service);

        let res = await request(app)
        .get('/getGameServer?exampleLabel=exampleValue');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            gameServerURL: "2.3.4.5",
            msg: ""
        });

        res = await request(app)
        .get('/getGameServer?differentLabel=anotherValue');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            gameServerURL: "1.2.3.4",
            msg: ""
        });
    });
});
