'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

module.exports = duo;
function duo(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



duo.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
}

duo.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();


	// Once the Plugin has successfull started resolve the promise
	defer.resolve();

    return defer.promise;
};

duo.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

duo.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

duo.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;
	
    var lang_code = this.commandRouter.sharedVars.get('language_code');
	var failmodes = fs.readJsonSync((__dirname + '/options/failmodes.json'),  'utf8', {throws: false});

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
			uiconf.sections[0].content[0].value = self.config.get('enable_duo');
			uiconf.sections[0].content[1].value = self.config.get('ikey');
			uiconf.sections[0].content[2].value = self.config.get('skey');
			uiconf.sections[0].content[3].value = self.config.get('api_host');
			for (var n = 0; n < failmodes.mode.length; n++){
				self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[4].options', {
					value: failmodes.mode[n].value,
					label: failmodes.mode[n].name
				});
				
				if(failmodes.mode[n].value == self.config.get('failmode'))
				{
					uiconf.sections[0].content[4].value.value = failmodes.mode[n].value;
					uiconf.sections[0].content[4].value.label = failmodes.mode[n].name;
				}
			}
			uiconf.sections[0].content[5].value = self.config.get('disable_password');

            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

duo.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

duo.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

duo.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

duo.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

// Update Config Methods -----------------------------------------------------------------------------

duo.prototype.saveConfig = function(data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('enable_duo', data['enable_duo']);
	self.config.set('ikey', data['ikey']);
	self.config.set('skey', data['skey']);
	self.config.set('api_host', data['api_host']);
	self.config.set('failmode', data['failmode'].value);
	self.config.set('disable_password', data['disable_password']);
	
	self.logger.info("Successfully updated snapserver configuration");
	self.toggleDuoPAM();
	
	return defer.promise;
};

duo.prototype.toggleDuoPAM = function()
{
	var self = this;
	var defer = libQ.defer();
	
	// define the replacement dictionary
	var replacementDictionary = [
		{ placeholder: "${IKEY}", replacement: self.config.get('ikey') },
		{ placeholder: "${SKEY}", replacement: self.config.get('skey') },
		{ placeholder: "${HOST}", replacement: self.config.get('api_host') },
		{ placeholder: "${FAILMODE}", replacement: self.config.get('failmode') }
	];
	
	self.createDuoConfig(pluginName, replacementDictionary)
	.then(function (activateConfig) {
		var edefer = libQ.defer();
		exec("/bin/mv " + __dirname + "/pam_duo.conf /etc/duo/pam_duo.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				console.log(stderr);
				self.commandRouter.pushConsoleMessage('Could not activate config with error: ' + error);
				self.commandRouter.pushToastMessage('error', "Activating configuration failed", "Failed to activate DUO configuration file with error: " + error);
				edefer.reject(new Error(error));
			}
		});
	})
	.then(function (copy_sshd_config) {
		exec("/usr/bin/rsync --ignore-missing-args /etc/pam.d/sshd "+ __dirname +"/templates/sshd", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not copy config file to temp location with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (executeScript) {
		if(self.config.get("enable_duo"))
		{
			self.logger.info("[DUO] Enabling DUO for SSH");
			exec("/bin/sh "+ __dirname +"/templates/enableDuoPAM.sh " + self.config.get("disable_password") ? "disable_password" : "", {uid:1000, gid:1000}, function (error, stout, stderr) {
				if(self.config.get("disable_password"))
					self.logger.warn("[DUO] Disabling password for SSH; if pam_duo fails open, ssh session is spawned without asking for a password!");
				if(error)
				{
					self.logger.error('Could not execute script with error: ' + error);
					defer.reject(new Error(error));
				}
			});
		}
		else
		{
			self.logger.info("[DUO] Disabling DUO for SSH");
			exec("/bin/sh "+ __dirname +"/templates/disableDuoPAM.sh", {uid:1000, gid:1000}, function (error, stout, stderr) {				
				if(error)
				{
					self.logger.error('Could not execute script with error: ' + error);
					defer.reject(new Error(error));
				}
			});
		}
	})
	.then(function (replace_sshd_config) {
		exec("/usr/bin/sudo /bin/mv "+ __dirname +"/templates/sshd /etc/pam.d/sshd", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not replace /etc/asound.conf with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (restore_file_owner) {
		exec("/usr/bin/sudo /bin/chown root:root /etc/pam.d/sshd", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not change file permissions with error: ' + error);
				defer.reject(new Error(error));
			}
		});
		defer.resolve(restore_file_owner);
	});
	
	self.commandRouter.pushToastMessage('success', "Successful push", "Successfully pushed new DUO configuration");
	return defer.promise;
};

duo.prototype.createDuoConfig = function(pluginName, replacements)
{
	var self = this;
	var defer = libQ.defer();
	
	fs.readFile(__dirname + "/templates/pam_duo.conf", 'utf8', function (err, data) {
		if (err) {
			defer.reject(new Error(err));
		}

		var tmpConf = data;
		for (var rep in replacements)
		{
			tmpConf = tmpConf.replace(replacements[rep]["placeholder"], replacements[rep]["replacement"]);			
		}
			
		fs.writeFile(__dirname + "/pam_duo.conf", tmpConf, 'utf8', function (err) {
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
