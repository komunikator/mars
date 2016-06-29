exports.src = {
    ttsPlay: {
                voice: 'Tatyana',
                text: 'Я Татьяна - женский голос.',
                next: {
                        ttsPlay: {
                                    voice: 'Maxim',
                                    text: 'Я Максим - мужской голос.',
                                    next: {
                                            ttsPlay: {
                                                        voice: 'Tatyana',
                                                        text: 'Я Татьяна - снова женский голос.',
                                                        next: {hangUp: true}
                                                     }
                                          }
                                 }
                      }
             }
}