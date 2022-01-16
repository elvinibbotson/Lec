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
canvas=null;
lastSave=-1;
months="JanFebMarAprMayJunJulAugSepOctNovDec";

// EVENT LISTENERS

// NEW BUTTON
id('buttonNew').addEventListener('click', function() { // show the log dialog
	console.log("show add jotting dialog with today's date, 1 day duration, blank text field and delete button disabled");
    toggleDialog('logDialog',true);
	var d=new Date().toISOString();
	id('logDate').value=d.substr(0,10);
	id('logCharge').checked=false;
	id('logDestination').value="";
	id('logDistance').value=0;
	id('logPercent').value=0;
	id('logExtra').value=0.5;
	log={};
	logIndex=null;
	id("buttonDeleteLog").disabled=true;
	id('buttonDeleteLog').style.color='gray';
});

// SAVE NEW/EDITED LOG
id('buttonSaveLog').addEventListener('click', function() {
	log.date=id('logDate').value;
	log.charge=id('logCharge').checked;
	log.destination=id('logDestination').value;
	log.distance=id('logDistance').value;
	log.percent=id('logPercent').value;
	log.extra=id('logExtra').value;
    toggleDialog('logDialog',false);
	console.log("save log - date: "+log.date+' '+log.distance+' miles to '+log.percent+'%');
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
	id('logDateField').value=log.date;
	id('logDaysField').value=log.days;
	id('logTextField').value=log.text;
	if(!log.tags) log.tags=[];
	listLogTags();
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
			console.log("list "+logs.length+" logs");
			logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
			console.log("populate list");
			id('list').innerHTML=""; // clear list
			var html="";
			var d="";
			var mon=0;
  			for(var i=logs.length-1; i>=0; i--) { // list latest first
  			 	var listItem = document.createElement('li');
				listItem.index=i;
	 		 	listItem.classList.add('log-item');
				// listItem.addEventListener('click', function(){logIndex=this.index; openLog();});
				listItem.addEventListener('click', selectLog);
				d=logs[i].date;
				mon=parseInt(d.substr(5,2))-1;
				mon*=3;
				d=d.substr(8,2)+" "+months.substr(mon,3)+" "+d.substr(2,2);
				html="<span class='log-date'>"+d+" ";
				html+="<span class='log-text'>";
				if(logs[i].charge) html+="CHARGE to... ";
				else html+=logs[i].destination+" "+logs[i].distance+"mi ";
				html+=logs[i].percent+"% ";
				if(!logs[i].charge) {
					var n=(logs[i-1].percent-logs[i].percent);
					console.log(n+'% used');
					n/=logs[i].distance;
					n*=10;
					n=Math.floor(n);
					n/=10;
					html+=n+"%/mi <img src='"+logs[i].extra*4+"button24px.svg'";
				}
				html+="</span>";
				listItem.innerHTML=html;
		  		id('list').appendChild(listItem);
  			}
	        var thisMonth=new Date().getMonth();
	        if(thisMonth!=lastSave) backup(); // monthly backups
	        drawGraph();
  		}
	}
	request.onerror=function(event) {
		console.log("cursor request failed");
	}
}

// DRAW GRAPH
function drawGraph() {
	var x=0;
	var ch=scr.h/4;
	var h=ch/100;
	var y=ch;
	// last.distance=last.percent=0;
	canvas.strokeStyle='#ffff00';
	canvas.lineWidth=3;
	canvas.beginPath();
	canvas.moveTo(x,y);
	for(var i=0;i<logs.length;i++) { // plot trips and charges
			console.log('draw charge bar '+i)
			x+=logs[i].distance*5; // 5 px/mile
			y=ch-logs[i].percent*h; // h px/%
			canvas.lineTo(x,y);
			canvas.arc(x,y,3,0,2*Math.PI,true);
			canvas.moveTo(x,y);
	}
    canvas.stroke();
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
id("canvas").width=scr.w;
id("canvas").height=scr.h/2;
canvas=id('canvas').getContext('2d');
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
