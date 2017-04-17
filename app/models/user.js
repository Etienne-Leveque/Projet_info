var mysql = require('mysql');
var config = require('../../config.js'); // get our config file

var connection = mysql.createConnection(config);

module.exports = {

User: function (name, password, admin) {
    this.name = name;
    this.password = password; 
    this.admin = admin;

    this.save = function() {
		connection.query('INSERT INTO User SET ?', this, function(err,res){
		if(err) throw err;

		console.log('Last insert ID:', res.insertId);
		});
	}

},

Membre: function (pseudo, pass) {
    this.pseudo = pseudo;
    this.pass = pass; 

    var date = new Date();
    day = date.getDate().toString();
    month = date.getMonth().toString();
    year = date.getFullYear().toString();

    this.date_inscription = year + '/' + month + '/' + day;


    this.save = function() {
		connection.query('INSERT INTO Membres SET ?', this, function(err,res){
		if(err) throw err;

		console.log('Last insert ID:', res.insertId);
		});
	}
},

Message: function (to_pseudo, from_pseudo, message) {
    this.to_pseudo = to_pseudo;
    this.from_pseudo = from_pseudo;
    this.message = message; 

    var date = new Date();
    day = date.getDate().toString();
    month = date.getMonth().toString();
    year = date.getFullYear().toString();
    hour = date.getHours().toString();
    minute = date.getMinutes().toString();
    seconde = date.getSeconds().toString();

    this.date_message = year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + seconde;


    this.save = function() {
		connection.query('INSERT INTO Messages SET ?', this, function(err,res){
		if(err) throw err;

		console.log('Last insert ID:', res.insertId);
		});
	}
}

};
