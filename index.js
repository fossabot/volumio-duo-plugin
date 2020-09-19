'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

module.exports = snapserver;
function snapserver(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



snapserver.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
}

snapserver.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();


	// Once the Plugin has successfull started resolve the promise
	defer.resolve();

    return defer.promise;
};

snapserver.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

snapserver.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

snapserver.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

	let spopExists = false;
	let volspotConnect1Exists = false;
	let volspotConnect2Exists = false;
	
    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
		.then(function(evaluate)
		{
			console.log('$$$ Evaluating settings');
			// Verify configs			
			defer.resolve(evaluate);
		})
        .then(function(uiconf)
        {
			console.log('$$$ Populating settings form');
			// If patched
			uiconf.sections[1].content[0].value = false;
			uiconf.sections[1].content[2].value = false;
			uiconf.sections[1].content[3].value = false;

            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

snapserver.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

snapserver.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

snapserver.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

snapserver.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

// Update Config Methods -----------------------------------------------------------------------------

snapserver.prototype.updateConfigs = function(newConfig) {
	var self = this;
	var defer = libQ.defer();
	
	// Always update snapserver config, there's no neat if-statement possible afaik
	
	if(
		self.config.get('') != newConfig['']
	)
	{
		
	};
	
	return defer.promise;
};

snapserver.prototype.updateMpdConfig = function() {
	var self = this;
	
	console.log('$$$ seems alright');
	
	return false;
};

snapserver.prototype.generateMpdUpdateScript = function()
{
	var self = this;
	var defer = libQ.defer();
	
	fs.readFile(__dirname + "/templates/mpd_switch_to_fifo.template", 'utf8', function (err, data) {
		if (err) {
			defer.reject(new Error(err));
		}

		let tmpconf = data.replace("${SAMPLE_RATE}", self.config.get('mpd_sample_rate'));
		tmpconf.replace("${BIT_DEPTH}", self.config.get('mpd_bit_depth'));
		tmpconf.replace("${CHANNELS}", self.config.get('mpd_channels'));
		tmpconf.replace(/ENABLE_ALSA/g, self.config.get('enable_alsa_mpd') == true ? "yes" : "no");
		tmpconf.replace(/ENABLE_FIFO/g, self.config.get('enable_fifo_mpd') == true ? "yes" : "no");
		
		fs.writeFile(__dirname + "/mpd_switch_to_fifo.sh", tmpconf, 'utf8', function (err) {
			if (err)
			{
				self.commandRouter.pushConsoleMessage('Could not write the script with error: ' + err);
				defer.reject(new Error(err));
			}
			else 
				defer.resolve();
		});
	});
	
	return defer.promise;
};

snapserver.prototype.updateShairportConfig = function() {
	var self = this;
	
	return true;
};

snapserver.prototype.updateSpotifyConfig = function(spopExists, volspotConnect1Exists, volspotConnect2Exists) {
	var self = this;
	var defer = libQ.defer();
	
	if (spopExists)
	{
		self.streamEdit("alsa", "raw", "/data/plugins/music_service/spop/spop.conf.tmpl", false);
		self.streamEdit("${outdev}", self.config.get('spotify_pipe') + '\\neffects = rate ' + self.config.get('spotify_sample_rate'), "/data/plugins/music_service/spop/spop.conf.tmpl", false);
		self.streamEdit("output_type", "output_type = raw", "/data/plugins/music_service/spop/spop.conf.tmpl", false);
		self.streamEdit("output_name", "output_name = " + self.config.get('spotify_pipe'), "/data/plugins/music_service/spop/spop.conf.tmpl", false);
		self.streamEdit("effects", "effects = rate " + self.config.get('spotify_sample_rate') + "; channels " + self.config.get('spotify_channels'), "/data/plugins/music_service/spop/spop.conf.tmpl", false);
		defer.resolve();
	}
	if(volspotConnect1Exists)
	{
		self.streamEdit("slave.pcm spotoutf", "updateLine", "/data/plugins/music_service/volspotconnect/asound.tmpl", false)
		.then(function(addLines){
			self.streamEdit("slave.pcm spotoutf", "updateLine", "/etc/asound.conf", true);
			defer.resolve(addLines);
		})
		.then(function(editLines){
			self.streamEdit("updateLine", "slave.pcm writeFile", "/data/plugins/music_service/volspotconnect/asound.tmpl", false);
			self.streamEdit("slave.pcm spotoutf", "#slave.pcm spotoutf", "/data/plugins/music_service/volspotconnect/asound.tmpl", false);			
			self.streamEdit("updateLine", "slave.pcm writeFile", "/etc/asound.conf", false);
			self.streamEdit("slave.pcm spotoutf", "#slave.pcm spotoutf", "/etc/asound.conf", false);			
			defer.resolve(editLines);
		})
		.fail(function()
		{
			defer.reject(new Error());
		});

	}
	if (volspotConnect2Exists)
	{
		// Legacy implementation
		self.streamEdit("--device ${outdev}", "--backend pipe --device " + self.config.get('spotify_pipe') + " ${normalvolume} \\\\", "/data/plugins/music_service/volspotconnect2/volspotconnect2.tmpl", false);
		// New implementation
		self.streamEdit("device", "device = \\x27/tmp/snapfifo\\x27", "/data/plugins/music_service/volspotconnect2/volspotify.tmpl", false);
		self.streamEdit("backend", "backend = \\x27pipe\\x27", "/data/plugins/music_service/volspotconnect2/volspotify.tmpl", false);
		defer.resolve();
	}
	
	var responseData = {
	title: 'Configuration required',
	message: 'Changes have been made to the Spotify implementation template, you need to save the settings in, or restart the corresponding plugin again for the changes to take effect.',
	size: 'lg',
	buttons: [{
				name: self.commandRouter.getI18nString('COMMON.CONTINUE'),
				class: 'btn btn-info',
				emit: '',
				payload: ''
			}
		]
	}

	self.commandRouter.broadcastMessage("openModal", responseData);

	return defer.promise;
};

snapserver.prototype.patchAsoundConfig = function()
{
	var self = this;
	var defer = libQ.defer();
	var pluginName = "snapcast";
	var pluginCategory = "miscellanea";
	
	// define the replacement dictionary
	var replacementDictionary = [
		{ placeholder: "${SAMPLE_RATE}", replacement: self.config.get('sample_rate') },
		{ placeholder: "${OUTPUT_PIPE}", replacement: self.config.get('spotify_pipe') }
	];
	
	self.createAsoundConfig(pluginName, replacementDictionary)
	.then(function (touchFile) {
		var edefer = libQ.defer();
		exec("/bin/touch /etc/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				console.log(stderr);
				self.commandRouter.pushConsoleMessage('Could not touch config with error: ' + error);
				self.commandRouter.pushToastMessage('error', "Configuration failed", "Failed to touch asound configuration file with error: " + error);
				edefer.reject(new Error(error));
			}
			else
				edefer.resolve();
			
			self.commandRouter.pushConsoleMessage('Touched asound config');
			return edefer.promise;
		});
	})
	.then(function (clear_current_asound_config) {
		var edefer = libQ.defer();
		exec("/bin/sed -i -- '/#" + pluginName.toUpperCase() + "/,/#ENDOF" + pluginName.toUpperCase() + "/d' /etc/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				console.log(stderr);
				self.commandRouter.pushConsoleMessage('Could not clear config with error: ' + error);
				self.commandRouter.pushToastMessage('error', "Configuration failed", "Failed to update asound configuration with error: " + error);
				edefer.reject(new Error(error));
			}
			else
				edefer.resolve();
			
			self.commandRouter.pushConsoleMessage('Cleared previous asound config');
			return edefer.promise;
		});
	})
	.then(function (copy_new_config) {
		var edefer = libQ.defer();
		var cmd = "/bin/cat /data/plugins/" + pluginCategory + "/" + pluginName + "/asound.section >> /etc/asound.conf\nalsactl -L -R restore";
		fs.writeFile(__dirname + "/" + pluginName.toLowerCase() + "_asound_patch.sh", cmd, 'utf8', function (err) {
			if (err)
			{
				self.commandRouter.pushConsoleMessage('Could not write the script with error: ' + err);
				edefer.reject(new Error(err));
			}
			else
				edefer.resolve();
		});
		
		return edefer.promise;
	})
	.then(function (executeScript) {
		self.executeShellScript(__dirname + '/' + pluginName.toLowerCase() + '_asound_patch.sh');
		defer.resolve();
	});
	
	self.commandRouter.pushToastMessage('success', "Successful push", "Successfully pushed new ALSA configuration");
	return defer.promise;
};

