const {
    GameServersService,
    getSuitableServer,
    replaceURL
} = require('../../dist/services/game-servers');
const gameServersMock = require('./game-servers.mock.js');

describe('GameServers', () => {

    let gameServers = {};

    beforeEach(() => {
        gameServers = Object.assign({}, gameServersMock);
    });

    test('returns null when no game servers are available', () => {
        gameServers = {};
        let server = getSuitableServer(gameServers);
        expect(server).toBe(null);
    });

    test('returns null when no matching labels are available', () => {
        let server = getSuitableServer(gameServers, { stage: 'alpha' });
        expect(server).toBe(null);
    });

    test('returns any server when no labels are provided', () => {
        let server = getSuitableServer(gameServers);
        expect(server).not.toBe(null);
    });

    test('returns correct server with matching label', () => {
        let server = getSuitableServer(gameServers, { stage: 'beta' });

        let expected =  {
            id: 'test1',
            labels: {
                stage: 'beta'
            },
            gameServerURL: 'beta.example.com',
            capacity: 15,
            playerCount: 3
        };

        expect(server).toEqual(expected);

        server = getSuitableServer(gameServers, { myLabel: 'seven' });

        let expected2 =  {
            id: 'test4',
            labels: {
                myLabel: 'seven'
            },
            gameServerURL: 'example.com',
            capacity: 10,
            playerCount: 0
        };

        expect(server).toEqual(expected2);
    });

    test('prioritizes servers with highest number of players', () => {

        let server = getSuitableServer(gameServers, { stage: 'prod' });

        let expected = {
            id: 'test9',
            labels: {
                stage: 'prod'
            },
            gameServerURL: 'example.com',
            capacity: 10,
            playerCount: 9
        };

        expect(server).toEqual(expected);
    });

    test('ignores full servers', () => {
        let server = getSuitableServer(gameServers, { stage: 'gamma' });
        expect(server).toBe(null);
    });
});

describe('GameServersService', () => {

    let service;
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {
            ...OLD_ENV,
            REPLACE_URLS: '{"2.3.4.5":"replaced.url.com","3.4.5.6":"another.replaced.com/url"}'
        };
        service = new GameServersService();
        service.addUnauthorisedServer('testSocketID', () => {});
    });

    afterEach(() => {
        service.removeUnauthorisedServer('testSocketID');
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test('adds a new unregistered server', () => {

        expect(service.unregisteredGameServers['testSocketID']).not.toBe(undefined);
    });

    test('removes and existing unregistered server', () => {

        expect(service.unregisteredGameServers['testSocketID']).not.toBe(undefined);
        service.removeUnauthorisedServer('testSocketID');
        expect(service.unregisteredGameServers['testSocketID']).toBe(undefined);
    });

    test('upgrades to authorisedServer', () => {

        service.upgradeServerToAuthorised('testSocketID');
        expect(service.unregisteredGameServers['testSocketID']).toBe(undefined);
        expect(service.gameServers['testSocketID']).not.toBe(undefined);
    });

    test('removes authorisedServer', () => {

        service.upgradeServerToAuthorised('testSocketID');
        expect(service.unregisteredGameServers['testSocketID']).toBe(undefined);
        expect(service.gameServers['testSocketID']).not.toBe(undefined);
        service.removeAuthorisedServer('testSocketID');
        expect(service.gameServers['testSocketID']).toBe(undefined);
    });

    test('can set playerCount', () => {

        service.upgradeServerToAuthorised('testSocketID');
        expect(service.gameServers['testSocketID'].playerCount).toBe(0);
        service.setPlayerCount('testSocketID', 1);
        expect(service.gameServers['testSocketID'].playerCount).toBe(1);
    });

    test('can replace URL', () => {

        service.setReplaceURLMap({
            "1.2.3.4": "url.example.com"
        });

        service.upgradeServerToAuthorised('testSocketID', { gameServerURL: "1.2.3.4" });
        let server = service.getSuitableServer();

        expect(server.gameServerURL).toBe("url.example.com");
    });

    test('does not replace URL, if not found in replace map', () => {

        service.setReplaceURLMap({
            "1.2.3.4": "url.example.com"
        });

        service.upgradeServerToAuthorised('testSocketID', { gameServerURL: "1.2.3.5" });
        let server = service.getSuitableServer();

        expect(server.gameServerURL).toBe("1.2.3.5");
    });

    test('can automatically set replace URLs from ENV var', () => {
        service.upgradeServerToAuthorised('testSocketID', { gameServerURL: "2.3.4.5" });
        let server = service.getSuitableServer();

        expect(server.gameServerURL).toBe("replaced.url.com");

        service.addUnauthorisedServer('server2', () => {});
        service.upgradeServerToAuthorised('server2', { gameServerURL: "3.4.5.6", labels: { stage: "test" } });

        server = service.getSuitableServer({ stage: "test" });

        expect(server.gameServerURL).toBe("another.replaced.com/url");
    });

    test('can gracefully handle bad replace URLs string from ENV var', () => {

        process.env = {
            ...OLD_ENV,
            REPLACE_URLS: '{"2.3.4.5:"replaced.url.com",3.4.5.6:"another.replaced.com/url"}'
        };
        service.setReplaceURLsFromEnv();

        service.upgradeServerToAuthorised('testSocketID', { gameServerURL: "2.3.4.5" });
        let server = service.getSuitableServer();

        expect(server.gameServerURL).toBe("2.3.4.5");
    });

    test('calls onChange callback whenever a gameServers changes', () => {
        let onChange = jest.fn();

        service.upgradeServerToAuthorised('testSocketID');
        service.onChange(onChange);
        service.setPlayerCount('testSocketID', 1);

        expect(onChange).toHaveBeenCalled();
    });

    test('can remove onChange callbacks', () => {
        let onChange = jest.fn();

        service.upgradeServerToAuthorised('testSocketID');
        let onChangeId = service.onChange(onChange);
        service.removeOnChange(onChangeId);
        service.setPlayerCount('testSocketID', 1);

        expect(onChange).not.toHaveBeenCalled();
    });
});
