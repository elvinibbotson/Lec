function id(el) {
	// console.log("return element whose id is "+el);
	return document.getElementById(el);
}

'use strict';
	
// GLOBAL VARIABLES
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
db=null;
logs=[];
log=null;
logIndex=null;
currentLog=null;
tags=[];
lastSave=-1;
months="JanFebMarAprMayJunJulAugSepOctNovDec";
capacity=17.6; // usable battery capacity (kWh)

// EVENT LISTENERS

// NEW BUTTON
id('buttonNew').addEventListener('click', function() { // show the log dialog
	console.log("show add jotting dialog with today's date, 1 day duration, blank text field and delete button disabled");
    toggleDialog('logDialog',true);
	var d=new Date().toISOString();
	id('logDate').value=d.substr(0,10);
	id('logMiles').value=null;
	id('logStartCharge').value=null;
	id('logEndCharge').value=null;
	log={};
	logIndex=null;
	id("buttonDeleteLog").disabled=true;
	id('buttonDeleteLog').style.color='gray';
});

// SAVE NEW/EDITED LOG
id('buttonSaveLog').addEventListener('click', function() {
	log.date=id('logDate').value;
	log.miles=id('logMiles').value;
	log.startCharge=id('logStartCharge').value;
	log.endCharge=id('logEndCharge').value;
    toggleDialog('logDialog',false);
	console.log("save log - date: "+log.date+' '+log.miles+' miles');
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	console.log("save log - logIndex is "+logIndex);
	if(logIndex===null) { // add new log
		var request=dbObjectStore.add(log);
		request.onsuccess=function(event) {
			console.log("new log added: "+log.text);
			populateList();
		};
		request.onerror=function(event) {console.log("error adding new log");};
	}
	else { // update existing log
		request=dbObjectStore.put(log); // update log in database
		request.onsuccess=function(event)  {
			console.log("log "+log.id+" updated");
			populateList();
		};
		request.onerror = function(event) {console.log("error updating log "+log.id);};
	}
});

// CANCEL NEW/EDIT LOG
id('buttonCancelLog').addEventListener('click', function() {
    toggleDialog('logDialog',false); // close add new jotting dialog
});
  
// DELETE LOG
id('buttonDeleteLog').addEventListener('click', function() {
	var text=log.text; // initiate delete log
	console.log("delete log "+text);
	toggleDialog("deleteDialog", true);
	id('deleteText').innerHTML=text;
	toggleDialog("logDialog", false);
});

