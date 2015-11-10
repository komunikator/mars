var providersList =
        {
            providers: [{
                    id: 'sipnet',
                    name_ru: 'Sipnet',
                    img: 'images/providers/sipnet.png'
                },
                {
                    id: 'megafon',
                    name_ru: 'Мегафон',
                    img: 'images/providers/megafon.png'
                },
                {
                    id: 'telfin',
                    name_ru: 'Телфин',
                    img: 'images/providers/telfin.png'
                },
                {
                    id: 'zadarma',
                    name_ru: 'Zadarma',
                    img: 'images/providers/zadarma.png'
                },
                {
                    id: 'MangoTel',
                    name_ru: 'Манго Телеком',
                    img: 'images/providers/MangoTel.png'
                },
                {
                    id: 'gravitel',
                    name_ru: 'Гравител',
                    img: 'images/providers/gravitel.png'
                },
                {
                    id: 'uiscom',
                    name_ru: 'Uiscom',
                    img: 'images/providers/uiscom.png'
                }
            ]
        };

function getProvidersList() {
    for (var key in providersList.providers) {
        $('#radioset').append('<input type="radio" id="' + providersList.providers[key].id + '_provider" name="provider">\n\
        <label for="' + providersList.providers[key].id + '_provider" style="display:block;">\n\
        <img src="' + providersList.providers[key].img + '" alt="' + providersList.providers[key].name_ru +
        '" style="float:left; margin-left: 50px; ">' + providersList.providers[key].name_ru + '</label>');
    }
}
;