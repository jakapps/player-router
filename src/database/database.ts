const bcrypt = require('bcrypt');

const getHash = (password) => {
    return bcrypt.hash(password, 10);
};

const verifyPassword = (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

const doesUserTableExist = (db) => {

    return db.get("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'")
    .then((data) => {

        if(data["COUNT(*)"]) {
            return true;
        }

        return false;
    });
};

const setupUserTable = (db) => {
    console.log("Ensuring users table exists");
    return db.run("CREATE TABLE if not exists users (user TEXT, hash TEXT)");
};

const addUser = async (db, username: string, password: string) => {
    let stmt = await db.prepare(`INSERT INTO users VALUES (?, ?)`);

    await stmt.run(username, await getHash(password));
    await stmt.finalize();
};

const getUser = async (db, username: string) => {

    let stmt = await db.prepare(`SELECT user, hash FROM users where user = ?`)

    let user = await stmt.get(username);
    await stmt.finalize();

    return user;
}

const getUsers = (db) => {
    return db.all("SELECT user, hash FROM users");
};

const authenticateUser = (db, username: string, password: string) => {

    if(!db) {
        return false;
    }

    if(!username || !password) {
        return false;
    }

    return getUser(db, username)
    .then((row) => {

        if(!row || !row.hash) {
            return false;
        }

        return verifyPassword(password, row.hash);
    })
    .catch((err) => {
        console.log(`Authentication error: ${err}`);
        return false;
    });
};

export {
    setupUserTable,
    doesUserTableExist,
    addUser,
    getUser,
    getUsers,
    authenticateUser
};
