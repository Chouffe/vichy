window.onload = function(){
    //Initializes on start
    tab = document.getElementById('Blame');
    for(var i=0; i <= 20; i++){
        line = document.createElement('DIV');
        line.className = 'author';
        console.log(tab);
        line.textContent = i;
        tab.appendChild(line);
    }
}
function blame(){
    var connection = sharejs.open('test2', 'text', function(error, doc){
        // this function is called once the connection is opened
        if (error) {
            alert("Can not open document");
        } else {
            // attach the ShareJS document to the textarea
            var xhr = new XMLHttpRequest();
            var doc_name = encodeURIComponent("test2");
            var version = doc.version;
            xhr.onreadystatechange = function() {
                //TODO: Done = close
                if (xhr.readyState==4 && xhr.status==200){
                    bl = document.getElementById("Blame");
                    result = JSON.parse(xhr.responseText);
                    result = result.blame;
                    for(j = 0; j < result.length; j++){
                        bl.children[j].textContent = result[j].author;
                    }
                }
            };
            xhr.open("GET", "/blame/"+doc_name+".json", true);
            xhr.send();
        }
    });
}
