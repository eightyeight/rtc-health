var uuid = require('uuid');
var fields = require('./fields');


/**
  Generates a statistic report
 **/
function Reporter(id, opts, reports) {
	this.source = id;
	this.target = opts.id;
	this.room = opts.room;
	this.reports = reports;

	// Create a unique connection id
	this.id = uuid.v4();
	this.connection_id = (this.source < this.target 
				? this.source + ':' + this.target 
				: this.target + ':' + this.source);	
}

Reporter.prototype.isActive = function() {
	if (!this.reports) return false;	

	var report = this.getReport('googCandidatePair');
	return report && report.stat('googActiveConnection');
}

/**
  Returns the report of the given type
 **/
Reporter.prototype.getReport = function(reportType) {
	if (!this.reports || this.reports.length === 0) return null;

	for (var i = 0; i < this.reports.length; i++) {
		if (this.reports[i].type === reportType) return this.reports[i];
	}

	return null;
}

/**
  Returns the report with the given id, or null
 **/
Reporter.prototype.getReportById = function(reportId) {
	if (!this.reports || this.reports.length === 0) return null;

	for (var i = 0; i < this.reports.length; i++) {
		if (this.reports[i].id === reportId) return this.reports[i];
	}

	return null;
}

Reporter.prototype.getReportsByType = function(reportType) {
	return ths.getReportsByTypes([reportType]);
}

/**
  Returns all the reports of a given type
 **/
Reporter.prototype.getReportsByTypes = function(reportTypes) {
	if (!this.reports || this.reports.length === 0) return null;

	var result = [];
	for (var i = 0; i < this.reports.length; i++) {
		if (reportTypes.indexOf(this.reports[i].type) >= 0) {
            result.push(this.reports[i]);
        }
	}

	return result;
}

/**
  Returns an array of channel reports, which bundle the statistics for the
  channel, as well as the statistics for the candidate pair
 **/
Reporter.prototype.getChannelReports = function() {

	var candidatePairs = this.getReportsByType('googCandidatePair'),
		reports = [];

	for (var i = 0; i < candidatePairs.length; i++) {
		var cdp = candidatePairs[i],
			channelId = cdp.stat('googChannelId'),
			channelStats = this.getReportById(channelId);

		reports.push(new ChannelReport(channelStats, cdp));
	}
	return reports;
}

/**
  Converts all reports to an object
 **/
Reporter.prototype.toJSON = function(exclude) {

	if (!this.reports) return [];

	var result = [],
		now = Date.now();
	for (var i = 0; i < this.reports.length; i++) {		
		var report = this.reports[i];
		if (exclude && exclude.indexOf(report.type) >= 0) continue;

		var output = { 
                id: report.id, 
                type: report.type, 
                timestamp: (report.timestamp ? report.timestamp.getTime() : Date.now())
            };
		output.data = reportToObject(report);
		result.push(output);
	}

	return { 
		id: this.id, 
		connection: this.connection_id, 
		source: { id: this.source }, 
		target: { id: this.target }, 
		mesh: this.room, 
		reports: result, 
		timestamp: now 
	};
}

/**
  Creates a channel report for reporting on the entirety of a channel
 **/
function ChannelReport(channel, connection) {
	this.channel = channel;
	this.connection = connection;
}

/**
  Return whether the channel is active
 **/
ChannelReport.prototype.isActive = function() {
	return this.connection && this.connection.stat('googActiveConnection');
}

/**
  Convert the report object to a standardised object for JSON serialization
 **/
ChannelReport.prototype.toJSON = function() {

	var result = { 
			id: (this.channel ? this.channel.id : ''),
			room: this.room,
			active: this.isActive()
		};

	if (this.connection) {
		result.connection = reportToObject(this.connection);
		result.timestamp = (
			this.connection.timestamp ? this.connection.timestamp.getTime() : Date.now()
		);
	}

	return result;
}

/**
  Convert the StatsReport to an object
 **/
function reportToObject(report) {
	if (!report) return null;
	var names = report.names(),
		result = {};
	for (var i = 0; i < names.length; i++) {
		var key = names[i];
		result[key] = report.stat(key);

		// Convert fields to int where required
		if (fields.AS_INT.indexOf(key) >= 0) result[key] = parseInt(result[key]);
	}
	return result;
}

module.exports = Reporter;