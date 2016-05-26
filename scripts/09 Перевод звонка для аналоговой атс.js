exports.src = {
	recOn: true,
	play: {
		file: 'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav',
		next: {

			// Посылка hf
			sendDtmf: {
				text: 'hf',
				next: {

					// Ждем 1 с
					wait: {
						time: 1,
						next: {

							// Посылка номер абонента
							sendDtmf: {
								text: '1',
								next: {

									// Ждем 1 с
									wait: {
										time: 1,
										next: {

											sendDtmf: {
												text: '0',
												next: {

													// Ждем 1 с
													wait: {
														time: 1,
														next: {

															sendDtmf: {
																text: '0',
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
											}
										}
									}
								}
							}
						}
					}
				}
			}

		}
	}
}