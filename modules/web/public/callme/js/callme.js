// Callme 2.2 * NazarTokar.com * dedushka.org * Copyright 2015-2010
// Nazar Tokar @ Ukraine
// updated on 2015-03-27

function getCallmeFolder(e) { // find script folder
	var scripts = document.getElementsByTagName('script');
	for (var i = 0; i < scripts.length; i++) {
		var k = scripts[i];
		if (k.src.indexOf(e) >= 0) {
			var res = k.src.substring(0, k.src.indexOf(e));
					res = res.replace('callme/js', 'callme');
			localStorage.setItem('callmeFolder', res);
			return res;
		}
	}
}

jQuery.getScript(getCallmeFolder('callme.js') + 'js/config.js', function() {

	var folder			= getData('callmeFolder'),
			tpl 				= {}, 
			cmeForm 		= '',
			hr 					= new Date().getHours(), // get usr hour
			callmeData 	= { // data to send
				fields 			: cmeData.fields,
				title 			: cmeData.title,
				calltime 		: cmeData.callTime,
				time_start 	: cmeData.startWork,
				time_end 		: cmeData.endWork,
				button 			: cmeData.button,
				hr 					: hr
			};

	jQuery('<link>').attr ({
		type 	: 'text/css',
		rel 	: 'stylesheet',
		href 	: folder + 'templates/' + cmeData.template + '/style.css'
	}).appendTo('head'); // add css

	function replaceData(data, key, str) { // replace template
		if (!data || !key || !str) { return ''; }
		return data = data.replace((new RegExp('{{:'+key+'}}', 'gi')), str);
	}

	function rpl(e,d,r) { // replace
		if (!d) {
			var t = ['\"', '\'', '~', ';', '{', '}'];
			for (var i=0; i<t.length; i++) {
				var o = new RegExp(t[i], "g");
				e = e.replace(o, '');
			}
		} else {
			o = new RegExp(d, 'g');
			e = e.replace(o, r);
		}
		return e;
	}

	function loadHTML() { // load templates html 
		if (!tpl.length) { 
			jQuery('#cme-form-main').find('.cme-template').each(function(){
				var e = jQuery(this);
				tpl[ e.data('cme') ] = e.html();
				e.html('');
			});
		}
	}

	function isIE() { // check if IE
		var msie = window.navigator.userAgent.indexOf("MSIE ");
		return msie > 0 ? true : false;
	}

	function getPlaceholder(e,t) { // find placeholder and caption
		var f = [' ', e];
		if (e.lastIndexOf('(') != '-1') { // если указан placeholder
			f[0] = e.replace(/.*\(|\)/gi, ''); // достать placeholder между скобками
			f[1] = e.substring(0, e.lastIndexOf('(')); // достать имя поля
		}
		return t == 1 ? f[0] : f[1];
	}

jQuery.get(folder + 'templates/form.html', function (d) {
	var keys = Object.keys(cmeData);
	keys.forEach(function(e){
		d = replaceData(d, e, cmeData[e]);
	});
	jQuery('body').append(d);
	loadHTML();

// обработка полей для формы

	var fields, fieldType, f, required, selects, data='', selectData='';

	fields = rpl(cmeData['fields'], ', ', ','); // убираем лишние запятые
	fields = rpl(fields).split(','); // создаем массив полей

	var cmeFields = jQuery('#cme-form-main').find('.cme-fields'); // указываем блок, куда сохранять поля

	fields.forEach(function(e){
		if (e.charAt(e.length-1) == '*') {
			e = e.substring(0,e.length-1);
			required = 1;
		} else { 
			required = 0;
		}

		switch (e.charAt(0)) {
			case '-':
				fieldType = 'textArea';
				f = replaceData(tpl[fieldType], 'caption', getPlaceholder(e.substring(1,e.length), 0));
				f = replaceData(f, 'placeholder', getPlaceholder(e.substring(1,e.length), 1));
				f = required==0 ? rpl(f, 'required',  '') : f;
				break;
			case '?':
				fieldType = 'checkBox';
				f = replaceData(tpl[fieldType], 'caption', e.substring(1,e.length));
				break;
			case '!':
				fieldType = 'select';
				f = tpl[fieldType];
				selectData = ''; 
				selects = e.split('!');
				f = replaceData(f, 'caption', selects[1]);
				for (var k = 2; k < f.length; k++) {
					selectData += replaceData(tpl['selectOption'], 'option', selects[k]);
				}
				f = replaceData(f, 'selectArea', selectData);
				break;
			default:
				fieldType = 'textField';
				f = replaceData(tpl[fieldType], 'caption', getPlaceholder(e,0));
				f = replaceData(f, 'placeholder', getPlaceholder(e,1));
				f = required==0 ? rpl(f, 'required',  '') : f;
		}
		data += f;
	});

	if (cmeData.callTime==1) { // время звонка
		var curHour = new Date().getHours(), hours;

		var workStart = curHour < Number(cmeData.workStart) ? Number(cmeData.workStart) : curHour;
		workStart = curHour < Number(cmeData.workEnd) ?  workStart : Number(cmeData.workStart);

		var workDay = curHour > Number(cmeData.workEnd) ? cmeData.txtTmrw : cmeData.txtToday;
		var f = replaceData(tpl.selectTime, 'txtDay', workDay);

		hours = '<option value=\'\'>~</option>';

		for (var i = workStart; i <= Number(cmeData.workEnd); i++) {
			hours += "<option value='"+i+"'>"+i+"</option>";
		}
		f = replaceData(f, 'timeStart', hours);

		hours = '<option value=\'\'>~</option>';

		var workEnd = workDay == cmeData.txtTmrw ? cmeData.workStart : curHour;
		for (var i = workStart; i <= Number(cmeData.workEnd); i++) {
			hours += "<option value='"+i+"'>"+i+"</option>";
		}
		f = replaceData(f, 'timeEnd', hours);
		data += f;
	}

	//

	eval(function(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('6(G).m(C);B=6(w).z(\'.b-n\');4 9=[\'I.P\',\'Q\'];4 e=0;e=9[0]+9[1]==h.g(u,l,u,N,K,T,M,q,J,O,S,R)+h.g(H,q,p,p,A,l)?0:1;c(e==1){6(\'.b-n\').m(\'F\')}6(\'<a>\',{E:9[1],D:\'L\',X:\'1c://\'+9[0]}).1b(\'.b-o-x r\');c(d.16==0){6(\'#17\').1a()}U y(s){4 t=\'\';s=1d(s.18("14.","").Y());f(4 i=0;i<s.8;i++){t+=(i%2==0?(s.k(i)*7):(s.k(i)*3))}t=t.15("");f(4 i=0;i<t.8;i++){t[i]=(i%3==0?(j(t[i])+3):(j(t[i])+5));t[i]=(i%2==0?(t[i]*2):(t[i]*3))}f(4 i=0;i<t.8;i++){c((i%2==0)&&(i<t.8/2)){4 v=t[i];t[i]=t[t.8-i-1];t[t.8-i-1]=v}}t=t.W("");t+=t;t=t.V(0,Z);10 t}c((d.13==y(w.12))&&(d.11==0)){6(\'.b-o-x r\').19()}',62,76,'||||var||jQuery||length|callmeLink||cme|if|cmeData|callmeError|for|fromCharCode|String||Number|charCodeAt|101|html|form|btn|108|97|span|||100||document|place|cmeCount|find|109|cmeForm|data|target|text|oops|cmeFields|67|dedushka|46|115|_blank|107|117|111|org|Callme|103|114|104|function|substr|join|href|toLowerCase|30|return|showCopyright|domain|license|www|split|showButton|viewform|replace|remove|hide|appendTo|http|unescape'.split('|')))


	//

});

	function dl(f,t) { // delay
		setTimeout(function(){
			eval(f+'()');
		}, t * 1000); 
	}

	function cmeMsg(form, c, t) { // set status
		var result = jQuery(form).find('.callme-result');
		if(c&&t){
			result.html('<div class='+c+'>'+t+'</div>');			
		} else if (!c&&!t) {
			result.html('');
		}
	}

	function cmeClr() { // clear form
		jQuery('.cme-form').find('[type=text], textarea').val('');
	} 

	function cmeHide() { // show/hide
		jQuery(document).find('#cme-form-main').fadeOut('fast');
		jQuery('#cme-back').fadeOut('fast');
	}

	function cmeShow (e, a) {
		cmeForm.css('position', 'absolute');
		var cmeAttribute = jQuery(e).data('cme') || false;
		cmeAttribute && setData('cmeAttribute', cmeAttribute);
		if (cmeForm.is(':visible')) {
			cmeForm.fadeOut('fast');
			jQuery('#cme-back').fadeOut('fast');
		} else {
			var dh = jQuery(document).height(), // высота документа
					wh = jQuery(window).height(),
					dw = jQuery(window).width(); // ширина окна

			if (cmeData.center==0) {
				tp_cr = e.pageY+20;
				tp 		= dh-e.pageY;
				
				if (tp<300) { tp_cr=dh-280; } // близко к низу
				
				lf_cr = e.pageX-150;
				lf = dw-e.pageX;
					
				if (lf<300) { lf_cr=dw-350; } // близко к правому
				
				if (e.pageX<300) { lf_cr=e.pageX+20; } // близко к левому

			} else {
				lf_cr = dw/2-150;
				tp_cr = wh/2-250 + jQuery(document).scrollTop();
			}

			if (tp_cr < 0) { 
				tp_cr = 0; 
			} 
			// если слишком близко к верху страницы
			
			cmeForm.css('left', lf_cr);
			cmeForm.css('top', tp_cr);
			jQuery('#cme-back').css('height', jQuery(document).height());
			jQuery('#cme-back').fadeToggle('fast');
			cmeForm.fadeToggle('fast');
			cmeClr();
		}
	} 

	function cmeSend(e) { // send data
		var err 				= false, 
				allRequired = 1,
				form 				= jQuery(e).closest('form');

		form.find('[type=text], textarea').each(function (){
			if (jQuery(this).attr('required') != undefined) { allRequired = 0; }

			if (jQuery(this).val().length < 1 && jQuery(this).attr('required') != undefined) {
				jQuery(this).addClass('has-error');
				err = true;
			} 
		});

		if (allRequired == 1) { 
			form.find('[type=text], textarea').each(function (){
				if (jQuery(this).val().length < 1) {
					err = true; 
					jQuery(this).addClass('has-error');
				}
			});
		}

		if (form.find('.cme-ct_start').find(':selected').val() == '~'){
			cmeMsg(form, 'c_error', cmeData.alertSetCallTime);
			err = true;
		}

		if (err) { 
			if (form.hasClass('cme')) {
				cmeMsg(form, 'c_error', 'Заполните все поля');
			}
			return false; 
		}

		cmeMsg(form, 'sending', cmeData.alertSending);

		var cnt = getData('callme-sent'); // load sent time
		if (!cnt) { cnt = 0; }
		var cs = [], os = [];

		form.find('[type=text], textarea').each(function() { // текстовые поля и textarea
			var e = jQuery(this);
			if (e.val() && e.val().length > 0) {
				cs.push(e.attr('name'));
				os.push(e.val());
			}
		});	

		form.find('select').each(function() { // селекты
			var e = jQuery(this);
			if (!e.hasClass('cme-ct-start') && !e.hasClass('cme-ct-finish')) { // кроме времени
				cs.push( e.attr('name') );
				os.push( e.find(':selected').text() );
			}
		});

		if (jQuery('.cme-ct-start').find(':selected').val() > 0) { // время звонка
			cs.push( cmeData.txtCallTime );
			os.push('с '+jQuery('.cme-ct-start').find(':selected').text()+' '+cmeData.txtTill+' '+ jQuery('.cme-ct-finish').find(':selected').text()+' '+cmeData.txtHours);
		}

		form.find('[type=checkbox]').each(function() { // чекбоксы
			var e = jQuery(this);
			cs.push(e.attr('name') );
			os.push(e.is(':checked') ? 'Да' : 'Нет' );
		});

		var rf = getData('cmeRef'); // источник трафика
		if (rf && rf.length>0) {
			cs.push(cmeData.mailReferrer);
			os.push(rf);
		}

		cs.push(cmeData.mailUrl); // страница с запросом
		os.push(location.href);

		var cmeAttribute = getData('cmeAttribute');

		if (cmeAttribute != 'false') {
			cs.push('Атрибут ссылки');
			os.push(cmeAttribute);
		}

		//jQuery.getJSON(folder + 'lib/send.php', { // отправка данных
	        //0 - sipAccountID
	        //console.log(cs);
		jQuery.getJSON('/makeCall/0/'+os[cs.indexOf('Телефон')]+'/04 autoattendant.js', { // отправка данных
			contentType: 'text/html; charset=utf-8',
			cs 		: cs,
			os 		: os,
			ctime : cnt,
		}, function(i) {
			cmeMsg(form, i.cls, i.message);
			if (i.result=='success') {
				setData('callme-sent', i.time);
				form.find('.cme-btn').attr('disabled', 'disabled');
				dl('cmeHide', 4);
				dl('cmeClr', 5);
			}
		});
	}

	jQuery(document).delegate('.callme_viewform', 'click', function(e) { // click show form link 
		e.preventDefault();
		cmeShow(e);
		return false;
	}); 

	jQuery(document).delegate('.cme-cls', 'click', function(e) { // close button
		e.preventDefault();
		cmeHide();
		return false;
	});

	jQuery(document).delegate('#cme-back', 'click', function() { // bg click
		cmeHide();
	}); 

	jQuery(document).delegate('.cme-btn', 'click', function(e) { // отправка уведомления
		e.preventDefault();
		cmeSend(jQuery(this));
	});	

	jQuery(document).delegate('#cme-form-main [type=text], #cme-form-main textarea', 'keypress', function() {
		jQuery(this).removeClass('has-error');
	});

	jQuery(document).delegate('.cme-ct-start', 'change', function() { // выбор времени звонка 
		jQuery('.cme-ct-finish').find('option').each(function() {
			jQuery(this).removeAttr('disabled');
		});

		var cme_h = Number(jQuery(this).find(':selected').text())+1;
		jQuery('.cme-ct-finish').find('option').each(function(){
			if (jQuery(this).val()<cme_h) {
				jQuery(this).attr('disabled', 'disabled');
				jQuery(this).prop('selected', false);
			}
		});

		jQuery('.cme-ct-finish').css('background', '#dff0d8');
	});

	jQuery(document).delegate('.cme-ct-finish', 'change', function() {
		jQuery(this).css('background', '');
	});

	jQuery(document).keyup(function(a) { // обработка esc
		if (a.keyCode==27 && cmeForm.is(':visible')) {
			cmeHide();
		} 
	});

	if (!getData('cmeRef') && (document.referrer)) { // load sent time
		setData('cmeRef', document.referrer);
	}

	function getData(e) { // get data
		return localStorage.getItem(e) || false;
	}

	function setData(e,v) { // save data
		localStorage.setItem(e, v);
	}
});