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

const getGameServers = (app: any, gameServersService: GameServersService) => {

    app.get('/getGameServers', (req, res) => {

        let servers = [];
        let labels: { [label: string]: string } = {};

        if(req.query) {

            Object.entries(req.query).forEach(([key, value]: Array<any>) => {
                labels[key] = value;
            });
        }

        servers = Object.entries(gameServersService.getServers(labels))
        .reduce((acc: Array<any>, [id, gameServer]: Array<any>) => {

            let g = { ...gameServer };
            delete g.timestamp;

            acc.push(g);

            return acc;
        }, []);

        if(!servers.length) {
            res.status(503);
        }

        res.send(servers);
    });
};

export {
    getGameServer,
    getGameServers
};
