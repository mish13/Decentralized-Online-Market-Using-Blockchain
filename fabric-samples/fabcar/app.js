var express = require("express")
var http = require("http")
var path = require("path")
var ledgerAPI = require('./ledgerAPI')

var bodyParser = require("body-parser");
//var popup = require('popups');
var cookieParser = require("cookie-parser");
var multer = require('multer')
var upload = multer({ dest: './pictures' })
var move = require('./fileMovement');

var app = express()
app.use(cookieParser())

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser())

//static files
app.use(express.static('./'));
app.use(express.static('./views'));
app.use(express.static('./pictures'));

const server = http.createServer(app)

///////////////////////////////////////////
///////////////////////////
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

//
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
var peer = fabric_client.newPeer('grpc://localhost:7051');
channel.addPeer(peer);
var order = fabric_client.newOrderer('grpc://localhost:7050')
channel.addOrderer(order);

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:' + store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    // get the enrolled user from persistence, this user will sign all requests
    return fabric_client.getUserContext('user1', true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded user1 from persistence, now you can start using this network');
        member_user = user_from_store;
    } else {
        throw new Error('Failed to get user1.... run registerUser.js');
    }
})
///////////////////////////////////////////


// var users =[{id:1,name:'anam',email:'anamibnaharun@gmail.com',password:'anam'}];

app.get('/sell', (req, res) => {
    if (req.cookies.userID == null){
        //window.alert("Log in first!")
        res.redirect('/login');
    } else {
        res.render('sell.hbs', {
        pageTitle: 'Upload Product',
        // message : 'nothing,hbs'
        //message : "<div class="alert"><span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> Successful</div>"
    });

    }
    //res.send(users);
})

app.get('/', (req, res) => {
    res.clearCookie('userID')
    res.render('homepage.hbs');
    //res.send(users);
})

app.get('/register', (req, res) => {
    if (req.cookies.userID == null) res.render('register.hbs');
    else res.redirect('/homepage')
    //res.send(users);
})

app.get('/login', (req, res) => {
    if (req.cookies.userID == null) res.render('login.hbs');
    else res.redirect('/homepage');
    //res.send(users);
})

app.get('/logout', (req, res) => {
    res.clearCookie('userID');
    res.render('homepage.hbs');
    // res.sendFile(path.join(__dirname + '/homepage.html'));
    //res.send(users);
})


app.get('/homepage', (req, res) => {
    res.render('homepage.hbs', {
        pageTitle: 'Online Shop'
    });
})

app.get('/profile', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    if (req.cookies.userID == null) {
        //popup.alert({
        //    content: 'Please login first!'
        //});
        console.log("Response is ", req.cookies.userID);
        res.render('login.hbs');
    } else {
        const request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'fabcar',
            fcn: 'userDetail',
            args: [req.cookies.userID]
        };

        // send the query proposal to the peer
        ledgerAPI.query(channel, request).then((query_responses) => {
            console.log("Query has completed, checking results");
            // query_responses could have more than one  results if there multiple peers were used as targets
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                } else {
                    var responseData = query_responses[0].toString();
                    var result = JSON.parse(responseData);
                    console.log("Response is ", req.cookies.userID);
                    console.log("Response is ", result.values[0].Record);
                    //res.cookie('userID', result.userID);
                    //res.send("Token, Key: "+query_responses[0].toString())
                    //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                    //res.redirect('/homepage');
                    res.render('profile.hbs', {
                        ResponseData: responseData,
                        Result: result.values[0].Record,
                        View: 'User'
                    });
                }
            } else {
                console.log("No payloads were returned from query");
            }
        }).catch((err) => {
            console.error('Failed to query successfully :: ' + err);
        });

    }

})

