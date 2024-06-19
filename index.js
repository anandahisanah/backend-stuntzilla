require('dotenv').config();

const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const serviceAccount = require('./service-account-key.json');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const { default: axios } = require('axios');
const { getAccessToken } = require('./google-vertex');


// support parsing of application/json type post data
app.use(bodyParser.json());

// support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

const db = admin.firestore();

app.get('/', (req, res) => {
    res.send('STUNTZILLA');
});

// create user (parent)
app.post('/user/store', async (req, res) => {
    const { user_token, fullname, nickname } = req.body;

    // validate
    if (!user_token || !fullname || !nickname) {
        return res.status(400).json({
            status: 'failed',
            message: 'All fields are required',
        });
    }

    try {
        // verify token
        const user = await admin.auth().verifyIdToken(user_token);

        await db.collection('users').doc(user.uid).set({
            fullname: fullname,
            nickname: nickname,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: {
                user_id: user.uid,
                fullname: fullname,
                nickname: nickname,
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
app.post('/child/store', async (req, res) => {
    const { user_token, user_id, fullname, birthdate } = req.body;

    // validate
    if (!user_token || !user_id || !fullname || !birthdate) {
        return res.status(400).json({
            status: 'failed',
            message: 'All fields are required'
        });
    }

    try {
        // verify token
        let user = await admin.auth().verifyIdToken(user_token);

        const child_id = uuidv4();
        await db.collection('childs').doc(child_id).set({
            user_id: user.uid,
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
app.post('/child/:child_id', async (req, res) => {
    const user_token = req.body.user_token;
    const user_id = req.body.user_id;
    const child_id = req.params.child_id;

    console.log('req.body', req.body)

    try {
        // verify token
        await admin.auth().verifyIdToken(user_token);

        const child_doc = await db.collection('childs').doc(child_id).get();

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

// stunting
app.get('/stunting', async (req, res) => {
    try {
        // get env
        const project_id = process.env.PROJECT_ID;
        const endpoint_id = process.env.ENDPOINT_ID;

        // request
        const gender = Number(req.query.gender);
        const age = Number(req.query.age);
        const birth_weight = Number(req.query.birth_weight);
        const birth_length = Number(req.query.birth_length);
        const body_weight = Number(req.query.body_weight);
        const body_length = Number(req.query.body_length);

        // get token
        let token = await getAccessToken();

        let response = await axios.post(`https://asia-southeast1-aiplatform.googleapis.com/v1/projects/${project_id}/locations/asia-southeast1/endpoints/${endpoint_id}:predict`,
            {
                "instances": [
                    [gender, age, birth_weight, birth_length, body_weight, body_length]
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let result = Math.round(response.data.predictions[0][0]);

        let category, message;
        if (result > 0) {
            category = 'Normal';
            message = 'Anak sehat. Pertahankan diet seimbang dengan banyak buah, sayuran, biji-bijian utuh, dan protein rendah lemak. Dorong aktivitas fisik dan pastikan pemeriksaan medis rutin.';

        } else {
            category = 'Stunting';
            message = 'Anak terdeteksi stunting. Pastikan nutrisi seimbang dan asupan kalori mencukupi. Fokus pada makanan tinggi protein seperti telur, produk susu, dan kacang-kacangan. Konsultasikan dengan penyedia layanan kesehatan untuk penilaian lebih lanjut.';
        }

        res.status(200).json({
            status: 'success',
            data: {
                category: category,
                message: message,
            },
        });
    } catch (error) {
        console.error('errror', error.message)
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
