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
	databaseURL: "https://hai-hai-123.firebaseio.com/databases/stuntzilla"
  });

const db = admin.firestore();

app.get('/', (req, res) => {
	res.send('STUNTZILLA');
});

// Gunakan body-parser sebelum rute post
app.post('/user', async (req, res) => {
    const { fullname, nickname, email, password } = req.body;

	console.log(req.body.fullname)

    // Validasi data yang diperlukan
    if (!fullname || !nickname || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Lakukan hashing password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Lanjutkan dengan menyimpan data pengguna
        const user_id = uuidv4();
        await db.collection('users').doc(user_id).set({
            fullname: fullname,
            nickname: nickname,
            email: email,
            password: hashedPassword,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            message: 'User created successfully',
            user_id: user_id,
            user: {
                fullname,
                nickname,
                email
            }
        });
    } catch (error) {
        console.error('Error adding document: ', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});


app.listen(3000, () => {
	console.log('Server listening on port 3000');
});
