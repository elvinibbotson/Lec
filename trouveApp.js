function id(el) {
	// console.log("return element whose id is "+el);
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
var logIndex=null;
var currentLog=null
var currentDialog;
var startX;
var thisWeek; // weeks since 1st Sept 1970
var backupWeek=0; // week of last backup;
var thisMonth=0;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";
var capacity=48; // usable battery capacity (kWh) for Peugeot e-208

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
			var dbTransaction=db.transaction('logs',"readwrite");
			var dbObjectStore=dbTransaction.objectStore('logs');
			var addRequest=dbObjectStore.add(log);
			addRequest.onsuccess=function(event) {
				charges=[]; // clear charges array
				console.log('month log saved');
				addChargeLog();
			}
			addRequest.onerror=function(event) {console.log('error adding month '+i);}
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
	var chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData); 
    toggleDialog('logDialog',false);
    populateList();
}
// SAVE CHANGED LOG
id('buttonSaveLog').addEventListener('click',function() {
	charge={};
	charge.date=id('logDate').value;
	charge.miles=parseInt(id('logMiles').value);
	charge.startCharge=parseInt(id('logStartCharge').value);
	charge.endCharge=parseInt(id('logEndCharge').value);
	console.log('update charge log '+logIndex+': '+charge.date+'; '+charge.miles+'; '+charge.startCharge+'-'+charge.endCharge);
	charges[logIndex]=charge;
	var chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData); 
    toggleDialog('logDialog',false);
    populateList();
})
// DELETE LOG
id('buttonDeleteLog').addEventListener('click', function() {
	console.log('delete charge log '+logIndex);
	charges.splice(logIndex,1);
	var chargeData=JSON.stringify(charges);
	window.localStorage.setItem('chargeData',chargeData);
	/*
	var text=log.text; // initiate delete log
	console.log("delete log "+text);
	toggleDialog(" ", true);
	id('deleteText').innerHTML=text;
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
	logs=[];
	var dbTransaction=db.transaction('logs',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('logs');
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {  
		var cursor=event.target.result;  
    	if(cursor) {
			logs.push(cursor.value);
			cursor.continue();
    	}
		else {
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
				/* html+=' '+logs[i].miles+'miles '+logs[i].percent+'%';
				// itemText.innerText=html;
				listItem.appendChild(itemText);
				var itemRate=document.createElement('span');
				itemRate.classList.add('right');
				*/
				total.miles+=logs[i].miles;
				total.percent+=logs[i].percent;
				mpk=logs[i].miles/(capacity*logs[i].percent/100);
				mpk=Math.floor(mpk*10)/10;
				listItem.innerText=html+': '+logs[i].miles+'mi '+mpk+' mi/kWh';
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
			// TRY IT HERE
			console.log('check need to backup');
			thisWeek=Math.floor(new Date().getTime()/604800000); // weeks since 1st Sept 1970
			console.log('backupWeek: '+backupWeek+'; thisWeek: '+thisWeek);
			if(thisWeek>backupWeek) backup(); // monthly backups
		}
		
	}
	request.onerror=function(event) {
		console.log("cursor request failed");
	}
}
// IMPORT/BACKUP
id('backupButton').addEventListener('click',backup);
function backup() {
  	console.log("save backup");
	var fileName="Trouve-"+thisWeek+'.json';
	// var date=new Date();
	// fileName+=date.getFullYear();
	// if(date.getMonth()<9) fileName+='0'; // date format YYYYMMDD
	// fileName+=(date.getMonth()+1);
	// if(date.getDate()<10) fileName+='0';
	// fileName+=date.getDate()+".json";
 	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	var logs=[];
	var request=dbObjectStore.openCursor();
	request.onsuccess = function(event) {  
		var cursor=event.target.result;  
    	if(cursor) {
		    logs.push(cursor.value);
			console.log("log "+cursor.value.id+", date: "+cursor.value.date);
			cursor.continue();  
    	}
		else {
			console.log(logs.length+" logs - sort and save");
    		logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
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
			backupWeek=thisWeek;
			window.localStorage.setItem('backupWeek',thisWeek); // remember week of backup
			display(fileName+" saved to downloads folder");
		}
	}
	request.onerror=function(event) {alert('backup failed');}
}
id('importButton').addEventListener('click',function() {
	toggleDialog('importDialog',true);
});
id("fileChooser").addEventListener('change',function() {
    var file=id('fileChooser').files[0];
    console.log("file: "+file+" name: "+file.name);
    var fileReader=new FileReader();
    fileReader.addEventListener('load', function(evt) {
	    console.log("file read: "+evt.target.result);
    	var data=evt.target.result;
    	console.log('data... logs: '+data.logs+'; charges: '+data.logs);
    	var json=JSON.parse(data);
    	console.log("json: "+json);
    	var logs=json.logs;
    	var chargeData=json.charges;
    	console.log(logs.length+" logs "+chargeData.length+" charges loaded");
    	console.log('import logs: '+logs);
    	var dbTransaction=db.transaction('logs',"readwrite");
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	var clearRequest=dbObjectStore.clear();
    	clearRequest.onsuccess=function(event) {console.log('logs data deleted');}
    	for(var i=0;i<logs.length;i++) {
    		console.log("add log "+i);
    		var request = dbObjectStore.add(logs[i]);
    		request.onsuccess = function(e) {
    			console.log(logs.length+" logs added to database");
    		};
    		request.onerror = function(e) {console.log("error adding log");};
    	}
    	console.log('import charges: '+charges);
    	var charge;
    	charges=[];
    	for(i=0;i<chargeData.length;i++) {
    		console.log('add charge '+i);
    		charge={};
    		charge.date=chargeData[i].date;
    		charge.miles=chargeData[i].miles;
    		charge.startCharge=chargeData[i].startCharge;
    		charge.endCharge=chargeData[i].endCharge;
    		charges.push(charge);
    	}
    	chargeData=JSON.stringify(charges);
    	window.localStorage.setItem('chargeData',chargeData);
    	toggleDialog('importDialog',false);
    	display("logs imported - restart");
    });
    fileReader.readAsText(file);
});
// START-UP CODE
scr.w=screen.width;
scr.h=screen.height;
console.log('screen size: '+scr.w+'x'+scr.h+'px');
backupWeek=window.localStorage.getItem('backupWeek'); // get month of last backup
if(backupWeek==null) backupWeek=0;
console.log('backupWeek: '+backupWeek);
chargeData=window.localStorage.getItem('chargeData');
console.log('chargeData: '+chargeData);
if(chargeData && chargeData!='undefined') {
	charges=JSON.parse(chargeData); // restore saved charges
	console.log(charges.length+' charges restored');
}
var request=window.indexedDB.open("trouveDB");
request.onsuccess=function(event) {
    db=event.target.result;
    console.log("DB open");
    var dbTransaction=db.transaction('logs',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('logs');
    console.log("indexedDB objectStore ready");
    // code to read logs from database
    logs=[];
    console.log("logs array ready");
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
		    logs.push(cursor.value);
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries!");
		    console.log(logs.length+" logs");
		    if(logs.length<1) { // no logs: offer to restore backup
		        toggleDialog('importDialog',true);
		        return
		    }
		    logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
		    /* TEMPORARY CONVERTER
		    var months=[]; // new array for monthly logs
		    var month=0; // latest month
		    var mm;
		    var miles=0; // total miles for month
		    // var startMiles=0;
		    var percent=0; // total percent charge for month
		    var log={};
		    var i=0;
		    while(i<logs.length) {
		    	mm=parseInt(logs[i].date.substr(5,2)); // 0-11
		    	if(i<1) {
		    		month=mm;
		    		miles=parseInt(logs[i].miles);
		    	}
		    	if(i>0 && mm!=month) { // new month - create log item for previous month
		    		log={};
		    		log.date=logs[i-1].date.substr(0,8)+'00'; // disregard day
		    		log.miles=parseInt(logs[i].miles)-miles;
		    		miles=parseInt(logs[i].miles);
		    		log.percent=percent;
		    		percent=0;
		    		month=mm;
		    		months.push(log);
		    		alert('new log item - date: '+log.date+'; miles: '+log.miles+'; percent: '+log.percent);
		    	}
		    	else { // tot up percentage charges for month
		    		percent+=(parseInt(logs[i].endCharge)-parseInt(logs[i].startCharge));
		    	}
		    	i++;
		    }
		    console.log(months.length+' months logged');
		    var dbTransaction=db.transaction('logs',"readwrite");
    		console.log("indexedDB transaction ready");
    		var dbObjectStore=dbTransaction.objectStore('logs');
    		console.log("indexedDB objectStore ready");
    		for(i=0;i<months.length;i++) {
    			var addRequest=dbObjectStore.add(months[i]);
    			addRequest.osuccess=function(event) {
    				console.log('month '+i+' added to database');
    			}
    			addRequest.onerror=function(event) {
    				console.log('error adding month '+i);
    			}
    		}
    		alert('MONTH DATA ADDED');
		    // END
		    */
		    populateList();
	    }
    };
    request.onerror=function(err) {
    	alert('IndexedDB error '+err.message);
    }
};
request.onupgradeneeded=function(event) {
	var dbObjectStore = event.currentTarget.result.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
	console.log("new logs ObjectStore created");
};
request.onerror=function(event) {
	alert("indexedDB error");
};
// implement service worker if browser is PWA friendly 
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('trouveSW.js', {
		scope: '/trouve/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
