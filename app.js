var express = require('express'),
    app = express(),
    connect = require('connect'),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs'),
    mysql = require('mysql'),
    sha1 = require('sha1'),
    session = require('cookie-session'), // Charge le middleware de session
    bodyParser = require('body-parser'), // Charge le middleware de gestion des paramètres
    urlencodedParser = bodyParser.urlencoded({ extended: true });
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

var port = 8080;

app.configure(function () {
    app.use('/views', express.static('views'))
    .use(require("express").static('data'))
    /* On utilise les sessions */
    .use(session({
        secret: "online",
        resave: true,
        saveUninitialized: true
    }))
    /* S'il n'y a pas de login session,
    on en crée une vide sous forme d'array avant la suite */
    .use(function(req, res, next){
        if (typeof(req.session.log) == 'undefined') {
            req.session.log = {};
            req.session.log.login = false;
        }
        next();
    });
})

var session_data = {};


//var config = require('./config.js'); // get our config file
var db = require('./app/models/user.js'); // get our model
    

//Connection à la base de données
var connection = mysql.createPool({
  host : 'localhost',
  user : 'projet_info',
  password : 'azerty',
  database : 'espace_membre'
});


// Chargement de la page index.html
app.get('/', function (req, res) {
    if (req.session.log.login) {
        res.redirect('/chat');
    }
    else {
        res.sendfile(__dirname + '/views/accueil.html');
    }
});


app.post('/register_member', urlencodedParser, function (req,res) {
    data = {
        pseudo: req.body.pseudo,
        pass: req.body.pass
    };

    var membre = new db.Membre(data.pass, sha1(data.pass));
    membre.save();

    req.session.log.pseudo = data.pass;
    req.session.log.login = true;
    session_data.pseudo = data.pseudo;
    res.redirect('/chat');
});

app.post('/log_in', urlencodedParser, function (req, res) {

    if (req.body.pseudo_connection != '') {
        data = {
            pseudo: req.body.pseudo_connection,
            pass: sha1(ent.encode(req.body.pass_connection))
        };

        session_data.password = data.pass;
        session_data.name = data.pseudo;

        var obj={};

        connection.getConnection(function(err,connection){
            if(err){
                connection.release();
            }
            else {
                var query="SELECT * FROM Membres WHERE pseudo = '" + data.pseudo + "' and pass = '" + data.pass + "'";
                connection.query(String(query),function(err,rows) {
                    connection.release();
                    if(!err) {
                        if (rows.length > 0) {
                            var un = new Buffer(String(rows[0].pseudo));
                            var ui = new Buffer(String(rows[0].id));
                            obj.path_name="/chat#?un="+un+"&ui="+ui;
                            // Generate a 16 character alpha-numeric token:
                            //var token = randtoken.generate(16);
                            req.session.log.pseudo = data.pseudo;
                            req.session.log.id = rows[0].id;
                            req.session.log.login = true;
                            req.session.sessionID = rows[0].id;
                            res.redirect('/chat');
                        }
                        else {
                            res.redirect('/');
                        }
                    }
                    else {
                        console.log('Query failed');
                    } 
                });
            }
        });   
    }
    else {
        res.redirect('/');
    }
});


app.get('/chat', function(req, res) {
    if (req.session.log.login) {
        //console.log(req.session.login);
        connection.getConnection(function(err,connection){
            if(err){
            connection.release();
            }
            else {
                var query = "SELECT * FROM Messages WHERE to_pseudo = '" + req.session.log.pseudo + "'";
                connection.query(String(query),function(err,rows) {
                    connection.release();
                    if(!err) {
                        res.render('chat.ejs', {message: rows, login: req.session.log.pseudo});
                    }
                    else {
                        console.log('Query failed');
                    } 
                });
            }
        });
    }
    else {
        res.redirect('/');
    }
});

app.post('/poster_message', urlencodedParser, function(req, res) {
    if (req.body.message != '' && req.body.to_pseudo != '') {
        data = {
            message: req.body.message,
            to_pseudo: req.body.to_pseudo,
            from_pseudo: req.session.log.pseudo
        };
        // On check si le pseudo est déjà dans la base de données
        connection.query('SELECT pseudo FROM Membres WHERE pseudo = ?', data.to_pseudo, function(err, rows) {
            if (rows.length > 0) {
                //console.log('Le pseudo est dans la base de donnée', false);
                message = new db.Message(data.to_pseudo, data.from_pseudo, data.message);
                message.save();
                res.redirect('/chat');
            }
            else {
                //console.log('Le pseudo n'est pas dans la base de donnée', true);
                res.redirect('/chat');
            }
        });
    }
    else{
        res.redirect('/chat');
    }

});

  
app.get('/log_out', function(req, res) {    
    req.session.log = {};
    req.session.log.login = false;
    res.redirect('/');
});


var register_socket = io.of('/register_socket');

var chat_socket = io.of('/chat_socket');


register_socket.on('connection', function (socket) {

    console.log('A socket has connected on register_socket');

    // On check si le pseudo est déjà dans la base de données
    socket.on('verifier_pseudo', function(pseudo) {
        connection.query('SELECT pseudo FROM Membres WHERE pseudo = ?', pseudo, function(err, res) {
            if (res.length === 0) {
                //console.log('Le pseudo est valide', false);
                socket.emit('verifier_pseudo', false);
            }
            else {
                //console.log('Le pseudo est invalide', true);
                socket.emit('verifier_pseudo', true);
            }
        });

    });

});

chat_socket.on('connection', function (socket) {

    console.log('A socket has connected on chat_socket');

    socket.on('disconnect', function() {
        console.log('A user has disconnect from chat_socket');
    });


});

server.listen(port, function() {
    console.log('listening on *: ' + port);
});