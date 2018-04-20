exports.src = async function (self, cb) {

    // Для генерации ответа на сообщения вызвать cb(self);
    // Преждевременно присвоить сформированный ответ в self.answer

    async function getDataDialogflow() {
        return new Promise((resolve, reject) => {
            const apiai = require("api.ai");

            const nlp = new apiai({
                token: "456c6c686bf4437192169ea9dcc2a732",
                session: "12345"
            });

            nlp.text('Марс прислал привет', function (error, response) {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    async function getLastMessageChatById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'im.dialog.messages.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    dialog_id: "668"

                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

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

    async function getListProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.list',
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

    async function getListTypePropertyTypes() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.property.types',
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

    async function getDescriptionFieldsPropertiesProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.property.fields',
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

    async function getDescriptionFieldsSettingsPropertiesProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.property.settings.fields',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    propertyType: "S", 
                    userType: "HTML"
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionFieldsElementPropertiesProductListType() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.property.settings.fields',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    propertyType: "S", 
                    userType: "HTML"
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getListPropertiesProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.product.property.list',
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

    async function getListLead() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.lead.list',
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


    async function getLeadByID() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.lead.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '60'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getLeadFieldsByID() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.lead.fields',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '60'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getLeadProductsByID() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.lead.productrows.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '60'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getUserFieldsLeads() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.lead.userfield.list',
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

    async function getDescriptionProductFields() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.productsection.fields',
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

    async function getSectionProductionsById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.productsection.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getListSectionProduct() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.productsection.list',
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

    async function getDescriptionFieldsCommodityItems() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.productrow.fields',
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

    async function getListCommodityItems() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.productrow.list',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    filter: { 
                        "OWNER_TYPE": 'L', 
                        "OWNER_ID":  '1'
                    }
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getListOffers() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.quote.list',
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

    async function getCommercialOfferById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.quote.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getProductLineOffers() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.quote.productrows.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getCustomFieldOffersById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.quote.userfield.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getListCustomOfferFields() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.quote.userfield.list',
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

    async function getListDeals() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.list',
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


    async function getDealById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '2'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionFieldsTransactionContact() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.contact.fields',
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

    async function getProductPositionDeal() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.productrows.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '2'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getCustomFieldDealById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.userfield.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '2'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getListUserFieldsLeads() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.deal.userfield.list',
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

    async function getListCurrency() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.currency.list',
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

    async function getCurrencyById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.currency.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: 'RUB'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getCurrencyFieldDescription() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.currency.fields',
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

    async function getLocalizationCurrencyById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.currency.localizations.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: 'RUB'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionLocalizationCurrency() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.currency.localizations.fields',
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

    async function getListInvoice() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.list',
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

    async function getInvoiceById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }


    async function getDescriptionsFieldsInvoice() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.fields',
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

    async function getListUserAccountField() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.userfield.list',
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

    async function getUserAccountFieldById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.userfield.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionFieldsPaymentMethods() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.paysystem.fields',
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

    async function getListPaymentMethod() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.paysystem.list',
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

    async function getFieldDescriptionsTypesPayers() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.persontype.fields',
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

    async function getListTypesPayers() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.persontype.list',
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

    async function getPublicLinkOnlineInvoice() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.invoice.getexternallink',
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


    async function getListDestinationsDeals() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.dealcategory.list',
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

    async function getDirectionDealsById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.dealcategory.get',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '1'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    async function getDescriptionFieldsDirectionDeals() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.dealcategory.fields',
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

    async function getListStagesDealsDestinationsById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.dealcategory.stage.list',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '2'
                }
            };

            self.request(request, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }


    async function getIdTypeReferenceStorageStagesById() {
        return new Promise((resolve, reject) => {
            let request = {
                requestTimeout: 35000,
                url: self.url,
                method: 'crm.dealcategory.status',
                settings: {
                    access_token: self.body['auth']['access_token'],
                    id: '2'
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

        case 'Список товаров':
            try {
                self.answer = await getListProduct();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список типов свойств товара':
            try {
                self.answer = await getListTypePropertyTypes();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей для свойств товаров':
            try {
                self.answer = await getDescriptionFieldsPropertiesProduct();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей дополнительных настроек свойства товаров':
            try {
                self.answer = await getDescriptionFieldsSettingsPropertiesProduct();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей элемента свойства товаров списочного типа':
            try {
                self.answer = await getDescriptionFieldsElementPropertiesProductListType();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список свойств товаров':
            try {
                self.answer = await getListPropertiesProduct();

            } catch(err) {
            }
            cb(self);
            break;

        case 'Список лидов':
            try {
                self.answer = await getListLead();

            } catch(err) {
            }
            cb(self);
            break;

        case 'Лид по id':
            try {
                self.answer = await getLeadByID();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Поля лида по id':
            try {
                self.answer = await getLeadFieldsByID();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Товары лида по id':
            try {
                self.answer = await getLeadProductsByID();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Список пользовательских полей лидов':
            try {
                self.answer = await getUserFieldsLeads();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей раздела товара':
            try {
                self.answer = await getDescriptionProductFields();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Раздел товаров по идентификатору':
            try {
                self.answer = await getSectionProductionsById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список разделов товара':
            try {
                self.answer = await getListSectionProduct();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей товарных позиций':
            try {
                self.answer = await getDescriptionFieldsCommodityItems();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список товарных позиций':
            try {
                self.answer = await getListCommodityItems();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список предложений':
            try {
                self.answer = await getListOffers();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Возвращает коммерческое предложение по id':
            try {
                self.answer = await getCommercialOfferById();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Товарные позиции предложения':
            try {
                self.answer = await getProductLineOffers();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Пользовательское поле предложений по id':
            try {
                self.answer = await getCustomFieldOffersById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список пользовательских полей предложений':
            try {
                self.answer = await getListCustomOfferFields();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список сделок':
            try {
                self.answer = await getListDeals();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Сделка по id':
            try {
                self.answer = await getDealById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей для связи сделка-контакт':
            try {
                self.answer = await getDescriptionFieldsTransactionContact();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Товарные позиции сделки':
            try {
                self.answer = await getProductPositionDeal();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Пользовательское поле сделок по id':
            try {
                self.answer = await getCustomFieldDealById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список пользовательских полей сделок':
            try {
                self.answer = await getListUserFieldsLeads();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список валют':
            try {
                self.answer = await getListCurrency();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Валюта по id':
            try {
                self.answer = await getCurrencyById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей валюты':
            try {
                self.answer = await getCurrencyFieldDescription();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Локализации валюты по id':
            try {
                self.answer = await getLocalizationCurrencyById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание локализаций валюты':
            try {
                self.answer = await getDescriptionLocalizationCurrency();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список счетов':
            try {
                self.answer = await getListInvoice();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Счет по id':
            try {
                self.answer = await getInvoiceById();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Описание полей счета':
            try {
                self.answer = await getDescriptionsFieldsInvoice();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Пользовательское поле счетов по id':
            try {
                self.answer = await getUserAccountFieldById();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Список пользовательских полей счетов':
            try {
                self.answer = await getListUserAccountField();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Описание полей для способов оплаты':
            try {
                self.answer = await getDescriptionFieldsPaymentMethods();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Список способов оплаты':
            try {
                self.answer = await getListPaymentMethod();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Описание полей для типов плательщиков':
            try {
                self.answer = await getFieldDescriptionsTypesPayers();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Описание типов плательщиков':
            try {
                self.answer = await getListTypesPayers();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Публичная ссылка онлайн-счета':
            try {
                self.answer = await getPublicLinkOnlineInvoice();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Список направлений сделок':
            try {
                self.answer = await getListDestinationsDeals();
            } catch(err) {
            }
            cb(self);
            break;

        case 'Направление сделок по id':
            try {
                self.answer = await getDirectionDealsById();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Описание полей направления сделок':
            try {
                self.answer = await getDescriptionFieldsDirectionDeals();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Список стадий сделок для направления по id':
            try {
                self.answer = await getListStagesDealsDestinationsById();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Идентификатор типа справочника для хранения стадий по id':
            try {
                self.answer = await getIdTypeReferenceStorageStagesById();
            } catch(err) {
            }
            cb(self);
            break;


        case 'Список последних сообщений в чате по id':
            try {
                self.answer = await getLastMessageChatById();
            } catch(err) {
            }
            cb(self);
            break;

       case 'Dialogflow':
           try {
               let answer = await getDataDialogflow();

               if (answer && answer.result && answer.result.fulfillment && answer.result.fulfillment.speech) {
                   answer = answer.result.fulfillment.speech;
               }
               self.answer = answer;
           } catch(err) {
               self.answer = err;
           }
           cb(self);
           break;
    }
}