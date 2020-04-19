/**
 * FOR THE MCGILL ANIME DISCORD, by Louis Mollick
 * Uses ZeroTwo Discord bot custom commands (https://zerotwo.bot/)
 */

const express = require('express');
const https = require('https');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
//app.use(bodyParser.urlencoded({ type: 'application/json', extended: true }));
app.use(express.json());
app.set('port', (process.env.PORT || 5000));

/**
 * CONSTANTS
 */

const REQUIRE_AUTH = true;
const responseText = "OK";
const AUTH_KEY = process.env.AUTH_KEY;
const TOKEN = process.env.TOKEN || 'token';
const MINEHUT_ID = process.env.MINEHUT_ID;
const MINEHUT_EMAIL = process.env.MINEHUT_EMAIL;
const MINEHUT_PASS = process.env.MINEHUT_PASS;

/**
 * ROUTES
 */

app.get('/', function (req, res) {
    res.send('Go away 凸ಠ益ಠ)凸');
});

app.post('/echo', function (req, res) {
    console.log(req);
    if (REQUIRE_AUTH && req.headers.authorization!= AUTH_KEY) return res.status(401).send('Unauthorized');
    console.log("Auth good ...");
    if (!req.body || !req.body.channel || !req.body.channel.channelId) return res.status(400).send('Bad Request');
    console.log("Validation good ...");

    // Echo back into same channel
    const channelId = req.body.channel.channelId;
    let sentence = "";
    req.body.arguments.forEach(word => {
        sentence = sentence + word + " ";
    });
    sendMessage(channelId, sentence, TOKEN);

    console.log("Sent message ...");

    // basic response to say we got er done
    res.send(responseText);
})

app.post('/minecraft/status', function (req, res) {
    console.log(req);
    if (REQUIRE_AUTH && req.headers.authorization!= AUTH_KEY) return res.status(401).send('Unauthorized');
    console.log("Auth good ...");
    if (!req.body || !req.body.channel || !req.body.channel.channelId) return res.status(400).send('Bad Request');
    console.log("Validation good ...");

    const channelId = req.body.channel.channelId;
    minehutLogin()
    .then(login =>{
        axios.get(`https://api.minehut.com/server/${MINEHUT_ID}/status`,
        { headers: 
            { 'Authorization': login.token, 'x-session-id' : login.sessionId } 
        })
        .then(res => {
            if (res.data.expired === "true") throw new Error("Authentication error when getting server status");
            if (!res.data.status || !res.data.status.status || !res.data.status.players) 
                throw new Error("General error when getting server status");

            let sentence = `Status : ${res.data.status.status} \nPlayers: `;
            if (res.data.status.players.length == 0) sentence += "No one is online :(";
            else {
                res.data.status.players.forEach(player => {
                    sentence += player + " ";
                });
            }
            sendMessage(channelId, sentence, TOKEN);
            console.log("Sent message ...");
        })
        .catch(err => {
            console.log(err);
            throw err;
        });
    })
    .then(() =>{
        res.send(responseText); // basic response to say we got er done
    })
    .catch(err => {
        console.log(err);
        res.status(500).send(err);
    });
});

app.post('/minecraft/start', function (req, res) {
    console.log(req);
    if (REQUIRE_AUTH && req.headers.authorization!= AUTH_KEY) return res.status(401).send('Unauthorized');
    console.log("Auth good ...");
    if (!req.body || !req.body.channel || !req.body.channel.channelId) return res.status(400).send('Bad Request');
    console.log("Validation good ...");

    const channelId = req.body.channel.channelId;
    minehutLogin()
    .then(login =>{
        axios.post(`https://api.minehut.com/server/${MINEHUT_ID}/start_service`,{},
        { headers: 
            { "Authorization" : login.token,
              "x-session-id" : login.sessionId } 
        }).then(res => {
            if (res.data.expired === "true") throw "Error when starting server"

            sendMessage(channelId, "Starting server... (it'll take a minute)", TOKEN);
            console.log("Sent message ...");
        })
        .catch(err =>{
            console.log(err);
            throw err;
        });
    })
    .then(() =>{
        res.send(responseText); // basic response to say we got er done
    })
    .catch(err => {
        console.log(err);
        res.status(500).send(err);
    });
});

app.listen(app.get('port'), function () {
    console.log('* Webhook service is listening on port:' + app.get('port'));
});

/**
 * FUNCTIONS
 */

async function minehutLogin(){
    const res = await axios.post('https://api.minehut.com/users/login', querystring.stringify({
        "email" : MINEHUT_EMAIL,
        "password" : MINEHUT_PASS
    }));
    if (res.data.token){
        console.log("Logged into Minehut!");
        return res.data;
    }
    else {
        console.log("Login error", res.data);
        throw "Error when logging into Minehut.";
    }
}

function sendMessage(channel, myMessage, token) {
    const data = JSON.stringify({
        channelId: channel,
        message : myMessage
    });

    const options = {
        hostname: 'api.zerotwo.bot',
        port: 443,
        path: '/guild/chat/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'X-ZeroTwo-Auth': token
        }
    }

    const req = https.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (error) => {
        console.error(error)
    });

    req.write(data);
    req.end();
}