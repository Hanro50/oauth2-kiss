/**
 * oauth 2 (keep it simple stupids)
 * #Design goals:
 * >This will auto generate the end points that are needed. 
 * >Integrate with express
 * >create an end point a client browser can pull from to get the available list of client end points from
 * 
 */
exports.name = 'oauth2-kiss';

//Mark for merge into main project!
const clients = new Map();
const instances = new Map();
const fetch = require('node-fetch');
var unsafe = false;

/**
 * The redirect URL. Please set this first
 */
exports.redirect = "http://localhost:8080";

const fs = require('fs');
/**
 * The cache manager class
 */

exports.savefile = __dirname + '/usercache.json';
var FileCacheManager = class {
    constructor(path) {
        this.path = path;
        this.data = new Map();
        if (fs.existsSync(this.path)) {
            try {
                this.data = new Map(JSON.parse(fs.readFileSync(this.path)));
            } catch (e) {
                console.warn("Could not restore session cache into memort =>\n" + e)
            }
        }
    }

    add(sessionID, UserObj) {
        this.data.set(sessionID, UserObj);
        fs.writeFileSync(this.path, JSON.stringify(Array.from(this.data.entries()), "\n", " "))
    }

    get(sessionID) {
        if (!this.data.has(sessionID)) {
            console.log("cannot find" + sessionID);
            console.log(this.data);
        }
        return this.data.get(sessionID);
    }

    clean() {
        this.data.forEach((val, key) => {
            if (val.exp) {
                console.log(Math.floor(Date.now() / 1000) + " > " + val.exp)
                if (Math.floor(Date.now() / 1000) > val.exp) {
                    this.logout(key);
                }
            }
        })
    }

    logout(sessionID) {
        if (sessionID != null && sessionID != "null")
            console.log("logging out user with a session ID of " + sessionID);

        this.data.delete(sessionID);

        fs.writeFileSync(this.path, JSON.stringify(Array.from(this.data.entries()), "\n", " "))
    }




}
var cache;




/**
 * This property should be set before the INIT command is ran. It sets the cache manager class
 */
exports.cacheManger = FileCacheManager;



/**
 * What to do after a user has been processed
 */
exports.consumer = function(req, res, data, tokenID, instance) {

        //Perhaps someone will find the extra fields helpfull? I just don't feel like removing them
        cache.add(req.sessionID, data, tokenID, instance)
        res.redirect("/");

    }
    /**
     * The first version of the Init command. 
     * Aimed to be a turn key solution
     * @param {Express} app 
     */
exports.INIT0 = function(app, loginPage) {
    if (loginPage == null) {
        loginPage = "/auth/login";
        app.get("/auth/login", (req, res) => {
            var s = "<html><head><title>Sign in!</title></head><body>";
            instances.forEach((val, key) => {
                s += "<a href='" + val.callURI + "'>" + key + "</a><br>"
            })
            s += "</body></html>"
            res.writeHead(200, "text/html")
            res.write(s);
            res.end();
        })
    }

    var x = this.cacheManger;
    console.log("will use " + this.savefile)
    cache = new x(this.savefile);
    app.use("/*", (req, _res, next) => {
        req.loginPage = loginPage;
        if (String(req.baseUrl).startsWith('/auth') || String(req.baseUrl) == loginPage) {
            req.loggedIn = "true"
            return next();
        }

        console.log("call")
        var session = req.sessionID;
        if (session == null) {
            console.log("err1")
            return next();
        }
        var user = cache.get(session);
        if (user == null) {
            console.log("err2")
            return next();
        }
        req.user = user;
        req.loggedIn = "true"
        return next();
    })



    app.get("/auth/logins", (req, res) => {
        res.writeHead(200, "application/json")
        res.write(JSON.stringify(Array.from(instances.entries())));
        console.log(JSON.stringify(Array.from(instances.entries())))
        res.end();

    })

    app.get('/auth/logout', (req, res) => {
        res.writeHead(200, "application/json")
        res.write(JSON.stringify(Array.from(instances.entries())));
        cache.logout(req.sessionID)
        res.end();

    })

    cache.clean();
    //*/5 * * * *
    const cron = require('node-cron');
    cron.schedule('*/5 * * * *', function() {

        if (cache) {
            try {
                cache.clean();
            } catch (e) {
                console.error(e);
            }
        } else {
            console.warn("Cache manager not loaded")
        }


    });

}


/**
 * Disables various safety checks. 
 * Used when you want something to continue working even if there are errors.
 * NOT RECOMMENDED USE AT OWN RISK.
 */

