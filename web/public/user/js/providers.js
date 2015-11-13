var providersList =
        {
            providers: [
                {
                    id: 'sipnet',
                    name_ru: 'Sipnet',
                    img: 'images/providers/sipnet.png',
                    host: 'sipnet.ru'
                },
                {
                    id: 'megafon',
                    name_ru: 'Мегафон',
                    img: 'images/providers/megafon.png',
                    host: '193.201.229.35',
                    domain: 'multifon.ru',
                },
                {
                    id: 'telfin',
                    name_ru: 'Телфин',
                    img: 'images/providers/telfin.png',
                    host: 'voice.telphin.com:5068'
                },
                {
                    id: 'zadarma',
                    name_ru: 'Zadarma',
                    img: 'images/providers/zadarma.png',
                    host: 'sip.zadarma.com'
                },
                {
                    id: 'MangoTel',
                    name_ru: 'Манго Телеком',
                    img: 'images/providers/MangoTel.png',
                    host: 'mangosip.ru'
                },
                {
                    id: 'gravitel',
                    name_ru: 'Гравител',
                    img: 'images/providers/gravitel.png',
                    host: 'gravitel.ru:5060'
                },
                {
                    id: 'uiscom',
                    name_ru: 'Uiscom',
                    img: 'images/providers/uiscom.png',
                    host: 'voip.uiscom.ru:9060'
                }
            ]
        };

function getProvidersList() {
    for (var key in providersList.providers) {
        $('#radioset').append('<input type="radio" id="' + providersList.providers[key].id + '" name="provider">\n\
        <label for="' + providersList.providers[key].id + '" style="display:block;">\n\
        <img src="' + providersList.providers[key].img + '" alt="' + providersList.providers[key].name_ru +
        '" style="float:left; margin-left: 50px; ">' + providersList.providers[key].name_ru + '</label>');
    }
};

function getHostSipConnection(id) {
    if (id) {
        for (var key in providersList.providers) {
            if (providersList.providers[key].id == id) {
                return providersList.providers[key].host;
            }
        }
    }
    return;
}

function getDomainSipConnection(id) {
    if (id) {
        for (var key in providersList.providers) {
            if (providersList.providers[key].id == id) {
                return providersList.providers[key].domain;
            }
        }
    }
    return;
}