snapserver.prototype.createAsoundConfig = function(pluginName, replacements)
{
	var self = this;
	var defer = libQ.defer();
	
	fs.readFile(__dirname + "/templates/asound." + pluginName.toLowerCase(), 'utf8', function (err, data) {
		if (err) {
			defer.reject(new Error(err));
		}

		var tmpConf = data;
		for (var rep in replacements)
		{
			tmpConf = tmpConf.replace(replacements[rep]["placeholder"], replacements[rep]["replacement"]);			
		}
			
		fs.writeFile(__dirname + "/asound.section", tmpConf, 'utf8', function (err) {
				if (err)
				{
					self.commandRouter.pushConsoleMessage('Could not write the script with error: ' + err);
					defer.reject(new Error(err));
				}
				else 
					defer.resolve();
		});
	});
	
	return defer.promise;
};

// General functions ---------------------------------------------------------------------------------

snapserver.prototype.streamEdit = function (pattern, value, inFile, append)
{
	var self = this;
	var defer = libQ.defer();
	let castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;

	let command = "/bin/sed -i -- '/" + pattern + ".*/a " + castValue + "' " + inFile;
	if(!append)
		command = "/bin/sed -i -- 's|" + pattern + ".*|" + castValue + "|g' " + inFile;	

	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);

		defer.resolve();
	});
	
	return defer.promise;
};

snapserver.prototype.isValidJSON = function (str) 
{
	var self = this;
    try 
	{
        JSON.parse(JSON.stringify(str));
    } 
	catch (e) 
	{
		self.logger.error('Could not parse JSON, error: ' + e + '\nMalformed JSON msg: ' + JSON.stringify(str));
        return false;
    }
    return true;
};