function undo()
{
    var xhr = new XMLHttpRequest();
    var param = encodeURIComponent("machin");
    var doc_name = encodeURIComponent("test");
    var version = 0
    xhr.open("POST", "http://localhost:8000/undo", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send("doc_name="+doc_name+"&version="+version);
    xhr.onreadystatechange = function() {
    };

    alert("Undo");
}