// CONFIRM DELETE
id('buttonDeleteConfirm').addEventListener('click', function() {
	console.log("delete log "+logIndex+" - "+log.text); // confirm delete log
	var dbTransaction=db.transaction("logs","readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore("logs");
	var request=dbObjectStore.delete(log.id);
	request.onsuccess=function(event) {
		console.log("log "+log.id+" deleted");
		logs.splice(logIndex,1); // not needed - rebuilding logs anyway
		populateList();
	};
	request.onerror=function(event) {console.log("error deleting log "+log.id);};
	toggleDialog('deleteDialog', false);
});

// CANCEL DELETE
id('buttonCancelDelete').addEventListener('click', function() {
    toggleDialog('deleteDialog', false); // close delete dialog
});

// SHOW/HIDE DIALOGS
function  toggleDialog(d, visible) {
    console.log('toggle '+d+' - '+visible);
  	id('buttonNew').style.display=(visible)?'none':'block';
	if(d=='logDialog') { // toggle log dialog
	    if (visible) {
      		id("logDialog").style.display='block';
    	} else {
      		id("logDialog").style.display='none';
    	}
	}
	else if(d=='deleteDialog') { // toggle DELETE dialog
	  	if(visible) {
      		id('deleteDialog').style.display='block';
   		} else {
     		id('deleteDialog').style.display='none';
    	}
	}
	else if(d=='importDialog') { // toggle file chooser dialog
	  	if(visible) {
      		id('importDialog').style.display='block';
    	} else {
      		id('importDialog').style.display='none';
    	}
	}
}

// OPEN SELECTED LOG FOR EDITING
function openLog() {
	console.log("open log: "+logIndex);
	log=logs[logIndex];
	toggleDialog('logDialog',true);
	id('logDate').value=log.date;
	id('logMiles').value=log.miles;
	id('logStartCharge').value=log.startCharge;
	id('logEndCharge').value=log.endCharge;
	id('buttonDeleteLog').disabled=false;
	id('buttonDeleteLog').style.color='red';
}
  
// POPULATE LOGS LIST
function populateList() {
	console.log("populate log list");
	logs=[];
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
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
			total.charge=0;
			console.log("list "+logs.length+" logs");
			logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
			console.log("populate list");
			id('list').innerHTML=""; // clear list
			var html="";
			var d="";
			var mon=0;
			var ppm=0; // percentage charge per mile
			var mpk=0; // miles per kWh
  			for(var i=0; i<logs.length; i++) { // list latest first
  			 	var listItem=document.createElement('li');
				listItem.index=i;
	 		 	listItem.classList.add('log-item');
				listItem.addEventListener('click', function(){logIndex=this.index; openLog();});
				// listItem.addEventListener('click', openLog);
				var itemText=document.createElement('span');
				d=logs[i].date;
				mon=parseInt(d.substr(5,2))-1;
				mon*=3;
				if(d.substr(8,2)=='00') html=months.substr(mon,3)+" "+d.substr(2,2); // month logs
				else d=d.substr(8,2)+' '+months.substr(mon,3)+" "+d.substr(2,2);
				if(logs[i].percent==null) html=d+' '+logs[i].miles+'miles '+logs[i].startCharge+'-'+logs[i].endCharge+'%';
				// itemText.innerText=html;
				listItem.appendChild(itemText);
				var itemRate=document.createElement('span');
				itemRate.classList.add('right');
				if(logs[i].percent) { // month logs
					total.miles+=logs[i].miles;
					total.percent+=logs[i].percent;
					total.charge+=capacity*logs[i].percent/100;
					mpk=logs[i].miles/(capacity*logs[i].percent/100);
					mpk=Math.floor(mpk*10)/10;
					itemText.innerText=html+': '+mpk+' mi/kWh';
					// itemRate.innerText=mpk+' mi/kWh';
					listItem.style.width=scr.w*mpk/7+'px';
					console.log('screen: '+scr.w+'px; mpk: '+mpk);
				}
				else if(i>0) { // current month's logs
					itemText.innerText=html;
					/*
					total.miles+=(logs[i].miles-logs[i-1].miles);
					total.charge+=(logs[i-1].endCharge-logs[i].startCharge);
					*/
					ppm=(logs[i-1].endCharge-logs[i].startCharge)/(logs[i].miles-logs[i-1].miles);
					ppm*=10;
					ppm=Math.round(ppm);
					ppm/=10; // one decimal place
					itemRate.innerText=ppm;
					if(ppm%1==0) itemRate.innerText+='.0';
					itemRate.innerText+='%/mi';
					/*
					var miles=logs[i].miles-logs[i-1].miles; // miles driven between charges
					total.mile+=miles;
					var kwh=(logs[i-1].endCharge-logs[i].startCharge)*17.6/100; // kWh consumed between charges
					total.kwh+=kwh;
					miles/=kwh; // energy consumption: miles/kWh
					miles*=10;
					miles=Math.round(miles);
					miles*=10; // nearest decimal point
					itemRate.innerText=miles+'mi/kWh';
					*/
				}
				listItem.appendChild(itemRate);
				/*
				if(logs[i].charge) html+="CHARGE to... "+logs[i].percent+'%';
				else html+=logs[i].destination; // +" "+logs[i].distance+"mi ";
				itemText.innerText=html;
				listItem.appendChild(itemText);
				if(!logs[i].charge) {
					var itemRate=document.createElement('span');
					itemRate.classList.add('right');
					var n=(logs[i-1].percent-logs[i].percent);
					console.log(n+'% used');
					n/=logs[i].distance;
					n*=10;
					n=Math.floor(n);
					if(n%10==0) n=n/10+'.0';
					else n/=10;
					itemRate.innerText=n+'%/mi';
					listItem.appendChild(itemRate);
					// html+=n+"%/mi <img src='"+logs[i].extra*4+"button24px.svg'";
					var itemPercent=document.createElement('span');
					itemPercent.classList.add('right');
					itemPercent.innerText=logs[i].percent+'%';
					listItem.appendChild(itemPercent);
					var itemDist=document.createElement('span');
					itemDist.classList.add('right');
					itemDist.innerHTML=logs[i].distance+'mi <img src="'+logs[i].extra*4+'button24px.svg"/>';
					listItem.appendChild(itemDist);
				}
				*/
		  		id('list').appendChild(listItem);
  			}
  			console.log('totals: '+total.miles+' miles; '+total.charge+' kWh; '+total.percent+' %/mi');
  			ppm=total.percent/total.miles;
  			ppm*=10;
  			ppm=Math.round(ppm);
  			ppm/=10;
  			mpk=total.miles/total.charge;
			mpk*=10;
			mpk=Math.round(mpk);
			mpk/=10; // one decimal place
			id('heading').innerText=mpk+' miles/kWh; '+ppm+' %/mile';
	        var thisMonth=new Date().getMonth();
	        if(thisMonth!=lastSave) backup(); // monthly backups
	        // drawGraph();
  		}
	}
	request.onerror=function(event) {
		console.log("cursor request failed");
	}
}

