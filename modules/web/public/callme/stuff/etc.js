jQuery(function(){ 

	hljs.configure({tabReplace: "   "});

	jQuery(function(){
		jQuery("pre").each(function(i, e) {hljs.highlightBlock(e)});
	});

	jQuery(".template_preview").click(function() {
		jQuery("#template_preview").attr("src", jQuery(this).attr("href"));
		return false;
	});

	jQuery(".tab-settings a").click(function (e) {
		e.preventDefault();
		jQuery(this).tab("show");
	});

});