import { config } from './config';

/**
 * Diagnostic Logger ensuring strict formatting
 */
const logSection = (title) => {
    console.log(`\n%c${'='.repeat(50)}\n ${title} \n${'='.repeat(50)}`, 'background: #222; color: #bada55; font-size: 14px; font-weight: bold;');
};

const logAction = (label, details) => {
    console.log(`%c[${label}]`, 'color: #007acc; font-weight: bold;', details);
};

const logError = (label, details) => {
    console.log(`%c[${label}]`, 'color: #ff4444; font-weight: bold;', details);
};

const formatBody = (body) => {
    if (!body) return 'NONE';
    if (typeof body === 'string') return body;
    return JSON.stringify(body, null, 2);
};

/**
 * Main Diagnostic Function
 */
export async function runApiDiagnostics(mobileNo, password) {
    logSection("STARTING COMLETE API DIAGNOSIS");
    
    // ---------------------------------------------------------
    // STEP 1: LOGIN API
    // ---------------------------------------------------------
    const loginUrl = `${config.apiBaseUrl}/api/auth/login`;
    const loginPayload = { mobileNo, password };
    
    logSection("ACTION 1: LOGIN API");
    logAction("API TYPE", "POST");
    logAction("URL", loginUrl);
    logAction("PARAMETERS PASSED (Body)", loginPayload);
    logAction("HEADERS", {
        'Content-Type': 'application/json'
    });

    let token = null;

    try {
        const startTime = Date.now();
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginPayload),
        });
        const duration = Date.now() - startTime;

        logAction("RESPONSE TIME", `${duration}ms`);
        logAction("RESPONSE STATUS", loginResponse.status);
        
        const loginData = await loginResponse.json();
        logAction("RESPONSE DATA", loginData);

        if (loginResponse.ok) {
            logAction("RESULT", "SUCCESS");
            
            // Extract Token logic (mirrored from main app)
            if (loginData.data && typeof loginData.data === 'object' && !Array.isArray(loginData.data)) {
                 token = loginData.data.token;
            } else {
                 token = loginData.token || loginData.jwt || loginData.accessToken;
                 if (!token && loginData.data && typeof loginData.data === 'string') {
                     token = loginData.data;
                 }
            }

            if (token) {
                logAction("TOKEN EXTRACTED", token);
                
                // Decode token for debugging
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    logAction("TOKEN PAYLOAD", payload);
                    logAction("TOKEN EXPIRY", new Date(payload.exp * 1000).toLocaleString());
                } catch (e) {
                    logError("TOKEN PARSE ERROR", "Could not decode JWT payload");
                }

            } else {
                logError("TOKEN EXTRACTION", "FAILED - No token found in response");
                return; // Stop here
            }

        } else {
            logError("RESULT", "FAILED");
            return; // Stop here
        }

    } catch (error) {
        logError("EXCEPTION", error);
        return;
    }

    // ---------------------------------------------------------
    // STEP 2: GET CATEGORY API
    // ---------------------------------------------------------
    if (!token) return;

    const categoryUrl = `${config.apiBaseUrl}/api/category/get`;
    // Clean token
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

    logSection("ACTION 2: GET CATEGORY API (Attempt 1: Standard Bearer)");
    logAction("API TYPE", "POST");
    logAction("URL", categoryUrl);
    
    let isCategorySuccess = false;

    try {
        const startTime = Date.now();
        const catResponse = await fetch(categoryUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({})
        });
        const duration = Date.now() - startTime;

        logAction("RESPONSE TIME", `${duration}ms`);
        logAction("RESPONSE STATUS", catResponse.status);

        const text = await catResponse.text();
        let catData; 
        try { catData = JSON.parse(text); } catch(e) { catData = text; }

        if (catResponse.ok && catData.response !== '0' && catData.response !== 0) {
            logAction("RESULT", "SUCCESS");
            logAction("RESPONSE BODY", catData);
            isCategorySuccess = true;
        } else {
            logError("RESULT", "FAILED");
            logError("ERROR RESPONSE BODY", catData);
        }

    } catch (error) {
        logError("EXCEPTION", error);
    }

    // ---------------------------------------------------------
    // STEP 3: RETRY WITHOUT BEARER (If Step 2 Failed)
    // ---------------------------------------------------------
    if (!isCategorySuccess) {
        logSection("ACTION 3: GET CATEGORY API (Attempt 2: Raw Token)");
        logAction("INFO", "Retrying without 'Bearer' prefix in Authorization header");
        
        try {
            const catResponse = await fetch(categoryUrl, {
                method: 'POST',
                headers: {
                    'Authorization': cleanToken, // Raw token
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const text = await catResponse.text();
            let catData; 
            try { catData = JSON.parse(text); } catch(e) { catData = text; }
            
            logAction("RESPONSE STATUS", catResponse.status);

            if (catResponse.ok && catData.response !== '0' && catData.response !== 0) {
                logAction("RESULT", "SUCCESS (Raw Token Worked!)");
                logAction("RESPONSE BODY", catData);
                console.log("%c[FIX FOUND] The server requires the token WITHOUT 'Bearer'. Please update the code.", "background: yellow; color: black; font-size: 14px;");
            } else {
                logError("RESULT", "FAILED (Raw Token also failed)");
                logError("ERROR RESPONSE BODY", catData);
            }

        } catch (error) {
            logError("EXCEPTION", error);
        }
    }

    logSection("DIAGNOSIS COMPLETE");
}
