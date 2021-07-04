const Database = require('sqlite-async');

const {
    setupUserTable,
    doesUserTableExist,
    addUser,
    getUsers,
    authenticateUser,
    getUser
} = require('../../dist/database/database');

describe('Database', () => {
    let db;

    beforeEach(async () => {
        db = await Database.open(":memory:");
        await setupUserTable(db);
    });

    test('creates users table, if not exists', async () => {
        let exists = await doesUserTableExist(db);

        expect(exists).toBe(true);
    });

    test('avoids creating users table, if already exists', async () => {
        let exists = await doesUserTableExist(db);
        expect(exists).toBe(true);

        await setupUserTable(db);
        exists = await doesUserTableExist(db);

        expect(exists).toBe(true);
    });

    test('adds and gets users', async () => {
        await addUser(db, 'testUser', '123');
        let users = await getUsers(db);

        expect(users.length).toBe(1);
        expect(users[0].user).toBe('testUser');
        expect(users[0].hash).not.toBe('');
    });

    test('authenticates users', async () => {
        await addUser(db, 'testUser', 'testUserPassword');
        let authenticated = await authenticateUser(db, 'testUser', 'testUserPassword');

        expect(authenticated).toBe(true);
    });

    test('rejects failed authentication attempts', async () => {
        await addUser(db, 'testUser', 'testUserPassword');
        let authenticated = await authenticateUser(db, 'testUser', 'aWrongPassword');

        expect(authenticated).toBe(false);
    });

    test('sanitises input', async () => {
        await addUser(db, 'testUser', 'testUserPassword');

        let user = await getUser(db, 'wrongUser\' OR 1=1 OR \'hello\'=\'hello');

        expect(user).toBe(undefined);
    });
});
