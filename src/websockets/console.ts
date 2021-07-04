import webSocket from "ws";
import { GameServers } from "../interfaces";
const { v4: uuidv4 } = require('uuid');

const refreshUserData = ({ socket, username, gameServers }) => {
    socket.send(JSON.stringify({ code: 200, username, gameServers }));
};

const consoleWebSockets = ({ authenticateUser, db, gameServersService }) => {

    let wss = new webSocket.Server({
        port: 3003
    });

    wss.on("connection", (socket) => {

        let authTimeout = setTimeout(() => socket.close(), 2000);
        let id = uuidv4();
        let gameServerOnChangeId: string = 'null';
        let firstMessage = true;

        socket.on("close", () => {
            gameServersService.removeOnChange(gameServerOnChangeId);
            clearTimeout(authTimeout);
            socket = null;
        });

        socket.on("error", (error) => {
            console.log("------ ERROR -------");
            console.log(error);
        });

        socket.on("message", async (message: any) => {

            if(typeof message === "string") {
                message = JSON.parse(message);
            }

            if(firstMessage) {
                let data = message;

                let authenticated = await authenticateUser(db, data.username, data.password);

                if(!authenticated) {
                    console.log("User failed to authenticate");
                    socket.send(JSON.stringify({ code: 401, errorMessage: "Authentication failed" }));
                    socket.close();

                    return;
                }

                clearTimeout(authTimeout);
                firstMessage = false;
                refreshUserData({
                    socket,
                    username: data.username,
                    gameServers: gameServersService.gameServers
                });

                gameServerOnChangeId = gameServersService.onChange((gameServers: GameServers) => {

                    refreshUserData({
                        socket,
                        username: data.username,
                        gameServers: gameServersService.gameServers
                    });
                });
            }
        });
    });

    return () => wss.close();
};

export { consoleWebSockets };
