exports.src = {
    mark: 'Главное меню',
    play: {file: 'media/uchet/Сигнал_записи.wav',
             next: {
                     sttOn: {
                              'opt': {model: 'general'},
                              '/*': {sendMESSAGE: {text: '[<session_id>] <sttText>',
                                                      next: {goto: 'Главное меню'}
                                                  }
                                    }
                            }
                   }
          }
}
