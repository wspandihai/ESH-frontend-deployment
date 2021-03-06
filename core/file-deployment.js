var promises = require('bluebird');

var needle = promises.promisifyAll(require('needle'));

var _ = require('lodash');

var config = require('../config');

var fs = require('fs');

var File = require('esh-deployment-cloud/File');

var Cloud = require('esh-deployment-cloud');

Cloud = new Cloud(config.qn);

var FileCache = {};



//发送到asd
var sendToasd = function(file) {
	//不存在就跳过这一步骤
	if (!file.exists || file.adsok) return Promise.resolve();

	var data = {
		rePath: file.rePath,
		upload: {
			file: file.rePath,
			content_type: 'image/png'
		}
	}

	return needle.postAsync(config.adsurl, data, {
		multipart: true
	});

}

var fileDeployment = function(files) {
	if (files.length == 0) return false;
	files = _.compact(files);
	promises.map(files, function(filePath) {
		//生成file对象,加入缓存
		var file = (filePath instanceof File) ? filePath : new File(filePath);
		FileCache[filePath] = file;
		return sendToasd(file);
	}).map(function(arg, index) {
		var file = FileCache[files[index]];
		file.adsok = !!(arg && arg[1] == 'ok');
		console.log(file.rePath + (file.adsok ? '上传成功' : '上传失败'));
		file.adsok ?
			return Cloud.Start(file): return Promise.resolve(file);

	}).then(function(files) {
		if (files.length && files.length > 0) {
			files = _.dropWhile(files, function(file) {
				return !file.exists;
			});
			fileDeployment(files)
		}
	}).catch(function(err) {
		console.error(err);
	});
}

module.exports = fileDeployment;