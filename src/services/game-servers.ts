import {
    Labels,
    UnregisteredGameServer,
    GameServerConfig,
    GameServer,
    UnregisteredGameServers,
    GameServers
} from "../interfaces";
const { v4: uuidv4 } = require('uuid');

const replaceURL = (map: {[url: string]: string}, str: string) => {

    return Object.keys(map).reduce((acc, ip) => {
        return acc.replace(ip, map[ip]);
    }, str);
};

const matchObjects = (obj1: any, obj2: any) : boolean => {

    return Object.entries(obj1)
    .reduce((matching: boolean, [key, val]) => {

        if(!obj2[key] || obj2[key] !== val) {
            matching = false;
        }

        return matching;
    }, true);
};

const getSuitableServer = (gameServers: GameServers, labels?: Labels) : GameServer | null => {

    return Object.entries(gameServers)
    .reduce((bestServerSoFar: GameServer, [serverSocketId, potentialServer]) => {

        if(potentialServer.playerCount >= potentialServer.capacity) {
            return bestServerSoFar;
        }

        if(labels && !matchObjects(labels, potentialServer.labels)) {
            return bestServerSoFar;
        }

        if(bestServerSoFar) {

            if(potentialServer.playerCount <= bestServerSoFar.playerCount) {
               return bestServerSoFar;
            }
        }

        return potentialServer;
    }, null);
};

class GameServersService {
    public unregisteredGameServers: UnregisteredGameServers = {};
    public gameServers: GameServers = {};
    public replaceMap: { [url: string]: string } = {};

    private onChangeHandlers: { [changeId: string] : (gameServers: GameServers) => void } = {};

    constructor() {
        this.setReplaceURLsFromEnv();
    }

    setReplaceURLsFromEnv() {
        let map = {};

        try {

            if(process.env.REPLACE_URLS) {
                map = JSON.parse(process.env.REPLACE_URLS);
            }
        } catch(error) {

        }

        this.setReplaceURLMap(map);
    }

    onChange(handler: (gameServers: GameServers) => void) : string {
        let changeId = uuidv4();

        this.onChangeHandlers[changeId] = handler;

        return changeId;
    }

    fireOnChange() {

        Object.entries(this.onChangeHandlers).forEach(([ key, handler]) => {
            handler(this.gameServers);
        });
    }

    removeOnChange(changeId: string) {
        delete this.onChangeHandlers[changeId];
    }

    setReplaceURLMap(map: { [url: string]: string }) {
        this.replaceMap = map;
    }

    getSuitableServer(labels?: Labels) {
        return getSuitableServer(this.gameServers, labels);
    }

    addUnauthorisedServer(socketId: string, onDestroy: () => void) {
        console.info(`Client connected [id=${socketId}]`);

        this.unregisteredGameServers[socketId] = {
            timestamp: new Date().getTime(),
            registerTimeout: setTimeout(() => {

                console.log("GameServer failed to register within 10 seconds");
                this.removeUnauthorisedServer(socketId);

                onDestroy();
            }, 10000)
        };
    }

    removeUnauthorisedServer(socketId: string) {

        let server = this.unregisteredGameServers[socketId];

        if(!server) {
            return;
        }

        clearTimeout(server.registerTimeout);

        delete this.unregisteredGameServers[socketId];
    }

    upgradeServerToAuthorised(socketId: string, config: GameServerConfig) {
        let defaults = {
            playerCount: 0,
            gameServerURL: "NoURLSet",
            playerCapacity: 100,
            id: "null",
            labels: {},
        };

        let unAuthServer = this.unregisteredGameServers[socketId];

        if(!unAuthServer) {
            return;
        }

        let serverParams: GameServer = Object.assign(
            {},
            defaults,
            {
                timestamp: unAuthServer.timestamp,
                ...config
            }
        );

        this.gameServers[socketId] = {
            ...serverParams,
            gameServerURL: replaceURL(this.replaceMap, serverParams.gameServerURL)
        };

        this.removeUnauthorisedServer(socketId);

        console.log(`registered gameserver: ${socketId}`);
        this.fireOnChange();
    }

    removeAuthorisedServer(socketId: string) {
        let server = this.gameServers[socketId];

        if(!server) {
            return;
        }

        let time = new Date().getTime();
        time = time - this.gameServers[socketId].timestamp;
        time /= 1000;

        console.info(`Client gone [id=${socketId}] after ${time} seconds`);

        delete this.gameServers[socketId];

        this.fireOnChange();
    }

    setPlayerCount(socketId: string, playerCount: number) {
        let server = this.gameServers[socketId];

        if(!server) {
            return;
        }

        server.playerCount = playerCount;
        console.log(`Set players to ${playerCount} for server: ${socketId}`);

        this.fireOnChange();
    }
};

export {
    GameServersService,
    getSuitableServer
};
