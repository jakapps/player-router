const Database = require('sqlite-async');
const WebSocket = require('ws');

const { consoleWebSockets } = require('../../dist/websockets/console');
const { authenticateUser, setupUserTable, addUser } = require('../../dist/database/database');
const { GameServersService } = require('../../dist/services/game-servers');

describe('consoleWebSockets', () => {
    let db;
    let closeConsoleWebsockets;
    let ws;
    let gameServersService;

    beforeEach(async () => {
        db = await Database.open(":memory:");
        gameServersService = new GameServersService();
        gameServersService.addUnauthorisedServer('testSocketID', () => {});
        gameServersService.upgradeServerToAuthorised('testSocketID');
        await setupUserTable(db);
        await addUser(db, 'testUser', 'correctPassword');

        closeConsoleWebsockets = consoleWebSockets({ db, authenticateUser, gameServersService });

        ws = new WebSocket('ws://localhost:3003');
    });

    afterEach(() => {
        ws.close();
        closeConsoleWebsockets();
    });

    test('will reject unauthenticated users', async () => {

        ws.onopen = () => {
            ws.send(JSON.stringify({ username: 'testUser', password: 'wrongPassword' }));
        };

        let closed = false;

        await new Promise((resolve) => {

            ws.onclose = () => {
                closed = true;
                resolve();
            };
        });

        expect(closed).toBe(true);
    });

    test('disconnects connections that fail to authenticate within 2 seconds', async () => {

        let closed = false;

        await new Promise((resolve) => {

            ws.onclose = () => {
                closed = true;
                resolve();
            };
        });

        expect(closed).toBe(true);
    });

    test('can authenticate and accept users', async () => {

        ws.onopen = () => {
            ws.send(JSON.stringify({ username: 'testUser', password: 'correctPassword' }));
        };

        let closed = false;

        await new Promise((resolve) => {

            ws.onclose = () => {
                closed = true;
                resolve();
            };

            ws.onmessage = (message) => {

                let data = JSON.parse(message.data);

                if(data.code !== 200) {
                    closed = true;
                }

                resolve();
            };
        });

        expect(closed).toBe(false);
    });

    test('emits gameServers update messages', async () => {

        ws.onopen = () => {
            ws.send(JSON.stringify({ username: 'testUser', password: 'correctPassword' }));
        };


        let gameServersUpdated = false;

        await new Promise((resolve) => {
            let firstMessage = true;

            ws.onclose = () => {
                resolve();
            };

            ws.onmessage = (message) => {

                let data = JSON.parse(message.data);

                if(data.code === 200) {

                    if(firstMessage) {
                        firstMessage = false;
                        gameServersService.setPlayerCount('testSocketID', 53);
                    } else {

                        if(data.gameServers.testSocketID.playerCount === 53) {
                            gameServersUpdated = true;
                        }

                        resolve();
                    }
                }
            };
        });

        expect(gameServersUpdated).toBe(true);
    });
});
