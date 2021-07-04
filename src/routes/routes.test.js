const routes = require("../../dist/routes/routes");
const { GameServersService } = require('../../dist/services/game-servers');

describe('Routes', () => {

    test('adds a getGameServer route', () => {

        let expressMock = {
            get: jest.fn()
        };

        let gameServersService = new GameServersService();

        routes.getGameServer(expressMock, gameServersService);

        expect(expressMock.get).toHaveBeenCalledWith(
            '/getGameServer/:stage',
            expect.any(Function)
        );
    });
});
