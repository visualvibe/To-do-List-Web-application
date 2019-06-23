$(document).ready(function(){

  $('#add-form').on('submit', function(e){
    e.preventDefault();

      //var item = $('#item');
      //var todo = {item: item.val()};
      var data = $(this).serializeArray();

      $.ajax({
        type: 'POST',
        url: '/todo',
        data: data,
        success: function(data){
          //do something with the data via front-end framework
          location.reload();
        }
      });

  });

  
  $('li').on('click', function(e){
      e.preventDefault();
      var item = $(this).text().trim().replace(/ /g, "-");
      
      console.log(item);
      $.ajax({
        type: 'DELETE',
        url: '/todo/' + item,
        success: function(data){
          //do something with the data via front-end framework

          location.reload();
        }
      });
  });
  

});