app.get('/profile/:UserID', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
        const request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'fabcar',
            fcn: 'userDetail',
            args: [req.params.UserID]
        };

        // send the query proposal to the peer
        ledgerAPI.query(channel, request).then((query_responses) => {
            console.log("Query has completed, checking results");
            // query_responses could have more than one  results if there multiple peers were used as targets
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                } else {
                    var responseData = query_responses[0].toString();
                    var result = JSON.parse(responseData);
                    //console.log("Response is ", req.cookies.userID);
                    //console.log("Response is ", result.values[0].Record);
                    //res.cookie('userID', result.userID);
                    //res.send("Token, Key: "+query_responses[0].toString())
                    //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                    //res.redirect('/homepage');
                    res.render('sellerProfile.hbs', {
                        ResponseData: responseData,
                        Result: result.values
                    });
                }
            } else {
                console.log("No payloads were returned from query");
            }
        }).catch((err) => {
            console.error('Failed to query successfully :: ' + err);
        });

})


///////////////////////////////

app.get('/seller/:OwnerID', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'userDetail',
        args: [req.params.OwnerID]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                //res.redirect('/homepage');
                res.render('profile.hbs', {
                    ResponseData: responseData,
                    Result: result.values[0].Record,
                    View: ''
                });
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

///////////////////////////////


//Upload a Product @vi
app.post('/sell', upload.single('productPic'), (req, res, next) => {
    var newPath = "./pictures/" + Date.now() + "/" + req.file.originalname;
    move(req.file.path, newPath).then(() =>{
        const product = {
            name: req.body.name,
            category: req.body.category,
            description: req.body.description,
            price: req.body.price,
            id: req.cookies.userID,
            picturePath: newPath
        };
        //console.log(user.name);
        // get a transaction id object based on the current user assigned to fabric client
        tx_id = fabric_client.newTransactionID();
        console.log("Assigning transaction_id: ", tx_id._transaction_id);
    
        // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
        // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
        // must send the proposal to endorsing peers
        var request = {
            //targets: let default to the peer assigned to the client
            chaincodeId: 'fabcar',
            fcn: 'uploadProduct',
            args: [product.name, product.category, product.description, product.price, product.id, product.picturePath],
            chainId: 'mychannel',
            txId: tx_id
        };
    
        // send the transaction proposal to the peers
        ledgerAPI.invoke(channel, request, peer).then((results) => {
            console.log('Send transaction promise and event listener promise have completed');
            // check the results in the order the promises were added to the promise all list
            if (results && results[0] && results[0].status === 'SUCCESS') {
                console.log('Successfully sent transaction to the orderer.');
            } else {
                console.error('Failed to order the transaction. Error code: ' + results[0].status);
            }
    
            if (results && results[1] && results[1].event_status === 'VALID') {
                console.log('Successfully committed the change to the ledger by the peer');
                res.render('sell.hbs', {
                    pageTitle: 'Upload Product',
                    success: 'upload successful'
                });
                // console.log("Response is ", results[0].toString());
    
            } else {
                res.render('sell.hbs', {
                    pageTitle: 'Upload Product',
                    error: 'Product not uploaded'
                });
                console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
            }
        }).catch((err) => {
            console.error('Failed to invoke successfully :: ' + err);
        });
    
        ///////////////////////////
    
        // users.push(user);
        // what you want to show after calculation
        console.log(req.body.name);
        // which you want to show .
        // a message
        // res.send(user);
    })
    
})

app.post('/register', upload.single('uploadPicture'), (req, res, next) => {
    var newPath = "./pictures/" + Date.now() + "/" + req.file.originalname;
    move(req.file.path, newPath).then(() => {

        const user = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password,
            address: req.body.address,
            contactNo: req.body.contactNo,
            profilePicPath : newPath
        };

        //
        // get a transaction id object based on the current user assigned to fabric client
        tx_id = fabric_client.newTransactionID();
        console.log("Assigning transaction_id: ", tx_id._transaction_id);

        // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
        // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
        // must send the proposal to endorsing peers
        var request = {
            //targets: let default to the peer assigned to the client
            chaincodeId: 'fabcar',
            fcn: 'register',
            args: [user.firstName, user.lastName, user.address, user.contactNo, user.email, user.password,  user.profilePicPath],
            chainId: 'mychannel',
            txId: tx_id
        };

        ledgerAPI.invoke(channel, request, peer).then((results) => {
            console.log('Send transaction promise and event listener promise have completed');
            // check the results in the order the promises were added to the promise all list
            if (results && results[0] && results[0].status === 'SUCCESS') {
                console.log('Successfully sent transaction to the orderer.');
            } else {
                console.error('Failed to order the transaction. Error code: ' + results[0].status);
            }

            if (results && results[1] && results[1].event_status === 'VALID') {
                console.log('Successfully committed the change to the ledger by the peer');
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>' + user.firstName +' ' + user.lastName + ', you are registered</h2></form></div></body></html>');
                // console.log("Response is ", results[0].toString());
                res.redirect('/homepage')
            } else {
                console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
            }
        }).catch((err) => {
            console.error('Failed to invoke successfully :: ' + err);
        });

        ///////////////////////////

        // users.push(user);
        // what you want to show after calculation
        console.log(req.body.name);
        // which you want to show .
        // a message
        // res.send(user);

    })
})

