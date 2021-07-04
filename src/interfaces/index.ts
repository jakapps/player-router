
type Labels = {
    [label: string]: string
};

type UnregisteredGameServer = {
    timestamp: number,
    registerTimeout: NodeJS.Timeout
};

type GameServerConfig = {
    id: string,
    labels: Labels,
    gameServerURL: string,
    capacity: number,
    playerCount: number
};

type GameServer = GameServerConfig & {
    timestamp: number
};

type UnregisteredGameServers = {
    [id: string]: UnregisteredGameServer
};

type GameServers = {
    [id: string]: GameServer
};

export type {
    Labels,
    UnregisteredGameServer,
    UnregisteredGameServers,
    GameServerConfig,
    GameServer,
    GameServers
};
