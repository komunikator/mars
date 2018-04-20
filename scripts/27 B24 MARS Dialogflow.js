exports.src = async function (self, cb) {

    // Для генерации ответа на сообщения вызвать cb(self);
    // Преждевременно присвоить сформированный ответ в self.answer

    //console.log(self);

    async function getDataDialogflow() {
        return new Promise((resolve, reject) => {
            const apiai = require("api.ai");

            const nlp = new apiai({
                token: "456c6c686bf4437192169ea9dcc2a732",
                session: self.body.auth.user_id
            });

            //console.log('self.message ', self.message);
        	//console.log('self.body.auth.user_id ', self.body.auth.user_id);

            nlp.text(self.message, function (error, response) {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

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
}