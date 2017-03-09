

// Require the modules we need
var http = require('http'),
	path = require('path'),
	net = require('net'),
	url = require('url'),
	querystring = require('querystring');

// DB init
var accessesSchema, Accesses;
var mongoose = require('mongoose');
//var db = mongoose.createConnection('mongodb://localhost/test');
var uuid = require('node-uuid');
var swig = require('swig');
var fs = require('fs');

// Configuration
swig.setDefaults({ cache: false });
http.globalAgent.maxSockets = 30;

function inspectFile(fileName, contents, searchString) {
	if (contents.toString().indexOf(searchString) != -1) {
		return fileName;
    }
	return "";
}

function searchOnLogs(res, searchString) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	
	fs.readdir('app/logspvm', function(err, files) {
		var result = "";
		
		if (!err) {			
			files
				 .forEach(function(file) { 
					var content = fs.readFileSync('app/logspvm/' + file).toString();
					if (result != "") result += "|";
					result += inspectFile('app/logspvm/' + file, content, searchString);	
					
				/*	fs.readFile('app/logspvm/' + file, 'utf-8', function(err, contents) { 
						if (!err) {
							result += inspectFile('app/logspvm/' + file, contents, searchString) + '';
							res.setHeader("Access-Control-Allow-Origin", "*");
							res.end(result);
							return;
						}
						else
						console.log("ERROR1:" + err)
					}); */
						});
						
				res.end(result);
		}
		else {
			console.log("ERROR: " + err);
			res.end(result);
		}
	});
}

function renderContentsFromFile(filePath, res, page404, returnCallback){
    fs.exists(filePath,function(exists) {
		if (exists){
            fs.readFile(filePath,function(err,contents){
				if(!err){
					returnCallback(contents);
                } else {
                    console.dir(err);
                };
            });
        } 
		else {
            fs.readFile(page404, function(err,contents){
                if (!err) {
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.end(contents);
                } else {
                    console.dir(err);
                };
            });
        };
    });
}

function getFile(filePath, res, page404, useViewsEngine){
	res.setHeader("Access-Control-Allow-Origin", "*");
	fs.exists(filePath,function(exists) {
		if (exists){			
			if (useViewsEngine) {
				var result = swig.renderFile(filePath);
				res.end(result);
			}
			else
				fs.readFile(filePath,function(err,contents){
					if(!err){
						res.end(contents);
					} else {
						console.dir(err);
					};
				});
        } 
		else {
            fs.readFile(page404, function(err,contents){
                if (!err) {
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.end(contents);
                } else {
                    console.dir(err);
                };
            });
        };
    });
}

function datePrint() {
	return new Date(Date.now()).toISOString();
}

var printBDError = function (err, result) {
      if (err) throw err;
      //console.log(result);
};

function initializeDatabase() {	
	accessesSchema = mongoose.Schema({
		ip: { type: String, trim: true, index: true },
		data: String, 
		agent: String,
		query: String,
		data: String });
	
	//Accesses = db.model('accesses', accessesSchema);	
}

function registerAccess(ip, date, agent, query, data) {
	var id = uuid.v1();
	var value = new Accesses({
		ip: ip,
		date: date,
		agent: agent,
		query: query,
		data: data
	});
	value.save(printBDError);
}

function sendObject(res, language, a, b, c) {
	console.log("Send object: " + language + a + " - " + b + " - " + c);
}

// Helper for HTTP requests
function requestHandler(req, res) {	
	var pathname = url.parse(req.url).pathname;
	var arguments = querystring.parse(url.parse(req.url).query);
	
	// #TEMP: incoming inspector
	console.log(datePrint() + " : " + req.connection.remoteAddress + ": " + pathname + "{" + arguments.toString() + "}");
	// #TEMP: incoming logger
	//registerAccess(req.connection.remoteAddress, datePrint(), req.headers['user-agent'], pathname, arguments.toString());
	
	
	if (pathname == "/searchLogs")
		searchOnLogs(res, arguments.searchText);
	else {
		var fileName = path.basename(req.url) || 'index.html',
			localFolder = __dirname + '/app',
			page404 = localFolder + '/404.html';
		var parts = fileName.split(".");
		fileName = replaceAllOn(req.url, "/", "\\");
		if (req.url == "/" || req.url == "") fileName = '/index.html';
		getFile((localFolder + fileName), res, page404, (parts[parts.length-1] == "html"));
	}
}

function replaceAllOn(string, source, target) {
	var result = source;
	var newResult = string.replace(source, target);
	
	while (result != newResult) {
		result = newResult;
		newResult = newResult.replace(source, target);
	} 
	
	return newResult;
}

function handlerHook(req, res) {
	var result;
	
	req.setTimeout(3000, function () { 
		console.debug("timeout"); 
		res.end("timeout"); 
	});
	
	try {
		result = requestHandler(req, res);
	}
	catch(err) {
		console.log("Error: " + err.message);
		res.end("Error");
	}
	
	return result;
}

initializeDatabase();
  
try {
	http.createServer(handlerHook)
		.listen(8000);
} 
catch (ex) {
	console.log(ex.toString());
	callback(ex);
}
