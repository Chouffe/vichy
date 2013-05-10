
function HomeController()
{

// bind event listeners to button clicks //
	var that = this;

// handle user logout //
	$('#btn-logout').click(function(){ that.attemptLogout(); });

// confirm account deletion //
	$('#account-form-btn1').click(function(){ $('.modal-confirm').modal('show');});
	
// open My documents
	$('#account-form-btn3').click(function(){ $('.modal-mydocs').modal('show');});
	
// create a new doc
	$('#account-form-btn4').click(function(){ $('.modal-newdoc').modal('show');});
	
// open a document
	$('#account-form-btn5').click(function(){ $('.modal-opendoc').modal('show');});

// handle account deletion //
	$('.modal-confirm .submit').click(function(){ that.deleteAccount(); });
	
// handle documents change //
	$('.modal-mydocs .submit').click(function(){ that.addUser(); });

// handle new document submission //
	$('.modal-newdoc .submit').click(function(){ that.newDoc(); });
	
// handle open document submission //
	$('.modal-opendoc .submit').click(function(){ that.openDoc(); });
		
	this.openDoc = function()
	{
		$('.modal-opendoc').modal('hide');
		//console.log('ok '+'  '+$('#name-doc').val());
		var that = this;
		$.get({
			url: '/opendoc',
			type: 'GET',
			//data:  "id="+$('#userId').val()+"doc="+$('#document-to-open').val(),
      		data:"doc=3",
			success: function(data){
        		window.location.href='/opendoc'
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}
	
	this.newDoc = function()
	{
		$('.modal-newdoc').modal('hide');
		//console.log('ok '+'  '+$('#name-doc').val());
		var that = this;
		$.ajax({
			url: '/newdoc',
			type: 'POST',
			data: { id: $('#userId').val(), doc: $('#name-doc').val() },
			success: function(data){
				console.log(data);
				if(data=='ok')
	 				that.showLockedAlert('Your document has been created.');
	 			else if(data=='docExists')
	 				that.showLockedError('The name of your document already exists, use another name.');
	 			else
	 				that.showLockedError('Unknown error.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}
	
	this.addUser = function()
	{
		$('.modal-mydocs').modal('hide');
		var that = this;
		
		$.ajax({
			url: '/mydocuments',
			type: 'POST',
			data: { id: $('#userId').val(), doc: $('#document-list').val(), user: $('#name-user').val() },
			success: function(data){
			    if(data == 'noUser')
			        that.showLockedError("The name of the user you want to add doesn't exist.");
			    else
	 			    that.showLockedAlert('The user has been added to your document.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

	this.deleteAccount = function()
	{
		$('.modal-confirm').modal('hide');
		var that = this;
		$.ajax({
			url: '/delete',
			type: 'POST',
			data: { id: $('#userId').val()},
			success: function(data){
	 			that.showLockedAlert('Your account has been deleted.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

	this.attemptLogout = function()
	{
		var that = this;
		$.ajax({
			url: "/home",
			type: "POST",
			data: {logout : true},
			success: function(data){
	 			that.showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

	this.showLockedAlert = function(msg){
		$('.modal-alert').modal({ show : false, keyboard : false, backdrop : 'static' });
		$('.modal-alert .modal-header h3').text('Success!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function(){window.location.href = '/';})
		setTimeout(function(){window.location.href = '/';}, 3000);
	}
	
	this.showLockedError = function(msg){
		$('.modal-alert').modal({ show : false, keyboard : false, backdrop : 'static' });
		$('.modal-alert .modal-header h3').text('Error!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').addClass('btn-danger');
		$('.modal-alert button').click(function(){window.location.href = '/';})
		setTimeout(function(){window.location.href = '/';}, 3000);
	}
}

HomeController.prototype.onUpdateSuccess = function()
{
	$('.modal-alert').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-alert .modal-header h3').text('Success!');
	$('.modal-alert .modal-body p').html('Your account has been updated.');
	$('.modal-alert').modal('show');
	$('.modal-alert button').off('click');
}
