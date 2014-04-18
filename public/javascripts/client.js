//------------------------------------------------------------------------------
// Copyright IBM Corp. 2014
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------

$(document).ready(function() {
  var name = '';

  $.getJSON('/instanceId', function(response, statusText, jqXHR) {
    if(jqXHR.status == 200) {
      $('#instance-id').show();
      $('#instance-id-value').html(response.id);
    } 
  });

  function go() {
    name = $('#user-name').val();
    $('#user-name').val('');
    $('.user-form').hide();
    $('.chat-box').show();
    poll();
  };
  $('#user-name').keydown(function(e) {
    if(e.keyCode == 13){
      go();
    }
  });
  $('.go-user').on('click', function(e) {
    go();
  });

  $('.chat-box textarea').keydown(function(e) {
    if(e.keyCode == 13){
      $.ajax({
        type: "POST",
        url: "/msg",
        data: JSON.stringify({"username" : name, "message" : $('#message-input').val().trim()}),
        contentType: "application/json"
      });
      $(this).val('');
      $('.jumbotron').hide();
      e.preventDefault()
    }
  });

  function poll() {
    $.getJSON('/poll/' + new Date().getTime(), function(response, statusText, jqXHR) {
      if(jqXHR.status == 200) {
        $('.jumbotron').hide();
        msg = response;
        var html = '<div class="panel panel-success"><div class="panel-heading"><h3 class="panel-title">' + msg.username + '</h3></div><div class="panel-body">' + msg.message + '</div></div>';
        $('.message-area').append(html);
        var d = $('.message-area');
        d.scrollTop(d.prop("scrollHeight"));
      }
      poll();
    });
  };
});