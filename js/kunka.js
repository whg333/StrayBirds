$(document).ready(function(){
	//console.log("jquery work!");
	
	//通过新窗口打开链接
	$(document.links).filter(function() {
	    return this.hostname != window.location.hostname;
	}).attr('target', '_blank');
});