$(document).ready(function(){
	//console.log("jquery work!");
	
	//通过新窗口打开不是本站的链接
	$(document.links).filter(function() {
	    return this.hostname != window.location.hostname;
	}).attr('target', '_blank');
	
	//点击图片可打开新窗口查看原图
	$(".main .article img").click(function(){
		window.open($(this).attr('src'));
        return false;
	});
});