"use strict";
var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
const path = require("path");
const Web3 = require("web3");

var app = express();
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.engine("html", require("ejs").renderFile);

async function main() {
  try {
    app.get("/", function (request, response) {
      request.session.loggedin = false;
      response.render(__dirname + "/public/index.html", {
        _: "salam",
      });
    });
    app.get("/index.html", function (request, response) {
      request.session.loggedin = false;
      response.sendFile(path.join(__dirname + "/public/index.html"));
    });
    //-----------------------------Voter---------------------------------
    app.get("/voter/index.html", function (request, response) {
      response.sendFile(path.join(__dirname + "/public/voter/dist/index.html"));
    });
    app.get("/voter/bundle.js", function (request, response) {
      response.sendFile(path.join(__dirname + "/public/voter/dist/bundle.js"));
    });

    //admin:
    app.get("/admin/index.html", function (request, response) {
      response.sendFile(path.join(__dirname + "/public/admin/dist/index.html"));
    });
    app.get("/admin/bundle.js", function (request, response) {
      response.sendFile(path.join(__dirname + "/public/admin/dist/bundle.js"));
    });
  } catch (error) {
    console.error(`******** FAILED to run the application: ${error}`);
  }
}
main();
var server = app.listen(5000, function () {
  var host = "localhost";
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
