exports.src = async function (self, cb) {

    // Для генерации ответа на сообщения вызвать cb(self);
    // Преждевременно присвоить сформированный ответ в self.answer

    async function getB24tasks() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'task.item.list',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    ORDER: {
                        DEADLINE: 'desc'
                    },
                    FILTER: {
                        RESPONSIBLE_ID: self.body['data']['PARAMS']['FROM_USER_ID'],
                        '<DEADLINE': '2018-01-30'
                    },
                    PARAMS: {
                        NAV_PARAMS: {
                            nPageSize: 1,
                            iNumPage: 1
                        }
                    },
                    SELECT: ['TITLE']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getBotList() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'imbot.chat.user.list',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDepartaments() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'department.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    BOT_ID: self.body.data.BOT[0].BOT_ID,
					CHAT_ID: self.body.data.PARAMS.CHAT_ID
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDepartamentFields() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'department.fields',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getContactFields() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.contact.company.fields',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getContactList() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.contact.list',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getContact() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.contact.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '54'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getProductCatalog() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.catalog.list',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getProductCatalogOnId() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.catalog.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '24'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionProductCatalog() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.catalog.fields',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionFieldsProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.fields',
                settings: {
                    access_token: self.body['auth']['access_token']
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    /*
    self.request({
        url: self.url,
        method: 'imbot.message.add',
        settings: {
            BOT_ID: self.body.data.BOT[0].BOT_ID,
            MESSAGE: 'Идет формирование ответа, пожалуйста подождите.',
            DIALOG_ID: self.body['data']['PARAMS']['FROM_USER_ID'],
            access_token: self.body['auth']['access_token']
        }
    }, (err, data) => {
            if (err) return console.log(err);
        }
    );
    */

    function hasWhiteSpace(s) {
	    return s.indexOf(' ') >= 0;
    }

    switch(self.message) {
        case 'что горит':
            try {
                self.answer = await getB24tasks();
            } catch(err) {
                console.error(err);
                self.answer = 'Ошибка при получении тасков';
            }
            cb(self);
            break;

        case 'Список подразделений':
            try {
                self.answer = await getDepartaments();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список полей подразделения':
            try {
                self.answer = await getDepartamentFields();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список контактов':
            try {
                self.answer = await getContactList();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Получить контакт':
            try {
                self.answer = await getContact();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список товарных каталогов':
            try {
                self.answer = await getProductCatalog();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Товарный каталог по id':
            try {
                self.answer = await getProductCatalogOnId();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей каталога товаров':
            try {
                self.answer = await getDescriptionProductCatalog();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей товара':
            try {
                self.answer = await getDescriptionFieldsProduct();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Здравствуйте':
        case 'здравствуйте':
        case 'Привет':
        case 'привет':
            self.answer = 'Здравствуйте!';
            cb(self);
            break;

        case 'заткнись':

            cb(self);
            break;

        case 'список':
            try {
                self.answer = await getBotList();
            } catch(err) {
                console.error(err);
                self.answer = 'Ошибка при получении тасков';
            }
            cb(self);
            break;

        default:
            /*
            self.answer = await new Promise((resolve) => {
                setTimeout( () => {
                    return resolve(`Стандартный ответ на сообщение: ${self.message}`);
                }, 1000);
            });
            */

            if ( hasWhiteSpace(self.message) ) {
                self.answer = 'Мы получили ваше обращение, ожидайте ответа.';
            } else {
                self.answer = 'Здравствуйте!';
            }

            cb(self);
            break;
    }
}