//const _ = require('lodash');
const needle = require("needle");
const express = require("express");
const cors = require('cors');
const webSocket = require("ws");
const util = require("util");
const bcrypt = require('bcrypt');
const Database = require('sqlite-async');
const { v4: uuidv4 } = require('uuid');

import { GameServersService } from "./services/game-servers";
import { getGameServer, getGameServers } from "./routes/routes";
import {
    setupUserTable,
    addUser,
    getUsers,
    authenticateUser
} from "./database/database";
import { consoleWebSockets } from "./websockets/console";

const app = express();
app.use(cors());

class PlayerRouter {
    private gameServersService: GameServersService = new GameServersService();
    private db: any;

    constructor() {
        this.init();
    }

    async init() {

        this.db = await Database.open("playerrouter.db");
        await this.initDb(this.db);
        await this.initServerWs();
        await consoleWebSockets({
            db: this.db,
            authenticateUser,
            gameServersService: this.gameServersService
        });
        await this.initRoutes();
    }

    initDb(db) {

        return setupUserTable(db)
        .then(() => getUsers(db))
        .then(async (users) => {

            if(users.length) {
                return;
            }

            console.log("Users table empty, creating defaults");

            return Promise.all([
                addUser(db, "admin", process.env.ADMIN_PASSWORD || "admin123"),
                addUser(db, "gameserver", process.env.GAMESERVER_PASSWORD || "gameserver123")
            ]);
        })
        .catch((err) => {
            console.log(`Error: ${err}`);
        });
    }

    initServerWs() {

        let wss = new webSocket.Server({
            port: 3002
        });

        wss.on("connection", (socket) => {
            let id = uuidv4();

            socket.firstMessage = true;

            this.gameServersService.addUnauthorisedServer(id, () => {

                if(socket) {
                    socket.close();
                }
            });

            // when socket disconnects, remove it from the list:
            socket.on("close", () => {

                this.gameServersService.removeUnauthorisedServer(id);
                this.gameServersService.removeAuthorisedServer(id);
                socket = null;
            });

            socket.on("error", (error) => {
                console.log("------ ERROR -------");
                console.log(error);
            });

            socket.on("message", async (message) => {

                if(typeof message === "string") {
                    message = JSON.parse(message);
                }

                if(socket.firstMessage) {
                    let config = message;

                    let authenticated = await authenticateUser(this.db, config.user, config.password);

                    if(!authenticated) {
                        console.log("GameServer failed to authenticate");

                        this.gameServersService.removeUnauthorisedServer(id);
                        socket.close();

                        return;
                    }

                    this.gameServersService.upgradeServerToAuthorised(
                        id,
                        {
                            playerCount: config.playerCount || 0,
                            gameServerURL: config.gameServerURL,
                            capacity: config.capacity || 48,
                            id: config.id,
                            labels: config.labels || {}
                        }
                    );

                    socket.firstMessage = false;
                } else if(message.type === "playerCount") {

                    let count = message.count;

                    if(message.count === undefined) {
                        console.log(`GameServer tried to set player count, but did not send a count`);
                        return;
                    }

                    this.gameServersService.setPlayerCount(id, message.count);
                }
            });
        });
    }

    initRoutes() {
        getGameServer(app, this.gameServersService);
        getGameServers(app, this.gameServersService);
    }
}

let m = new PlayerRouter();
app.listen(8090);
