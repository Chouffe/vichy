exports.display = function(documentName) {

	var i = 0;
	var nameDoc = '';
	var nameCreator = '';
	while(documentName[i]+documentName[i+1]+documentName[i+2]+documentName[i+3]!='$$$$' && i!=documentName.length) {
		i++
	}
	
	if(i!=documentName.length) {
		for(var j=0;j<i;j++) {
			nameDoc += documentName[j];
		}
	
		for(var j=i+4;j<documentName.length;j++) {
			nameCreator += documentName[j];
		}
		return nameDoc+' (by '+nameCreator+')';
	}
	
	else
		return documentName; 
}

exports.reverseDoc = function(documentName) {
    var i=0;
    var nameDoc = '';
    var nameCreator = '';

    while(documentName[i]+documentName[i+1]+documentName[i+2]+documentName+[i+3]+documentName[i+4] !=' (by ' && i!=documentName.length) {
        i++;
    }
    if(i!=documentName.length) {
        for(var j=0;j<i;j++) {
            nameDoc += documentName[j];
        }

        for(var j=i+5;j<documentName.length-1;j++) {
            nameCreator += documentName[j];
        }
        return nameDoc+'$$$$'+nameCreator;
    }
    else {
        return documentName;
    }

}
