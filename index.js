const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const serviceAccount = require('./service-account-key.json');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// support parsing of application/json type post data
app.use(bodyParser.json());

// support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://test-stuntzilla-default-rtdb.asia-southeast1.firebasedatabase.app/backend-api"
});

const db = admin.firestore();

app.get('/', (req, res) => {
    res.send('STUNTZILLA');
});

// create user (parent)
app.post('/user/store', async (req, res) => {
    const { fullname, nickname, email, password } = req.body;

    // validate
    if (!fullname || !nickname || !email || !password) {
        return res.status(400).json({ 
            status: 'failed', 
            message: 'All fields are required',
        });
    }

    try {
        // hashing password
        const hashed_password = await bcrypt.hash(password, 10);

        const user_id = uuidv4();
        await db.collection('users').doc(user_id).set({
            fullname: fullname,
            nickname: nickname,
            email: email,
            password: hashed_password,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: {
                user_id,
                fullname,
                nickname,
                email
            }
        });
    } catch (error) {
        console.error('Error adding document: ', error);
        res.status(500).json({
            status: 'failed', 
            message: 'Error creating user', 
        });
    }
});

// find user by id
app.get('/user/:user_id', async (req, res) => {
    const user_id = req.params.user_id;
    try {
        const child_doc = await db.collection('users').doc(user_id).get();

        if (!child_doc.exists) {
            return res.status(404).json({
                status: 'failed',
                message: 'User not found',
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                nickname: child_doc.data().nickname,
                fullname: child_doc.data().fullname,
                email: child_doc.data().email,
            },
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({
            status: 'failed',
            message: 'Error getting user data',
        });
    }
});

// create child
app.post('/user/child/store', async (req, res) => {
    const { user_id, fullname, birthdate } = req.body;

    // validate
    if (!user_id || !fullname || !birthdate) {
        return res.status(400).json({ 
            status: 'failed', 
            message: 'All fields are required' 
        });
    }

    try {
        const child_id = uuidv4();
        await db.collection('users').doc(user_id).collection('childs').doc(child_id).set({
            fullname: fullname,
            birthdate: birthdate,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            status: 'success',
            message: 'Child created successfully',
            data: {
                user_id,
                child_id,
                fullname,
                birthdate,
            }
        });
    } catch (error) {
        console.error('Error adding document: ', error);
        res.status(500).json({
            status: 'failed',
            message: 'Error creating child',
        });
    }
});

// find child by id
app.get('/user/:user_id/child/:child_id', async (req, res) => {
    const user_id = req.params.user_id;
    const child_id = req.params.child_id;

    try {
        const child_doc = await db.collection('users').doc(user_id).collection('childs').doc(child_id).get();

        if (!child_doc.exists) {
            return res.status(404).json({
                status: 'failed',
                message: 'Child not found',
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user_id: user_id,
                child_id: child_id,
                nickname: child_doc.data().nickname,
                fullname: child_doc.data().fullname,
                email: child_doc.data().email,
            },
        });
    } catch (error) {
        console.error('Error getting child data:', error);
        res.status(500).json({
            status: 'failed',
            message: 'Error getting child data',
        });
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