exports.setUnsafe = () => {
    console.warn("Turned on unsafe mode. Please check your packages if you don't remember turning this on!")
    unsafe = true
};
/**
 * Registers a client with the required information
 * @param {string} id The internel ID of the client
 * @param {string} accessTokenUri 
 * @param {string} authorizationUri
 * @param {function UserInfo(token, consumer) {}} 
 */
exports.registerClient = function(id, accessTokenUri, authorizationUri, UserInfo) {
    if (clients.has(id.toLocaleLowerCase())) {
        if (!unsafe)
            throw ("The provided id was not unique!");
        else
            clients.delete(id.toLocaleLowerCase())
    }
    clients.set(id.toLocaleLowerCase(), {
        accessTokenUri: accessTokenUri,
        authorizationUri: authorizationUri,
        UserInfo: UserInfo
    })
}

exports.googleCompress = true;
//google
this.registerClient(
    'google',
    'https://www.googleapis.com/oauth2/v4/token',
    'https://accounts.google.com/o/oauth2/v2/auth',
    (token, consumer) => {
        var x = token.data.id_token
        fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + x).then(r => {
            // console.log(r)
            r.json().then(json => {
                if (this.googleCompress) {
                    json.iss = undefined;
                    json.azp = undefined;
                    json.sub = undefined;
                    json.iat = undefined;
                    json.alg = undefined;
                    json.kid = undefined;
                    json.typ = undefined;
                }
                consumer(json, x);
            });

        });
    });

//Microsoft_consumer
this.registerClient(
    'microsoft_consumer',
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    (token, consumer) => {
        console.log(token)
        endpoint = "https://graph.microsoft.com/oidc/userinfo"
        headers = { "Authorization": 'Bearer ' + token.accessToken }

        fetch(endpoint, { headers: headers }).then(response => response.json())
            .then(data => {
                //This can be changed since MS's default picture thing doesn't seem to work
                data.picture = "/MS_PFP.jpg"
                data.exp = Math.round(Date.now() / 1000) + Number(token.data.expires_in);
                consumer(data, token)
            });
    })


var ClientOAuth2 = require('client-oauth2');
/**
 * Registers a client and the needed end points
 * @param {Express} The express client needed to generate the needed end points
 * @param {string} provider The name of the provider (e.g google). Please register a client if you're using a custom provider
 * @param {string} clientID The client ID, get this from the web portal of the provider you're using.
 * @param {string} clientSecret The client secret, get this from the web portal of the provider you're using.
 @param {Array<string>} scopes The scopes for this client 
 * @param {string} name The is the physical name of this instance. <br> Used when generating the reference links. Must be unique and should contain no spaces
 */

exports.setup = (app, provider, clientID, clientSecret, scopes, name) => {
    if (instances.has(name.toLocaleLowerCase())) {
        if (!unsafe)
            throw ("The provided name was not unique!");
        else
            instances.delete(name.toLocaleLowerCase());
    }

    if (!clients.has(provider.toLocaleLowerCase())) {
        if (!unsafe)
            throw "Could not find provider " + provider.toLocaleLowerCase() + " in database";
        else {
            console.warn("Could not find provider " + provider.toLocaleLowerCase() + " in database")
            return;
        }
    }
    var providerInfo = clients.get(provider.toLocaleLowerCase());
    var localRedirect = '/auth/' + name.toLocaleLowerCase() + '/callback';
    var call = '/auth/' + name.toLocaleLowerCase();

    var client = new ClientOAuth2({
        clientId: clientID,
        clientSecret: clientSecret,
        accessTokenUri: providerInfo.accessTokenUri,
        authorizationUri: providerInfo.authorizationUri,
        redirectUri: this.redirect + localRedirect,
        scopes: scopes,
        response_type: "id_token"
    })

    app.get(call, function(req, res) {
        var uri = client.code.getUri()
        res.redirect(uri)
        res.end()
    })

    var consume = this.consumer;
    app.get(localRedirect, function(req, res) {
        client.code.getToken(req.originalUrl)
            .then(function(token) {
                // Sign API requests on behalf of the current user.
                token.sign({
                    method: 'get',
                    url: this.redirect
                })
                providerInfo.UserInfo(token, (data, tokenID) => consume(req, res, data, tokenID, name.toLocaleLowerCase()));
            })
    })
    console.log("Please be sure " + this.redirect + localRedirect + " is an allowed redirect!")

    instances.set(name.toLocaleLowerCase(), {
        name: name,
        callURI: call
    })




}
