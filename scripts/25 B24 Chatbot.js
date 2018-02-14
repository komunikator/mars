// Для генерации ответа на сообщения вызвать cb(self);
// Преждевременно присвоить сформированный ответ в self.answer

exports.src = async function (self, cb) {

    async function getB24tasks() {
        return new Promise((resolve, reject) => {
            self.params = {
                "auth": self.body["auth"]["access_token"],
                "method": "task.item.list",
                "ORDER": {
                    "DEADLINE": "desc"
                },
                "FILTER": {
                    "RESPONSIBLE_ID": self.body["data"]["PARAMS"]["FROM_USER_ID"],
                    "<DEADLINE": "2018-01-30"
                },
                "PARAMS": {
                    "NAV_PARAMS": {
                        "nPageSize": 1,
                        "iNumPage": 1
                    }
                },
                "SELECT": ["TITLE"]
            };

            self.request(self, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
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

        default:
            self.answer = await new Promise((resolve) => {
                setTimeout( () => {
                    return resolve(`Стандартный ответ на сообщение: ${self.message}`);
                }, 1000);
            });
            cb(self);
            break;
    }
}