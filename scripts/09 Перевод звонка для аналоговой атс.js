exports.src = {
	recOn: true,
	play: {
		file: 'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav',
		next: {

			sendDtmf: {
				text: 'R100',
				next: {

					// Ждем 1 с
					wait: {
						time: 1,

						next: {
							hangUp: true
						}
					}
				}
			}
		}
	}
}