app.post('/updateProfile', (req, res) => {

    const user = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        address: req.body.address,
        contactNo: req.body.contactNo

    };

    //
    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
    // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
    // must send the proposal to endorsing peers
    var request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'fabcar',
        fcn: 'register',
        args: [user.firstName, user.lastName, user.email, user.password, user.address, user.contactNo],
        chainId: 'mychannel',
        txId: tx_id
    };

    ledgerAPI.invoke(channel, request, peer).then((results) => {
        console.log('Send transaction promise and event listener promise have completed');
        // check the results in the order the promises were added to the promise all list
        if (results && results[0] && results[0].status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
        } else {
            console.error('Failed to order the transaction. Error code: ' + results[0].status);
        }

        if (results && results[1] && results[1].event_status === 'VALID') {
            console.log('Successfully committed the change to the ledger by the peer');
            //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>' + user.firstName +' ' + user.lastName + ', you are registered</h2></form></div></body></html>');
            // console.log("Response is ", results[0].toString());
            res.redirect('/homepage');
        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });

    ///////////////////////////

    // users.push(user);
    // what you want to show after calculation
    console.log(req.body.name);
    // which you want to show .
    // a message
    // res.send(user);
})

app.post('/logout', (req, res) => {

    const user = {
        userID: req.body.userID,
    };
    var uID = req.cookies.userID;
    res.clearCookie('uID')
    setTimeout(() => {
        res.redirect('/');
    }, 1000);
    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
    // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
    // must send the proposal to endorsing peers
    var request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'fabcar',
        fcn: 'logout',
        args: [user.userID],
        chainId: 'mychannel',
        txId: tx_id
    };

    // send the transaction proposal to the peers
    ledgerAPI.invoke(channel, request, peer).then((results) => {
        console.log('Send transaction promise and event listener promise have completed');
        // check the results in the order the promises were added to the promise all list
        if (results && results[0] && results[0].status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
        } else {
            console.error('Failed to order the transaction. Error code: ' + results[0].status);
        }

        if (results && results[1] && results[1].event_status === 'VALID') {
            console.log('Successfully committed the change to the ledger by the peer');
            res.send("Logout Successful");
            res.redirect('/homepage');
            // console.log("Response is ", results[0].toString());

        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });

    ///////////////////////////

    // users.push(user);
    // what you want to show after calculation
    console.log(req.body.name);
    // which you want to show .
    // a message
    // res.send(user);
})

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'login',
        args: [user.email, user.password]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result.values[0].Record.FirstName);
                if (result != null) {
                    res.cookie('userID', result.values[0].Record.UserID);
                    console.log("Cookie is ", result.values[0].Record.UserID);
                }
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})


app.post('/category/:ProductCategory/:ProductID/buy', (req, res) => {

    //
    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
    // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
    // must send the proposal to endorsing peers
    var request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'fabcar',
        fcn: 'purchaseProduct',
        args: [req.params.ProductID, req.cookies.userID],
        chainId: 'mychannel',
        txId: tx_id
    };

    ledgerAPI.invoke(channel, request, peer).then((results) => {
        console.log('Send transaction promise and event listener promise have completed');
        // check the results in the order the promises were added to the promise all list
        if (results && results[0] && results[0].status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
        } else {
            console.error('Failed to order the transaction. Error code: ' + results[0].status);
        }

        if (results && results[1] && results[1].event_status === 'VALID') {
            console.log('Successfully committed the change to the ledger by the peer');
            //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>' + user.firstName +' ' + user.lastName + ', you are registered</h2></form></div></body></html>');
            // console.log("Response is ", results[0].toString());
            res.redirect('/homepage');
        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });

    ///////////////////////////

    // users.push(user);
    // what you want to show after calculation
    console.log(req.body.name);
    // which you want to show .
    // a message
    // res.send(user);
})



