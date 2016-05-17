$(document).ready(function(){
	//console.log("jquery work in kunka.js!");
	
	//通过新窗口打开不是本站的链接
	$(document.links).filter(function() {
	    return this.hostname != window.location.hostname;
	}).attr('target', '_blank');
	
	//点击图片可打开新窗口查看原图
	$(".main .article img").click(function(){
		window.open($(this).attr('src'));
        return false;
	});
	
	//浮层跟随页面滚动
	var $sidebar = $(".aside"),
		$window = $(window),
		$document = $(document),
		offset = $sidebar.offset(),
		height = $document.height() - $window.height(),
		topPadding = 43;
	
	$window.scroll(function() {
		if ($window.scrollTop() >= height) {
            //console.log("滚动条已经到达底部为" + $document.scrollTop());
            return;
        }
		console.log($window.scrollTop() + ', ' + offset.top);
		if ($window.scrollTop() > offset.top) {
			$sidebar.stop().animate({
				marginTop : $window.scrollTop() - offset.top + topPadding
			});
		} else {
			$sidebar.stop().animate({
				marginTop : 26
			});
		}
	});
	
});