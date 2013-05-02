function undo()
{
    var xhr = new XMLHttpRequest();
    var param = encodeURIComponent("machin");
    var machin = 3;
    var truc = 4;
    xhr.open("POST", "http://localhost:8000/undo", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send("param="+machin+"&param2="+truc);
    
    xhr.onreadystatechange = function() {
    };

    alert("Undo");
}

