import Database from 'better-sqlite3';
import path from 'path';
import https from 'https';

const dbPath = path.join(process.env.APPDATA || '', 'TradeSlate', 'tradeslate.db');
console.log('Connecting to DB:', dbPath);

const db = new Database(dbPath, { readonly: true });

try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined;

    if (!row) {
        console.error('Error: API Key not found in DB!');
        process.exit(1);
    }

    let apiKey = '';
    try {
        // Try parsing as JSON first
        const parsed = JSON.parse(row.value);
        if (parsed.value) apiKey = parsed.value;
        else apiKey = row.value; // Fallback
    } catch {
        apiKey = row.value; // It's a raw string
    }

    console.log('API Key retrieved (first 5 chars):', apiKey.substring(0, 5) + '...');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log('Fetching models from:', url);

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
                    json.models.forEach((m: any) => {
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
        });
    }).on('error', (err) => {
        console.error('Request Error:', err.message);
    });

} catch (err: any) {
    console.error('DB Error:', err.message);
} finally {
    db.close();
}
