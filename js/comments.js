$(document).ready(function(){
	//console.log("jquery work in comments.js!");

	var postIds = [];
	$(".main .article").each(function(){
		postIds.push($(this).attr("id").replaceAll("_", "/"));
	});
	var threads = postIds.join(",");
	
	$.ajax({
        type : "GET",
        url : "http://api.duoshuo.com/threads/counts.jsonp",
        data : {
        	short_name : $("#duoshuoId").text(),
        	threads : threads
        },
        dataType : "jsonp",	//数据类型为jsonp
        //jsonp: "callback",	//服务端用于接收callback调用的function名的参数 
        success : function(data){
        	//console.log("Data Loaded: " + data);
        	//console.log(JSON.stringify(data));
        	//console.log(JSON.stringify(data.response));
        	//console.log(data.code);
        	
        	if(data.code != 0){
        		return;
        	}
        	
        	//console.log(data.response);
        	//$("#/articles/2015/12/16/large-web-site-technology-framework").text("123test");
        	for(var responseId in data.response){
        		$($("#"+responseId.replaceAll("/", "_")).find(".info-comment a")).text("("+data.response[responseId].comments+")");
        		$($("#"+responseId.replaceAll("/", "_")).find(".info-like a")).text("("+data.response[responseId].likes+")");
        	}
        },
        error : function(data){
            console.log('fail: '+data);
        }
    });
});

String.prototype.replaceAll = function(s1,s2){ 
	return this.replace(new RegExp(s1,"gm"),s2); 
}