if(window.location.hostname != '127.0.0.1' && window.location.hostname != 'localhost'){
	//console.log('not 127.0.0.1 and not localhost');
	var _hmt = _hmt || [];
	(function() {
		var hm = document.createElement('script');
		hm.src = '//hm.baidu.com/hm.js?e5c18023d10d67c761477228392feac9';
		var s = document.getElementsByTagName('script')[0];
		s.parentNode.insertBefore(hm, s)
	})();
}//else{
	//console.log('127.0.0.1 or localhost');
//}

$(document).ready(function(){
	//console.log('jquery work in kunka.js!');
	
	//通过新窗口打开不是本站的链接
	$(document.links).filter(function() {
	    return this.hostname != window.location.hostname;
	}).attr('target', '_blank');
	
	//点击图片可打开新窗口查看原图
	$('.main .article img').click(function(){
		window.open($(this).attr('src'));
        return false;
	});
	
	//浮层跟随页面滚动
	var $sidebar = $('.aside'),
		$window = $(window),
		$document = $(document),
		offset = $sidebar.offset(),
		height = $document.height() - $window.height(),
		topPadding = 43;
	
	var $backToTop = $('#back-to-top');
	$backToTop.click(function(){  
        $('body,html').animate({scrollTop:0}, 1000);  
        return false;  
    });
	
	//console.log('init height='+height);
	$window.scroll(function() {
		if($window.scrollTop() > 100){
			$backToTop.fadeIn(1500);
		}else{
			$backToTop.fadeOut(1000);
		}
		
		if ($window.scrollTop() >= height) {
            //console.log('滚动条已经到达底部为' + $document.scrollTop());
            return;
        }
		//console.log($window.scrollTop() + ', ' + offset.top);
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