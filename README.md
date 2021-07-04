# Player Router

Player Router is a game server discovery and player load balancing tool for you cluster of game servers.

It it desinged to be infratructure and container orchestration agnostic, in order to simplify your game server deployments as much as possible.

Each of your game servers will each connect to the Player Router server via the javsacript SDK (which internally will use a websocket connection).
The Player Router exposes REST endpoints for your game clients to query, which will return the URL of the most suitable game server at that given time.
You may also (optionally) use the console client to log into the Player Router server and view (in realtime) information about your game servers.
