
$(document).ready(function(){

	var hc = new HomeController();
	var av = new AccountValidator();
	
	$('#account-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			if (av.validateForm() == false){
				return false;
			} 	else{
			// push the disabled username field onto the form data array //
				formData.push({name:'user', value:$('#user-tf').val()})
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			if (status == 'success') hc.onUpdateSuccess();
		},
		error : function(e){
			if (e.responseText == 'email-taken'){
			    av.showInvalidEmail();
			}	else if (e.responseText == 'username-taken'){
			    av.showInvalidUserName();
			}
		}
	});
	$('#name-tf').focus();
	$('#github-banner').css('top', '41px');

// customize the account settings form //
	
	$('#account-form h1').text('Account Settings');
	$('#account-form #sub1').text('Here are the current settings for your account.');
	$('#user-tf').attr('disabled', 'disabled');
	$('#account-form-btn1').html('Delete');
	$('#account-form-btn1').addClass('btn-danger');
	$('#account-form-btn2').html('Update');
	$('#account-form-btn3').html('My documents');
	$('#account-form-btn4').html('New Doc');
	$('#account-form-btn5').html('Open Doc');
	
// setup open document window

	$('.modal-opendoc').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-opendoc .modal-header h3').text('My documents');
	$('.modal-opendoc .modal-body p').html('Open a document in your list');
	$('.modal-opendoc .cancel').html('Cancel');
	$('.modal-opendoc .submit').html('Open');

// setup the new document window

    $('.modal-newdoc').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-newdoc .modal-header h3').text('Create a new document');
	//$('.modal-newdoc .modal-body p').html('Give a name to your document');
	$('.modal-newdoc .cancel').html('Cancel');
	$('.modal-newdoc .submit').html('Create');
	
// setup the documents window

	$('.modal-mydocs').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-mydocs .modal-header h3').text('My documents');
	$('.modal-mydocs .modal-body p').html('Manage your document rights');
	$('.modal-mydocs .cancel').html('Cancel');
	$('.modal-mydocs .submit').html('Submit');

// setup the confirm window that displays when the user chooses to delete their account //

	$('.modal-confirm').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-confirm .modal-header h3').text('Delete Account');
	$('.modal-confirm .modal-body p').html('Are you sure you want to delete your account?');
	$('.modal-confirm .cancel').html('Cancel');
	$('.modal-confirm .submit').html('Delete');
	$('.modal-confirm .submit').addClass('btn-danger');

})
