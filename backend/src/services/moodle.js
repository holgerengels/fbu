const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');

let settingsPath = path.join(__dirname, '../../../config/settings.json');
let settings = {};
try {
    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
} catch (err) {
    console.warn(`[Moodle] Warning: ${err.message}`);
}

const moodleConfig = settings.moodle || {};

/**
 * Fetch profiles from Fachnetz Moodle via session-based login and report download.
 * Follows the same flow as Fachnetz.java:
 * 1. GET login page → extract logintoken
 * 2. POST login with credentials
 * 3. GET user page → extract sesskey
 * 4. GET report as HTML → parse table rows
 */
async function fetchProfiles() {
    const baseUrl = (moodleConfig.url || '').replace(/\/$/, '');
    const plogin = (moodleConfig.plogin || 'login/index.php').replace(/^\//, '');
    const puser = (moodleConfig.puser || 'admin/user.php').replace(/^\//, '');
    const preport = (moodleConfig.preport || 'reportbuilder/download.php').replace(/^\//, '');
    const user = moodleConfig.user || '';
    const password = moodleConfig.password || '';

    if (!baseUrl || !user || !password) {
        throw new Error('Moodle configuration incomplete (url, user, password required)');
    }

    // Create axios client with cookie jar for session management
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        withCredentials: true,
        maxRedirects: 5,
        headers: {
            'User-Agent': 'FachberaterApp/1.0'
        }
    }));

    // Step 1: Get login page and extract logintoken
    console.log('[Moodle] Fetching login page...');
    const loginPageResponse = await client.get(`${baseUrl}/${plogin}`);
    const $login = cheerio.load(loginPageResponse.data);
    const logintoken = $login('input[name=logintoken]').attr('value');
    console.log(`[Moodle] logintoken = ${logintoken}`);

    // Step 2: POST login credentials
    console.log('[Moodle] Logging in...');
    const params = new URLSearchParams();
    params.append('username', user);
    params.append('password', password);
    params.append('logintoken', logintoken);

    await client.post(`${baseUrl}/${plogin}`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Step 3: Get user page and extract sesskey
    console.log('[Moodle] Fetching sesskey...');
    const userPageResponse = await client.get(`${baseUrl}/${puser}`);
    const $user = cheerio.load(userPageResponse.data);
    const sesskey = $user('input[name=sesskey]').attr('value');
    console.log(`[Moodle] sesskey = ${sesskey}`);

    // Step 4: Download report as HTML
    console.log('[Moodle] Downloading report...');
    const reportUrl = `${baseUrl}/${preport}?id=27&download=html&parameters=%7B%22withcheckboxes%22%3Atrue%7D&sesskey=${sesskey}`;
    const reportResponse = await client.get(reportUrl);

    // Step 5: Parse HTML table
    // Columns: 0=anmeldename, 1=email, 2=vollständiger Name (link→moodleId),
    //          3=nachname, 4=vorname, 5=schulname, 6=schulort, 7=rp,
    //          8-11=fach1-4
    const $ = cheerio.load(reportResponse.data);
    const profiles = [];
    let first = true;

    $('tr').each((i, tr) => {
        if (first) {
            first = false;
            return;
        }
        const cells = $(tr).children('td');
        if (cells.length < 8) return;

        const profile = {
            anmeldename: $(cells[0]).text().trim(),
            email: $(cells[1]).text().trim(),
            nachname: $(cells[3]).text().trim(),
            vorname: $(cells[4]).text().trim(),
            schulname: $(cells[5]).text().trim(),
            schulort: $(cells[6]).text().trim(),
            rp: $(cells[7]).text().trim(),
            faecher: [
                cells[8] ? $(cells[8]).text().trim() : '',
                cells[9] ? $(cells[9]).text().trim() : '',
                cells[10] ? $(cells[10]).text().trim() : '',
                cells[11] ? $(cells[11]).text().trim() : ''
            ].filter(Boolean)
        };

        // Extract moodleId from link in "vollständiger Name" column (index 2)
        const link = $(cells[2]).find('a').attr('href');
        if (link) {
            const param = link.substring(link.indexOf('?') + 1);
            profile.moodleId = param.substring(param.indexOf('=') + 1);
        }

        profiles.push(profile);
    });

    console.log(`[Moodle] Fetched ${profiles.length} profiles`);
    return profiles;
}

/**
 * Update a user profile in Moodle via REST API (core_user_update_users)
 */
async function updateUser(userId, fields) {
    const baseUrl = (moodleConfig.url || '').replace(/\/$/, '');
    const servicePath = (moodleConfig.servicepath || 'webservice/rest/server.php').replace(/^\//, '');
    const serviceToken = moodleConfig.servicetoken || '';
    const serviceFunction = moodleConfig.servicefunction || 'core_user_update_users';

    if (!baseUrl || !serviceToken) {
        throw new Error('Moodle service configuration incomplete (url, servicetoken required)');
    }

    const params = new URLSearchParams();
    params.append('wstoken', serviceToken);
    params.append('wsfunction', serviceFunction);
    params.append('moodlewsrestformat', 'json');
    params.append('users[0][id]', userId);

    let fieldIndex = 0;
    for (const [key, value] of Object.entries(fields)) {
        // Standard Moodle user fields
        if (['email', 'firstname', 'lastname', 'city', 'institution'].includes(key)) {
            params.append(`users[0][${key}]`, value);
        } else {
            // Custom profile fields
            params.append(`users[0][customfields][${fieldIndex}][type]`, key);
            params.append(`users[0][customfields][${fieldIndex}][value]`, value);
            fieldIndex++;
        }
    }

    const url = `${baseUrl}/${servicePath}`;
    const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.data && response.data.exception) {
        throw new Error(`Moodle API error: ${response.data.message}`);
    }

    return response.data;
}

module.exports = { fetchProfiles, updateUser };
