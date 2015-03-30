var express = require("express");
var app = express();
var fs = require("fs");

// This is for testing scheduling.
var schedule = require("node-schedule");
var http = require("http");
var today = new Date();
console.log(today)
var date_vi_faar_fra_post_request = new Date(2015,2,30,today.getHours(),today.getMinutes(),today.getSeconds()+5);
console.log(date_vi_faar_fra_post_request)
schedule.scheduleJob(date_vi_faar_fra_post_request,function() {
	console.log("Let the fun swag begin.")
	var options = {
		host: "127.0.0.1",
		//hostname: "www.google.com",
		path: "/loadByUUID/" + "smallest",
		port: "3002",
		//method: "GET"
	}
	http.get(options,function(response) {

	}).on("error",function(e) {
		console.log("FUCK YOU")
	})
})

/*
 * Forward data from superpc to 
 *
 *
 */
var net = require("net");

server = net.createServer(function (socket) {
	console.log("Connected" + socket.remoteAddress + ":" + socket.remotePort)

	var superPC_opts = {
		host: "127.0.0.1",
		port: 5901
	}

	var superPC_socket = net.connect(superPC_opts,function() {
		console.log("Connected to virtual stream");
	});

	// Data from superPC, write it to user.
	superPC_socket.on("data",function(data) {
		socket.write(data);

	})

	// Data from user, write it to superPC.
  socket.on("data",function (data) {
      superPC_socket.write(data);
  })

  socket.on("end",function(err) {
  	console.log("Client ended");
  	socket.end();
  	superPC_socket.end();
  })

  superPC_socket.on("end",function(err) {
  	console.log("Super pc ended stream?")
  	socket.end();
  	superPC_socket.end();
  })

});


 
 
 
server.listen(9000,"localhost")




//var backend_ip = "127.0.0.1";
var port = 3002
/*
 * Is streams bad to use with glusterfs?
 * We need to check this at some point, and document our findings in report ;D
 *
 */
app.get("/loadByUUID/:uuid",function(req,res) {
	var uuid = req.params.uuid + ".img";
	var superPcImgPath = "/home/tankz/SUPERPC_IMAGES/" + uuid;
	var glusterImgPath = "/home/tankz/GLUSTERFS_IMAGES/" + uuid;
	var source = fs.createReadStream(glusterImgPath);
	var dest = fs.createWriteStream(superPcImgPath);
	source.pipe(dest);
	source.on("end",function() {
		console.log("Done copying");
		res.status(200).end();
	});
	source.on("error",function(err) {
		console.log(err);
		res.status(403).end(err)
	});
});

app.get("/saveByUUID/:uuid",function(req,res) {
	var uuid = req.params.uuid + ".img";
	var superPcImgPath = "/home/tankz/SUPERPC_IMAGES/" + uuid;
	var glusterImgPath = "/home/tankz/GLUSTERFS_IMAGES/" + uuid;
	var source = fs.createReadStream(superPcImgPath);
	var dest = fs.createWriteStream(glusterImgPath);
	source.pipe(dest);

	// Copied succesfully
	source.on("end",function() {
		// unlink = delete/remove
		fs.unlink(superPcImgPath,function(err) {
			if (err) {console.log(err)};
			console.log("Done saving.");
			res.status(200).end();
		});
	});

	// Copying went wrong.
	source.on("error",function(err) {
		console.log(err);
		res.status(403).end(err)
	});
});


app.listen(port,function() {
	console.log("Server running")
	var date = new Date();
	//console.log(date.getFullYear())
	//console.log(date.getDate())
	//console.log(date.getHours())
	//console.log(date.getMinutes())
	//console.log(date.getSeconds())
});