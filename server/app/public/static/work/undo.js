function undo()
{

    var connection = sharejs.open(docToOpen, 'text', function(error, doc)
    {
        // this function is called once the connection is opened
        if (error) {
            alert("Can not open document");
        } else {
            // attach the ShareJS document to the textarea
            var xhr = new XMLHttpRequest();
            var doc_name = encodeURIComponent(docToOpen);
            var version = doc.version;
            xhr.open("POST", "http://localhost:8088/undo", true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send("doc_name="+doc_name+"&version="+version);
            xhr.onreadystatechange = function() {
            //TODO: Done = close
            };
        }
    });


}