function selectLog() {
	if(currentLog) currentLog.children[0].style.backgroundColor='gray'; // deselect any previously selected item
    itemIndex=parseInt(logIndex);
	log=logs[logIndex];
	console.log("selected item: "+logIndex);
	currentLog=id('list').children[logIndex];
	// currentLog.children[0].style.backgroundColor='black'; // highlight new selection
	currentLog.style.backgroundColor='black'; // highlight new selection
}
  
// IMPORT FILE
id("fileChooser").addEventListener('change',function() {
    var file=id('fileChooser').files[0];
    console.log("file: "+file+" name: "+file.name);
    var fileReader=new FileReader();
    fileReader.addEventListener('load', function(evt) {
	    console.log("file read: "+evt.target.result);
    	var data=evt.target.result;
    	var json=JSON.parse(data);
    	console.log("json: "+json);
    	var logs=json.logs;
    	console.log(logs.length+" logs loaded");
    	var dbTransaction=db.transaction('logs',"readwrite");
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	for(var i=0;i<logs.length;i++) {
    		console.log("add log "+i);
    		var request = dbObjectStore.add(logs[i]);
    		request.onsuccess = function(e) {
    			console.log(logs.length+" logs added to database");
    		};
    		request.onerror = function(e) {console.log("error adding log");};
    	}
    	toggleDialog('importDialog',false);
    	alert("logs imported - restart");
    });
    fileReader.readAsText(file);
});
  
// CANCEL IMPORT DATA
id('buttonCancelImport').addEventListener('click',function() {
    console.log('cancel import');
    toggleDialog('importDialog', false);
});

// BACKUP
function backup() {
  	console.log("save backup");
	var fileName="trouve.json";
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
			var data={'logs': logs};
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
			alert(fileName+" saved to downloads folder");
			var today=new Date();
			lastSave=today.getMonth();
			window.localStorage.setItem('trouveSave',lastSave); // remember month of backup
		}
	}
}

// START-UP CODE
scr.w=screen.width;
scr.h=screen.height;
console.log('screen size: '+scr.w+'x'+scr.h+'px');
lastSave=window.localStorage.getItem('trouveSave'); // get month of last backup
console.log('lastSave: '+lastSave);
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
