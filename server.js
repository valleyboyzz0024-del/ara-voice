async function getGoogleAuth() {
    try {
        if (process.env.GOOGLE_CREDENTIALS) {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            
            // Check if credentials contain a client_email and private_key (service account format)
            if (credentials.client_email && credentials.private_key) {
                return new google.auth.GoogleAuth({
                    credentials: credentials,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
            } 
            // If it's a token or other format, try to create a JWT client directly
            else if (credentials.access_token || credentials.refresh_token) {
                const oAuth2Client = new google.auth.OAuth2();
                oAuth2Client.setCredentials(credentials);
                return oAuth2Client;
            }
            // As a fallback, try the old method
            else {
                const client = google.auth.fromJSON(credentials);
                // If this doesn't have getClient, create a wrapper that does
                if (!client.getClient) {
                    return {
                        getClient: async () => client,
                    };
                }
                return client;
            }
        }
        
        // Fallback to file-based credentials
        return new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    } catch (error) {
        console.error("Error creating Google Auth client:", error);
        console.error("Credentials structure:", 
            process.env.GOOGLE_CREDENTIALS ? 
            JSON.stringify(Object.keys(JSON.parse(process.env.GOOGLE_CREDENTIALS))) : 
            "No credentials found");
        return null;
    }
}