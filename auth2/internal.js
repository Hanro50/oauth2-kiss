const cookieID = "auth_id"
const uuid = require('uuid').v4;
/**
 * Used to get the session id of a user
 * @param {request} req 
 * @returns
 */
function getSessionID(req) {
    var x = String(req.headers.cookie);
    var result = "";
    console.log(x)
    if (x.includes(';')) {
        var arr = x.split(';')
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].trim().startsWith(cookieID + "=")) {
                result = arr[i].trim();
                break;
            }
        }
    }
    else
        result = x;

    if (result.startsWith(cookieID + "=")) {
        console.log(result.substring((cookieID + "=").length).trim())
        return result.substring((cookieID + "=").length).trim();
    }
    return null;
}


exports.setsession = function(req, res,next){
    var session = getSessionID(req);
    if (session == null) {
        session = uuid();
        console.log("internal.js 111=>"+cookieID + "=" + session+";Max-Age=259200"+";Domain="+req.header('Host')+";Path=/");
        res.set('Set-Cookie', cookieID + "=" + session+";Max-Age=259200");
     }

     req.sessionID = session;
     next();
}