$(document).ready(function(){

    $('form').on('submit', function(){
  
        var username = $("#username");
        var password = $("#password");
        var firstname = $("#firstname");
        var lastname = $('#lastname');
        var user = ({username: username.val(), password: password.val(), firstname: firstname.val(), lastname: lastname.val()});
  
        $.ajax({
          type: 'POST',
          url: '/register',
          data: user,
          success: function(data){
            //do something with the data via front-end framework
            alert("Successfully registered");
            location.replace("/login");
          },
          error: function() {
              alert("poop");
              return false;
          }

        });
 
        return false;
  
    });


});