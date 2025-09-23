const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// =================================================================
// THIS IS THE CORRECTED AUTHENTICATION FUNCTION
// =================================================================
async function getGoogleAuth() {
    try {
        if (!process.env.GOOGLE_CREDENTIALS) {
            throw new Error("GOOGLE_CREDENTIALS environment variable is not set.");
        }

        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        // Standard and recommended method for server-to-server authentication
        if (credentials.client_email && credentials.private_key) {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            // The GoogleAuth object itself can be used to get an authorized client
            return auth;
        } 
        
        // Handling for OAuth2 tokens (less common for backend services but kept for flexibility)
        else if (credentials.access_token || credentials.refresh_token) {
            const oAuth2Client = new google.auth.OAuth2();
            oAuth2Client.setCredentials(credentials);
            return oAuth2Client;
        }

        // If credentials are not in a recognized format, throw a clear error
        else {
            throw new Error("The provided GOOGLE_CREDENTIALS are not in a recognized format (Service Account or OAuth2 token).");
        }

    } catch (error) {
        console.error("Error creating Google Auth client:", error.message);
        // Log the structure of the credentials without exposing sensitive values
        if (process.env.GOOGLE_CREDENTIALS) {
            try {
                const credKeys = Object.keys(JSON.parse(process.env.GOOGLE_CREDENTIALS));
                console.error("Credential keys found:", JSON.stringify(credKeys));
            } catch (parseError) {
                console.error("Could not parse GOOGLE_CREDENTIALS.");
            }
        }
        // Return null or re-throw to ensure the app doesn't continue with a broken auth object
        return null;
    }
}


// =================================================================
// YOUR SERVER LOGIC (Example - please adapt to your needs)
// =================================================================

// This is an example route. You will need to add your actual app logic here.
app.get('/', (req, res) => {
    res.send('Ara-Voice server is running. Ready to connect to Google Sheets.');
});

// Example route to test sheets access
app.get('/test-sheets', async (req, res) => {
    try {
        const auth = await getGoogleAuth();
        if (!auth) {
            return res.status(500).send("Authentication failed. Check server logs.");
        }
        
        // This is how you get the authorized client for making API calls
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // Replace with your Spreadsheet ID and range
        const spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE';
        const range = 'Sheet1!A1:B2';

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        res.json(response.data.values);

    } catch (error) {
        console.error("Error accessing Google Sheets:", error);
        res.status(500).send('Error connecting to Google Sheets. Check server logs.');
    }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});