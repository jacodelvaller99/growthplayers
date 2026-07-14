describe('showAlert', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    // jsdom no define window.alert/confirm por defecto — limpiar lo que asignamos a mano.
    delete (window as any).confirm;
    delete (window as any).alert;
  });

  it('web: confirma con window.confirm y dispara el botón no-cancel', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const { showAlert } = require('@/lib/confirm');
    const onConfirm = jest.fn();
    const confirmSpy = jest.fn().mockReturnValue(true);
    (window as any).confirm = confirmSpy;

    showAlert('Título', 'Mensaje', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: onConfirm },
    ]);

    expect(confirmSpy).toHaveBeenCalledWith('Título\n\nMensaje');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('web: no dispara el callback si el usuario cancela el confirm', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const { showAlert } = require('@/lib/confirm');
    const onConfirm = jest.fn();
    (window as any).confirm = jest.fn().mockReturnValue(false);

    showAlert('Título', 'Mensaje', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: onConfirm },
    ]);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('web: un solo botón (alerta simple) usa window.alert y llama onPress', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const { showAlert } = require('@/lib/confirm');
    const onPress = jest.fn();
    const alertSpy = jest.fn();
    (window as any).alert = alertSpy;

    showAlert('Error', 'Algo falló', [{ text: 'OK', onPress }]);

    expect(alertSpy).toHaveBeenCalledWith('Error\n\nAlgo falló');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('nativo: delega en Alert.alert de react-native (nunca window.confirm)', () => {
    const nativeAlert = jest.fn();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Alert: { alert: nativeAlert },
    }));
    const { showAlert } = require('@/lib/confirm');
    const confirmSpy = jest.fn();
    (window as any).confirm = confirmSpy;
    const buttons = [{ text: 'Cancelar', style: 'cancel' as const }, { text: 'Confirmar', onPress: jest.fn() }];

    showAlert('Título', 'Mensaje', buttons);

    expect(nativeAlert).toHaveBeenCalledWith('Título', 'Mensaje', buttons);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
