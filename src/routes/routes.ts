import { GameServersService } from '../services/game-servers';

const getGameServer = (app: any, gameServersService: GameServersService) => {

    app.get('/getGameServer/:stage', (req, res) => {

        let response = {
            msg: "",
            gameServerURL: ""
        };

        let suitableServer = gameServersService.getSuitableServer({ stage: req.params.stage });

        if(!suitableServer) {

            res.status(503);
            response.msg = "No game servers available";
            res.send(response);

            return;
        }

        response.gameServerURL = suitableServer.gameServerURL;

        res.send(response);
    });
}

export {
    getGameServer
};
