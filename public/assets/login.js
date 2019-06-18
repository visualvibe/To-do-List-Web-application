$(document).ready(function(){
    $('form').on('submit', function(e){
        e.preventDefault();
  
        var username = $("#username");
        var password = $("#password");
        var user = ({username: username.val(), password: password.val()});
  
        $.ajax({
          type: 'POST',
          url: '/todo-login',
          data: user,
          success: function(data){
            //do something with the data via front-end framework
            alert("data:" + data);
            //location.replace("/todo-login");
          },
          error: function() {
            alert("Invalid Username or Password");
            return false;
        }
        });
  
    });

});