import { GameServersService } from '../services/game-servers';

const getGameServer = (app: any, gameServersService: GameServersService) => {

    app.get('/getGameServer/:stage?', (req, res) => {

        let response = {
            msg: "",
            gameServerURL: ""
        };

        let labels: { [label: string]: string } = {};

        if(req.params.stage) {
            labels.stage = req.params.stage;
        }

        if(req.query) {

            Object.entries(req.query).forEach(([key, value]: Array<any>) => {
                labels[key] = value;
            });
        }

        let suitableServer = gameServersService.getSuitableServer(labels);

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
