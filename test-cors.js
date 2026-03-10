const https = require('https');

const req = https.request('https://chat-application-backend-x245.onrender.com/api/auth/login', {
    method: 'OPTIONS',
    headers: {
        'Origin': 'https://chat-application-zchp.onrender.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
    }
}, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
});

req.on('error', (e) => {
    console.error(e);
});
req.end();
