const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n--- Gemini Model Checker ---');
console.log('We cannot access the database directly due to Node.js version mismatch.');
console.log('Please paste your Gemini API Key below to check available models.');

rl.question('API Key: ', (apiKey) => {
    apiKey = apiKey.trim();
    if (!apiKey) {
        console.error('No API Key provided.');
        rl.close();
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log('\nFetching models from Google API...');

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    console.error('API Error:', JSON.stringify(json.error, null, 2));
                } else if (json.models) {
                    console.log('\n=== AVAILABLE MODELS ===');
                    json.models.forEach((m) => {
                        console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
                    });
                    console.log('========================\n');
                } else {
                    console.log('Unexpected response:', data);
                }
            } catch (e) {
                console.error('Failed to parse response:', e);
                console.log('Raw response:', data);
            }
            rl.close();
        });
    }).on('error', (err) => {
        console.error('Request Error:', err.message);
        rl.close();
    });
});
