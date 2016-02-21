var request    = require('request'),
    cheerio    = require('cheerio'),
    express    = require('express'),
    util       = require('util'),
    dot        = require('express-dot'),
    DEPTH      = 2; //How many pages deep to scrape

server = express();
//requires dot to render
server.set('view engine', 'dot');
//requires express-dot stub to use dot with express3
server.engine('dot',dot.__express);
//make request use cookies
request = request.defaults({jar : true});
//add cookie to access over 18 subreddits
var cookieJar = request.jar();
cookieJar.setCookie('over18=1', 'http://www.reddit.com', {}, function() { });

server.get('/', function(req, res) {
	var urls = [
			'http://phish.in/2013-12-31', 
		   ];
	scrapeAll(urls, function(result) {
		res.render('images.dot', {layout:false, images : result});
	});
});

function scrapeAll(urls, callback) {
	var results = [];
	var urlsLeft = urls.length;
	for (var i=0; i<urls.length; i++) {
		scrape(urls[i], DEPTH, [], function(result) {
			results = results.concat(result);
			//After each page is finished scrapping the urlsLeft decreases
			urlsLeft -= 1; //you single threaded motherfucker, please don't fuck this up
		});
	}
	//We do this to wait for scraping
	function check() {
		if (urlsLeft == 0)  callback(results);
		else setTimeout(check, 500);    
	} check();
}
//goes recursively through pages adding scraped images to output
//url - the url to be scraped
//count - how many pages deep
//output - the result
//callback - gets called when scrapping is finished
function scrape(url, count, output, callback) {
	if (count == 0) {
		callback(output);
		return;
	}
	console.log('Scraping: ' + url);
	request({url : url, jar: cookieJar}, function(err, body, html) {
		var $ = cheerio.load(html);
		$("a.title[href$='.png'], a.title[href$='.jpg'], a.title[href$='.gif']").each(function(i,e) {
			var url = $(this).attr('href');
			output.push(url);
		});
		var nextPage = $("a[rel$='next']").attr('href');
		if (nextPage === '' || nextPage === undefined) scrape('wtf', 0, output, callback);
		else scrape(nextPage, count-1, output, callback);
	});
}
server.listen(1337);