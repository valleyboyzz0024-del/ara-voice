/**
 * Test for Google Auth fix - ensuring auth object works directly with google.sheets()
 */

const { google } = require('googleapis');

describe('Google Auth Integration', () => {
  
  describe('getSheetData function fix', () => {
    test('should work with GoogleAuth constructor (keyFile approach)', () => {
      // This simulates the case when keyFile is used
      const auth = new google.auth.GoogleAuth({
        keyFile: 'non-existent-file.json', // File doesn't need to exist for this test
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
      });
      
      // The fix: pass auth directly instead of calling getClient()
      expect(() => {
        const sheets = google.sheets({ version: "v4", auth: auth });
        expect(typeof sheets).toBe('object');
        expect(sheets.spreadsheets).toBeDefined();
      }).not.toThrow();
    });

    test('should work with fromJSON approach (GOOGLE_CREDENTIALS env var)', () => {
      // This simulates the case when GOOGLE_CREDENTIALS is used
      const mockCredentials = {
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      };
      
      let auth;
      expect(() => {
        auth = google.auth.fromJSON(mockCredentials);
      }).not.toThrow();
      
      // The key issue: fromJSON returns an object WITHOUT getClient() method
      expect(typeof auth.getClient).toBe('undefined');
      
      // The fix: pass auth directly instead of calling getClient()
      expect(() => {
        const sheets = google.sheets({ version: "v4", auth: auth });
        expect(typeof sheets).toBe('object');
        expect(sheets.spreadsheets).toBeDefined();
      }).not.toThrow();
    });

    test('getClient method availability varies by auth type', () => {
      // GoogleAuth constructor has getClient method
      const auth1 = new google.auth.GoogleAuth({
        keyFile: 'test.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
      });
      expect(typeof auth1.getClient).toBe('function');
      
      // fromJSON does NOT have getClient method
      const mockCredentials = {
        type: 'service_account',
        project_id: 'test',
        private_key_id: 'test',
        private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test.iam.gserviceaccount.com',
        client_id: 'test',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token'
      };
      
      const auth2 = google.auth.fromJSON(mockCredentials);
      expect(typeof auth2.getClient).toBe('undefined');
    });
  });
});