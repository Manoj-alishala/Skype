import https from 'https';

const req = https.request('https://chat-application-backend-x245.onrender.com/api/auth/login', {
    method: 'POST',
    headers: {
        'Origin': 'https://chat-application-zchp.onrender.com',
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Allow-Origin:', res.headers['access-control-allow-origin']);
        console.log('Body:', data);
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(JSON.stringify({ username: 'abc', password: 'def' }));
req.end();