app.get('/category', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'getCategory',
        args: []
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.render('category.hbs', {
                    ResponseData: responseData,
                    Result: result.values
                });
                //res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

app.get('/sold', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    if (req.cookies.userID == null){
        //window.alert("Log in first!")
        res.redirect('/login');
    } else {
        const request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'fabcar',
            fcn: 'getSoldNotification',
            args: [req.cookies.userID]
        };
    
        // send the query proposal to the peer
        ledgerAPI.query(channel, request).then((query_responses) => {
            console.log("Query has completed, checking results");
            // query_responses could have more than one  results if there multiple peers were used as targets
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                } else {
                    var responseData = query_responses[0].toString();
                    var result = JSON.parse(responseData);
                    console.log("Response is ", result);
                    //res.cookie('userID', result.userID);
                    //res.send("Token, Key: "+query_responses[0].toString())
                    //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                    res.render('soldNotification.hbs', {
                        ResponseData: responseData,
                        Result: result.values
                    });
                    //res.redirect('/homepage');
                }
            } else {
                console.log("No payloads were returned from query");
            }
        }).catch((err) => {
            console.error('Failed to query successfully :: ' + err);
        });
    }
    

})

app.get('/purchased', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    if (req.cookies.userID == null){
        //window.alert("Log in first!")
        res.redirect('/login');
    } else {
        const request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'fabcar',
            fcn: 'getPurchasedNotification',
            args: [req.cookies.userID]
        };
    
        // send the query proposal to the peer
        ledgerAPI.query(channel, request).then((query_responses) => {
            console.log("Query has completed, checking results");
            // query_responses could have more than one  results if there multiple peers were used as targets
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                } else {
                    var responseData = query_responses[0].toString();
                    var result = JSON.parse(responseData);
                    console.log("Response is ", result);
                    //res.cookie('userID', result.userID);
                    //res.send("Token, Key: "+query_responses[0].toString())
                    //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                    res.render('purchasedNotification.hbs', {
                        ResponseData: responseData,
                        Result: result.values
                    });
                    //res.redirect('/homepage');
                }
            } else {
                console.log("No payloads were returned from query");
            }
        }).catch((err) => {
            console.error('Failed to query successfully :: ' + err);
        });
    }
    


})

app.get('/category/:ProductCategory/:ProductID', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'productDetail',
        args: [req.params.ProductID]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.render('prodDetail.hbs', {
                    ResponseData: responseData,
                    Result: result.values
                });
                //res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

app.get('/category/:ProductCategory', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'getProductByCategory',
        args: [req.params.ProductCategory]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.render('showProduct.hbs', {
                    ResponseData: responseData,
                    Result: result.values
                });
                //res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

app.post('/category/:ProductCategory', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'getProductByCategory',
        args: [req.params.ProductCategory]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.render('showProd.hbs', {
                    ResponseData: responseData,
                    Result: result.values
                });
                //res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

app.get('/profile', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'userDetail',
        args: [req.cookies.userID]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                console.log("Response is ", result);
                //res.cookie('userID', result.userID);
                //res.send("Token, Key: "+query_responses[0].toString())
                //res.send('<!DOCTYPE html><html><head><title>Login</title><meta charset="UTF-8\"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="style.css"></head><body class="login"><form method="post" action="/registerd"><div class="loginBox" style="height: 68%; top: 60%; margin-top: 15%"><img src="user.png" class="user"><h2>This profile belongs to <br>' + user.email + '</h2></form></div></body></html>');
                res.redirect('/homepage');
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})

app.get('/getCategory', (req, res) => {
    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'getCategory',
        args: []
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {
                var responseData = query_responses[0].toString();
                var result = JSON.parse(responseData);
                //res.send(responseData);
                res.render('profile.hbs', {
                    Result: result
                });
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

})


server.listen(3000, err => {
    if (err) {
        throw err
    }
    console.log('server started on port 3000');
})