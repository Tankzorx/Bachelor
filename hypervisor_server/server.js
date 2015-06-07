var express = require("express");
var app = express();
var fs = require("fs");
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

	source.on("end",function() {
		fs.unlink(superPcImgPath,function(err) {
			if (err) {console.log(err)};
			console.log("Done saving.");
			res.status(200).end();
		});
	});

	source.on("error",function(err) {
		console.log(err);
		res.status(403).end(err)
	});
});


app.listen(port,function() {
	console.log("Server running")
});