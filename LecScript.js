function id(el) {
	return document.getElementById(el);
}
'use strict';
// GLOBAL VARIABLES
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
var db=null;
var logs=[]; // monthly logs - from database
var charges=[]; // this month's charges
var log=null;
var charge=null;
var chargeData=null;
var logData=null;
var logIndex=null;
var currentLog=null
var currentDialog;
var startX;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";
var backupDay;
var capacity=48; // usable battery capacity (kWh) for Peugeot e-208
// var root; // OPFS root directory
// EVENT LISTENERS
id('main').addEventListener('touchstart', function(event) {
    // console.log(event.changedTouches.length+" touches");
    startX=event.changedTouches[0].clientX;
})
id('main').addEventListener('touchend', function(event) {
    var dragX=event.changedTouches[0].clientX-startX;
    if(dragX<-50) { // drag left
    	if(currentDialog) toggleDialog(currentDialog,false); // close an open dialog
    }
})
// TAP HEADER - DATA MENU
id('heading').addEventListener('click',function() {toggleDialog('dataDialog',true);})
// NEW BUTTON
id('buttonNew').addEventListener('click', function() { // show the log dialog
	console.log("show add jotting dialog with today's date, 1 day duration, blank text field and delete button disabled");
	var d=new Date().toISOString();
	id('logDate').value=d.substr(0,10);
	id('logMiles').value=null;
	id('logStartCharge').value=null;
	id('logEndCharge').value=null;
	log={};
	logIndex=null;
	id("buttonDeleteLog").style.display='none';
	id('buttonAddLog').style.display='block';
	id('buttonSaveLog').style.display='none';
	toggleDialog('logDialog',true);
});
// ADD NEW CHARGE LOG
id('buttonAddLog').addEventListener('click', function() {
	var month=parseInt(id('logDate').value.substr(5,2));
	console.log('thisMonth: '+thisMonth+'; month: '+month+' '+charges.length+' charges');
	if(thisMonth===null) thisMonth=month;
	else if(month!=thisMonth) { // first entry for another month
		thisMonth=month;
		if(charges.length>0) { // make new month log from previous month's charges
			console.log('another month - create new month log');
			log={}; // create new month log from last month's charges
			log.date=charges[0].date.substr(0,8)+'00'; // null day for month logs
			log.miles=parseInt(id('logMiles').value)-charges[0].miles; // total miles for month
			log.percent=0; // tot up percent charge for month
			for(var i in charges) log.percent+=(charges[i].endCharge-charges[i].startCharge);
			console.log('new log: '+log.date+' '+log.miles+' miles '+log.percent+'%');
			logs.push(log);
			charges=[]; // clear charges array
			console.log('month log saved');
			addChargeLog();
		}
		else addChargeLog(); 
	}
	else addChargeLog();
});
function addChargeLog() {
	charge={};
	charge.date=id('logDate').value;
	charge.miles=parseInt(id('logMiles').value);
	charge.startCharge=parseInt(id('logStartCharge').value);
	charge.endCharge=parseInt(id('logEndCharge').value);
	console.log('add charge log: '+charge.date+'; '+charge.miles+'; '+charge.startCharge+'-'+charge.endCharge);
	charges.push(charge); // save to charges[]
	save();
	/*
	chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData);
	*/
    toggleDialog('logDialog',false);
    populateList();
}
// SAVE CHANGED CHARGE LOG
id('buttonSaveLog').addEventListener('click',function() {
	charge={};
	charge.date=id('logDate').value;
	charge.miles=parseInt(id('logMiles').value);
	charge.startCharge=parseInt(id('logStartCharge').value);
	charge.endCharge=parseInt(id('logEndCharge').value);
	console.log('update charge log '+logIndex+': '+charge.date+'; '+charge.miles+'; '+charge.startCharge+'-'+charge.endCharge);
	charges[logIndex]=charge;
	save();
	/*
	var chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData);
	*/
    toggleDialog('logDialog',false);
    populateList();
})
// DELETE LOG
id('buttonDeleteLog').addEventListener('click', function() {
	console.log('delete charge log '+logIndex);
	charges.splice(logIndex,1);
	save();
	/*
	var chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData);
	*/
	toggleDialog("logDialog", false);
	populateList();
});
// DISPLAY MESSAGE
function display(message) {
	id('messageDialog').innerHTML=message;
	toggleDialog('messageDialog',true);
}
// SHOW/HIDE DIALOGS
function  toggleDialog(d, visible) {
	if(currentDialog) id(currentDialog).style.display='none';
	if(visible) currentDialog=d;
	else currentDialog=null;
    console.log('toggle '+d+' - '+visible);
  	id('buttonNew').style.display=(visible)?'none':'block';
  	id(d).style.display=(visible)?'block':'none';
}
// OPEN SELECTED LOG
function openLog(month) {
	console.log('open log '+logIndex+' month is '+month);
	if(month) {
		console.log('open month log '+logIndex);
		log=logs[logIndex];
		var mon=parseInt(log.date.substr(5,2))-1;
		var html=months.substr(mon*3,3)+" "+log.date.substr(0,4);
		var val=capacity*log.percent/100;
		val=Math.round(val);
		html+=': '+log.miles+' miles using '+val+'kWh ('+log.percent+'% charge)<br>@ ';
		val=log.miles/val;
		val*=10;
		val=Math.round(val);
		val/=10;
		html+=val+' mi/kWh (';
		val=log.miles/log.percent;
		val*=10;
		val=Math.round(val);
		val/=10;
		html+=val+' mi/% charge)';
		display(html);
		toggleDialog('messageDialog',true);
	}
	else {
		console.log("open charge log: "+logIndex);
		log=charges[logIndex];
		toggleDialog('logDialog',true);
		id('logDate').value=log.date;
		id('logMiles').value=log.miles;
		id('logStartCharge').value=log.startCharge;
		id('logEndCharge').value=log.endCharge;
		id('buttonDeleteLog').style.display='block';
		id('buttonDeleteLog').style.color='red';
		id('buttonAddLog').style.display='none';
		id('buttonSaveLog').style.display='block';
	}
}
// POPULATE LOGS LIST
function populateList() {
	console.log("populate log list");
	var total={};
	total.miles=0;
	total.percent=0;
	thisMonth=0;
	logs.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)}); // date order
	console.log("list "+logs.length+" month logs");
	id('list').innerHTML=""; // clear list
	var html="";
	var d="";
	var mon=0;
	var mpk=0; // miles per kWh
  	for(var i=0; i<logs.length; i++) { // list month logs first
  		var listItem=document.createElement('li');
		listItem.index=i;
	 	listItem.classList.add('log-item');
		listItem.addEventListener('click', function(){logIndex=this.index; openLog(true);});
		d=logs[i].date;
		mon=parseInt(d.substr(5,2));
		thisMonth=mon;
		mon--; // months 0-11
		mon*=3;
		html=months.substr(mon,3)+" "+d.substr(0,4); // month logs date is Mon YYYY
		total.miles+=logs[i].miles;
		total.percent+=logs[i].percent;
		mpk=logs[i].miles/(capacity*logs[i].percent/100);
		mpk=Math.floor(mpk*10)/10;
		listItem.innerText=html+': '+logs[i].miles+'mi '+mpk;
		listItem.style.width=scr.w*mpk/5+'px';
		id('list').appendChild(listItem);
	}
	console.log('list '+charges.length+' charges');
	if(charges.length>0) {
		d=charges[0].date;
		mon=parseInt(d.substr(5,2))-1;
		mon*=3;
		listItem=document.createElement('li');
		listItem.innerText='this month ('+months.substr(mon,3)+')';
		listItem.style='font-weight:bold';
		id('list').appendChild(listItem);
  		for( i in charges) { // list this month's charges after month logs
  			var listItem=document.createElement('li');
			listItem.index=i;
	 	 	listItem.classList.add('log-item');
			listItem.addEventListener('click', function(){logIndex=this.index; openLog();});
			var itemText=document.createElement('span');
			console.log('charge log '+i+' date:'+charges[i].date+' miles:'+charges[i].miles+' from '+charges[i].startCharge+' to '+charges[i].endCharge);
  			d=charges[i].date;
  			mon=parseInt(d.substr(5,2));
  			if(mon!=thisMonth) thisMonth=mon;
  			listItem.innerText=d.substr(8,2)+' '+charges[i].startCharge+'-'+charges[i].endCharge+'% '; // add charge percents
  			listItem.innerText+='@'+charges[i].miles; // add mileage
  			if(i>0) {
  				mpk=(charges[i].miles-charges[i-1].miles)/(capacity*(charges[i-1].endCharge-charges[i].startCharge)/100);
  				mpk*=10;
  				mpk=Math.round(mpk);
  				mpk/=10;
  			}
  			if(i>0) listItem.style.width=scr.w*mpk/5+'px';
  			if(i>0) total.miles+=(charges[i].miles-charges[i-1].miles);
  			total.percent+=(charges[i].endCharge-charges[i].startCharge);
			id('list').appendChild(listItem);
  		}
	}
  	console.log('thisMonth: '+thisMonth);
  	console.log('totals: '+total.miles+' miles; '+total.percent+' %');
  	mpk=total.miles/(capacity*total.percent/100);
	mpk*=10;
	mpk=Math.round(mpk);
 	mpk/=10; // one decimal place
	id('heading').innerText='Peugeot e208: '+mpk+' miles/kWh';
	/*
	logData=JSON.stringify(logs);
	window.localStorage.setItem('logData',logData);
	console.log('logs listed & data saved');
	*/
}
// DATA
function load() {
	var data=window.localStorage.getItem('LecData');
	if(!data) {
		id('restoreMessage').innerText='no data - restore?';
		toggleDialog('restoreDialog',true);
		return;
	}
	var json=JSON.parse(data);
	logs=json.logs;
	charges=json.charges;
	console.log(logs.length+' logs and '+charges.length+' read');
	logs.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)}); // date order
	charges.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)});
	populateList();
	today=Math.floor(new Date().getTime()/86400000);
	var days=today-backupDay;
	if(days>15) days='ages';
	if(days>4) { // backup reminder every 5 days
		id('backupMessage').innerText=days+' since last backup';
		toggleDialog('backupDialog',true);
	}
	/*
	root=await navigator.storage.getDirectory();
	console.log('OPFS root directory: '+root);
	var persisted=await navigator.storage.persist();
	console.log('persisted: '+persisted);
	var handle=await root.getFileHandle('LecData');
	var file=await handle.getFile();
	var loader=new FileReader();
    loader.addEventListener('load',function(evt) {
        	var data=evt.target.result;
        	console.log('data: '+data.length+' bytes');
      		var json=JSON.parse(data);
      		logs=json.logs;
      		charges=json.charges;
      		console.log(logs.length+' logs and '+charges.length+' read');
      		logs.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)}); // date order
      		charges.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)});
			populateList();
    	});
	loader.addEventListener('error',function(event) {
    	alert('load failed - '+event);
	});
	loader.readAsText(file);
	*/
}
function save() {
	var data={'logs': logs,'charges':charges};
	var json=JSON.stringify(data);
	window.localStorage.setItem('LecData',json);
	/*
	var handle=await root.getFileHandle('LecData',{create:true});
	var json=JSON.stringify(data);
	var writable=await handle.createWritable();
    await writable.write(json);
    await writable.close();
    */
	console.log('data saved to LecData');
}
id('backupButton').addEventListener('click',backup);
function backup() {
  	console.log("save backup");
	var fileName='LecData.json';
	var data={'logs': logs, 'charges':charges};
	var json=JSON.stringify(data);
	var blob=new Blob([json],{type:"data:application/json"});
  	var a=document.createElement('a');
	a.style.display='none';
    var url=window.URL.createObjectURL(blob);
	console.log("data ready to save: "+blob.size+" bytes");
   	a.href=url;
   	a.download=fileName;
    document.body.appendChild(a);
    a.click();
    display(fileName+" saved to downloads folder");
}
id('restoreButton').addEventListener('click',function() {
	toggleDialog('importDialog',true);
});
id("fileChooser").addEventListener('change',function() {
    var file=id('fileChooser').files[0];
    console.log("file: "+file+" name: "+file.name);
    var fileReader=new FileReader();
    fileReader.addEventListener('load', function(evt) {
	    console.log("file read: "+evt.target.result);
    	var data=evt.target.result;
    	var json=JSON.parse(data);
    	logs=json.logs;
    	charges=json.charges;
    	console.log(logs.length+' logs & '+charges.length+' charges');
    	save();
    	/*
    	logs=[];
    	for(var i=0;i<json.logs.length;i++) { // discard redundant log IDs
    		logs[i]={};
    		logs[i].date=json.logs[i].date;
    		logs[i].miles=json.logs[i].miles;
    		logs[i].percent=json.logs[i].percent;
    	}
    	logData=JSON.stringify(logs);
    	window.localStorage.setItem('logData',logData);
    	charges=json.charges;
    	chargeData=JSON.stringify(charges);
    	window.localStorage.setItem('chargeData',chargeData);
    	*/
    	toggleDialog('	restoreDialog',false);
    	// display("logs imported - restart");
    	load();
    });
    fileReader.readAsText(file);
});
// START-UP CODE
scr.w=screen.width;
scr.h=screen.height;
console.log('screen size: '+scr.w+'x'+scr.h+'px');
backupDay=window.localStorage.getItem('backupDay');
if(backupDay) console.log('last backup on day '+backupDay);
else backupDay=0;
load();
/*
chargeData=window.localStorage.getItem('chargeData');
console.log('chargeData: '+chargeData);
if(chargeData && chargeData!='undefined') {
	charges=JSON.parse(chargeData); // restore saved charges
	console.log(charges.length+' charges restored');
}
logData=window.localStorage.getItem('logData');
console.log('logData: '+logData);
if(logData && logData!='undefined') {
	logs=JSON.parse(logData); // restore saved logs
	console.log(logs.length+' logs restored');
	logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
	populateList();
}
else toggleDialog('importDialog',true);
*/
// implement service worker if browser is PWA friendly 
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('sw.js', {
		scope: '/Lec/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
