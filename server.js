var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

// setup view engine as handlebar
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/myNews";

// Connect to the Mongo DB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/index", function(req, res) {
  // check and see if there is anything in the database, if not, scrape it
  // otherwise pull the records from the database and display data
  db.Article.find().sort({ _id:1 })
    .then(function(result){
      if (result.length > 0 ){
        // res.json(result);
        console.log (result);
        res.render('home',{result: result});
      }else {
        res.redirect("/scrape");
      }
    }).catch(function(err) {
      res.render("error");
    })
 
});

// // A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {

  console.log ("scraping data");
  // First, we grab the body of the html with axios
  axios.get("https://www.680news.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.post").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.date = $(this)
        .children("span")
        .text();

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          // console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
          res.render("error");
        });
    });

    res.redirect("/index");
  });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {

  const id = req.params.id;
  db.Article.findById(id)
  .populate("note")
  .then(function(article) {
     res.json(article);
  }).catch(function(err){
    res.json (err);
  });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  const title = req.body.title;
  const body = req.body.body;
  const articleID = req.params.id;

  var note = {
    title: title,
    body: body,
  };
  
  db.Note.create(note)
  .then(function(dbNote) {
    // View the added result in the console
    return db.Article.findOneAndUpdate({_id: articleID},  { note: dbNote._id } , { new: true });
  }).then(function(result){
    res.json(result);
  }).catch(function(err) {
    // If an error occurred, log it
    console.log(err);
    res.json(err);
  });
});

app.delete("/note/:id", function(req, res){
    const noteID = req.params.id;
    console.log (noteID);
    return db.Note.findOneAndDelete( {_id: noteID}, function(err, result) {
      if (err){
        console.log('error' + err);
        res.json(err);
      }else {
        console.log('result' + result);
        res.json(result);
      }
    })
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});